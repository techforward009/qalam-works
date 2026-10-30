import { test, expect, type Page } from "@playwright/test";
import type { Editor } from "@tiptap/core";
type EditorElement = HTMLElement & { editor: Editor };

async function ready(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 15000 });
}
for (const mode of ["pages", "facing"] as const) {
  test(mode + ": Ctrl+Up/Down and Ctrl+Home/End navigate exact document text", async ({ page }) => {
    await ready(page);
    if (mode === "facing") {
      await page.locator('[data-menu-root="view"]').click();
      await page.locator('[data-menu-action="view.facing"]').click();
    }
    const story = page.locator(".ProseMirror");
    const start = await story.evaluate(element => {
      const editor = (element as EditorElement).editor;
      editor.commands.setContent({ type: "doc", content: [
        { type: "paragraph", content: [{ type: "text", text: "پہلا پیراگراف" }] },
        { type: "paragraph", content: [{ type: "text", text: "دوسرا پیراگراف" }] },
        { type: "paragraph", content: [{ type: "text", text: "تیسرا پیراگراف" }] },
      ] });
      const positions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.isTextblock) { positions.push(pos + 1); return false; }
      });
      editor.commands.focus("start");
      editor.commands.setTextSelection(positions[1] + 3);
      return { positions, end: editor.state.doc.content.size - 1 };
    });
    const pos = () => story.evaluate(element => (element as EditorElement).editor.state.selection.head);
    await page.keyboard.press("Control+ArrowUp");
    await expect.poll(pos).toBe(start.positions[1]);
    await page.keyboard.press("Control+ArrowUp");
    await expect.poll(pos).toBe(start.positions[0]);
    await page.keyboard.press("Control+ArrowDown");
    await expect.poll(pos).toBe(start.positions[1]);
    await page.keyboard.press("Control+End");
    await expect.poll(pos).toBe(start.end);
    await page.keyboard.press("Control+Home");
    await expect.poll(pos).toBe(start.positions[0]);
  });
}
test("centered RTL line highlights only selected ink width, not blank margin", async ({ page }) => {
  await ready(page);
  const story = page.locator(".ProseMirror");
  await story.evaluate(element => {
    const editor = (element as EditorElement).editor;
    editor.commands.setContent({ type: "doc", content: [
      { type: "paragraph", attrs: { textAlign: "center" }, content: [
        { type: "text", text: "متن خطبہ جمعہ مبارک" },
      ] },
    ] });
    editor.commands.focus("start");
    editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
  });
  await expect(page.locator("[data-studio-line-selection]").first()).toBeVisible();
  const geometry = await page.evaluate(() => {
    const p = document.querySelector(".ProseMirror p")!;
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const ink: DOMRect[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node as Text).data.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      ink.push(...range.getClientRects());
    }
    const r = document.querySelector("[data-studio-line-selection]")!.getBoundingClientRect();
    return {
      selectionLeft: r.left, selectionRight: r.right,
      inkLeft: Math.min(...ink.map(b => b.left)),
      inkRight: Math.max(...ink.map(b => b.right)),
      pageWidth: p.getBoundingClientRect().width,
      alignment: getComputedStyle(p).textAlign,
    };
  });
  expect(geometry.alignment).toBe("center");
  expect(geometry.selectionRight - geometry.inkRight).toBeLessThan(5);
  expect(geometry.inkLeft - geometry.selectionLeft).toBeLessThan(5);
  expect(geometry.selectionRight - geometry.selectionLeft).toBeLessThan(geometry.pageWidth * 0.8);
});
