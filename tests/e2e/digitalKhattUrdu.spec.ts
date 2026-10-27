import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import type { Editor } from "@tiptap/core";
import { arabicAyat, urduAyat, arabicWords, urduWords } from "../fixtures/digitalKhatt/aalImran";

const evidence = process.env.QALAM_FONT_EVIDENCE_DIR ?? join(tmpdir(), "qalam-digital-khatt-evidence");
async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1"))).not.toBeNull();
  await expect(page.locator(".ProseMirror")).toBeEditable();
  await page.locator(".ProseMirror").evaluate(element => element.setAttribute("spellcheck", "false"));
}
async function setDigital(page: Page, texts: string[]) {
  await page.locator(".ProseMirror").evaluate((element, values) => {
    const editor = (element as HTMLElement & { editor: Editor }).editor;
    editor.commands.setContent({ type: "doc", content: values.map(text => ({
      type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text,
        marks: [{ type: "textStyle", attrs: { fontFamily: "Digital Khatt Indo-Pak", fontSize: "24pt" } }] }],
    })) });
    editor.commands.setTextSelection(1);
    editor.commands.scrollIntoView();
    editor.commands.blur();
  }, texts);
  await page.evaluate(async () => {
    await document.fonts.load('24pt "Digital Khatt Indo-Pak"');
    await document.fonts.ready;
  });
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready");
  await expect(page.locator(".ProseMirror")).toHaveText(texts.join(""));
}
async function editorPixels(page: Page, path?: string) {
  await page.evaluate(() => {
    document.getSelection()?.removeAllRanges();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const box = await page.locator(".ProseMirror").boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("Missing editor viewport");
  const x = Math.max(0, box.x), y = Math.max(0, box.y);
  // Capture the visible editor without element.screenshot scrolling/resizing
  // a transformed mobile page and triggering an unrelated layout pass.
  const png = await page.screenshot({ path, animations: "disabled", clip: {
    x, y, width: Math.min(box.width, viewport.width - x),
    height: Math.min(box.height, 500, viewport.height - y),
  } });
  // Compare monochrome glyph ink, not transient native blue editing handles or
  // subpixel colour fringes. Retain the original colour PNG as review evidence.
  return sharp(png).greyscale().threshold(96).png().toBuffer();
}
async function layoutState(page: Page) {
  return page.locator(".ProseMirror").evaluate(element => {
    const editor = (element as HTMLElement & { editor: Editor }).editor;
    const plugin = editor.state.plugins.find(p => (p as unknown as { key: string }).key.startsWith("qalam-first-line"));
    return {
      fonts: Array.from(document.fonts).map(f => ({ family: f.family, status: f.status })),
      runs: (plugin?.getState(editor.state) as { runs?: unknown[] })?.runs,
      paragraphs: Array.from(element.querySelectorAll("p")).map(p => ({
        text: p.textContent, y: p.getBoundingClientRect().y, height: p.getBoundingClientRect().height,
        lineHeight: getComputedStyle(p).lineHeight,
        spans: Array.from(p.querySelectorAll("[data-studio-line-run]")).map(e => ({ text: e.textContent, style: e.getAttribute("style") })),
      })),
    };
  });
}
async function fonts(page: Page) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable"); await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: ".ProseMirror p, .ProseMirror p *" });
    const used = [];
    for (const nodeId of nodeIds) {
      const result = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      used.push(...result.fonts.filter(face => face.glyphCount > 0));
    }
    expect(used.length).toBeGreaterThan(0);
    expect(used.every(face => /DigitalKhattIndoPakQalam/i.test(face.postScriptName))).toBe(true);
    return used;
  } finally { await session.detach(); }
}

test("Digital Khatt Urdu Quran uses one font and matches Arabic pixels", async ({ page }, testInfo) => {
  const reviewDir = join(evidence, testInfo.project.name, String(testInfo.repeatEachIndex));
  mkdirSync(reviewDir, { recursive: true });
  let releaseFont!: () => void;
  let requested!: () => void;
  const requestSeen = new Promise<void>(resolve => { requested = resolve; });
  const release = new Promise<void>(resolve => { releaseFont = resolve; });
  await page.route("**/fonts/DigitalKhattIndoPakQalam.woff2", async route => {
    requested(); await release; await route.continue();
  });
  await open(page);
  await page.addStyleTag({ content: "[data-studio-caret],[data-studio-line-selection]{visibility:hidden!important}.ProseMirror{caret-color:transparent!important}.ProseMirror ::selection{background:transparent!important}" });
  const editor = page.locator(".ProseMirror");
  // Force a genuine cold-font first set, then release the font via its event.
  const firstSet = setDigital(page, urduAyat);
  await requestSeen;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  releaseFont();
  await firstSet;
  const clearLines = await editor.evaluate(element => {
    const p = element.querySelector("p")!;
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    const lines: { top: number; bottom: number }[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (let i = 0; i < (node.textContent ?? "").length; i++) {
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
        const rect = range.getBoundingClientRect();
        const line = lines.find(line => Math.abs(line.top - rect.top) < 0.5);
        if (line) line.bottom = Math.max(line.bottom, rect.bottom);
        else lines.push({ top: rect.top, bottom: rect.bottom });
      }
    }
    lines.sort((a, b) => a.top - b.top);
    return lines.length >= 2 && lines.slice(1).every((line, index) => line.top >= lines[index].bottom - 0.5);
  });
  expect(clearLines).toBe(true);
  const firstRender = await editorPixels(page, join(reviewDir, "first-render.png"));
  writeFileSync(join(reviewDir, "first-layout.json"), JSON.stringify(await layoutState(page), null, 2));
  await setDigital(page, urduAyat);
  const secondRender = await editorPixels(page, join(reviewDir, "second-render.png"));
  writeFileSync(join(reviewDir, "second-layout.json"), JSON.stringify(await layoutState(page), null, 2));
  expect(firstRender.equals(secondRender)).toBe(true);
  const before = await page.addStyleTag({ content: '@font-face{font-family:"DigitalKhattBefore";src:url("/fonts/DigitalKhattIndoPakRegular.woff2")} .ProseMirror,.ProseMirror *{font-family:"DigitalKhattBefore","Noto Naskh Arabic",serif!important}' });
  await page.evaluate(async () => { await document.fonts.load('24pt "DigitalKhattBefore"'); await document.fonts.ready; });
  const beforePixels = await editorPixels(page, join(reviewDir, "aal-imran-before.png"));
  await before.evaluate(element => element.parentNode?.removeChild(element));
  await setDigital(page, urduAyat);
  const used = await fonts(page);
  const after = await editorPixels(page, join(reviewDir, "aal-imran-after.png"));
  expect(beforePixels.equals(after)).toBe(false);
  await setDigital(page, arabicAyat);
  const arabic = await editorPixels(page, join(reviewDir, "aal-imran-arabic.png"));
  expect(after.equals(arabic)).toBe(true);
  await setDigital(page, [urduWords]); await fonts(page);
  const words = await editorPixels(page);
  await setDigital(page, [arabicWords]); await fonts(page);
  expect(words.equals(await editorPixels(page))).toBe(true);
  writeFileSync(join(reviewDir, "platform-fonts.json"), JSON.stringify(used, null, 2));
});

test("everyday editor use and digital PDF export", async ({ page, isMobile }) => {
  test.skip(isMobile, "Everyday-use desktop pass; cold font repeat test covers mobile separately.");
  test.setTimeout(120000);
  await open(page);
  const editor = page.locator(".ProseMirror");
  await editor.focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.insertText("یہ اردو کی عبارت ہے جسے ہم روز لکھتے اور پڑھتے ہیں");
    await page.keyboard.press("Enter");
  }
  await page.locator('[data-studio-font-family]').selectOption({ label: "Digital Khatt Indo-Pak" });
  await editor.focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.insertText(urduAyat[i % 2]); await page.keyboard.press("Enter");
  }
  // Actual Enter key pagination, rather than injecting a page break.
  for (let i = 0; i < 55; i++) await page.keyboard.press("Enter");
  await page.keyboard.insertText(urduAyat[0]);
  await expect.poll(() => page.locator('[data-studio-page-sheet]').count()).toBeGreaterThanOrEqual(2);
  // Close the synthetic typing history group without a timer or document edit.
  await editor.evaluate(element => {
    const e = (element as HTMLElement & { editor: Editor }).editor;
    e.view.dispatch(e.state.tr.setMeta("closeHistory$", true));
  });
  const beforeDelete = await editor.textContent();
  await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace");
  await expect(editor).toHaveText("");
  await page.keyboard.press("Control+Z"); await expect(editor).toHaveText(beforeDelete ?? "");
  await page.keyboard.press("Control+Shift+Z"); await expect(editor).toHaveText("");
  await page.keyboard.press("Control+Z"); await expect(editor).toHaveText(beforeDelete ?? "");
  const menus = await page.locator('[data-menu-root]').evaluateAll(elements => elements.map(e => e.getAttribute("data-menu-root")!));
  for (const menu of menus) {
    await page.locator(`[data-menu-root="${menu}"]`).click();
    await expect(page.getByRole("menu").first()).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.locator('[data-menu-root="view"]').click();
  await page.locator('[data-menu-action="view.fullscreen"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await editor.focus(); await page.keyboard.press("Control+A");
  await page.locator('[data-studio-font-size]').fill("20");
  await page.locator('[data-studio-font-size]').press("Enter");
  await page.getByRole("button", { name: "Colour", exact: true }).click();
  await page.locator('[data-studio-colour-option="Blue"]').click();
  await expect(editor.locator('span[style*="color"]').first()).toHaveCSS("color", "rgb(0, 0, 255)");
  await page.getByRole("button", { name: "Left to right", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("dir", "ltr");
  await page.getByRole("button", { name: "Right to left", exact: true }).click();
  await expect(editor.locator("p").first()).toHaveAttribute("dir", "rtl");
  for (const value of ["50", "100", "200"]) {
    await page.locator('[data-studio-zoom-control]').selectOption(value);
    await expect(page.locator('[data-studio-print-root]')).toHaveAttribute("data-studio-zoom", value);
  }
  for (const view of ["pageless", "pages"]) {
    await page.locator('[data-menu-root="view"]').click();
    await page.locator(`[data-menu-action="view.${view}"]`).click();
    await expect(page.locator('[data-studio-print-root]')).toHaveAttribute("data-studio-view", view);
  }
  await page.locator('[data-studio-zoom-control]').selectOption("100");
  await setDigital(page, urduAyat.map((value, i) => value + (i === 0 ? " ۝۲۶۔" : " ۝۲۷۔")));
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-submenu="file.download"]').hover();
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator('[data-menu-action="file.downloadPdf"]').click()]);
  expect(await download.failure()).toBeNull();
  mkdirSync(evidence, { recursive: true });
  await download.saveAs(join(evidence, "aal-imran-digital.pdf"));
});


test("ayah marker Urdu digits compose exactly like Arabic-Indic digits", async ({ page }, testInfo) => {
  await open(page);
  const reviewDir = join(evidence, testInfo.project.name, "markers");
  mkdirSync(reviewDir, { recursive: true });
  await page.addStyleTag({ content: "[data-studio-caret],[data-studio-line-selection]{visibility:hidden!important}.ProseMirror{caret-color:transparent!important}.ProseMirror ::selection{background:transparent!important}" });
  await setDigital(page, ["۝۲۶ ۝۲۷ ۝۱۲۳"]);
  await fonts(page);
  const urdu = await editorPixels(page, join(reviewDir, "urdu-markers.png"));
  await setDigital(page, ["۝٢٦ ۝٢٧ ۝١٢٣"]);
  const arabic = await editorPixels(page, join(reviewDir, "arabic-markers.png"));
  expect(urdu.equals(arabic)).toBe(true);
});

test("opens hadiyat InPage and applies Digital Khatt to an imported Quran passage", async ({ page, isMobile }) => {
  test.skip(isMobile, "Imported-book everyday pass is run on desktop.");
  test.setTimeout(120000);
  await open(page);
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.open"]').click();
  const [picker] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: "Open InPage file…" }).click()]);
  await picker.setFiles(resolve("tests/fixtures/inpage/hadiyat.inp"));
  const imported = page.getByRole("dialog", { name: "InPage text imported" });
  await expect(imported).toBeVisible();
  await imported.getByRole("button", { name: "Close", exact: true }).click();
  const result = await page.locator(".ProseMirror").evaluate(element => {
    const editor = (element as HTMLElement & { editor: Editor }).editor;
    const paragraphs: { pos: number; text: string; size: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.isTextblock) { paragraphs.push({ pos, text: node.textContent, size: node.content.size }); return false; }
    });
    for (const paragraph of paragraphs) {
      let normalized = "";
      const offsets: number[] = [];
      for (let offset = 0; offset < paragraph.text.length; offset++) {
        const chars = paragraph.text[offset].normalize("NFD").replace(/\p{M}/gu, "").replace(/[ھہ]/g, "ه").replace(/[یى]/g, "ي").replace(/ک/g, "ك");
        for (const char of chars) { normalized += char; offsets.push(offset); }
      }
      const begin = normalized.indexOf("قل اللهم مالك الملك");
      const ending = begin < 0 ? -1 : normalized.indexOf("قدير", begin);
      if (ending < 0) continue;
      const fromOffset = offsets[begin], toOffset = offsets[ending + 4] ?? paragraph.text.length;
      const from = paragraph.pos + 1 + fromOffset, to = paragraph.pos + 1 + toOffset;
      editor.commands.setTextSelection({ from, to });
      return { found: true, text: paragraph.text.slice(fromOffset, toOffset), from, to };
    }
    return { found: false, sample: paragraphs.slice(0, 30).map(p => p.text).join("\n") };
  });
  expect(result.found, JSON.stringify(result)).toBe(true);
  await page.locator('[data-studio-font-family]').selectOption({ label: "Digital Khatt Indo-Pak" });
  await page.evaluate(() => document.fonts.ready);
  const selected = await page.locator(".ProseMirror").evaluate((element, range) => {
    const editor = (element as HTMLElement & { editor: Editor }).editor;
    let digital = false;
    editor.state.doc.nodesBetween(range.from!, range.to!, node => {
      if (node.isText && node.marks.some(mark => mark.type.name === "textStyle" && mark.attrs.fontFamily === "Digital Khatt Indo-Pak")) digital = true;
    });
    return { digital, text: editor.state.doc.textBetween(range.from!, range.to!, "\n") };
  }, result);
  expect(selected.digital).toBe(true);
  expect(selected.text).toBe(result.text);
  mkdirSync(evidence, { recursive: true });
  writeFileSync(join(evidence, "hadiyat-passage.json"), JSON.stringify(result, null, 2));
  await page.screenshot({ path: join(evidence, "hadiyat-digital.png"), animations: "disabled" });
});
