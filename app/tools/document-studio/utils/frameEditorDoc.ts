import type { StudioTextAlign } from "./documentCommands";
import {
  collapseParagraphAligns,
  isFrameAlign,
  resolvedParagraphAligns,
  type ParagraphAlign,
} from "./paragraphAlign";
import {
  PARAGRAPH_FORMAT_KEYS,
  collapseParagraphFormats,
  normalizeParagraphFormat,
  resolvedParagraphFormats,
  type ParagraphFormat,
} from "./paragraphFormats";

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
  paragraphFormats?: readonly ParagraphFormat[] | null;
}

export interface FrameDocPatch {
  text: string;
  textAlign?: StudioTextAlign | null;
  paragraphAligns?: ParagraphAlign[] | null;
  paragraphFormats?: ParagraphFormat[] | null;
}

function readAlign(attrs: Record<string, unknown> | undefined): ParagraphAlign {
  return isFrameAlign(attrs?.textAlign) ? attrs.textAlign : null;
}

function readFormat(attrs: Record<string, unknown> | undefined): ParagraphFormat {
  if (!attrs) return null;
  const raw: Record<string, unknown> = {};
  for (const key of PARAGRAPH_FORMAT_KEYS) {
    if (attrs[key] !== undefined && attrs[key] !== null) {
      raw[key] = attrs[key];
    }
  }
  return normalizeParagraphFormat(raw);
}

function inlineText(node: FrameDocNode): string {
  if (node.type === "text") return node.text ?? "";
  let text = "";
  for (const child of node.content ?? []) text += inlineText(child);
  return text;
}

function collectParagraphs(
  node: FrameDocNode | null | undefined,
  out: { text: string; align: ParagraphAlign; format: ParagraphFormat }[],
): void {
  if (!node || node.type === "text") return;
  if (node.type === "paragraph" || node.type === "heading") {
    out.push({ text: inlineText(node), align: readAlign(node.attrs), format: readFormat(node.attrs) });
    return;
  }
  for (const child of node.content ?? []) collectParagraphs(child, out);
}

/** One paragraph node per line. `textAlign` comes from `resolvedParagraphAligns` (null stays unset). */
export function frameToDoc(
  text: string,
  textAlign: StudioTextAlign | undefined,
  paragraphAligns?: readonly ParagraphAlign[] | null,
  paragraphFormats?: readonly ParagraphFormat[] | null,
): FrameDocNode {
  const aligns = resolvedParagraphAligns(text, textAlign, paragraphAligns ?? undefined);
  const formats = resolvedParagraphFormats(text, paragraphFormats);
  return {
    type: "doc",
    content: text.split("\n").map((line, index) => {
      const align = aligns[index];
      const format = formats[index];
      const attrs: Record<string, unknown> = {};
      if (align) attrs.textAlign = align;
      if (format) {
        for (const key of PARAGRAPH_FORMAT_KEYS) {
          const val = format[key];
          if (val !== undefined && val !== null) {
            attrs[key] = val;
          }
        }
      }
      const paragraph: FrameDocNode = { type: "paragraph", attrs };
      if (line) paragraph.content = [{ type: "text", text: line }];
      return paragraph;
    }),
  };
}

/** Join paragraph text with newlines and collapse alignment and formats. Dir and marks are dropped. */
export function docToFrame(
  doc: FrameDocNode | null | undefined,
  textAlign?: StudioTextAlign | null,
): {
  text: string;
  textAlign?: StudioTextAlign;
  paragraphAligns: ParagraphAlign[] | null;
  paragraphFormats: ParagraphFormat[] | null;
} {
  const paragraphs: { text: string; align: ParagraphAlign; format: ParagraphFormat }[] = [];
  collectParagraphs(doc, paragraphs);
  if (paragraphs.length === 0) paragraphs.push({ text: "", align: null, format: null });
  return {
    text: paragraphs.map((paragraph) => paragraph.text).join("\n"),
    ...collapseParagraphAligns(textAlign ?? undefined, paragraphs.map((paragraph) => paragraph.align)),
    paragraphFormats: collapseParagraphFormats(paragraphs.map((paragraph) => paragraph.format)),
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

function formatsEqual(
  frame: FrameTextState,
  nextFormats: ParagraphFormat[] | null,
): boolean {
  const currentCollapsed = collapseParagraphFormats(
    resolvedParagraphFormats(frame.text, frame.paragraphFormats),
  );
  return JSON.stringify(currentCollapsed) === JSON.stringify(nextFormats);
}

/** Null when the doc still matches the frame. A text-only edit leaves stored aligns and formats (including nulls and a legacy omission) untouched. */
export function frameContentPatch(frame: FrameTextState, doc: FrameDocNode | null | undefined): FrameDocPatch | null {
  const next = docToFrame(doc, frame.textAlign ?? undefined);
  const textSame = next.text === frame.text;
  const alignSame = collapsedEqual(frame, next);
  const formatSame = formatsEqual(frame, next.paragraphFormats);
  if (textSame && alignSame && formatSame) return null;
  const patch: FrameDocPatch = { text: next.text };
  if (!alignSame) {
    patch.textAlign = next.textAlign ?? null;
    patch.paragraphAligns = next.paragraphAligns;
  }
  if (!formatSame) {
    patch.paragraphFormats = next.paragraphFormats;
  }
  return patch;
}
