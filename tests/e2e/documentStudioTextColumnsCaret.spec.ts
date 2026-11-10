import { expect, test, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";
import { renderPrintFrame } from "../../app/tools/document-studio/utils/printableFrames";

const object = (page: Page, id: string) => page.locator(`[data-studio-frame-id="${id}"]`);
const frameEditor = (page: Page, id: string) => object(page, id).locator("[data-studio-frame-editor]");
const story = (page: Page) => page.locator("[data-studio-selection-host] .ProseMirror:not([data-studio-frame-editor])");

type Box = { text: string; left: number; right: number; top: number; bottom: number };

async function openStudio(page: Page, flag: boolean) {
  await page.addInitScript((enabled) => {
    localStorage.setItem("qalam-site-language", "en");
    localStorage.setItem("qalam.keyboard.layout", "off");
    if (enabled) localStorage.setItem("qalam.textboxPm", "1");
    else localStorage.removeItem("qalam.textboxPm");
  }, flag);
  await page.goto(flag ? "/tools/document-studio?textboxPm=1" : "/tools/document-studio");
  await expect(story(page)).toBeEditable({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await story(page).click();
  await story(page).evaluate((el) => {
    (el as HTMLElement & { editor: Editor }).editor.commands.setContent('<p dir="rtl">مرکزی عبارت</p>');
  });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.save"]').click();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  const typography = { ...defaultDocumentSettings().typography, defaultRtlFontId: "mehr-nastaliq-web" };
  const body = Array.from({ length: 12 }, (_, index) => `لکیر ${index + 1}`).join("\n");
  const spill = Array.from({ length: 36 }, (_, index) => `اوور ${index + 1}`).join("\n");
  await page.evaluate(({ typography: type, body: text, spill: overflow }) => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1");
    if (!id) return;
    const key = "qalam-studio-frames-v1";
    const map = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, unknown>;
    map[id] = [
      { kind: "text", page: 1, xMm: 15, yMm: 22, wMm: 150, hMm: 58, flip: false, typography: type, id: "cols", text, columnCount: 2, columnGutterMm: 8 },
      { kind: "text", page: 1, xMm: 15, yMm: 88, wMm: 90, hMm: 20, flip: false, typography: type, id: "spill", text: overflow, columnCount: 2, columnGutterMm: 6 },
    ];
    localStorage.setItem(key, JSON.stringify(map));
  }, { typography, body, spill });
  await page.reload();
  await expect(object(page, "cols").locator("[data-studio-text-columns='2']").first()).toBeVisible();
  await page.locator('[data-studio-tool-button="text"]').click();
}

async function paragraphs(page: Page, id: string): Promise<Box[]> {
  return frameEditor(page, id).evaluate((el) => [...el.querySelectorAll("p")].map((node) => {
    const rect = node.getBoundingClientRect();
    return { text: node.textContent ?? "", left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
}

async function caretBox(page: Page, id: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const caret = object(page, id).locator("[data-studio-frame-caret]");
  const found: { box: { x: number; y: number; width: number; height: number } | null } = { box: null };
  await expect.poll(async () => {
    found.box = await caret.boundingBox();
    return found.box && found.box.width > 0 ? found.box.x : null;
  }).not.toBeNull();
  if (!found.box) throw new Error("column caret has no box");
  return found.box;
}

test.describe("multi-column caret", () => {
  test.setTimeout(60_000);

  for (const flag of [false, true]) {
    test(`typing and clicks stay in the column when the flag is ${flag ? "on" : "off"}`, async ({ page }) => {
      await openStudio(page, flag);
      const host = object(page, "cols");
      const bounds = await host.boundingBox();
      if (!bounds) throw new Error("column box has no bounds");
      await page.mouse.click(bounds.x + bounds.width - 12, bounds.y + 16);
      const editor = frameEditor(page, "cols");
      await expect(editor).toBeVisible();
      await expect(host.locator("textarea")).toHaveCount(0);
      await expect(editor).toHaveAttribute("data-studio-text-columns", "2");
      await expect(editor).toHaveAttribute("data-studio-column-direction", "rtl");
      await expect.poll(async () => editor.evaluate((el) => getComputedStyle(el).columnCount)).toBe("2");
      await expect.poll(async () => editor.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
      const boxes = await paragraphs(page, "cols");
      const mid = bounds.x + bounds.width / 2;
      const right = boxes.filter((box) => (box.left + box.right) / 2 >= mid && box.right - box.left > 8);
      const left = boxes.filter((box) => (box.left + box.right) / 2 < mid && box.right - box.left > 8);
      expect(right.length).toBeGreaterThan(1);
      expect(left.length).toBeGreaterThan(0);
      expect(right[0].text).toContain("لکیر 1");

      const rightLine = right[0];
      await page.mouse.click((rightLine.left + rightLine.right) / 2, (rightLine.top + rightLine.bottom) / 2);
      const rightCaret = await caretBox(page, "cols");
      expect(rightCaret.x + rightCaret.width / 2).toBeGreaterThan(mid);
      expect(rightCaret.y + rightCaret.height / 2).toBeGreaterThan(rightLine.top - 8);
      expect(rightCaret.y + rightCaret.height / 2).toBeLessThan(rightLine.bottom + 28);
      await page.keyboard.type("X");
      await expect.poll(async () => {
        const placed = await paragraphs(page, "cols");
        return placed.some((box) => box.text.includes("X") && (box.left + box.right) / 2 >= mid);
      }).toBe(true);
      const typedCaret = await caretBox(page, "cols");
      expect(typedCaret.x + typedCaret.width / 2).toBeGreaterThan(mid);

      const leftLine = (await paragraphs(page, "cols")).find((box) => (box.left + box.right) / 2 < mid && !box.text.includes("X"));
      if (!leftLine) throw new Error("left column has no line");
      await page.mouse.click((leftLine.left + leftLine.right) / 2, (leftLine.top + leftLine.bottom) / 2);
      await expect.poll(async () => {
        const leftCaret = await caretBox(page, "cols");
        return leftCaret.x + leftCaret.width / 2;
      }).toBeLessThan(mid);
      await page.keyboard.type("Z");
      await expect.poll(async () => paragraphs(page, "cols")).toEqual(expect.arrayContaining([
        expect.objectContaining({ text: expect.stringContaining("Z") }),
      ]));
      const leftTyped = (await paragraphs(page, "cols")).find((box) => box.text.includes("Z"));
      expect(leftTyped).toBeTruthy();
      expect((leftTyped!.left + leftTyped!.right) / 2).toBeLessThan(mid);

      const fresh = await paragraphs(page, "cols");
      const lastRight = [...fresh].reverse().find((box) => (box.left + box.right) / 2 >= mid);
      if (!lastRight) throw new Error("right column has no line");
      await page.mouse.click((lastRight.left + lastRight.right) / 2, (lastRight.top + lastRight.bottom) / 2);
      await page.keyboard.press("End");
      const atEnd = await caretBox(page, "cols");
      await page.keyboard.press("Home");
      await expect.poll(async () => (await caretBox(page, "cols")).x).toBeGreaterThan(atEnd.x + 2);
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.up("Shift");
      await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? "")).not.toBe("");
      await expect(host.locator("[data-studio-frame-caret]")).toHaveCount(0);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Control+ArrowDown");
      await expect.poll(async () => {
        const moved = await caretBox(page, "cols");
        return moved.x + moved.width / 2;
      }).toBeLessThan(mid + 4);

      await expect.poll(async () => editor.evaluate((el) => el.scrollTop)).toBe(0);
      await expect.poll(async () => editor.evaluate((el) => el.scrollLeft)).toBe(0);

      const spill = object(page, "spill");
      const spillBounds = await spill.boundingBox();
      if (!spillBounds) throw new Error("overflow box has no bounds");
      await page.mouse.click(spillBounds.x + spillBounds.width - 10, spillBounds.y + 12);
      const spillEditor = frameEditor(page, "spill");
      await expect(spillEditor).toBeVisible();
      await expect(spill.locator('[data-studio-frame-overflow="bottom"]')).toBeVisible();
      await expect.poll(async () => spillEditor.evaluate((el) => el.scrollTop)).toBe(0);
      await spillEditor.hover();
      await page.mouse.wheel(0, 200);
      await expect.poll(async () => spillEditor.evaluate((el) => el.scrollTop)).toBe(0);

      await page.locator('[data-menu-root="file"]').click();
      await page.locator('[data-menu-action="file.save"]').click();
      await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(frameEditor(page, "spill")).toHaveCount(0);
      await expect(spill.locator("[data-studio-text-columns='2']").first()).toBeVisible();
      await expect(host.locator("textarea")).toHaveValue(/X/);
      const saved = await page.evaluate(() => {
        const id = localStorage.getItem("qalam-document-studio-active-document-v1");
        const frames = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}")[id!] as Array<Record<string, unknown>>;
        return frames.find((frame) => frame.id === "cols");
      });
      expect(saved?.text).toEqual(expect.stringContaining("X"));
      expect(saved?.text).toEqual(expect.stringContaining("Z"));
      expect(renderPrintFrame(saved as Parameters<typeof renderPrintFrame>[0])).toContain('data-print-text-columns="2"');
    });
  }
});
