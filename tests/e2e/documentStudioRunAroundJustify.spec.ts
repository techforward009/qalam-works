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

async function seed(page: Page, align: string) {
  await page.evaluate(next => {
    const id = localStorage.getItem("qalam-document-studio-active-document-v1")!;
    const map = JSON.parse(localStorage.getItem("qalam-studio-frames-v1") || "{}") as Record<string, unknown>;
    map[id] = next;
    localStorage.setItem("qalam-studio-frames-v1", JSON.stringify(map));
  }, frames);
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
        const rect = range.getBoundingClientRect();
        cursor += found.length;
        if (rect.width < 2 || rect.height < 2) continue;
        wordWidths.push(rect.width);
        const key = Math.round(rect.top / 2);
        const band = bands.get(key) ?? [];
        band.push(rect);
        bands.set(key, band);
        const crosses = rect.bottom > frame.top + 2 && rect.top < frame.bottom - 2;
        if (!crosses) continue;
        const mid = (rect.left + rect.right) / 2;
        if (mid <= frame.left + 1) left = true;
        else if (mid >= frame.right - 1) right = true;
        else over += 1;
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
      justify: style.textJustify,
      spaces: paragraph.querySelectorAll("[data-run-around-space]").length,
      justifyMark: paragraph.getAttribute("data-run-around-justify"),
      segments: paragraph.querySelectorAll("[data-run-around-segment]").length,
      left,
      right,
      over,
      fullLine,
      maxBeside: besideGaps.length ? Math.max(...besideGaps) : 0,
      maxBelow: belowGaps.length ? Math.max(...belowGaps) : 0,
      widest,
      narrowest,
    };
  }, { frameId, words });
}

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
