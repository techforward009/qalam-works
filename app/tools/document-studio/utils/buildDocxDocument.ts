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
  PageOrientation,
  Packer,
  TabStopPosition,
  TabStopType,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import type { DocNode, Direction } from "./extractPlainText";
import { deriveDocumentTitle } from "./extractPlainText";
import { resolveFontSizePt, type DocumentStudioSettings, defaultDocumentSettings, validateLineHeight, validateIndentMm, validateSpacingPt } from "./documentSettings";
import { BLOCK_STYLES, isBlockStyleId } from "./documentStyles";
import { resolvePageLayout, resolvePageDimensions, mmToTwips, ptToHalfPoints, resolvePhysicalMargins } from "./pageLayout";
import {
  directionForNode,
  resolveEditorFontFamily,
  getFontById,
  type FontResolution,
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

// Batch 16A — resolves a body PARAGRAPH's spacing/indent following
// EXPLICIT TIPTAP FORMAT > DOCUMENT SETTINGS DEFAULT > SYSTEM FALLBACK:
// an explicit per-block attr (set via the editor's real schema attrs)
// always wins; otherwise falls back to documentSettings.typography;
// otherwise the original PARAGRAPH_SPACING constant (so callers that
// still pass the default settings object see identical output to
// before this change). Headings keep their own canonical HEADING_SPACING
// unaffected — this only applies to plain body paragraphs, matching the
// brief's "Headings may still have canonical heading spacing."
function resolveParagraphSpacingAndIndent(
  node: DocNode,
  typography: DocumentStudioSettings["typography"]
): {
  spacing: { before: number; after: number; line: number; lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] };
  indent?: { start?: number; end?: number; firstLine?: number };
} {
  const mmToTwips = (mm: number) => Math.round((mm / 25.4) * 1440);
  const ptToTwips = (pt: number) => Math.round(pt * 20);

  const beforePt = (typeof node.attrs?.spaceBeforePt === "number" ? validateSpacingPt(node.attrs.spaceBeforePt) : null) ?? typography.paragraphBeforePt;
  const afterPt = (typeof node.attrs?.spaceAfterPt === "number" ? validateSpacingPt(node.attrs.spaceAfterPt) : null) ?? typography.paragraphAfterPt;
  const lineHeight = (typeof node.attrs?.lineHeight === "number" ? validateLineHeight(node.attrs.lineHeight) : null) ?? typography.lineHeight;
  const firstLineIndentMm =
    (typeof node.attrs?.firstLineIndentMm === "number" ? validateIndentMm(node.attrs.firstLineIndentMm) : null) ?? typography.firstLineIndentMm;
  const indentStartMm = typeof node.attrs?.indentStartMm === "number" ? validateIndentMm(node.attrs.indentStartMm) : null;
  const indentEndMm = typeof node.attrs?.indentEndMm === "number" ? validateIndentMm(node.attrs.indentEndMm) : null;

  const spacing = {
    before: ptToTwips(beforePt),
    after: ptToTwips(afterPt),
    line: Math.round(lineHeight * 240),
    lineRule: LineRuleType.AUTO,
  };

  const indent: { start?: number; end?: number; firstLine?: number } = {};
  if (indentStartMm !== null) indent.start = mmToTwips(indentStartMm);
  if (indentEndMm !== null) indent.end = mmToTwips(indentEndMm);
  if (firstLineIndentMm > 0) indent.firstLine = mmToTwips(firstLineIndentMm);

  return { spacing, indent: Object.keys(indent).length > 0 ? indent : undefined };
}

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

// Batch 16A.1 correction (item 4) — headings can now carry explicit
// lineHeight/spaceBeforePt/spaceAfterPt (added to the schema in Batch
// 16A), but this always ignored them in favor of the canonical
// per-level HEADING_SPACING. Precedence is now: EXPLICIT HEADING ATTR >
// CANONICAL HEADING DEFAULT > SYSTEM FALLBACK — canonical heading
// spacing remains the default (document body paragraph spacing never
// substitutes for it), but a genuine user override on that specific
// heading is honored.
function headingSpacingFor(
  level: unknown,
  node: DocNode
): { before: number; after: number; line: number; lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] } {
  const canonical = typeof level === "number" && level in HEADING_SPACING ? HEADING_SPACING[level] : HEADING_SPACING[4];
  const beforePt = typeof node.attrs?.spaceBeforePt === "number" ? validateSpacingPt(node.attrs.spaceBeforePt) : null;
  const afterPt = typeof node.attrs?.spaceAfterPt === "number" ? validateSpacingPt(node.attrs.spaceAfterPt) : null;
  const lineHeight = typeof node.attrs?.lineHeight === "number" ? validateLineHeight(node.attrs.lineHeight) : null;
  return {
    before: beforePt !== null ? Math.round(beforePt * 20) : canonical.before,
    after: afterPt !== null ? Math.round(afterPt * 20) : canonical.after,
    line: lineHeight !== null ? Math.round(lineHeight * 240) : PARAGRAPH_SPACING.line,
    lineRule: PARAGRAPH_SPACING.lineRule,
  };
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

// Batch 16A correction — resolves a run's font family following EXPLICIT
// FONTFAMILY MARK > DOCUMENT SETTINGS DEFAULT > SYSTEM FALLBACK, without
// bypassing fontRegistry: when no explicit mark exists, this substitutes
// the SETTINGS default font's own editorFamily string as the "requested"
// value into the exact same resolveEditorFontFamily() the explicit-mark
// path already uses — so unsupported/misconfigured default fonts still
// fall back exactly the way an explicit but unsupported font choice
// always has. Existing callers that don't pass typography see identical
// behavior to before (falls through to resolveEditorFontFamily's own
// hardcoded default).
function resolveEffectiveFontFamily(
  rawFontFamily: unknown,
  blockDir: Direction,
  typography?: DocumentStudioSettings["typography"]
): FontResolution {
  if (typeof rawFontFamily === "string" && rawFontFamily.trim().length > 0) {
    return resolveEditorFontFamily(rawFontFamily, blockDir);
  }
  if (typography) {
    const defaultId = blockDir === "rtl" ? typography.defaultRtlFontId : typography.defaultLtrFontId;
    const def = getFontById(defaultId);
    if (def?.editorFamily) {
      return resolveEditorFontFamily(def.editorFamily, blockDir);
    }
  }
  return resolveEditorFontFamily(null, blockDir);
}

function runFont(node: DocNode, blockDir: Direction, typography?: DocumentStudioSettings["typography"]): string {
  const styleMark = node.marks?.find((m) => m.type === "textStyle");
  return resolveEffectiveFontFamily(styleMark?.attrs?.fontFamily, blockDir, typography).docxFamily;
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
  typography: DocumentStudioSettings["typography"],
  overrides?: { forceItalic?: boolean; size?: number },
  blockDefaults?: { fontSizePt?: number; bold?: boolean }
): ParagraphChild[] {
  if (!nodes) return [];
  const runs: ParagraphChild[] = [];
  // Batch 16A correction — EXPLICIT FONTSIZE MARK > BLOCK STYLE DEFAULT >
  // SETTINGS DEFAULT > SYSTEM FALLBACK.
  const blockDefaultSizeHalfPoints = blockDefaults?.fontSizePt ? ptToHalfPoints(blockDefaults.fontSizePt) : null;
  const defaultSizeHalfPoints = blockDefaultSizeHalfPoints ?? ptToHalfPoints(typography.bodyFontSizePt);

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push(new TextRun({ text: "", break: 1, font: runFont(node, dir, typography), size: overrides?.size ?? defaultSizeHalfPoints }));
      continue;
    }
    if (node.type !== "text" || typeof node.text !== "string" || node.text.length === 0) {
      continue;
    }

    // Block-style bold (e.g. Title) applies as a default for every run in
    // the block — same ceiling the editor's own [data-block-style] CSS
    // rule imposes (it also can't selectively un-bold one run within a
    // Title paragraph, since presentation is applied at the block level
    // in both places identically).
    const bold = (node.marks?.some((m) => m.type === "bold") ?? false) || (blockDefaults?.bold ?? false);
    const italics = overrides?.forceItalic || (node.marks?.some((m) => m.type === "italic") ?? false);
    const underline = node.marks?.some((m) => m.type === "underline") ?? false;
    const linkMark = node.marks?.find((m) => m.type === "link");
    const href = linkMark?.attrs?.href;
    const styleMark = node.marks?.find((m) => m.type === "textStyle");
    const sizePt = resolveFontSizePt(styleMark?.attrs?.fontSize);
    const size = overrides?.size ?? (sizePt != null ? ptToHalfPoints(sizePt) : defaultSizeHalfPoints);

    if (typeof href === "string" && href.trim().length > 0) {
      runs.push(
        new ExternalHyperlink({
          link: href,
          children: [
            new TextRun({
              text: node.text,
              bold,
              italics,
              underline: underline ? {} : undefined,
              style: "Hyperlink",
              font: runFont(node, dir, typography),
              size,
            }),
          ],
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: node.text,
          bold,
          italics,
          underline: underline ? {} : undefined,
          font: runFont(node, dir, typography),
          size,
        })
      );
    }
  }

  return runs;
}

function convertNode(
  node: DocNode,
  dir: Direction,
  ctx: NumberingContext,
  typography: DocumentStudioSettings["typography"],
  listRef?: { reference: string }
): Paragraph[] {
  switch (node.type) {
    case "paragraph": {
      const blockDir = directionForNode(node, dir);
      const { spacing, indent } = resolveParagraphSpacingAndIndent(node, typography);
      // Batch 16A correction — canonical block-style presentation
      // (Title/Subtitle/Caption), sourced from documentStyles.ts's
      // BLOCK_STYLES (same single source of truth the editor CSS and PDF
      // exporter both use). Applied as computed OUTPUT formatting for
      // this export only — never written back into the source document
      // as a stamped mark, so it stays a clean, non-destructive default
      // exactly like the editor's own CSS-driven presentation.
      const blockStyleId = typeof node.attrs?.blockStyle === "string" && isBlockStyleId(node.attrs.blockStyle) ? node.attrs.blockStyle : null;
      const styleDef = blockStyleId ? BLOCK_STYLES[blockStyleId] : null;
      return [
        new Paragraph({
          bidirectional: blockDir === "rtl",
          alignment: alignmentFor(node) ?? (styleDef?.align ? ALIGNMENT_MAP[styleDef.align] : undefined),
          spacing,
          indent,
          numbering: listRef ? { reference: listRef.reference, level: 0 } : undefined,
          children: convertInline(node.content, blockDir, typography, undefined, {
            fontSizePt: styleDef?.defaultFontSizePt,
            bold: styleDef?.bold,
          }),
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
          spacing: headingSpacingFor(level, node),
          children: convertInline(node.content, blockDir, typography),
        }),
      ];
    }
    case "blockquote": {
      // Border and bidi follow each child's resolved direction, not only
      // the document-level dir — mixed RTL/LTR quotes export correctly.
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((child) => {
        if (child.type === "paragraph") {
          const blockDir = directionForNode(child, dir);
          // Batch 16A correction — line-height/before/after now come from
          // the shared resolver (explicit attr > typography default),
          // same as ordinary paragraphs. BLOCKQUOTE_INDENT is kept as-is
          // (the quote's own established visual indent, distinct from the
          // new user-configurable indentStartMm/indentEndMm concept) —
          // preserving existing quote styling exactly.
          const { spacing: quoteSpacing } = resolveParagraphSpacingAndIndent(child, typography);
          out.push(
            new Paragraph({
              bidirectional: blockDir === "rtl",
              indent: { start: BLOCKQUOTE_INDENT },
              spacing: quoteSpacing,
              border: {
                [blockDir === "rtl" ? "right" : "left"]: {
                  style: BorderStyle.SINGLE,
                  size: 12,
                  color: BLOCKQUOTE_BORDER_COLOR,
                },
              },
              shading: { fill: BLOCKQUOTE_SHADING_FILL },
              children: convertInline(child.content, blockDir, typography, {
                forceItalic: true,
                size: BLOCKQUOTE_FONT_SIZE_HALF_POINTS,
              }),
            })
          );
        } else {
          out.push(...convertNode(child, dir, ctx, typography));
        }
      });
      return out;
    }
    case "bulletList": {
      const reference = registerList(ctx, "bullet");
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((item) => {
        out.push(...convertListItem(item, dir, ctx, reference, 0, typography));
      });
      return out;
    }
    case "orderedList": {
      const reference = registerList(ctx, "ordered");
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((item) => {
        out.push(...convertListItem(item, dir, ctx, reference, 0, typography));
      });
      return out;
    }
    default: {
      // Unknown/unsupported node type (tables, images — out of v1 scope
      // per the spec) — walk children defensively rather than throwing,
      // so an unexpected node doesn't fail the whole export.
      const out: Paragraph[] = [];
      (node.content ?? []).forEach((child) => out.push(...convertNode(child, dir, ctx, typography)));
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
function convertListItem(item: DocNode, dir: Direction, ctx: NumberingContext, reference: string, depth: number, typography: DocumentStudioSettings["typography"]): Paragraph[] {
  const out: Paragraph[] = [];
  (item.content ?? []).forEach((child, i) => {
    if (i === 0 && child.type === "paragraph") {
      const blockDir = directionForNode(child, dir);
      // Batch 16A correction — list-item paragraphs previously used the
      // hardcoded PARAGRAPH_SPACING unconditionally, silently ignoring
      // both an explicit per-block lineHeight the editor can genuinely
      // set on a list-item paragraph, and the document-wide typography
      // defaults. Only spacing/line-height come from the shared
      // resolver — the numbering indent stays list-numbering's own
      // (untouched), matching "preserve existing list numbering styling."
      const { spacing } = resolveParagraphSpacingAndIndent(child, typography);
      out.push(
        new Paragraph({
          bidirectional: blockDir === "rtl",
          numbering: { reference, level: depth },
          spacing,
          children: convertInline(child.content, blockDir, typography),
        })
      );
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      const nestedKind = child.type === "bulletList" ? "bullet" : "ordered";
      const nestedDepth = depth + 1;
      ensureLevel(ctx, reference, nestedDepth, nestedKind);
      (child.content ?? []).forEach((nestedItem) => {
        out.push(...convertListItem(nestedItem, dir, ctx, reference, nestedDepth, typography));
      });
    } else {
      // Any other extra content inside a list item (e.g. a second
      // paragraph that isn't a nested list) — out of v1 scope, same as
      // before; walk without a numbering reference rather than
      // silently dropping it.
      out.push(...convertNode(child, dir, ctx, typography));
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
/**
 * Sync, pure mapping from a TipTap-shaped DocNode to a docx.Document.
 * No I/O — safe to call directly in tests and assert on the result.
 */
/** Resolves an effective DOCX font family through fontRegistry for header/footer text. */
function resolveHFFont(text: string, docDir: Direction, typography: DocumentStudioSettings["typography"]): string {
  const isLatin = isPureLatinText(text);
  if (isLatin) return resolveEditorFontFamily(getFontById(typography.defaultLtrFontId).editorFamily, "ltr").docxFamily;
  return resolveEditorFontFamily(getFontById(typography.defaultRtlFontId).editorFamily, docDir).docxFamily;
}

/** Builds the DOCX footer paragraph supporting footerText + pageNumbers together. */
function buildDocxFooterParagraph(settings: DocumentStudioSettings, dir: Direction): Paragraph {
  const { footerText, pageNumbers } = settings.headerFooter;
  const hasText = footerText.trim().length > 0;
  const hasNumbers = pageNumbers !== "none";
  const font = resolveHFFont(footerText || "x", dir, settings.typography);
  const SZ = 18;

  if (!hasText && !hasNumbers) {
    return new Paragraph({ children: [new TextRun({ text: "", font, size: SZ })] });
  }
  if (hasText && !hasNumbers) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: !isPureLatinText(footerText) && dir === "rtl",
      children: [new TextRun({ text: footerText, font, size: SZ })],
    });
  }
  // Footers with page numbers use tab layout: text at start side, number at end side.
  const pageRun =
    pageNumbers === "current"
      ? new TextRun({ children: [PageNumber.CURRENT], font, size: SZ })
      : new TextRun({ children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], font, size: SZ });

  if (!hasText) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [pageRun],
    });
  }
  // Text + numbers: text flush start, number flush end via tab stop.
  return new Paragraph({
    bidirectional: !isPureLatinText(footerText) && dir === "rtl",
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: footerText, font, size: SZ }),
      new TextRun({ text: "\t", font, size: SZ }),
      pageRun,
    ],
  });
}

export function createDocxDocument(doc: DocNode, dir: Direction, settings: DocumentStudioSettings = defaultDocumentSettings()): Document {
  const ctx: NumberingContext = { configs: [], counter: 0 };
  const children: Paragraph[] = [];

  (doc.content ?? []).forEach((node) => {
    children.push(...convertNode(node, dir, ctx, settings.typography));
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
          page: (() => {
            const layout = resolvePageLayout({
              size: settings.page.size,
              orientation: settings.page.orientation,
              marginPreset: settings.page.margins.preset,
              customMargins: settings.page.margins,
            });
            return {
              size: {
                // Batch 16B — docx.js's own PageSize internally swaps
                // width/height based on `orientation` (verified in its
                // source: width uses height's value when orientation is
                // landscape, and vice versa). Passing already-swapped
                // dimensions here would double-swap. Always pass PORTRAIT
                // base dimensions and let the library's real API do the
                // swap for w:orient.
                width: mmToTwips(resolvePageDimensions(layout.size, "portrait").widthMm),
                height: mmToTwips(resolvePageDimensions(layout.size, "portrait").heightMm),
                orientation: layout.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              },
              margin: (() => {
                const physical = resolvePhysicalMargins(layout.margins, dir);
                return {
                  top: mmToTwips(layout.margins.topMm),
                  bottom: mmToTwips(layout.margins.bottomMm),
                  left: mmToTwips(physical.leftMm),
                  right: mmToTwips(physical.rightMm),
                };
              })(),
            };
          })(),
        },
        headers: settings.headerFooter.headerEnabled
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    bidirectional: !isPureLatinText(
                      settings.headerFooter.headerMode === "custom" && settings.headerFooter.headerText
                        ? settings.headerFooter.headerText
                        : title
                    ) && dir === "rtl",
                    children: [
                      new TextRun({
                        text:
                          settings.headerFooter.headerMode === "custom" && settings.headerFooter.headerText
                            ? settings.headerFooter.headerText
                            : title,
                        font: resolveHFFont(
                          settings.headerFooter.headerMode === "custom" && settings.headerFooter.headerText
                            ? settings.headerFooter.headerText
                            : title,
                          dir,
                          settings.typography
                        ),
                        size: 18,
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        footers: settings.headerFooter.footerEnabled
          ? {
              default: new Footer({
                children: [buildDocxFooterParagraph(settings, dir)],
              }),
            }
          : undefined,
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
export async function buildDocxBlob(doc: DocNode, dir: Direction, settings?: DocumentStudioSettings): Promise<Blob> {
  return Packer.toBlob(createDocxDocument(doc, dir, settings ?? defaultDocumentSettings()));
}
