import { expect, test, type Page } from "@playwright/test";

// One pasted run of this phrase fits on page 1 (220 repeats measured 365px
// against a 1026px content height). Full lines in successive paragraphs keep
// flowing, with no page break, until the story is beside the page-2 boxes.
const line = `سلام\u200cعلی `.repeat(36);

const frames = [
  { id: "pic-page2", kind: "picture-rect", page: 2, xMm: 58, yMm: 32, wMm: 34, hMm: 30, flip: false, text: "", runAround: true, runAroundLeftMm: 1, runAroundRightMm: 4, runAroundTopMm: 0.5, runAroundBottomMm: 1 },
  { id: "text-page2", kind: "text", page: 2, xMm: 126, yMm: 32, wMm: 34, hMm: 28, flip: false, text: "دوسرا خانہ", runAround: true, runAroundLeftMm: 2, runAroundRightMm: 3, runAroundTopMm: 0.4, runAroundBottomMm: 1.2 },
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
  await expect(page.locator('[data-studio-frame-id="pic-page2"]')).toBeVisible();
  // Story edits are ignored until the story itself owns the caret.
  await page.locator(".ProseMirror").click();
  await page.locator(".ProseMirror").evaluate((root, text) => {
    const editor = (root as HTMLElement & { editor: { commands: { setContent: (doc: unknown) => void; focus: (at: string) => void } } }).editor;
    editor.commands.setContent({
      type: "doc",
      content: Array.from({ length: 36 }, (_, index) => ({
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [{ type: "text", text: index === 0 ? `بِسم اللہ ${text}` : `${text} ${index + 1}` }],
      })),
    });
    editor.commands.focus("start");
  }, line);
  await expect(page.locator(".ProseMirror")).toContainText("بِسم");
  await expect(page.locator("[data-document-page-break]")).toHaveCount(0);
  await expect.poll(() => page.locator("[data-studio-page-paper]").count(), { timeout: 20000 }).toBeGreaterThan(1);
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 20000 }).toBeGreaterThan(0);
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

test("a continuous story runs around page-2 boxes, and clearances undo", async ({ page }) => {
  test.setTimeout(180000);
  await open(page);
  await seed(page);
  const continued = await page.evaluate(() => {
    const paper = document.querySelector('[data-studio-page-paper="1"]')?.getBoundingClientRect();
    const first = document.querySelector(".ProseMirror p")?.getBoundingClientRect();
    return Boolean(paper && first && first.top < paper.bottom - 1 && first.bottom > paper.top + 1);
  });
  expect(continued).toBe(true);
  await page.locator('[data-studio-frame-id="pic-page2"]').scrollIntoViewIfNeeded();
  for (const id of ["pic-page2", "text-page2"]) {
    expect(await sides(page, id), id).toEqual({ left: true, right: true });
  }

  const before = await stored(page, "pic-page2");
  await page.locator('[data-studio-tool-button="select"]').click();
  const box = page.locator('[data-studio-frame-id="pic-page2"]');
  await box.evaluate(el => el.scrollIntoView({ block: "center", inline: "nearest" }));
  const start = await box.boundingBox();
  expect(start).toBeTruthy();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(start!.x + start!.width / 2 + 36, start!.y + start!.height / 2 + 20, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number((await stored(page, "pic-page2"))?.xMm)).toBeGreaterThan(Number(before?.xMm) + 1);
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });

  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.pageless"]').click();
  await expect(page.locator("[data-studio-pageless]")).toBeVisible();
  await expect(page.locator("[data-studio-page-sheet]")).toHaveCount(0);
  await page.locator('[data-studio-frame-id="text-page2"]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
  expect(await sides(page, "pic-page2")).toEqual({ left: true, right: true });
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });

  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.pages"]').click();
  await expect(page.locator("[data-studio-page-paper]").nth(1)).toBeVisible();
  await page.locator('[data-studio-frame-id="text-page2"]').scrollIntoViewIfNeeded();
  await page.locator('[data-studio-frame-id="text-page2"]').click();
  await page.locator('[data-menu-root="format"]').click();
  await page.locator('[data-menu-action="text.runaround"]').click();
  const dialog = page.getByRole("dialog", { name: "Runaround" });
  const clearance = (name: string) => dialog.getByRole("spinbutton", { name, exact: true });
  await expect(clearance("Left")).toHaveValue("2.00mm");
  await clearance("Right").fill("6mm");
  await clearance("Top").fill("1.5mm");
  await clearance("Bottom").fill("2mm");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await stored(page, "text-page2"))?.runAroundRightMm).toBe(6);
  expect((await stored(page, "text-page2"))?.runAroundLeftMm).toBe(2);
  expect((await stored(page, "text-page2"))?.runAroundTopMm).toBe(1.5);
  expect((await stored(page, "text-page2"))?.runAroundBottomMm).toBe(2);
  expect((await stored(page, "text-page2"))?.runAround).toBe(true);
  expect(await sides(page, "text-page2")).toEqual({ left: true, right: true });

  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await stored(page, "text-page2"))?.runAroundRightMm).toBe(3);
  expect((await stored(page, "text-page2"))?.runAroundTopMm).toBe(0.4);
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(async () => (await stored(page, "text-page2"))?.runAroundRightMm).toBe(6);

  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(async () => (await stored(page, "text-page2"))?.runAroundBottomMm).toBe(2);
  await expect.poll(async () => (await stored(page, "pic-page2"))?.page).toBe(2);

  await page.evaluate(() => { window.print = () => undefined; });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.print"]').click();
  const portal = page.locator("[data-studio-print-portal]");
  await expect(portal).toHaveAttribute("data-print-waited-fonts", "true");
  await expect(portal.locator('[data-print-frame-id="pic-page2"]')).toHaveCount(1);
  await expect(portal.locator('[data-print-frame-id="text-page2"]')).toHaveCount(1);
  await expect.poll(() => portal.locator("[data-print-run-around]").count()).toBeGreaterThan(0);
  await expect(portal.locator("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]")).toHaveCount(0);
});
