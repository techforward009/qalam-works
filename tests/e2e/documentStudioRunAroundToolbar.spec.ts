import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const story = `بِسم اللہ ${"سلام\u200cعلی ".repeat(260)}`;

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await expect.poll(
    () => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")),
    { timeout: 20000 },
  ).not.toBeNull();
}

async function allStored(page: Page) {
  return page.evaluate(() => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
    return doc ? (map[doc] || []) : [];
  });
}

async function stored(page: Page, id: string) {
  return page.evaluate((frameId) => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
    return doc ? (map[doc] || []).find((frame) => frame.id === frameId) : undefined;
  }, id);
}

async function measureFlow(page: Page, id: string) {
  return page.evaluate((frameId) => {
    const frame = document.querySelector(`[data-studio-frame-id="${frameId}"]`)?.getBoundingClientRect();
    const root = document.querySelector(".ProseMirror");
    if (!frame || !root) return { left: false, right: false, overlap: 0 };
    let left = false;
    let right = false;
    let overlap = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim()) continue;
      if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-skip]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom <= frame.top + 1 || rect.top >= frame.bottom - 1) continue;
        if (rect.right <= frame.left - 1) left = true;
        if (rect.left >= frame.right + 1) right = true;
        if (rect.right > frame.left + 2 && rect.left < frame.right - 2) overlap += 1;
      }
    }
    return { left, right, overlap };
  }, id);
}

async function maxGapWidth(page: Page) {
  return page.evaluate(() => {
    let best = 0;
    for (const el of document.querySelectorAll("[data-run-around-gap]")) {
      best = Math.max(best, el.getBoundingClientRect().width);
    }
    return best;
  });
}

test.describe("Run Around Property Toolbar integration", () => {
  test("creates a rectangular Picture Box, toggles Run Around on toolbar, updates clearances, supports Undo/Redo and .qpg reload", async ({ page }) => {
    test.setTimeout(120000);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !(msg.location()?.url ?? "").includes("/_vercel/")) consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await open(page);
    await page.locator(".ProseMirror").click();
    await page.keyboard.insertText(story);
    await expect(page.locator(".ProseMirror")).toContainText("بِسم", { timeout: 10000 });

    // 1. Create a rectangular Picture Box centered across story lines
    await page.locator('[data-studio-tool-button="cross-square"]').click();
    const surface = page.locator("[data-studio-objects]");
    const surfaceBox = await surface.boundingBox();
    expect(surfaceBox).toBeTruthy();
    await page.mouse.move(surfaceBox!.x + 330, surfaceBox!.y + 120);
    await page.mouse.down();
    await page.mouse.move(surfaceBox!.x + 450, surfaceBox!.y + 210, { steps: 5 });
    await page.mouse.up();

    const frameLocator = page.locator('[data-studio-frame="picture-rect"]').first();
    await expect(frameLocator).toBeVisible();
    const frameId = (await frameLocator.getAttribute("data-studio-frame-id"))!;
    expect(frameId).toBeTruthy();

    // 2. Select using the Arrow tool & verify toolbar state: newly inserted Picture Box defaults to Run Around ON
    await page.locator('[data-studio-tool-button="select"]').click();
    await frameLocator.click();
    const ribbon = page.locator('[data-studio-object-ribbon="true"]');
    await expect(ribbon).toHaveAttribute("data-ribbon-mode", "object");
    const runAroundBtn = page.locator('[data-ribbon-field="run-around"]');
    const insetBtn = page.locator('[data-ribbon-field="inset"]');
    await expect(runAroundBtn).toBeEnabled();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "true");
    await expect(insetBtn).toBeDisabled();

    // Story automatically flows on both sides of the newly inserted Picture Box
    await expect.poll(async () => (await stored(page, frameId))?.runAround).toBe(true);
    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect.poll(() => measureFlow(page, frameId), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    // Modify Object dialog stays synchronized and unobstructed
    const boxPos = await frameLocator.boundingBox();
    expect(boxPos).toBeTruthy();
    await page.mouse.click(boxPos!.x + 20, boxPos!.y + 20, { button: "right" });
    await page.locator('[data-picture-menu="object"], [data-object-menu="format"]').click();
    const modifyDialog = page.locator('[data-studio-format-object-dialog="true"]');
    await expect(modifyDialog).toBeVisible();
    await expect(modifyDialog.getByLabel("Run Around")).toBeEnabled();
    await expect(modifyDialog.getByLabel("Run Around")).toBeChecked();
    await modifyDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(modifyDialog).toHaveCount(0);

    // 7. Toggle Run Around OFF via toolbar & verify story returns to overlapping normal layout
    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await stored(page, frameId))?.runAround).toBe(false);
    await expect(page.locator("[data-run-around-gap]")).toHaveCount(0);
    await expect.poll(async () => (await measureFlow(page, frameId)).overlap).toBeGreaterThan(0);

    // Turn back ON, then edit clearance via existing StudioRunAroundDialog (Format -> Runaround...)
    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect.poll(() => measureFlow(page, frameId), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });
    const baseGap = await maxGapWidth(page);

    // 8. Open Format -> Runaround... and set clearances
    await page.locator('[data-menu-root="format"]').click();
    await page.locator('[data-menu-action="text.runaround"]').click();
    const dialog = page.getByRole("dialog", { name: "Runaround" });
    await expect(dialog).toBeVisible();
    const clearance = (name: string) => dialog.getByRole("spinbutton", { name, exact: true });
    await expect(clearance("Top")).toHaveValue("1.50mm");
    await expect(clearance("Left")).toHaveValue("2.50mm");
    await expect(clearance("Right")).toHaveValue("2.50mm");
    await expect(clearance("Bottom")).toHaveValue("1.50mm");
    await clearance("Top").fill("2mm");
    await clearance("Left").fill("2.5mm");
    await clearance("Right").fill("8mm");
    await clearance("Bottom").fill("3mm");
    await dialog.getByRole("button", { name: "OK" }).click();
    await expect(dialog).toHaveCount(0);

    await expect.poll(async () => (await stored(page, frameId))?.runAroundRightMm).toBe(8);
    expect((await stored(page, frameId))?.runAroundTopMm).toBe(2);
    expect((await stored(page, frameId))?.runAroundLeftMm).toBe(2.5);
    expect((await stored(page, frameId))?.runAroundBottomMm).toBe(3);
    await expect.poll(() => maxGapWidth(page), { timeout: 15000 }).toBeGreaterThan(baseGap + 20);
    await expect.poll(() => measureFlow(page, frameId)).toEqual({ left: true, right: true, overlap: 0 });

    // 9. Undo / Redo restores clearance and Run Around state cleanly
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await stored(page, frameId))?.runAroundRightMm).toBeUndefined();
    expect((await stored(page, frameId))?.runAround).toBe(true);
    await expect.poll(() => maxGapWidth(page), { timeout: 15000 }).toBeLessThan(baseGap + 5);

    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await stored(page, frameId))?.runAround).toBe(false);
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-run-around-gap]")).toHaveCount(0);
    await expect.poll(async () => (await measureFlow(page, frameId)).overlap).toBeGreaterThan(0);

    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => (await stored(page, frameId))?.runAround).toBe(true);
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => measureFlow(page, frameId), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    await page.keyboard.press("Control+Shift+z");
    await expect.poll(async () => (await stored(page, frameId))?.runAroundRightMm).toBe(8);
    await expect.poll(() => maxGapWidth(page), { timeout: 15000 }).toBeGreaterThan(baseGap + 20);

    // 10. Save & reload .qpg document and verify persistence
    const beforeDocId = await page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"));
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-action="file.saveAs"]').click();
    const saveAs = page.locator("[data-studio-qpg-save-as]");
    await expect(saveAs).toBeVisible();
    await saveAs.getByRole("textbox", { name: "QPG file name" }).fill("RunAround Toolbar");
    const downloadPromise = page.waitForEvent("download");
    await saveAs.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const bytes = readFileSync(downloadPath!);
    const qpgJson = JSON.parse(bytes.toString("utf8")) as { format: string; frames: Array<Record<string, unknown>> };
    expect(qpgJson.format).toBe("qalam-page");
    expect(qpgJson.frames.find((f) => f.id === frameId)).toMatchObject({
      id: frameId,
      runAround: true,
      runAroundTopMm: 2,
      runAroundLeftMm: 2.5,
      runAroundRightMm: 8,
      runAroundBottomMm: 3,
    });

    await page.locator("#document-studio-upload-input").setInputFiles({
      name: "RunAround Toolbar.qpg",
      mimeType: "application/octet-stream",
      buffer: bytes,
    });
    await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBe(beforeDocId);
    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect.poll(() => measureFlow(page, frameId), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });
    expect(await stored(page, frameId)).toMatchObject({
      runAround: true,
      runAroundTopMm: 2,
      runAroundLeftMm: 2.5,
      runAroundRightMm: 8,
      runAroundBottomMm: 3,
    });

    // Re-select reloaded frame with Arrow tool & inspect Ribbon + Runaround dialog
    await page.locator('[data-studio-tool-button="select"]').click();
    await page.locator(`[data-studio-frame-id="${frameId}"]`).click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "true");
    await expect(insetBtn).toBeDisabled();
    await page.locator('[data-menu-root="format"]').click();
    await page.locator('[data-menu-action="text.runaround"]').click();
    await expect(dialog).toBeVisible();
    await expect(clearance("Top")).toHaveValue("2.00mm");
    await expect(clearance("Left")).toHaveValue("2.50mm");
    await expect(clearance("Right")).toHaveValue("8.00mm");
    await expect(clearance("Bottom")).toHaveValue("3.00mm");
    await dialog.getByRole("button", { name: "Cancel" }).click();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("handles multi-selection mixed Run Around states, locked objects, and unsupported shapes via Property Toolbar", async ({ page }) => {
    test.setTimeout(120000);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !(msg.location()?.url ?? "").includes("/_vercel/")) consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await open(page);
    const seededFrames = [
      { id: "rect-on", kind: "picture-rect", page: 1, xMm: 54, yMm: 40, wMm: 32, hMm: 24, flip: false, text: "", runAround: true },
      { id: "rect-off", kind: "picture-rect", page: 1, xMm: 126, yMm: 40, wMm: 32, hMm: 24, flip: false, text: "", runAround: false },
      { id: "rect-locked", kind: "picture-rect", page: 1, xMm: 54, yMm: 86, wMm: 32, hMm: 24, flip: false, text: "", locked: true, runAround: false },
      { id: "pic-ellipse", kind: "picture-ellipse", page: 1, xMm: 126, yMm: 86, wMm: 32, hMm: 24, flip: false, text: "" },
      { id: "pic-rotated", kind: "picture-rect", page: 1, xMm: 88, yMm: 132, wMm: 32, hMm: 24, flip: false, text: "", angle1Deg: 15 },
    ];
    await page.evaluate((next) => {
      const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
      const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
      map[id] = next;
      localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
    }, seededFrames);
    await page.reload();
    await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
    await page.locator(".ProseMirror").click();
    await page.keyboard.insertText(`بِسم اللہ ${"سلام\u200cعلی ".repeat(320)}`);
    await expect(page.locator(".ProseMirror")).toContainText("بِسم", { timeout: 10000 });
    await expect.poll(() => measureFlow(page, "rect-on"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });
    await expect.poll(async () => (await measureFlow(page, "rect-off")).overlap).toBeGreaterThan(0);

    await page.locator('[data-studio-tool-button="select"]').click();
    const runAroundBtn = page.locator('[data-ribbon-field="run-around"]');
    const insetBtn = page.locator('[data-ribbon-field="inset"]');

    // Unsupported single selections cannot enable Run Around via toolbar, menu, or Modify Object dialog
    await page.locator('[data-studio-frame-id="pic-ellipse"]').click();
    await expect(runAroundBtn).toBeDisabled();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");
    await expect(insetBtn).toBeDisabled();
    await page.locator('[data-menu-root="format"]').click();
    await expect(page.locator('[data-menu-action="text.runaround"]')).toBeDisabled();
    await page.keyboard.press("Escape");

    const ellBox = await page.locator('[data-studio-frame-id="pic-ellipse"]').boundingBox();
    expect(ellBox).toBeTruthy();
    await page.mouse.click(ellBox!.x + 15, ellBox!.y + 15, { button: "right" });
    await page.locator('[data-picture-menu="object"], [data-object-menu="format"]').click();
    const modifyDialog = page.locator('[data-studio-format-object-dialog="true"]');
    await expect(modifyDialog).toBeVisible();
    await expect(modifyDialog.getByLabel("Run Around")).toBeDisabled();
    await expect(modifyDialog.getByLabel("Run Around")).not.toBeChecked();
    await modifyDialog.getByRole("button", { name: "Cancel" }).click();

    await page.locator('[data-studio-frame-id="pic-rotated"]').click();
    await expect(runAroundBtn).toBeDisabled();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");

    await page.locator('[data-studio-frame-id="rect-locked"]').click();
    await expect(runAroundBtn).toBeDisabled();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");

    // Mixed selection: two eligible rectangular boxes (true + false)
    await page.locator('[data-studio-frame-id="rect-on"]').click();
    await page.locator('[data-studio-frame-id="rect-off"]').click({ modifiers: ["Shift"] });
    await expect(runAroundBtn).toBeEnabled();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "mixed");
    await expect(runAroundBtn).toHaveAttribute("data-ribbon-mixed", "true");

    // Toggle mixed -> both On
    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "true");
    expect(await runAroundBtn.getAttribute("data-ribbon-mixed")).toBeNull();
    await expect.poll(async () => (await stored(page, "rect-off"))?.runAround).toBe(true);
    await expect.poll(() => measureFlow(page, "rect-on"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });
    await expect.poll(() => measureFlow(page, "rect-off"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });

    // Toggle On -> both Off
    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await stored(page, "rect-on"))?.runAround).toBe(false);
    expect((await stored(page, "rect-off"))?.runAround).toBe(false);
    await expect(page.locator("[data-run-around-gap]")).toHaveCount(0);

    // Undo twice restores both On then initial mixed state
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await stored(page, "rect-on"))?.runAround).toBe(true);
    expect((await stored(page, "rect-off"))?.runAround).toBe(true);
    await page.keyboard.press("Control+z");
    await expect.poll(async () => (await stored(page, "rect-off"))?.runAround).toBe(false);
    expect((await stored(page, "rect-on"))?.runAround).toBe(true);
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "mixed");

    // Mixed multi-selection including locked rect + unsupported ellipse: only unlocked rects change
    await page.locator('[data-studio-frame-id="rect-locked"]').click({ modifiers: ["Shift"] });
    await page.locator('[data-studio-frame-id="pic-ellipse"]').click({ modifiers: ["Shift"] });
    await expect(runAroundBtn).toBeEnabled();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "mixed");
    await expect(runAroundBtn).toHaveAttribute("data-ribbon-mixed", "true");

    await runAroundBtn.click();
    await expect.poll(async () => (await stored(page, "rect-off"))?.runAround).toBe(true);
    expect((await stored(page, "rect-on"))?.runAround).toBe(true);
    expect((await stored(page, "rect-locked"))?.runAround).toBe(false);
    expect((await stored(page, "pic-ellipse"))?.runAround).toBeUndefined();
    // rect-locked remains false in the selection, so ribbon stays mixed and offers turning unlocked rects off
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "mixed");
    await expect(runAroundBtn).toHaveAttribute("data-ribbon-mixed", "true");
    await expect(runAroundBtn).toHaveAttribute("title", /click to turn off/);
    await expect.poll(() => measureFlow(page, "rect-off"), { timeout: 15000 }).toEqual({ left: true, right: true, overlap: 0 });
    await expect.poll(async () => (await measureFlow(page, "rect-locked")).overlap).toBeGreaterThan(0);

    await runAroundBtn.click();
    await expect(runAroundBtn).toHaveAttribute("aria-pressed", "false");
    expect(await runAroundBtn.getAttribute("data-ribbon-mixed")).toBeNull();
    await expect.poll(async () => (await stored(page, "rect-on"))?.runAround).toBe(false);
    expect((await stored(page, "rect-off"))?.runAround).toBe(false);
    expect((await stored(page, "rect-locked"))?.runAround).toBe(false);
    expect((await stored(page, "pic-ellipse"))?.runAround).toBeUndefined();
    await expect(page.locator("[data-run-around-gap]")).toHaveCount(0);
    const snapshot = await allStored(page);
    expect(snapshot.find((f) => f.id === "pic-rotated")?.runAround).toBeUndefined();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
