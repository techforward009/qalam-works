import type { StudioTextAlign } from "./documentCommands";
import {
  collapseParagraphAligns,
  isFrameAlign,
  resolvedParagraphAligns,
  type ParagraphAlign,
} from "./paragraphAlign";

/** TipTap JSON subset the box editor stores. Marks, dir, and directionMode are ignored on the way out. */
export interface FrameDocNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: FrameDocNode[];
}

export interface FrameTextState {
  text: string;
  textAlign?: StudioTextAlign | null;
  paragraphAligns?: readonly ParagraphAlign[] | null;
}

export interface FrameDocPatch {
  text: string;
  textAlign?: StudioTextAlign | null;
  paragraphAligns?: ParagraphAlign[] | null;
}

function readAlign(attrs: Record<string, unknown> | undefined): ParagraphAlign {
  return isFrameAlign(attrs?.textAlign) ? attrs.textAlign : null;
}

function inlineText(node: FrameDocNode): string {
  if (node.type === "text") return node.text ?? "";
  let text = "";
  for (const child of node.content ?? []) text += inlineText(child);
  return text;
}

function collectParagraphs(node: FrameDocNode | null | undefined, out: { text: string; align: ParagraphAlign }[]): void {
  if (!node || node.type === "text") return;
  if (node.type === "paragraph" || node.type === "heading") {
    out.push({ text: inlineText(node), align: readAlign(node.attrs) });
    return;
  }
  for (const child of node.content ?? []) collectParagraphs(child, out);
}

/** One paragraph node per line. `textAlign` comes from `resolvedParagraphAligns` (null stays unset). */
export function frameToDoc(
  text: string,
  textAlign: StudioTextAlign | undefined,
  paragraphAligns?: readonly ParagraphAlign[] | null,
): FrameDocNode {
  const aligns = resolvedParagraphAligns(text, textAlign, paragraphAligns ?? undefined);
  return {
    type: "doc",
    content: text.split("\n").map((line, index) => {
      const align = aligns[index];
      const paragraph: FrameDocNode = { type: "paragraph", attrs: align ? { textAlign: align } : {} };
      if (line) paragraph.content = [{ type: "text", text: line }];
      return paragraph;
    }),
  };
}

/** Join paragraph text with newlines and collapse alignment. Dir and marks are dropped. */
export function docToFrame(doc: FrameDocNode | null | undefined, textAlign?: StudioTextAlign | null): {
  text: string;
  textAlign?: StudioTextAlign;
  paragraphAligns: ParagraphAlign[] | null;
} {
  const paragraphs: { text: string; align: ParagraphAlign }[] = [];
  collectParagraphs(doc, paragraphs);
  if (paragraphs.length === 0) paragraphs.push({ text: "", align: null });
  return {
    text: paragraphs.map((paragraph) => paragraph.text).join("\n"),
    ...collapseParagraphAligns(textAlign ?? undefined, paragraphs.map((paragraph) => paragraph.align)),
  };
}

function collapsedEqual(
  frame: FrameTextState,
  next: { textAlign?: StudioTextAlign; paragraphAligns: ParagraphAlign[] | null },
): boolean {
  const current = collapseParagraphAligns(
    frame.textAlign ?? undefined,
    resolvedParagraphAligns(frame.text, frame.textAlign ?? undefined, frame.paragraphAligns ?? undefined),
  );
  return (current.textAlign ?? null) === (next.textAlign ?? null)
    && JSON.stringify(current.paragraphAligns) === JSON.stringify(next.paragraphAligns);
}

/** Null when the doc still matches the frame. A text-only edit leaves stored aligns (including nulls and a legacy omission) untouched. */
export function frameContentPatch(frame: FrameTextState, doc: FrameDocNode | null | undefined): FrameDocPatch | null {
  const next = docToFrame(doc, frame.textAlign ?? undefined);
  const textSame = next.text === frame.text;
  const alignSame = collapsedEqual(frame, next);
  if (textSame && alignSame) return null;
  if (alignSame) return { text: next.text };
  return { text: next.text, textAlign: next.textAlign ?? null, paragraphAligns: next.paragraphAligns };
}
