import { expect, test, type Page } from "@playwright/test";

const words = ["عبادت", "انسان", "معرفت", "محبت", "سلام", "زندگی", "بندگی"];
const line = `${words.join("، ")}، English words 2026، `;

const frames = [
  { id: "pic-justify", kind: "picture-rect", page: 1, xMm: 78, yMm: 36, wMm: 42, hMm: 24, flip: false, text: "", runAround: true, runAroundLeftMm: 0.71, runAroundRightMm: 0.71, runAroundTopMm: 0.35, runAroundBottomMm: 0.35 },
  { id: "text-justify", kind: "text", page: 1, xMm: 80, yMm: 68, wMm: 40, hMm: 18, flip: false, text: "خانہ", runAround: true, runAroundLeftMm: 1.2, runAroundRightMm: 0.8, runAroundTopMm: 0.4, runAroundBottomMm: 0.6 },
];

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qalam-document-studio-active-document-v1")), { timeout: 20000 }).not.toBeNull();
}

async function seed(page: Page, align: string, framesToSeed: typeof frames = frames) {
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = next;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, framesToSeed);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await page.locator(".ProseMirror").click();
  await page.locator(".ProseMirror").evaluate((root, payload) => {
    const editor = (root as HTMLElement & { editor: { commands: { setContent: (doc: unknown) => void } } }).editor;
    const content = Array.from({ length: 24 }, () => ({ type: "text", text: payload.line }));
    editor.commands.setContent({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl", textAlign: payload.align }, content }],
    });
  }, { line, align });
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThan(0);
}

async function measure(page: Page, frameId: string) {
  return page.evaluate(({ frameId: id, words: samples }) => {
    const frame = document.querySelector(`[data-studio-frame-id="${id}"]`)?.getBoundingClientRect();
    const paragraph = document.querySelector(".ProseMirror p");
    if (!frame || !paragraph) return null;
    const style = getComputedStyle(paragraph);
    const wordWidths: number[] = [];
    const besideGaps: number[] = [];
    const belowGaps: number[] = [];
    let left = false;
    let right = false;
    let over = 0;
    const overlaps: Array<{ word: string; left: number; right: number; top: number; bottom: number }> = [];
    let fullLine = false;
    const bands = new Map<number, DOMRect[]>();
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (node.parentElement?.closest("[data-studio-frame-id], [data-run-around-gap], [data-run-around-space]")) continue;
      let cursor = 0;
      const text = node.data;
      while (cursor < text.length) {
        const found = samples.find(word => text.startsWith(word, cursor));
        if (!found) { cursor += 1; continue; }
        const range = document.createRange();
        range.setStart(node, cursor);
        range.setEnd(node, cursor + found.length);
        // Use each painted line fragment, not the union bounding box. A bidi
        // Range can span both sides of a Run Around hole; its union includes
        // the empty hole and falsely reports ink over the object.
        const rects = [...range.getClientRects()].filter(rect => rect.width >= 2 && rect.height >= 2);
        cursor += found.length;
        for (const rect of rects) {
          wordWidths.push(rect.width);
          const key = Math.round(rect.top / 2);
          const band = bands.get(key) ?? [];
          band.push(rect);
          bands.set(key, band);
          const crosses = rect.bottom > frame.top + 2 && rect.top < frame.bottom - 2;
          if (!crosses) continue;
          if (rect.right <= frame.left + 1) left = true;
          else if (rect.left >= frame.right - 1) right = true;
          else {
            over += 1;
            overlaps.push({
              word: found,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
            });
          }
        }
      }
    }
    const column = paragraph.getBoundingClientRect();
    for (const band of bands.values()) {
      const ordered = [...band].sort((a, b) => a.left - b.left);
      const beside = ordered.some(rect => rect.bottom > frame.top + 2 && rect.top < frame.bottom - 2);
      const below = ordered.every(rect => rect.top >= frame.bottom - 2);
      const span = ordered[ordered.length - 1].right - ordered[0].left;
      if (below && span > column.width * 0.72) fullLine = true;
      const groups = below ? [ordered] : [
        ordered.filter(rect => (rect.left + rect.right) / 2 <= frame.left),
        ordered.filter(rect => (rect.left + rect.right) / 2 >= frame.right),
      ];
      for (const group of groups) {
        const row = [...group].sort((a, b) => a.left - b.left);
        for (let index = 1; index < row.length; index += 1) {
          const gap = row[index].left - row[index - 1].right;
          if (gap < 0 || gap > 80) continue;
          if (beside) besideGaps.push(gap);
          if (below) belowGaps.push(gap);
        }
      }
    }
    const widest = wordWidths.length ? Math.max(...wordWidths) : 0;
    const narrowest = wordWidths.length ? Math.min(...wordWidths) : 0;
    return {
      align: paragraph.getAttribute("data-text-align"),
      justify: style.getPropertyValue("text-justify"),
      spaces: paragraph.querySelectorAll("[data-run-around-space]").length,
      justifyMark: paragraph.getAttribute("data-run-around-justify"),
      segments: paragraph.querySelectorAll("[data-run-around-segment]").length,
      left,
      right,
      over,
      overlaps,
      fullLine,
      maxBeside: besideGaps.length ? Math.max(...besideGaps) : 0,
      maxBelow: belowGaps.length ? Math.max(...belowGaps) : 0,
      widest,
      narrowest,
      modelFrame: (() => {
        const documentId = localStorage.getItem("qalam-document-studio-active-document-v1");
        const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, Array<Record<string, unknown>>>;
        return documentId ? (map[documentId] || []).find(item => item.id === id) ?? null : null;
      })(),
      storyRoot: (() => {
        const root = paragraph.closest(".ProseMirror")?.getBoundingClientRect();
        return root ? { left: root.left, top: root.top, width: root.width, height: root.height } : null;
      })(),
      nearbyWrap: [...document.querySelectorAll("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]")].map(element => {
        const rect = element.getBoundingClientRect();
        return {
          kind: element.hasAttribute("data-run-around-gap") ? "gap" : element.hasAttribute("data-run-around-break") ? "break" : "skip",
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }).filter(rect => rect.top > frame.top - 60 && rect.top < frame.bottom + 60),
    };
  }, { frameId, words });
}

async function storyInkSignature(page: Page) {
  return page.evaluate(() => {
    const paragraph = document.querySelector(".ProseMirror p");
    if (!paragraph) return "";
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const rects: string[] = [];
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim() || node.parentElement?.closest("[data-run-around-gap], [data-run-around-space], [data-run-around-skip]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1) continue;
        rects.push(`${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`);
      }
    }
    return rects.join("|");
  });
}

async function wrapDecorationSignature(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll("[data-run-around-gap], [data-run-around-space], [data-run-around-break], [data-run-around-skip]")].map(el => {
    const rect = el.getBoundingClientRect();
    const kind = el.hasAttribute("data-run-around-gap") ? "g"
      : el.hasAttribute("data-run-around-space") ? "s"
      : el.hasAttribute("data-run-around-break") ? "b" : "k";
    // A zero-width BR caret x-coordinate can vary with bidi font metrics without moving ink or a gap.
    // Compare its vertical line position, but keep x/width checks for actual wrap spacers.
    return kind === "b"
      ? `b:${Math.round(rect.top)}:${Math.round(rect.height)}`
      : `${kind}${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
  }).join("|"));
}

async function waitForStableRunAroundLayout(page: Page) {
  let previous = "";
  let consecutiveMatches = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = `${await storyInkSignature(page)}\n${await wrapDecorationSignature(page)}`;
    if (current === previous) consecutiveMatches += 1;
    else {
      previous = current;
      consecutiveMatches = 0;
    }
    if (consecutiveMatches >= 5) return;
    await page.waitForTimeout(60);
  }
  throw new Error("Run Around layout did not remain stable for six consecutive samples");
}

test("holds justified story text still during object drag and reflows only after drop", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  // Keep this interaction test focused on one movable object; the separate text-box test covers multiple obstacles.
  await seed(page, "justify", [frames[0]]);
  await expect(page.locator('[data-run-around-justify="true"]')).toHaveCount(1);
  const initialLayout = await measure(page, "pic-justify");
  const initialStory = await storyInkSignature(page);
  const initialWrap = await wrapDecorationSignature(page);
  const picture = page.locator('[data-studio-frame-id="pic-justify"]');
  await page.locator('[data-studio-tool-button="select"]').click();
  const start = await picture.boundingBox();
  expect(start).toBeTruthy();
  const x = start!.x + start!.width / 2;
  const y = start!.y + start!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(x, y + step * 18);
    await page.waitForTimeout(40);
    expect(await storyInkSignature(page), `story moved during drag step ${step}`).toBe(initialStory);
    expect(await wrapDecorationSignature(page), `wrap changed during drag step ${step}`).toBe(initialWrap);
    const moving = await picture.boundingBox();
    expect(moving?.y ?? 0, "picture preview should follow the pointer").toBeGreaterThan(start!.y + step * 12);
  }
  await page.mouse.up();
  await expect.poll(() => storyInkSignature(page), { timeout: 10000 }).not.toBe(initialStory);
  await expect.poll(() => wrapDecorationSignature(page), { timeout: 10000 }).not.toBe(initialWrap);
  // Pointer-up triggers a real reflow; allow its successive layout frames to settle
  // before recording the final signature. A persistent oscillation still fails.
  await waitForStableRunAroundLayout(page);
  const settledStory = await storyInkSignature(page);
  const settledWrap = await wrapDecorationSignature(page);
  for (let index = 0; index < 4; index += 1) {
    await page.waitForTimeout(60);
    expect(await storyInkSignature(page)).toBe(settledStory);
    expect(await wrapDecorationSignature(page)).toBe(settledWrap);
  }
  const moved = await measure(page, "pic-justify");
  expect(moved?.align).toBe("justify");
  // Reopen from the persisted frame geometry to distinguish an immediate reflow
  // scheduling issue from a layout calculation issue.
  await page.reload();
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await expect.poll(() => page.locator("[data-run-around-gap], [data-run-around-break], [data-run-around-skip]").count(), { timeout: 15000 }).toBeGreaterThan(0);
  const afterReload = await measure(page, "pic-justify");
  expect(moved?.over ?? 0, JSON.stringify({ initialLayout, afterDrop: moved, afterReload, frame: await page.locator('[data-studio-frame-id="pic-justify"]').boundingBox() })).toBeLessThanOrEqual(initialLayout?.over ?? 0);
  expect(afterReload?.over ?? 0, JSON.stringify({ initialLayout, afterReload })).toBeLessThanOrEqual(initialLayout?.over ?? 0);
});

test("justified Urdu keeps word spacing beside image and text boxes", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await seed(page, "justify");
  await expect(page.locator('[data-run-around-justify="true"]')).toHaveCount(1);
  const picture = await measure(page, "pic-justify");
  const textBox = await measure(page, "text-justify");
  await page.screenshot({ path: "/tmp/qalam-phase5-justify.png", fullPage: false });
  expect(picture, JSON.stringify(picture)).toBeTruthy();
  expect(textBox, JSON.stringify(textBox)).toBeTruthy();
  expect(picture!.align).toBe("justify");
  expect(picture!.justify).toBe("inter-word");
  expect(picture!.justifyMark).toBe("true");
  expect(picture!.spaces).toBe(0);
  expect(picture!.segments, JSON.stringify(picture)).toBeGreaterThan(0);
  expect(picture!.left && picture!.right, JSON.stringify(picture)).toBe(true);
  expect(textBox!.left && textBox!.right, JSON.stringify(textBox)).toBe(true);
  expect(picture!.fullLine).toBe(true);
  // Each side fills its box by widening spaces, without opening a hole-sized gap.
  expect(picture!.maxBeside).toBeGreaterThan(0);
  expect(picture!.maxBeside).toBeLessThan(48);
  expect(textBox!.maxBeside).toBeLessThan(48);
  expect(picture!.widest).toBeLessThan(picture!.narrowest * 2);

  for (const align of ["right", "left", "center"]) {
    await page.locator(".ProseMirror").evaluate((root, next) => {
      const editor = (root as HTMLElement & { editor: { chain: () => { focus: () => { selectAll: () => { setTextAlign: (value: string) => { run: () => void } } } } } }).editor;
      editor.chain().focus().selectAll().setTextAlign(next).run();
    }, align);
    await expect.poll(() => page.locator(".ProseMirror p").getAttribute("data-text-align")).toBe(align);
    await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 8000 }).toBeGreaterThan(0);
    const again = await measure(page, "pic-justify");
    const textAgain = await measure(page, "text-justify");
    await page.screenshot({ path: `/tmp/qalam-phase5-${align}.png`, fullPage: false });
    expect(again!.left && again!.right, JSON.stringify(again)).toBe(true);
    expect(again!.justifyMark, align).toBeNull();
    expect(again!.maxBeside, align).toBeLessThan(36);
    expect(textAgain!.justifyMark, align).toBeNull();
  }
});

const PARITY_URDU = "اردو زبان و ادب کی تاریخ میں خطِ نستعلیق کو ایک منفرد اور ممتاز مقام حاصل ہے۔ صدیوں سے برصغیر کے خطاطوں اور کاتبوں نے اس خوبصورت رسم الخط کو اپنی محنت، ذوق اور فنی مہارت سے نکھارا ہے جس کی بدولت آج بھی کتابیں، رسائل اور اخبارات اس کی دلکشی سے مزین نظر آتے ہیں۔ کمپیوٹر اور جدید طباعت کے دور میں بھی نستعلیق کی اصل روح، کشش، نشست و برخاست اور الفاظ کے درمیان متوازن فاصلہ برقرار رکھنا ایک نہایت اہم اور نازک مرحلہ رہا ہے۔ جب کسی صفحے کے درمیان کوئی تصویر یا خاکہ شامل کیا جاتا ہے تو اس کے دونوں اطراف عبارت کا خوبصورتی اور توازن کے ساتھ پھیلنا، حاشیوں کا سیدھا رہنا اور تصویر کے گرد مناسب فاصلہ ہونا اعلیٰ معیار کی کتابت کی پہچان ہے۔ قارئین کے لیے مطالعہ اسی وقت خوشگوار اور آسان ہوتا ہے جب سطریں نہ تو تصویر سے ٹکرائیں اور نہ ہی بائیں یا دائیں جانب بے ڈھنگا خالی پن پیدا ہو، بلکہ پوری عبارت ایک ہموار اور منظم انداز میں تصویر کے اردگرد بہتی ہوئی نیچے مکمل چوڑائی کے ساتھ جاری رہے۔";

test("matches Editor, Browser Print, and Save as PDF line distribution around an empty centered Picture Box", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  const emptyCenterPic = {
    id: "parity-center-pic",
    kind: "picture-rect",
    page: 1,
    xMm: 78,
    yMm: 46,
    wMm: 54,
    hMm: 46,
    flip: false,
    text: "",
    runAround: true,
    borderColor: "#000000",
    borderWidthMm: 25.4 / 72,
    borderPattern: "none",
    borderPosition: "inside",
    backgroundColor: "#FFFFFF",
    backgroundHatch: "none",
    roundnessMm: 6.35,
    angle1Deg: 0,
  };
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = [next];
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, emptyCenterPic);
  await page.reload();
  await expect(page.locator(".ProseMirror")).toBeEditable({ timeout: 45000 });
  await expect(page.locator(".ProseMirror")).toHaveAttribute("data-studio-font-layout", "ready", { timeout: 25000 });
  await page.locator(".ProseMirror").click();
  await page.locator(".ProseMirror").evaluate((root, text) => {
    const editor = (root as HTMLElement & { editor: { commands: { setContent: (doc: unknown) => void; focus: (at: string) => void } } }).editor;
    editor.commands.setContent({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "rtl", textAlign: "justify" }, content: [{ type: "text", text: `${text} ${text}` }] }],
    });
    editor.commands.focus("start");
  }, PARITY_URDU);
  await expect.poll(() => page.locator("[data-run-around-gap]").count(), { timeout: 15000 }).toBeGreaterThanOrEqual(4);

  const collectLines = async (selectorP: string, selectorFrame: string) =>
    page.evaluate(({ pSel, fSel }) => {
      const p = document.querySelector<HTMLElement>(pSel);
      const frame = document.querySelector<HTMLElement>(fSel);
      if (!p || !frame) return null;
      const pRect = p.getBoundingClientRect();
      const fRect = frame.getBoundingClientRect();
      const spans: Array<{ word: string; top: number; bottom: number; side: "left" | "right" | "mid" }> = [];
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        if (!node.data.trim()) continue;
        if (node.parentElement?.closest("[data-run-around-gap], [data-run-around-skip], [data-print-run-around='gap'], [data-print-run-around='skip'], [data-print-run-around='tail']")) continue;
        const re = /\S+/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(node.data))) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const r = range.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          const mid = (r.left + r.right) / 2;
          spans.push({
            word: m[0],
            top: r.top,
            bottom: r.bottom,
            side: mid > fRect.right ? "right" : mid < fRect.left ? "left" : "mid",
          });
        }
      }
      const lines: Array<{ top: number; bottom: number; words: typeof spans }> = [];
      for (const s of spans) {
        let row = lines.find(l => Math.abs(l.top - s.top) < 8);
        if (!row) { row = { top: s.top, bottom: s.bottom, words: [] }; lines.push(row); }
        row.words.push(s);
      }
      lines.sort((a, b) => a.top - b.top);
      return {
        pWidth: pRect.width,
        textRendering: getComputedStyle(p).textRendering,
        lines: lines.map(l => {
          const inBand = l.bottom > fRect.top + 1 && l.top < fRect.bottom - 1;
          return {
            inBand,
            text: l.words.map(w => w.word).join(" "),
            right: inBand ? l.words.filter(w => w.side === "right").map(w => w.word).join(" ") : "",
            left: inBand ? l.words.filter(w => w.side === "left").map(w => w.word).join(" ") : "",
          };
        }),
      };
    }, { pSel: selectorP, fSel: selectorFrame });

  const editorSnapshot = await collectLines(".qalam-editor-content .ProseMirror p", '[data-studio-frame-id="parity-center-pic"]');
  expect(editorSnapshot).toBeTruthy();
  expect(editorSnapshot!.textRendering).toBe("geometricprecision");
  const editorWrapped = editorSnapshot!.lines.filter(l => l.inBand);
  expect(editorWrapped.length).toBeGreaterThanOrEqual(6);
  expect(editorWrapped.every(l => l.right.length > 0 && l.left.length > 0)).toBe(true);
  // Full-width continuation lines appear below the wrapped band.
  const lastWrappedIdx = editorSnapshot!.lines.map(l => l.inBand).lastIndexOf(true);
  expect(editorSnapshot!.lines.length - 1 - lastWrappedIdx).toBeGreaterThanOrEqual(2);

  // Verify Browser Print portal produces identical line breaks and right/left lane distribution.
  await page.evaluate(() => {
    const w = window as Window & { __origPrint?: typeof window.print; __printCalled?: number };
    w.__origPrint = window.print;
    w.__printCalled = 0;
    window.print = () => { w.__printCalled = (w.__printCalled ?? 0) + 1; };
  });
  try {
    await page.locator('[data-menu-root="file"]').click();
    await page.locator('[data-menu-action="file.print"]').click();
    await expect.poll(() => page.evaluate(() => (window as Window & { __printCalled?: number }).__printCalled), { timeout: 15000 }).toBe(1);
    await expect(page.locator('[data-studio-print-portal][data-print-waited-fonts="true"]')).toHaveCount(1);
    await page.emulateMedia({ media: "print" });
    const printSnapshot = await collectLines("[data-studio-print-portal] .ProseMirror p", '[data-studio-print-portal] [data-print-frame-id="parity-center-pic"]');
    await page.emulateMedia({ media: "screen" });
    expect(printSnapshot).toBeTruthy();
    expect(printSnapshot!.lines).toEqual(editorSnapshot!.lines);
  } finally {
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("afterprint"));
      const w = window as Window & { __origPrint?: typeof window.print };
      if (w.__origPrint) { window.print = w.__origPrint; delete w.__origPrint; }
    });
  }

  // Verify Save as PDF uses identical printable width, embedded Mehr Nastaliq Web, and identical visual line count.
  let pdfStatus = 0;
  let pdfHeaders: Record<string, string> = {};
  await page.route("**/api/export-pdf", async route => {
    const response = await route.fetch();
    pdfStatus = response.status();
    pdfHeaders = response.headers();
    await route.fulfill({ response });
  });
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.downloadPdf"]').click();
  await expect.poll(() => pdfStatus, { timeout: 45000 }).toBe(200);
  expect(pdfHeaders["x-pdf-page-count"]).toBe("1");
  expect(Number(pdfHeaders["x-pdf-visual-lines"])).toBe(editorSnapshot!.lines.length);
  expect(Math.abs(Number(pdfHeaders["x-pdf-printable-width"]) - editorSnapshot!.pWidth)).toBeLessThan(1);
  expect(pdfHeaders["x-pdf-embedded-fonts"]).toContain("MehrNastaliqWeb");
  expect(pdfHeaders["x-pdf-font-fallbacks"]).toBe("[]");
});
