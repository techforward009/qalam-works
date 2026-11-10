import type { StudioTextAlign } from "./documentCommands";

export const FRAME_ALIGNS = ["left", "center", "right", "justify", "justify-all"] as const;
export type ParagraphAlign = StudioTextAlign | null;

export function isFrameAlign(value: unknown): value is StudioTextAlign {
  return typeof value === "string" && (FRAME_ALIGNS as readonly string[]).includes(value);
}

/** Absent means a legacy frame. Null entries inherit the frame alignment. */
export function isParagraphAlignList(value: unknown): value is ParagraphAlign[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 10000 && value.every(item => item === null || isFrameAlign(item));
}

export function paragraphCount(text: string): number {
  return text.split("\n").length;
}

/** Caret or exclusive selection edge. An index on a newline still belongs to the paragraph before it. */
export function paragraphIndexAt(text: string, index: number): number {
  const bounded = Math.max(0, Math.min(index, text.length));
  let count = 0;
  for (let i = 0; i < bounded; i += 1) if (text[i] === "\n") count += 1;
  return count;
}

export function resolvedParagraphAligns(
  text: string,
  textAlign: StudioTextAlign | undefined,
  paragraphAligns: readonly ParagraphAlign[] | undefined,
): ParagraphAlign[] {
  const count = paragraphCount(text);
  const fallback = textAlign ?? null;
  return Array.from({ length: count }, (_, index) => {
    const stored = paragraphAligns?.[index];
    return stored === undefined ? fallback : stored;
  });
}

export function collapseParagraphAligns(
  textAlign: StudioTextAlign | undefined,
  aligns: readonly ParagraphAlign[],
): { textAlign?: StudioTextAlign; paragraphAligns: ParagraphAlign[] | null } {
  const concrete = aligns.map(item => item ?? textAlign ?? null);
  if (concrete.every(item => item === concrete[0])) {
    return concrete[0] ? { textAlign: concrete[0], paragraphAligns: null } : { textAlign: undefined, paragraphAligns: null };
  }
  return { textAlign, paragraphAligns: [...concrete] };
}

export function applyParagraphAlignment(
  text: string,
  textAlign: StudioTextAlign | undefined,
  paragraphAligns: readonly ParagraphAlign[] | undefined,
  selectionStart: number,
  selectionEnd: number,
  align: StudioTextAlign,
): { textAlign?: StudioTextAlign; paragraphAligns: ParagraphAlign[] | null } {
  const aligns = resolvedParagraphAligns(text, textAlign, paragraphAligns);
  const from = paragraphIndexAt(text, Math.min(selectionStart, selectionEnd));
  const to = paragraphIndexAt(text, Math.max(selectionStart, selectionEnd));
  for (let index = from; index <= to && index < aligns.length; index += 1) aligns[index] = align;
  return collapseParagraphAligns(textAlign, aligns);
}

function editBounds(before: string, after: string): { start: number; endBefore: number; inserted: string } {
  let start = 0;
  const shared = Math.min(before.length, after.length);
  while (start < shared && before[start] === after[start]) start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return { start, endBefore, inserted: after.slice(start, endAfter) };
}

export interface TextEditRange {
  start: number;
  end: number;
}

function rangeFromKnownEdit(before: string, after: string, edit: TextEditRange | undefined): { start: number; endBefore: number; inserted: string } | null {
  if (!edit) return null;
  const start = Math.max(0, Math.min(edit.start, before.length));
  const endBefore = Math.max(start, Math.min(edit.end, before.length));
  const insertedLength = after.length - before.length + (endBefore - start);
  if (insertedLength < 0 || start + insertedLength > after.length) return null;
  const inserted = after.slice(start, start + insertedLength);
  return before.slice(0, start) + inserted + before.slice(endBefore) === after ? { start, endBefore, inserted } : null;
}

/** Without a caret, a newline inserted beside an existing break belongs to the paragraph before that break. */
function attributeBoundaryInsertion(before: string, after: string, bounds: { start: number; endBefore: number; inserted: string }) {
  const { start, endBefore, inserted } = bounds;
  if (start !== endBefore || start === 0 || before[start - 1] !== "\n" || !inserted.includes("\n")) return bounds;
  const earlier = start - 1;
  return before.slice(0, earlier) + inserted + before.slice(earlier) === after
    ? { start: earlier, endBefore: earlier, inserted }
    : bounds;
}

function fitAligns(aligns: ParagraphAlign[], count: number, fill: ParagraphAlign): ParagraphAlign[] {
  const next = aligns.slice(0, count);
  while (next.length < count) next.push(fill);
  return next;
}

/** New paragraphs created by Enter or paste inherit the paragraph that contained the edit. */
export function realignAfterTextEdit(
  before: string,
  after: string,
  textAlign: StudioTextAlign | undefined,
  paragraphAligns: readonly ParagraphAlign[] | undefined,
  edit?: TextEditRange,
): { textAlign?: StudioTextAlign; paragraphAligns: ParagraphAlign[] | null } {
  const aligns = resolvedParagraphAligns(before, textAlign, paragraphAligns);
  if (before === after) return collapseParagraphAligns(textAlign, aligns);
  const known = rangeFromKnownEdit(before, after, edit);
  const { start, endBefore, inserted } = known ?? attributeBoundaryInsertion(before, after, editBounds(before, after));
  const startPara = Math.min(paragraphIndexAt(before, start), Math.max(0, aligns.length - 1));
  const endPara = Math.min(paragraphIndexAt(before, endBefore), Math.max(0, aligns.length - 1));
  const removed = before.slice(start, endBefore);
  if (removed === "\n" && inserted === "") {
    const previousBreak = start > 0 ? before.lastIndexOf("\n", start - 1) : -1;
    const removedParagraphIsEmpty = before.slice(previousBreak + 1, start).length === 0;
    const kept = removedParagraphIsEmpty
      ? [...aligns.slice(0, startPara), ...aligns.slice(startPara + 1)]
      : [...aligns.slice(0, startPara + 1), ...aligns.slice(endPara + 1)];
    return collapseParagraphAligns(textAlign, fitAligns(kept, paragraphCount(after), aligns[Math.max(0, startPara - 1)] ?? null));
  }
  const inherited = aligns[startPara] ?? null;
  const middle = Array.from({ length: Math.max(1, inserted.split("\n").length) }, () => inherited);
  const next = [...aligns.slice(0, startPara), ...middle, ...aligns.slice(Math.max(startPara, endPara) + 1)];
  return collapseParagraphAligns(textAlign, fitAligns(next, paragraphCount(after), inherited));
}

export function paragraphTextPatch(
  frame: { text: string; textAlign?: StudioTextAlign; paragraphAligns?: readonly ParagraphAlign[]; singleLine?: boolean },
  next: string,
  edit?: TextEditRange,
): { text: string; textAlign?: StudioTextAlign; paragraphAligns?: ParagraphAlign[] | null } {
  if (frame.singleLine || !frame.paragraphAligns?.length) return { text: next };
  return { text: next, ...realignAfterTextEdit(frame.text, next, frame.textAlign, frame.paragraphAligns, edit) };
}

export function toolbarParagraphAlign(
  text: string,
  textAlign: StudioTextAlign | undefined,
  paragraphAligns: readonly ParagraphAlign[] | undefined,
  selectionStart: number,
  selectionEnd: number,
): string {
  if (!paragraphAligns?.length) return textAlign ?? "";
  const aligns = resolvedParagraphAligns(text, textAlign, paragraphAligns);
  const from = paragraphIndexAt(text, Math.min(selectionStart, selectionEnd));
  const to = paragraphIndexAt(text, Math.max(selectionStart, selectionEnd));
  const selected = aligns.slice(from, to + 1).map(item => item ?? "");
  return selected.every(item => item === selected[0]) ? selected[0] ?? "" : "mixed";
}

export interface FrameAlignSnapshot {
  text: string;
  textAlign?: StudioTextAlign | null;
  paragraphAligns?: ParagraphAlign[] | null;
  start: number;
  end: number;
}

export function createFrameHistory() {
  const past: FrameAlignSnapshot[] = [];
  const future: FrameAlignSnapshot[] = [];
  const clone = (snap: FrameAlignSnapshot): FrameAlignSnapshot => ({
    ...snap,
    paragraphAligns: snap.paragraphAligns ? [...snap.paragraphAligns] : snap.paragraphAligns,
  });
  return {
    remember(current: FrameAlignSnapshot) {
      past.push(clone(current));
      if (past.length > 100) past.shift();
      future.length = 0;
    },
    undo(current: FrameAlignSnapshot): FrameAlignSnapshot | null {
      const previous = past.pop();
      if (!previous) return null;
      future.push(clone(current));
      return previous;
    },
    redo(current: FrameAlignSnapshot): FrameAlignSnapshot | null {
      const next = future.pop();
      if (!next) return null;
      past.push(clone(current));
      return next;
    },
  };
}
