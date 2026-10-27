import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { buildPdfHtml } from "../../app/tools/document-studio/utils/buildPdfHtml";
import { defaultDocumentSettings } from "../../app/tools/document-studio/utils/documentSettings";

mkdirSync("/workspace/screenshots", { recursive: true });

type Box = { text: string; left: number; right: number; top: number; bottom: number; width: number; natural: number; layout: number };
type Layout = { frame: { left: number; right: number }; words: Box[]; urdu: Box[]; scaleX: boolean };

async function openStudio(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await page.locator('[data-studio-tool-button="text"]').click();
}

async function setDoc(page: Page, text: string, dir: "rtl" | "ltr") {
  await page.locator(".ProseMirror").evaluate((element, payload) => {
    const editor = (element as HTMLElement & { editor: { commands: { setContent: (doc: unknown) => boolean; focus: () => boolean; selectAll: () => boolean } } }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: payload.dir }, content: [{ type: "text", text: payload.text }] }],
    });
    editor.commands.selectAll();
  }, { text, dir });
  await page.getByRole("button", { name: dir === "ltr" ? "Left to right" : "Right to left" }).click();
  await expect(page.locator(".ProseMirror p").first()).toHaveAttribute("dir", dir);
}

async function clearSelection(page: Page) {
  await page.locator(".ProseMirror").evaluate((element) => {
    const editor = (element as HTMLElement & { editor: { state: { selection: { to: number } }; commands: { setTextSelection: (pos: number) => boolean } } }).editor;
    editor.commands.setTextSelection(editor.state.selection.to);
  });
}

async function scaleSelection(page: Page, percent: number) {
  await page.locator(".ProseMirror").evaluate((element) => {
    (element as HTMLElement & { editor: { commands: { selectAll: () => boolean } } }).editor.commands.selectAll();
  });
  const field = page.locator("[data-studio-scale]");
  await field.click();
  await field.fill(String(percent));
  await field.press("Enter");
}

async function readLayout(page: Page): Promise<Layout> {
  return page.locator(".ProseMirror").evaluate(() => {
    const root = document.querySelector(".ProseMirror") as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const style = getComputedStyle(root);
    const zoom = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
    const frame = {
      left: rootRect.left + parseFloat(style.paddingLeft) * zoom,
      right: rootRect.right - parseFloat(style.paddingRight) * zoom,
    };
    const words = [...root.querySelectorAll<HTMLElement>("[data-studio-latin-scale]")]
      .filter((el) => el.style.display === "inline-block")
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const margin = parseFloat(el.style.marginInlineEnd) || 0;
        return {
          text: el.textContent ?? "",
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          natural: el.offsetWidth * zoom,
          layout: (el.offsetWidth + margin) * zoom,
        };
      });
    const urdu: Layout["urdu"] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? "";
      if (/\p{Script_Extensions=Arabic}/u.test(text)) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0.5 && rect.height > 0.5) {
          urdu.push({ text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, natural: 0, layout: 0 });
        }
      }
      node = walker.nextNode();
    }
    return { frame, words, urdu, scaleX: !!root.querySelector("[style*='scaleX']") };
  });
}

function overlaps(a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) {
  return a.left < b.right - 0.75 && a.right > b.left + 0.75 && a.top < b.bottom - 0.75 && a.bottom > b.top + 0.75;
}

async function plainWidth(page: Page, word: string) {
  return page.locator(".ProseMirror").evaluate((root, needle) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? "";
      const index = text.indexOf(needle);
      if (index >= 0 && !/\p{Script_Extensions=Arabic}/u.test(text)) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + needle.length);
        return range.getBoundingClientRect().width;
      }
      node = walker.nextNode();
    }
    return 0;
  }, word);
}

test("scaled Latin glyphs match their layout width in the editor and PDF", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "both viewports are covered in this test");
  test.setTimeout(180_000);
  const sample = "سلام Hello Qalam 2026";
  for (const viewport of [{ width: 1280, height: 800 }, { width: 393, height: 851 }]) {
    await page.setViewportSize(viewport);
    await openStudio(page);
    for (const dir of ["rtl", "ltr"] as const) {
      await setDoc(page, sample, dir);
      await expect.poll(() => plainWidth(page, "Hello")).toBeGreaterThan(8);
      const base = await plainWidth(page, "Hello");
      for (const percent of [400, 200, 100, 50, 25]) {
        await scaleSelection(page, percent);
        const factor = percent / 100;
        await expect.poll(async () => {
          if (percent === 100) {
            const width = await plainWidth(page, "Hello");
            const layout = await readLayout(page);
            return !layout.scaleX && width > 0 && Math.abs(width - base) <= Math.max(2, base * 0.05);
          }
          const layout = await readLayout(page);
          const hello = layout.words.find((word) => word.text === "Hello");
          if (!hello || hello.natural < 1) return false;
          const ratio = hello.width / hello.natural;
          return Math.abs(ratio - factor) / factor <= 0.05 && Math.abs(hello.width - hello.layout) <= Math.max(2, hello.width * 0.05);
        }, { timeout: 8_000 }).toBe(true);
        const layout = await readLayout(page);
        if (percent === 100) {
          expect(layout.scaleX, `${dir} ${viewport.width} 100%`).toBe(false);
          continue;
        }
        const hello = layout.words.find((word) => word.text === "Hello");
        expect(hello, "Hello").toBeTruthy();
        expect(Math.abs(hello!.width / base - factor) / factor, `${dir} ${viewport.width} ${percent}% vs 100%`).toBeLessThanOrEqual(0.05);
        for (const word of layout.words) {
          expect(word.left, word.text).toBeGreaterThanOrEqual(layout.frame.left - 2);
          expect(word.right, word.text).toBeLessThanOrEqual(layout.frame.right + 2);
          expect(Math.abs(word.width / word.natural - factor) / factor, word.text).toBeLessThanOrEqual(0.05);
          for (const urdu of layout.urdu) expect(overlaps(word, urdu), `${word.text} x ${urdu.text}`).toBe(false);
        }
        const line = layout.words.filter((word) => Math.abs(word.top - hello!.top) < 4).sort((a, b) => a.left - b.left);
        for (let i = 1; i < line.length; i += 1) expect(line[i - 1].right).toBeLessThanOrEqual(line[i].left + 1);
        const qalam = line.find((word) => word.text === "Qalam");
        if (qalam) expect(hello!.left).toBeLessThan(qalam.left);
        if (dir === "rtl" && (percent === 25 || percent === 100)) {
          const boxes = [...layout.words, ...layout.urdu];
          const contentLeft = Math.min(...boxes.map((box) => box.left));
          const contentRight = Math.max(...boxes.map((box) => box.right));
          expect(layout.frame.right - contentRight, `${dir} ${viewport.width} ${percent}% sits on the right`).toBeLessThan(contentLeft - layout.frame.left + 8);
        }
        if (viewport.width === 1280 && dir === "rtl" && (percent === 400 || percent === 25)) {
          await clearSelection(page);
          await page.locator(".ProseMirror").screenshot({ path: `/workspace/screenshots/scale-rtl-${percent}-editor.png` });
        }
      }
      if (viewport.width === 1280 && dir === "rtl") {
        await scaleSelection(page, 400);
        await expect.poll(async () => (await readLayout(page)).words.some((word) => word.text === "Hello")).toBe(true);
        await page.keyboard.press("F8");
        await expect.poll(async () => {
          const hello = (await readLayout(page)).words.find((word) => word.text === "Hello");
          return !!hello && Math.abs(hello.width / hello.natural - 4) / 4 <= 0.05;
        }).toBe(true);
        await page.keyboard.press("F7");
        const hello = (await readLayout(page)).words.find((word) => word.text === "Hello")!;
        await page.mouse.click(hello.left + hello.width * 0.85, (hello.top + hello.bottom) / 2);
        const late = await page.locator(".ProseMirror").evaluate(() => {
          const editor = (document.querySelector(".ProseMirror") as HTMLElement & { editor: { state: { doc: { descendants: (fn: (node: { isText: boolean; text?: string }, pos: number) => void) => void }; selection: { from: number } } } }).editor;
          let start = -1;
          editor.state.doc.descendants((node, pos) => {
            if (start >= 0 || !node.isText || !node.text) return;
            const index = node.text.indexOf("Hello");
            if (index >= 0) start = pos + index;
          });
          return editor.state.selection.from - start;
        });
        expect(late, "caret near the end of Hello").toBeGreaterThanOrEqual(3);
        expect(late).toBeLessThanOrEqual(5);
        await page.mouse.click(hello.left + hello.width * 0.2, (hello.top + hello.bottom) / 2);
        const early = await page.locator(".ProseMirror").evaluate(() => {
          const editor = (document.querySelector(".ProseMirror") as HTMLElement & { editor: { state: { doc: { descendants: (fn: (node: { isText: boolean; text?: string }, pos: number) => void) => void }; selection: { from: number } } } }).editor;
          let start = -1;
          editor.state.doc.descendants((node, pos) => {
            if (start >= 0 || !node.isText || !node.text) return;
            const index = node.text.indexOf("Hello");
            if (index >= 0) start = pos + index;
          });
          return editor.state.selection.from - start;
        });
        expect(early, "caret near the start of Hello").toBeGreaterThanOrEqual(0);
        expect(early).toBeLessThanOrEqual(2);
      }
    }
    const long = `سلام ${"The quick brown fox jumps over the lazy dog and keeps running. ".repeat(6)}`;
    await setDoc(page, long, "rtl");
    await scaleSelection(page, 50);
    await expect.poll(async () => {
      const layout = await readLayout(page);
      const word = layout.words.find((item) => item.text === "quick");
      return !!word && Math.abs(word.width / word.natural - 0.5) / 0.5 <= 0.05;
    }, { timeout: 8_000 }).toBe(true);
    const wrapped = await readLayout(page);
    const tops = new Set(wrapped.words.map((word) => Math.round(word.top)));
    expect(tops.size, `wrapped lines at ${viewport.width}`).toBeGreaterThan(1);
    for (const word of wrapped.words) {
      expect(word.right, word.text).toBeLessThanOrEqual(wrapped.frame.right + 2);
      expect(word.left, word.text).toBeGreaterThanOrEqual(wrapped.frame.left - 2);
      for (const urdu of wrapped.urdu) expect(overlaps(word, urdu)).toBe(false);
    }
    if (viewport.width === 1280) {
      await clearSelection(page);
      await page.locator(".ProseMirror").screenshot({ path: "/workspace/screenshots/scale-rtl-50-long-editor.png" });
    }
  }
});

test("PDF HTML scales glyphs inside a 794px page", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "PDF HTML is measured once");
  test.setTimeout(60_000);
  const typography = defaultDocumentSettings().typography;
  const cases = [
    { scale: 400, text: "Hello Qalam 2026", shot: "/workspace/screenshots/scale-rtl-400-pdf.png" },
    { scale: 25, text: "Hello Qalam 2026", shot: "/workspace/screenshots/scale-rtl-25-pdf.png" },
    { scale: 50, text: `${"The quick brown fox jumps over the lazy dog and keeps running. ".repeat(6)}`, shot: "/workspace/screenshots/scale-rtl-50-long-pdf.png" },
    { scale: 100, text: "Hello Qalam 2026", shot: "" },
    { scale: 200, text: "Hello Qalam", shot: "" },
  ];
  for (const item of cases) {
    const doc = {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { dir: "rtl" },
        content: [
          { type: "text", text: "سلام " },
          { type: "text", text: item.text, marks: [{ type: "textStyle", attrs: { scalePercent: item.scale, fontFamily: "Arial" } }] },
        ],
      }],
    };
    const html = buildPdfHtml(doc, "rtl", { faces: [] }, typography).html
      .replace("</head>", "<style>html,body{width:794px!important;max-width:794px!important;overflow:visible!important}</style></head>");
    expect(html).not.toContain("margin-inline-end");
    await page.setViewportSize({ width: 794, height: 900 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready);
    const measured = await page.evaluate((factor) => {
      const words = [...document.querySelectorAll<HTMLElement>("[data-pdf-scale]")]
        .filter((el) => getComputedStyle(el).display === "inline-block")
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const margin = parseFloat(el.style.marginInlineEnd) || 0;
          return { text: el.textContent ?? "", left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, natural: el.offsetWidth, layout: el.offsetWidth + margin };
        });
      const urdu = [...document.querySelectorAll<HTMLElement>("[data-pdf-urdu], span")].flatMap((el) => {
        const text = el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE ? el.textContent ?? "" : "";
        if (!/\p{Script_Extensions=Arabic}/u.test(text) || el.querySelector("*")) return [];
        const rect = el.getBoundingClientRect();
        return [{ text, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }];
      });
      const bodyWidth = document.body.getBoundingClientRect().width;
      return { words, urdu, bodyWidth, scaleX: !!document.querySelector("[style*='scaleX']") };
    }, item.scale / 100);
    if (item.shot) await page.screenshot({ path: item.shot, fullPage: true });
    expect(measured.bodyWidth).toBeLessThanOrEqual(796);
    if (item.scale === 100) {
      expect(measured.scaleX).toBe(false);
      continue;
    }
    const factor = item.scale / 100;
    expect(measured.words.length).toBeGreaterThan(0);
    for (const word of measured.words) {
      expect(word.left, word.text).toBeGreaterThanOrEqual(-1);
      expect(word.right, word.text).toBeLessThanOrEqual(795);
      expect(Math.abs(word.width / word.natural - factor) / factor, word.text).toBeLessThanOrEqual(0.05);
      expect(Math.abs(word.width - word.layout), word.text).toBeLessThanOrEqual(Math.max(2, word.width * 0.05));
      for (const urdu of measured.urdu) {
        const hit = word.left < urdu.right - 0.75 && word.right > urdu.left + 0.75 && word.top < urdu.bottom - 0.75 && word.bottom > urdu.top + 0.75;
        expect(hit, `${word.text} x ${urdu.text}`).toBe(false);
      }
    }
    const hello = measured.words.find((word) => word.text === "Hello");
    const qalam = measured.words.find((word) => word.text === "Qalam");
    if (hello && qalam && Math.abs(hello.top - qalam.top) < 4) expect(hello.left).toBeLessThan(qalam.left);
  }
});
