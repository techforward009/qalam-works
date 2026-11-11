import { expect, test, type Page } from "@playwright/test";

const story = `بِسم اللہ ${"سلام\u200cعلی ".repeat(220)}`;

const frames = [
  { id: "pic-left", kind: "picture-rect", page: 1, xMm: 58, yMm: 42, wMm: 34, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 4, runAroundTopMm: 0.5, runAroundBottomMm: 1 },
  { id: "pic-right", kind: "picture-rect", page: 1, xMm: 128, yMm: 42, wMm: 32, hMm: 26, flip: false, text: "", runAround: true, runAroundLeftMm: 3, runAroundRightMm: 1, runAroundTopMm: 2, runAroundBottomMm: 0.4 },
  { id: "text-left", kind: "text", page: 1, xMm: 58, yMm: 90, wMm: 34, hMm: 22, flip: false, text: "بائیں خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 2, runAroundTopMm: 1, runAroundBottomMm: 1 },
  { id: "text-right", kind: "text", page: 1, xMm: 126, yMm: 90, wMm: 34, hMm: 22, flip: false, text: "دائیں خانہ", runAround: true, runAroundLeftMm: 0.5, runAroundRightMm: 5, runAroundTopMm: 0.4, runAroundBottomMm: 2 },
];

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
}

async function seed(page: Page) {
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = next;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, frames);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await expect(page.locator('[data-studio-frame-id="pic-left"]')).toBeVisible();
  await page.locator(".ProseMirror").click();
  await page.keyboard.insertText(story);
  await expect(page.locator(".ProseMirror")).toContainText("بِسم", { timeout: 10000 });
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
}

async function stored(page: Page, id: string) {
  return page.evaluate(frameId => {
    const doc = localStorage.getItem("qalam-document-studio-active-document-v1");
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
    return doc ? (map[doc] || []).find(frame => frame.id === frameId) : undefined;
  }, id);
}

async function sides(page: Page, id: string) {
  return page.evaluate(frameId => {
    const frame = document.querySelector(`[data-studio-frame-id="${frameId}"]`)?.getBoundingClientRect();
    if (!frame) return { left: false, right: false };
    const root = document.querySelector(".ProseMirror");
    if (!root) return { left: false, right: false };
    let left = false;
    let right = false;
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
      }
    }
    return { left, right };
  }, id);
}

test("story text runs around image and text boxes on both sides", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await seed(page);
  const prose = await page.locator(".ProseMirror").innerText();
  expect(prose).toContain("بِسم");
  expect(prose).toContain("سلام\u200cعلی");

  for (const id of ["pic-left", "pic-right", "text-left", "text-right"]) {
    const flow = await sides(page, id);
    expect(flow, id).toEqual({ left: true, right: true });
  }

  const before = await stored(page, "pic-right");
  await page.locator('[data-studio-tool-button="select"]').click();
  const box = page.locator('[data-studio-frame-id="pic-right"]');
  const start = await box.boundingBox();
  expect(start).toBeTruthy();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(start!.x + start!.width / 2 + 36, start!.y + start!.height / 2 + 24, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number((await stored(page, "pic-right"))?.xMm)).toBeGreaterThan(Number(before?.xMm) + 2);
  await expect.poll(() => page.locator("[data-run-around-gap]").count()).toBeGreaterThan(0);
  expect(await sides(page, "pic-right")).toEqual({ left: true, right: true });

  const moved = await stored(page, "pic-right");
  const handle = page.locator('[data-studio-frame-id="pic-right"] [data-studio-frame-handle="se"]');
  const grip = await handle.boundingBox();
  expect(grip).toBeTruthy();
  await page.mouse.move(grip!.x + 2, grip!.y + 2);
  await page.mouse.down();
  await page.mouse.move(grip!.x + 28, grip!.y + 22, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number((await stored(page, "pic-right"))?.wMm)).toBeGreaterThan(Number(moved?.wMm) + 2);
  expect(await sides(page, "text-left")).toEqual({ left: true, right: true });

  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Control+z");
  await expect.poll(async () => Number((await stored(page, "pic-right"))?.wMm)).toBeCloseTo(Number(moved?.wMm), 1);
  await page.keyboard.press("Control+z");
  await expect.poll(async () => Number((await stored(page, "pic-right"))?.xMm)).toBeCloseTo(Number(before?.xMm), 1);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(async () => Number((await stored(page, "pic-right"))?.xMm)).toBeGreaterThan(Number(before?.xMm) + 2);

  await page.locator('[data-studio-frame-id="text-right"]').click({ button: "right" });
  await page.locator('[data-object-menu="format"]').click();
  const dialog = page.locator('[data-studio-format-object-dialog="true"]');
  await dialog.getByLabel("Run Around").uncheck();
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect.poll(async () => (await stored(page, "text-right"))?.runAround).toBe(false);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await stored(page, "text-right"))?.runAround).toBe(true);
  expect((await stored(page, "text-right"))?.runAroundRightMm).toBe(5);
  expect(await sides(page, "text-right")).toEqual({ left: true, right: true });

  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(async () => (await stored(page, "pic-left"))?.runAroundLeftMm).toBe(1);
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);

  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.pageless"]').click();
  await expect(page.locator("[data-studio-pageless]")).toBeVisible();
  await expect(page.locator("[data-studio-page-sheet]")).toHaveCount(0);
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
  expect(await sides(page, "pic-left")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-right")).toEqual({ left: true, right: true });

  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.pages"]').click();
  await expect(page.locator("[data-studio-page-sheet]").first()).toBeVisible();
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);

  await page.evaluate(() => { window.print = () => undefined; });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.print"]').click();
  const portal = page.locator("[data-studio-print-portal]");
  await expect(portal).toHaveAttribute("data-print-waited-fonts", "true");
  await expect.poll(() => portal.locator("[data-print-run-around]").count()).toBeGreaterThan(0);
  await expect(portal.locator("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]")).toHaveCount(0);
  await expect(portal.locator('[data-print-frame-id="pic-left"]')).toHaveCount(1);
  await expect(portal.locator('[data-print-frame-id="text-right"]')).toHaveCount(1);
  const printFlow = await portal.evaluate(root => {
    const frame = root.querySelector('[data-print-frame-id="pic-right"], [data-studio-frame-id="pic-right"]')?.getBoundingClientRect()
      ?? root.querySelector("[data-print-frame]")?.getBoundingClientRect();
    const spacers = [...root.querySelectorAll<HTMLElement>("[data-print-run-around='gap']")];
    return { frames: root.querySelectorAll("[data-print-frame]").length, gaps: spacers.length, frame: Boolean(frame) };
  });
  expect(printFlow.frames).toBe(4);
  expect(printFlow.gaps).toBeGreaterThan(0);
});
