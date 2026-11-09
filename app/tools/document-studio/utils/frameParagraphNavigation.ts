/** Text-box (textarea) twin of `documentNavigationPosition` in
 * studioDocumentNavigation.ts: Ctrl+Up/Down jump between logical paragraph
 * starts, never relying on native caret placement in the hidden RTL layout. */
export type FrameParagraphKey = "ArrowUp" | "ArrowDown";

/** Offsets where paragraphs start: 0 and every index after a line break. */
export function frameParagraphStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return starts;
}

/** Same rules as the main story: Up = start of current paragraph when the
 * caret is past it, otherwise start of the previous one (text start at the
 * top); Down = start of the next paragraph (text end at the bottom). */
export function frameParagraphNavigationOffset(text: string, head: number, key: FrameParagraphKey): number {
  const starts = frameParagraphStarts(text);
  if (key === "ArrowUp") {
    for (let i = starts.length - 1; i >= 0; i--) if (starts[i] < head) return starts[i];
    return 0;
  }
  for (const pos of starts) if (pos > head) return pos;
  return text.length;
}

export type FrameSelection = { start: number; end: number; direction: "forward" | "backward" | "none" };

/** Resolve the new textarea selection. With Shift the anchor stays put and
 * the head moves (like `TextSelection.between`); otherwise it collapses. */
export function frameParagraphNavigationSelection(text: string, selectionStart: number, selectionEnd: number, direction: string | null | undefined, key: FrameParagraphKey, extend: boolean): FrameSelection {
  const backward = direction === "backward";
  const head = backward ? selectionStart : selectionEnd;
  const anchor = backward ? selectionEnd : selectionStart;
  const target = frameParagraphNavigationOffset(text, head, key);
  if (!extend || anchor === target) return { start: target, end: target, direction: "none" };
  return anchor < target ? { start: anchor, end: target, direction: "forward" } : { start: target, end: anchor, direction: "backward" };
}
