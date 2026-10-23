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
    for (const rect of range.getClientRects()) {
      if (rect.width < 0.1 || rect.height < 1 || (clip && (rect.bottom <= clip.top || rect.top >= clip.bottom || rect.right <= clip.left || rect.left >= clip.right))) continue;
      rects.push({ left: rect.left, top: rect.top, width: rect.width, height: Number.isFinite(leading) ? leading * scale : rect.height, fontTop: rect.top, fontBottom: rect.bottom });
    }
  };
  if (common.nodeType === Node.TEXT_NODE) visit(common);
  else for (let node = walker.nextNode(); node; node = walker.nextNode()) visit(node);
  return groupVisualLineRects(rects);
}

/** Mirror at natural size, then transform: zoom must not change wrapping. */
export function selectedTextareaLineBoxes(input: HTMLTextAreaElement): TextLineBox[] {
  if (input.selectionStart === input.selectionEnd) return [];
  const style = getComputedStyle(input), rect = input.getBoundingClientRect();
  const scale = elementScale(input);
  const mirror = document.createElement("div");
  mirror.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:break-word;margin:0;border:0;box-sizing:border-box;transform-origin:top left;";
  for (const property of ["font-family", "font-size", "line-height", "font-weight", "font-style", "font-variant-ligatures", "font-feature-settings", "direction", "text-align", "letter-spacing", "word-spacing", "unicode-bidi", "text-indent", "tab-size", "font-kerning", "padding"]) mirror.style.setProperty(property, style.getPropertyValue(property));
  Object.assign(mirror.style, {
    left: `${rect.left + input.clientLeft * scale}px`,
    top: `${rect.top + input.clientTop * scale - input.scrollTop * scale}px`,
    width: `${input.clientWidth + (input.offsetWidth ? rect.width / scale - input.offsetWidth : 0)}px`,
    transform: `scale(${scale})`,
  });
  const text = document.createTextNode(input.value);
  mirror.append(text); document.body.append(mirror);
  try {
    const range = document.createRange();
    range.setStart(text, input.selectionStart); range.setEnd(text, input.selectionEnd);
    return selectedLineBoxes(mirror, range, rect);
  } finally { mirror.remove(); }
}
