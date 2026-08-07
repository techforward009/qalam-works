// Phase 3C adapter — see docs/PHASE-3C-DOCX-SPEC.md for the full mapping
// table and the evidence behind each choice below (verified against the
// installed docx package by generating and inspecting real OOXML, not
// assumed from documentation alone).
//
// Two functions, deliberately kept separate (per Sajjad's 2026-08-07
// review): createDocxDocument is sync/pure/testable — no I/O, easy to
// assert against directly in tests. buildDocxBlob is the thin async
// wrapper around Packer.toBlob(), which is genuinely asynchronous.

import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { DocNode, Direction } from "./extractPlainText";

// Matches app/layout.tsx's next/font Noto_Nastaliq_Urdu (the same family
// the editor itself uses for RTL content via the `font-nastaliq` CSS
// class) and a standard, universally-installed LTR fallback. v1 does not
// embed the font file — see PHASE-3C-DOCX-SPEC.md §5 for the accepted
// fallback-rendering risk this carries.
const FONT_RTL = "Noto Nastaliq Urdu";
const FONT_LTR = "Calibri";

function fontFor(dir: Direction): string {
  return dir === "rtl" ? FONT_RTL : FONT_LTR;
}

const ALIGNMENT_MAP: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function alignmentFor(node: DocNode): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const textAlign = node.attrs?.textAlign;
  return typeof textAlign === "string" ? ALIGNMENT_MAP[textAlign] : undefined;
}

// Tracks list-numbering config entries as they're discovered while walking
// the document, since docx needs each distinct list registered once on the
// Document itself (numbering.config), not per-paragraph.
interface NumberingContext {
  configs: Array<{
    reference: string;
    levels: Array<{ level: number; format: (typeof LevelFormat)[keyof typeof LevelFormat]; text: string; alignment: (typeof AlignmentType)[keyof typeof AlignmentType] }>;
  }>;
  counter: number;
}

function registerList(ctx: NumberingContext, kind: "bullet" | "ordered"): string {
  ctx.counter += 1;
  const reference = `qalam-list-${ctx.counter}`;
  ctx.configs.push({
    reference,
    levels: [
      {
        level: 0,
        format: kind === "bullet" ? LevelFormat.BULLET : LevelFormat.DECIMAL,
        text: kind === "bullet" ? "•" : "%1.",
        alignment: AlignmentType.START,
      },
    ],
  });
  return reference;
}

// Walks a paragraph/heading's inline content (text nodes with marks,
// hardBreak) into docx run objects. Link hrefs are preserved as real
// hyperlinks (approved 2026-08-07); an invalid/missing href falls back to
// plain formatted text rather than dropping the content.
function convertInline(nodes: DocNode[] | undefined, dir: Direction): ParagraphChild[] {
  if (!nodes) return [];
  const runs: ParagraphChild[] = [];

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push(new TextRun({ text: "", break: 1, font: fontFor(dir) }));
      continue;
    }
    if (node.type !== "text" || typeof node.text !== "string" || node.text.length === 0) {
      continue;
    }

    const bold = node.marks?.some((m) => m.type === "bold") ?? false;
    const italics = node.marks?.some((m) => m.type === "italic") ?? false;
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;

    if (typeof href === "string" && href.trim().length > 0) {
      runs.push(
        new ExternalHyperlink({
          link: href,
          children: [
            new TextRun({ text: node.text, bold, italics, style: "Hyperlink", font: fontFor(dir) }),
          ],
        })
      );
    } else {
      runs.push(new TextRun({ text: node.text, bold, italics, font: fontFor(dir) }));
    }
  }

  return runs;
}

function convertNode(node: DocNode, dir: Direction, ctx: NumberingContext, listRef?: { reference: string }): Paragraph[] {
  switch (node.type) {
    case "paragraph": {
      return [
        new Paragraph({
          bidirectional: dir === "rtl",
          alignment: alignmentFor(node),
          numbering: listRef ? { reference: listRef.reference, level: 0 } : undefined,
          children: convertInline(node.content, dir),
        }),
      ];
    }
    case "heading": {
      const level = node.attrs?.level;
      const heading = level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1;
      return [
        new Paragraph({
          heading,
          bidirectional: dir === "rtl",
          alignment: alignmentFor(node),
          children: convertInline(node.content, dir),
        }),
      ];
    }
    case "blockquote": {
      // v1: plain indented paragraphs, no border/shading (per spec §2 —
      // DOCX doesn't render CSS-style borders the same way, out of scope).
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((child) => {
        if (child.type === "paragraph") {
          out.push(
            new Paragraph({
              bidirectional: dir === "rtl",
              indent: { start: 720 },
              children: convertInline(child.content, dir),
            })
          );
        } else {
          out.push(...convertNode(child, dir, ctx));
        }
      });
      return out;
    }
    case "bulletList": {
      const reference = registerList(ctx, "bullet");
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((item) => {
        out.push(...convertListItem(item, dir, ctx, reference));
      });
      return out;
    }
    case "orderedList": {
      const reference = registerList(ctx, "ordered");
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((item) => {
        out.push(...convertListItem(item, dir, ctx, reference));
      });
      return out;
    }
    default: {
      // Unknown/unsupported node type (tables, images — out of v1 scope
      // per the spec) — walk children defensively rather than throwing,
      // so an unexpected node doesn't fail the whole export.
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((child) => out.push(...convertNode(child, dir, ctx)));
      return out;
    }
  }
}

function convertListItem(item: DocNode, dir: Direction, ctx: NumberingContext, reference: string): Paragraph[] {
  const out: Paragraph[] = [];
  (item.content ?? []).forEach((child, i) => {
    if (i === 0 && child.type === "paragraph") {
      out.push(
        new Paragraph({
          bidirectional: dir === "rtl",
          numbering: { reference, level: 0 },
          children: convertInline(child.content, dir),
        })
      );
    } else {
      // Nested lists/extra paragraphs inside a list item — out of v1 scope
      // (spec explicitly excludes nested lists); walk without a numbering
      // reference rather than silently dropping the content.
      out.push(...convertNode(child, dir, ctx));
    }
  });
  return out;
}

/**
 * Sync, pure mapping from a TipTap-shaped DocNode to a docx.Document.
 * No I/O — safe to call directly in tests and assert on the result.
 */
export function createDocxDocument(doc: DocNode, dir: Direction): Document {
  const ctx: NumberingContext = { configs: [], counter: 0 };
  const children: Paragraph[] = [];

  (doc.content ?? []).forEach((node) => {
    children.push(...convertNode(node, dir, ctx));
  });

  return new Document({
    numbering: ctx.configs.length > 0 ? { config: ctx.configs } : undefined,
    sections: [{ children }],
  });
}

/**
 * Async — the only step that actually touches Packer/ZIP generation.
 * Kept thin on purpose so it needs no dedicated tests beyond "does this
 * resolve to a Blob"; the real mapping coverage lives in
 * createDocxDocument's tests.
 */
export async function buildDocxBlob(doc: DocNode, dir: Direction): Promise<Blob> {
  return Packer.toBlob(createDocxDocument(doc, dir));
}
