import { expect, test } from "@playwright/test";
import type { Editor } from "@tiptap/core";
import sharp from "sharp";

type EditorElement = HTMLElement & { editor: Editor };

// Compare painted glyphs, not just the selection/line DOM rectangles. Wrapped
// paragraphs also catch a band hiding ascenders or descenders on adjacent lines.
for (const [font, dir, text] of [
  ["Mehr Nastaliq Web", "rtl", "پہلا حصہ درمیانی آخری حصہ اردو عبارت السلام علیکم "],
  ["Digital Khatt Indo-Pak", "rtl", "قُلِ اللّٰهُمَّ مَالِكَ الْمُلْكِ لَا إِلٰهَ إِلَّا اللّٰهُ "],
  ["Arial", "ltr", "The first words and the middle words remain fully visible. "],
]) {
  test(`${font}: selection preserves glyph ink with and without effects`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
    await page.goto("/tools/document-studio");
    const editor = page.locator(".ProseMirror");
    await expect(editor).toBeEditable();
    await page.addStyleTag({ content: "[data-studio-caret]{visibility:hidden!important}" });

    for (const effect of [null, "box", "overline", "pattern", "reverse"]) {
      await editor.evaluate((node, data) => {
        const e = (node as EditorElement).editor;
        e.commands.setContent({ type: "doc", content: [{
          type: "paragraph", attrs: { dir: data.dir }, content: [{
            type: "text", text: data.text, marks: [{ type: "textStyle", attrs: {
              fontFamily: data.font, fontSize: "24pt", textEffect: data.effect,
            } }],
          }],
        }] });
        e.commands.focus("start");
      }, { font, dir, text: text.repeat(3), effect });
      await page.evaluate(() => document.fonts.ready);
      await expect(editor).toHaveAttribute("data-studio-effects-painted", "true");
      // Let font loading, first-line paint and the effect layer settle.
      await page.waitForTimeout(150);
      const rect = (await editor.locator("p").boundingBox())!;
      const clip = {
        x: Math.floor(rect.x), y: Math.floor(rect.y),
        width: Math.ceil(rect.width), height: Math.ceil(rect.height + 20),
      };
      const before = await page.screenshot({ clip, scale: "css" });
      // Isolate the glyph mask from effect borders and backgrounds. This also
      // identifies white ink on reverse text without counting white whitespace.
      const hideInk = await page.addStyleTag({ content:
        ".qalam-editor-content .ProseMirror, .qalam-editor-content .ProseMirror * {-webkit-text-fill-color:transparent!important;text-shadow:none!important}",
      });
      const blank = await sharp(await page.screenshot({ clip, scale: "css" })).removeAlpha().raw().toBuffer();
      await hideInk.evaluate(node => node.parentNode?.removeChild(node));
      const original = await sharp(before).removeAlpha().raw().toBuffer({ resolveWithObject: true });

      for (const method of ["word", "line", "paragraph"]) {
        if (method === "paragraph") {
          await page.keyboard.press("Control+A");
        } else {
          const points = await editor.locator("p").evaluate(node => {
            const text = document.createTreeWalker(node, NodeFilter.SHOW_TEXT).nextNode() as Text;
            const rects = Array.from(text.data, (_, i) => {
              const range = document.createRange();
              range.setStart(text, i); range.setEnd(text, i + 1);
              return range.getBoundingClientRect();
            });
            const first = rects[0];
            const line = rects.filter(r => Math.abs(r.top - first.top) < 1 && r.width > 0);
            const last = line[line.length - 1];
            const rtl = getComputedStyle(node).direction === "rtl";
            return {
              start: { x: rtl ? first.right - .5 : first.left + .5, y: first.top + first.height / 2 },
              end: { x: rtl ? last.left + .5 : last.right - .5, y: last.top + last.height / 2 },
              word: { x: line[Math.min(8, line.length - 1)].left + 1, y: first.top + first.height / 2 },
            };
          });
          if (method === "word") {
            await page.mouse.dblclick(points.word.x, points.word.y);
          } else {
            await page.mouse.move(points.start.x, points.start.y);
            await page.mouse.down();
            await page.mouse.move(points.end.x, points.end.y, { steps: 12 });
            await page.mouse.up();
          }
        }
        await expect(page.locator("[data-studio-line-selection]").first()).toBeVisible();
        const selected = await sharp(await page.screenshot({ clip, scale: "css" })).removeAlpha().raw().toBuffer();
        let ink = 0, retained = 0;
        for (let i = 0; i < original.data.length; i += original.info.channels) {
          const foreground = Math.abs(original.data[i] - blank[i]) > 150 &&
            (effect === "reverse" ? original.data[i] > 230 : original.data[i] < 70);
          if (!foreground) continue;
          ink++;
          const visible = effect === "reverse"
            ? selected[i] > 200 && selected[i + 1] > 200 && selected[i + 2] > 200
            : selected[i] < 100 && selected[i + 1] < 100 && selected[i + 2] < 100;
          if (visible) retained++;
        }
        expect(ink).toBeGreaterThan(100);
        expect(retained / ink, `${font} ${effect ?? "plain"} ${method} glyph pixels retained`).toBeGreaterThan(.97);
        await editor.evaluate(node => (node as EditorElement).editor.commands.setTextSelection(1));
        await expect(page.locator("[data-studio-line-selection]")).toHaveCount(0);
        expect(await page.screenshot({ clip, scale: "css" }), "clearing selection preserves effect appearance").toEqual(before);
      }
    }
  });
}
