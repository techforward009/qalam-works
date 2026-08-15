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
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { DocNode, Direction } from "./extractPlainText";
import {
  directionForNode,
  resolveEditorFontFamily,
} from "./fontRegistry";

// Matches app/layout.tsx's next/font Noto_Nastaliq_Urdu (the same family
// the editor itself uses for RTL content via the `font-nastaliq` CSS
// class) and a standard, universally-installed LTR fallback. v1 does not
// embed the font file — see PHASE-3C-DOCX-SPEC.md §5 for the accepted
// fallback-rendering risk this carries.
//
// UNCHANGED in v1.1 Phase 1 (2026-08-09, per Sajjad's explicit
// instruction) — font strategy is deliberately deferred to a separate
// pass after real Word compatibility testing. Do not edit these two
// lines as part of page-layout/heading work.
const FONT_RTL = "Noto Nastaliq Urdu";
const FONT_LTR = "Inter";

// v1.1 Phase 1 — professional page layout. A4 and 1-inch margins in
// twips (1440 twips = 1 inch; A4 = 210mm × 297mm ≈ 11906 × 16838 twips,
// the same standard value docx itself already defaults to — set here
// explicitly rather than relying on the library's default, per the
// audit's finding that page size was previously entirely unset).
const PAGE_SIZE_A4 = { width: 11906, height: 16838 };
const PAGE_MARGIN = { top: 1440, bottom: 1440, left: 1440, right: 1440 };

// v1.1 Phase 1 — paragraph and line spacing, applied uniformly to every
// Paragraph this adapter creates (regular paragraphs, headings,
// blockquote lines, list items) so spacing is consistent throughout the
// document rather than varying by block type. `line: 360` is 1.5-line
// spacing in docx's twentieths-of-a-point line-spacing unit (240 =
// single, 480 = double); `before`/`after` are in twips.
const PARAGRAPH_SPACING = { before: 120, after: 120, line: 360, lineRule: LineRuleType.AUTO };

// v1.3 Phase — Professional Polish: heading-specific spacing, larger for
// higher-level headings, tapering down for H3/H4, distinct from (and
// larger than) plain PARAGRAPH_SPACING's before/after — `line`/lineRule
// stay the same 1.5-line spacing as the rest of the document for visual
// consistency, only before/after vary by level.
const HEADING_SPACING: Record<number, { before: number; after: number }> = {
  1: { before: 480, after: 240 }, // H1 — most visual separation
  2: { before: 360, after: 200 }, // H2 — medium
  3: { before: 240, after: 160 }, // H3 — smaller
  4: { before: 200, after: 120 }, // H4 — smallest, closest to body text
};

function headingSpacingFor(level: unknown): { before: number; after: number; line: number; lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] } {
  const levels = typeof level === "number" && level in HEADING_SPACING ? HEADING_SPACING[level] : HEADING_SPACING[4];
  return { ...levels, line: PARAGRAPH_SPACING.line, lineRule: PARAGRAPH_SPACING.lineRule };
}

// v1.2 Phase 2A — Enhanced Blockquote Styling. Matches the editor's own
// visual language (DocumentStudioEditor.tsx's .qalam-editor-content CSS
// uses `border-inline-start: 3px solid #d97706` — the same amber-600
// accent color used throughout the site's UI — plus a light amber tint).
// Corrects an earlier, incorrect assumption in this file's own comment
// ("DOCX doesn't render CSS-style borders the same way, out of scope") —
// verified 2026-08-09 by generating real OOXML: docx's Paragraph border/
// shading options work correctly and produce real <w:pBdr>/<w:shd>.
const BLOCKQUOTE_BORDER_COLOR = "D97706"; // amber-600, no leading '#'
const BLOCKQUOTE_SHADING_FILL = "FEF3C7"; // amber-100, subtle tint
const BLOCKQUOTE_INDENT = 720; // unchanged from v1 — 0.5in

// v1.3 Phase — blockquote text is always italic and slightly smaller than
// body text (10pt = 20 half-points; docx run sizes are in half-points),
// regardless of the DocNode's own bold/italic marks — a quotation's
// visual identity, matching common professional document conventions.
const BLOCKQUOTE_FONT_SIZE_HALF_POINTS = 20;

function fontFor(dir: Direction): string {
  return dir === "rtl" ? FONT_RTL : FONT_LTR;
}

function runFont(node: DocNode, blockDir: Direction): string {
  const styleMark = node.marks?.find((m) => m.type === "textStyle");
  return resolveEditorFontFamily(styleMark?.attrs?.fontFamily, blockDir).docxFamily;
}

// Returns true when text contains only ASCII/Latin characters (no RTL codepoints).
// Used to ensure that a pure-English header such as "Qalam Works" is always
// rendered LTR regardless of the surrounding document direction, preventing
// strange character spacing caused by inheriting RTL/Nastaliq bidi attributes.
function isPureLatinText(text: string): boolean {
  return /^[\u0000-\u024F\s]*$/.test(text);
}

// v1.1 Phase 1 — fixes a real bug found during the DOCX audit: any
// heading level other than exactly 2 previously collapsed to HEADING_1,
// silently mis-exporting H3/H4 (reachable today via TipTap's markdown
// input rules — e.g. typing "### " — even with no H3/H4 toolbar button)
// as H1. Levels 5/6, if they ever occur, fall back to HEADING_4 rather
// than silently becoming H1 again.
const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

function headingLevelFor(level: unknown): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  if (typeof level === "number" && level in HEADING_MAP) {
    return HEADING_MAP[level];
  }
  // Unrecognized/higher level (5, 6, or missing) — HEADING_4 is a safer
  // fallback than HEADING_1, since a deeper heading is visually closer
  // in intent to H4 than to a top-level H1.
  return HeadingLevel.HEADING_4;
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
    levels: Array<{
      level: number;
      format: (typeof LevelFormat)[keyof typeof LevelFormat];
      text: string;
      alignment: (typeof AlignmentType)[keyof typeof AlignmentType];
      style?: { paragraph?: { indent?: { start: number } } };
    }>;
  }>;
  counter: number;
}

// v1.2 Phase 2A — one list level's definition. Indent increases 720
// twips (0.5in) per depth, matching Word's own default multi-level list
// indent convention — verified empirically that a single numbering
// reference can mix formats across levels (e.g. bullet at level 0,
// decimal at level 1) for correctly nested "mixed" lists.
function levelDefinition(depth: number, kind: "bullet" | "ordered") {
  return {
    level: depth,
    format: kind === "bullet" ? LevelFormat.BULLET : LevelFormat.DECIMAL,
    text: kind === "bullet" ? "•" : `%${depth + 1}.`,
    alignment: AlignmentType.START,
    style: { paragraph: { indent: { start: 720 + depth * 720 } } },
  };
}

// Registers a brand-new, independent list — used only for a TOP-LEVEL
// bulletList/orderedList (one that isn't nested inside another list's
// item). Unchanged behavior from v1: each top-level list still gets its
// own reference, starting at level 0.
function registerList(ctx: NumberingContext, kind: "bullet" | "ordered"): string {
  ctx.counter += 1;
  const reference = `qalam-list-${ctx.counter}`;
  ctx.configs.push({ reference, levels: [levelDefinition(0, kind)] });
  return reference;
}

// v1.2 Phase 2A — adds a new nesting level to an ALREADY-registered list
// reference (rather than creating a whole separate, unrelated list), so
// a nested bulletList/orderedList found inside a listItem visually nests
// under its parent using the same coherent numbering definition. A
// no-op if that depth is already defined (e.g. a second nested list at
// the same depth reuses the existing level).
function ensureLevel(ctx: NumberingContext, reference: string, depth: number, kind: "bullet" | "ordered"): void {
  const config = ctx.configs.find((c) => c.reference === reference);
  if (!config) return;
  if (!config.levels.some((l) => l.level === depth)) {
    config.levels.push(levelDefinition(depth, kind));
  }
}

// Walks a paragraph/heading's inline content (text nodes with marks,
// hardBreak) into docx run objects. Link hrefs are preserved as real
// hyperlinks (approved 2026-08-07); an invalid/missing href falls back to
// plain formatted text rather than dropping the content.
//
// v1.3 Phase: `overrides` is optional and only passed by the blockquote
// case below — every other call site (paragraph, heading, list item)
// omits it, so their output is byte-for-byte unchanged from before.
function convertInline(
  nodes: DocNode[] | undefined,
  dir: Direction,
  overrides?: { forceItalic?: boolean; size?: number }
): ParagraphChild[] {
  if (!nodes) return [];
  const runs: ParagraphChild[] = [];

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push(new TextRun({ text: "", break: 1, font: runFont(node, dir), size: overrides?.size }));
      continue;
    }
    if (node.type !== "text" || typeof node.text !== "string" || node.text.length === 0) {
      continue;
    }

    const bold = node.marks?.some((m) => m.type === "bold") ?? false;
    const italics = overrides?.forceItalic || (node.marks?.some((m) => m.type === "italic") ?? false);
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;

    if (typeof href === "string" && href.trim().length > 0) {
      runs.push(
        new ExternalHyperlink({
          link: href,
          children: [
            new TextRun({ text: node.text, bold, italics, style: "Hyperlink", font: runFont(node, dir), size: overrides?.size }),
          ],
        })
      );
    } else {
      runs.push(new TextRun({ text: node.text, bold, italics, font: runFont(node, dir), size: overrides?.size }));
    }
  }

  return runs;
}

function convertNode(node: DocNode, dir: Direction, ctx: NumberingContext, listRef?: { reference: string }): Paragraph[] {
  switch (node.type) {
    case "paragraph": {
      const blockDir = directionForNode(node, dir);
      return [
        new Paragraph({
          bidirectional: blockDir === "rtl",
          alignment: alignmentFor(node),
          spacing: PARAGRAPH_SPACING,
          numbering: listRef ? { reference: listRef.reference, level: 0 } : undefined,
          children: convertInline(node.content, blockDir),
        }),
      ];
    }
    case "heading": {
      const blockDir = directionForNode(node, dir);
      const level = node.attrs?.level;
      const heading = headingLevelFor(level);
      return [
        new Paragraph({
          heading,
          bidirectional: blockDir === "rtl",
          alignment: alignmentFor(node),
          spacing: headingSpacingFor(level),
          children: convertInline(node.content, blockDir),
        }),
      ];
    }
    case "blockquote": {
      // v1.2 Phase 2A: real border + shading (previously plain indent
      // only — see the BLOCKQUOTE_* constants' comment for why the old
      // "DOCX doesn't support this" assumption was incorrect). Border
      // goes on the side text visually starts from — right for RTL,
      // left for LTR — matching the editor's own `border-inline-start`
      // CSS behavior rather than a fixed physical side.
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((child) => {
        if (child.type === "paragraph") {
          out.push(
            new Paragraph({
              bidirectional: dir === "rtl",
              indent: { start: BLOCKQUOTE_INDENT },
              spacing: PARAGRAPH_SPACING,
              border: {
                [dir === "rtl" ? "right" : "left"]: {
                  style: BorderStyle.SINGLE,
                  size: 12,
                  color: BLOCKQUOTE_BORDER_COLOR,
                },
              },
              shading: { fill: BLOCKQUOTE_SHADING_FILL },
              children: convertInline(child.content, dir, { forceItalic: true, size: BLOCKQUOTE_FONT_SIZE_HALF_POINTS }),
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
        out.push(...convertListItem(item, dir, ctx, reference, 0));
      });
      return out;
    }
    case "orderedList": {
      const reference = registerList(ctx, "ordered");
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((item) => {
        out.push(...convertListItem(item, dir, ctx, reference, 0));
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

// v1.2 Phase 2A: `depth` (default 0, unchanged for existing flat lists)
// tracks nesting level. A nested bulletList/orderedList found inside a
// listItem's content — previously fell through to convertNode's default
// case and flattened to the SAME level with a brand-new, unrelated
// numbering reference — now correctly adds a new level to the PARENT
// list's own reference and recurses at depth+1, so it visually nests
// under its parent with proper indent, supporting mixed bullet/numbered
// nesting too.
function convertListItem(item: DocNode, dir: Direction, ctx: NumberingContext, reference: string, depth: number): Paragraph[] {
  const out: Paragraph[] = [];
  (item.content ?? []).forEach((child, i) => {
    if (i === 0 && child.type === "paragraph") {
      out.push(
        new Paragraph({
          bidirectional: dir === "rtl",
          numbering: { reference, level: depth },
          spacing: PARAGRAPH_SPACING,
          children: convertInline(child.content, dir),
        })
      );
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      const nestedKind = child.type === "bulletList" ? "bullet" : "ordered";
      const nestedDepth = depth + 1;
      ensureLevel(ctx, reference, nestedDepth, nestedKind);
      (child.content ?? []).forEach((nestedItem) => {
        out.push(...convertListItem(nestedItem, dir, ctx, reference, nestedDepth));
      });
    } else {
      // Any other extra content inside a list item (e.g. a second
      // paragraph that isn't a nested list) — out of v1 scope, same as
      // before; walk without a numbering reference rather than
      // silently dropping it.
      out.push(...convertNode(child, dir, ctx));
    }
  });
  return out;
}

// v1.3 Phase — derives a document title from the DocNode itself (the
// first H1 heading's plain text), falling back to "Qalam Works" if none
// exists. No new parameter added to createDocxDocument's signature — the
// title comes entirely from data already present in `doc`, so no other
// file needs to change to supply it.
// v1.4 (2026-08-09) — fixes a documented limitation from v1.3: title
// detection only checked doc.content[0], so a document starting with a
// plain paragraph (or anything other than an H1) always fell back to
// "Qalam Works" even when a real H1 existed further down. Now searches
// the entire top-level node list and uses the FIRST H1 found anywhere,
// preserving the same "Qalam Works" fallback when none exists at all.
function deriveDocumentTitle(doc: DocNode): string {
  for (const node of doc.content ?? []) {
    if (node.type === "heading" && node.attrs?.level === 1) {
      const text = (node.content ?? [])
        .filter((n) => n.type === "text" && typeof n.text === "string")
        .map((n) => n.text)
        .join("");
      if (text.trim().length > 0) return text;
    }
  }
  return "Qalam Works";
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

  const title = deriveDocumentTitle(doc);

  return new Document({
    // v1.3 Phase — Professional Polish: document metadata. Subject and
    // Keywords are Qalam Works' own reasonable defaults (not derivable
    // from the DocNode) — Subject describes the export's origin, and
    // Keywords reflects the language direction actually used.
    title,
    creator: "Qalam Works",
    subject: "Document exported from Qalam Works Document Studio",
    keywords: dir === "rtl" ? "Urdu, Arabic, Persian, RTL" : "English, LTR",
    numbering: ctx.configs.length > 0 ? { config: ctx.configs } : undefined,
    sections: [
      {
        properties: {
          page: {
            size: PAGE_SIZE_A4,
            margin: PAGE_MARGIN,
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                // Pure-Latin titles (e.g. "Qalam Works") must always render LTR with
                // a standard Latin font, regardless of the document's own direction.
                // Inheriting RTL bidi here caused strange character spacing in Word.
                bidirectional: isPureLatinText(title) ? false : dir === "rtl",
                children: [new TextRun({ text: title, font: isPureLatinText(title) ? FONT_LTR : fontFor(dir), size: 18 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    font: fontFor(dir),
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
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
