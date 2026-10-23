export interface TextLineBox { left: number; top: number; width: number; height: number }

/** Range rects describe font extents, not CSS line boxes (Nastaliq may overhang).
 * Keep selection paint in the existing leading; this never changes text flow. */
export function selectedLineBoxes(root: HTMLElement, selection: Range): TextLineBox[] {
  const rootStyle = getComputedStyle(root);
  const rootWidth = parseFloat(rootStyle.width) + (rootStyle.boxSizing === "border-box" ? 0 : parseFloat(rootStyle.paddingLeft) + parseFloat(rootStyle.paddingRight) + parseFloat(rootStyle.borderLeftWidth) + parseFloat(rootStyle.borderRightWidth));
  const scale = rootWidth > 0 ? root.getBoundingClientRect().width / rootWidth : 1;
  const boxes: TextLineBox[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!selection.intersectsNode(node)) continue;
    const text = node as Text;
    const start = selection.startContainer === text ? selection.startOffset : 0;
    const end = selection.endContainer === text ? selection.endOffset : text.length;
    if (end <= start) continue;
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, end);
    const parent = text.parentElement!;
    const style = getComputedStyle(parent);
    const leading = parseFloat(style.lineHeight);
    const block = parent.closest("p,h1,h2,h3,h4,h5,h6,li") as HTMLElement | null;
    for (const rect of range.getClientRects()) {
      if (rect.width < 0.1 || rect.height < 1) continue;
      const height = Number.isFinite(leading) ? leading * scale : rect.height;
      // CSS distributes leading equally above and below the font box.
      const top = Math.max(block?.getBoundingClientRect().top ?? -Infinity, rect.top + (rect.height - height) / 2);
      boxes.push({ left: rect.left, top, width: rect.width, height });
    }
  }
  // Fractional font metrics can differ by a subpixel; never paint into the next line.
  for (const box of boxes) {
    const next = boxes.filter(other => other.top > box.top + 1).reduce((top, other) => Math.min(top, other.top), Infinity);
    box.height = Math.min(box.height, next - box.top);
  }
  return boxes;
}

/** A textarea has no public DOM Range; mirror its existing layout only while selected. */
export function selectedTextareaLineBoxes(input: HTMLTextAreaElement): TextLineBox[] {
  if (input.selectionStart === input.selectionEnd) return [];
  const style = getComputedStyle(input), rect = input.getBoundingClientRect();
  const scale = input.offsetWidth ? rect.width / input.offsetWidth : 1;
  const mirror = document.createElement("div");
  mirror.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:break-word;margin:0;padding:0;border:0;";
  for (const property of ["font-family", "font-weight", "font-style", "font-variant-ligatures", "font-feature-settings", "direction", "text-align", "letter-spacing", "word-spacing"]) mirror.style.setProperty(property, style.getPropertyValue(property));
  Object.assign(mirror.style, {
    left: `${rect.left + input.clientLeft * scale}px`,
    top: `${rect.top + input.clientTop * scale - input.scrollTop * scale}px`,
    width: `${input.clientWidth * scale}px`,
    fontSize: `${parseFloat(style.fontSize) * scale}px`,
    lineHeight: `${parseFloat(style.lineHeight) * scale}px`,
  });
  const text = document.createTextNode(input.value);
  mirror.append(text);
  document.body.append(mirror);
  try {
    const range = document.createRange();
    range.setStart(text, input.selectionStart);
    range.setEnd(text, input.selectionEnd);
    return selectedLineBoxes(mirror, range).map(box => {
      const top = Math.max(rect.top + input.clientTop * scale, box.top);
      const bottom = Math.min(rect.bottom - input.clientTop * scale, box.top + box.height);
      return { ...box, top, height: Math.max(0, bottom - top) };
    });
  } finally { mirror.remove(); }
}
