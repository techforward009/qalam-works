export interface TextLineBox { left: number; top: number; width: number; height: number }
export interface LineRect extends TextLineBox { fontTop: number; fontBottom: number }

/** One sort and one grouping/clamping pass: all runs on a visual line share its box. */
export function groupVisualLineRects(rects: LineRect[]): TextLineBox[] {
  rects.sort((a, b) => a.fontTop - b.fontTop || a.left - b.left);
  const lines: { rects: LineRect[]; top: number; bottom: number; fontTop: number; fontBottom: number }[] = [];
  for (const rect of rects) {
    const line = lines[lines.length - 1];
    const overlap = line ? Math.min(line.fontBottom, rect.fontBottom) - Math.max(line.fontTop, rect.fontTop) : 0;
    if (line && overlap > Math.min(line.fontBottom - line.fontTop, rect.fontBottom - rect.fontTop) / 2) {
      line.rects.push(rect);
      line.top = Math.min(line.top, rect.top);
      line.bottom = Math.max(line.bottom, rect.top + rect.height);
      line.fontTop = Math.min(line.fontTop, rect.fontTop);
      line.fontBottom = Math.max(line.fontBottom, rect.fontBottom);
    } else lines.push({ rects: [rect], top: rect.top, bottom: rect.top + rect.height, fontTop: rect.fontTop, fontBottom: rect.fontBottom });
  }
  const boxes: TextLineBox[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bottom = Math.min(line.bottom, lines[i + 1]?.top ?? Infinity);
    for (const rect of line.rects) boxes.push({ left: rect.left, top: line.top, width: rect.width, height: Math.max(0, bottom - line.top) });
  }
  return boxes;
}

function elementScale(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const width = parseFloat(style.width) + (style.boxSizing === "border-box" ? 0 : parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth));
  return width > 0 ? element.getBoundingClientRect().width / width : 1;
}

/** Visit only the selected subtree, and discard offscreen rects before grouping. */
export function selectedLineBoxes(root: HTMLElement, selection: Range, clip = root.closest("[data-studio-scroller]")?.getBoundingClientRect()): TextLineBox[] {
  const scale = elementScale(root);
  const rects: LineRect[] = [];
  const common = selection.commonAncestorContainer;
  if (common !== root && !root.contains(common)) return [];
  const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
  const visit = (node: Node) => {
    if (!selection.intersectsNode(node)) return;
    const text = node as Text;
    const start = selection.startContainer === text ? selection.startOffset : 0;
    const end = selection.endContainer === text ? selection.endOffset : text.length;
    if (end <= start) return;
    const range = document.createRange();
    range.setStart(text, start); range.setEnd(text, end);
    const leading = parseFloat(getComputedStyle(text.parentElement!).lineHeight);
    const selectionOffset = parseFloat(text.parentElement!.closest("[data-studio-line-selection-offset]")?.getAttribute("data-studio-line-selection-offset") ?? "0") * scale;
    for (const rect of range.getClientRects()) {
      if (rect.width < 0.1 || rect.height < 1 || (clip && (rect.bottom <= clip.top || rect.top >= clip.bottom || rect.right <= clip.left || rect.left >= clip.right))) continue;
      rects.push({ left: rect.left, top: rect.top + selectionOffset, width: rect.width, height: Number.isFinite(leading) ? leading * scale : rect.height, fontTop: rect.top + selectionOffset, fontBottom: rect.bottom + selectionOffset });
    }
  };
  if (common.nodeType === Node.TEXT_NODE) visit(common);
  else for (let node = walker.nextNode(); node; node = walker.nextNode()) visit(node);
  return groupVisualLineRects(rects);
}
