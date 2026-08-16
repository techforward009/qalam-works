"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../lib/language-context";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
// Batch 16A correction (item 7) — removed the direct `import Underline
// from "@tiptap/extension-underline"`: StarterKit v3 (already configured
// below) bundles its own Underline extension internally, so this import
// was unused — toggleUnderline()/isActive("underline") work via
// StarterKit's own copy, confirmed by inspecting the installed package.
import { extractPlainText, createDocumentAnalysisContext, type DocNode } from "../utils/extractPlainText";
import { normalizeDocumentNodes, type NormalizeReport } from "../utils/normalizeDocumentNodes";
import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import { displayDirForPaste } from "../../../utils/processing/cleanTextPipeline";
import { listEditorFonts, getFontById } from "../utils/fontRegistry";
import {
  defaultDocumentSettings,
  loadDocumentSettings,
  saveDocumentSettings,
  clearDocumentSettings,
  FONT_SIZE_OPTIONS_PT,
  LINE_HEIGHT_OPTIONS,
  resolveFontSizePt,
  validateLineHeight,
  validateIndentMm,
  validateSpacingPt,
  type DocumentStudioSettings,
} from "../utils/documentSettings";
import { resolvePageLayout, mmToPx, resolvePhysicalMargins, resolveResponsivePagePadding, MARGIN_MIN_MM, MARGIN_MAX_MM, clampMarginMm } from "../utils/pageLayout";
import { BLOCK_STYLES, BLOCK_STYLE_IDS, isBlockStyleId, type BlockStyleId } from "../utils/documentStyles";
import {
  applyPresetToSettings,
  getPreset,
  loadSelectedPresetId,
  saveSelectedPresetId,
  type PresetId,
} from "../utils/publishingPresets";
import { buildDocumentAuditReport, type QualityAuditReport } from "../utils/buildDocumentAuditReport";
import { buildDocumentStats, type DocumentStats } from "../utils/buildDocumentStats";
import { buildDocumentHealthReport, type DocumentHealthReport } from "../utils/buildDocumentHealthReport";
import { generateDocumentSuggestions, type DocumentSuggestion } from "../utils/generateDocumentSuggestions";
import { findAllTextMatches } from "../utils/findReplace";
import { extractDocumentOutline, type OutlineEntry } from "../utils/documentOutline";
import {
  addGlossaryEntry,
  updateGlossaryEntry,
  removeGlossaryEntry,
  loadGlossary,
  saveGlossary,
  exportGlossaryToJson,
  importGlossaryFromJson,
  type GlossaryEntry,
} from "../utils/glossary";
import {
  createReviewState,
  acceptSuggestion,
  ignoreSuggestion,
  acceptCategory,
  ignoreCategory,
  refreshPendingSuggestions,
  suggestionKey,
  type SuggestionReviewState,
} from "../utils/suggestionReview";
import { buildDocxBlob } from "../utils/buildDocxDocument";
import { plainTextToDocNode, normalizeDocxParagraphBreaks } from "../utils/plainTextToDocNode";
import { QualityAuditPanel } from "./QualityAuditPanel";
import { DocumentStatsBar } from "./DocumentStatsBar";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { FindReplacePanel } from "./FindReplacePanel";
import { DocumentOutlinePanel } from "./DocumentOutlinePanel";
import { GlossaryPanel } from "./GlossaryPanel";
import { WordRuler } from "./WordRuler";
import { PublishingPresetSelector } from "./PublishingPresetSelector";
import { validateFile } from "../../../utils/fileValidation";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";
import { formatFileSize } from "../../../utils/formatFileSize";

const DRAFT_STORAGE_KEY = "qalam-document-studio-draft";
const AUTOSAVE_DEBOUNCE_MS = 1000;

// Maintenance Batch (2026-08-09) — Health Report/Stats/Suggestions
// analysis is real work (measured ~30ms combined on a ~500-paragraph
// document during the Document Intelligence audit) and previously ran on
// EVERY keystroke with no debounce. For small documents (the common
// case) that's imperceptible and stays instant — only documents at or
// above this rough size threshold get debounced, so normal short-
// document editing is not delayed at all. ANALYSIS_DEBOUNCE_MS is
// intentionally short (not the slower 1s autosave interval) so even
// large-document typing still feels responsive, just coalesced.
const LARGE_DOCUMENT_CHAR_THRESHOLD = 5000;
const ANALYSIS_DEBOUNCE_MS = 300;

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`h-[38px] px-3 rounded-md text-sm font-semibold border transition-all ${
        active
          ? "bg-[#1A3A2A] text-white border-[#1A3A2A]"
          : "bg-white text-gray-600 border-gray-200 hover:border-[#B8935A] hover:text-[#1A3A2A]"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-[26px] bg-gray-200 mx-1.5 self-center" />;
}


/** Persist writing direction on textblocks so empty RTL paragraphs place the caret on the right. */
// Batch 16A (2026-08-11) — real, persistent schema attrs. Previously
// only `dir` was declared here; block-style/line-height/indent/spacing
// attrs were being set via updateAttributes() WITHOUT being declared in
// the schema, which TipTap does not persist through getJSON()/reload —
// a real, verified bug (confirmed via round-trip test). `blockStyle`
// renders as `data-block-style` (CSS-driven presentation — see the
// editor's own <style jsx global> block below — never stamps inline
// FontSize/Bold/TextAlign marks, so switching styles is always a clean,
// symmetric reset with zero risk of leftover marks from a previous
// style). `lineHeight` renders as a real inline style (matching what
// buildPdfHtml.ts's openAttrs() already expected — that code was
// correct and simply never reachable before now). The remaining spacing/
// indent attrs render as data-* attributes: PDF/DOCX exporters read them
// directly from node.attrs (not from parsed HTML), so their correctness
// does not depend on live in-editor visual rendering.
const PARAGRAPH_STYLE_ATTRS = {
  blockStyle: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-block-style");
      // Batch 16A correction (item 6) — validate against the canonical
      // BlockStyleId set; an unrecognized/corrupted imported value falls
      // back to null (plain paragraph) rather than flowing an arbitrary
      // string into PDF/DOCX lookups downstream.
      return v && isBlockStyleId(v) ? v : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      // Batch 16A.1 correction (item 5) — parseHTML only runs for content
      // parsed FROM the DOM/HTML; a document loaded directly from JSON
      // (e.g. Editor content prop / setContent from localStorage) never
      // goes through it, so a corrupted stored value could otherwise
      // reach renderHTML — and from there, PDF/DOCX or the editor's own
      // rendered style — unvalidated. Re-validate here as the JSON-safe
      // choke point.
      const v = isBlockStyleId(attributes.blockStyle) ? attributes.blockStyle : null;
      return v ? { "data-block-style": v } : {};
    },
  },
  lineHeight: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.style.lineHeight;
      const n = v ? parseFloat(v) : NaN;
      return validateLineHeight(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.lineHeight === "number" ? validateLineHeight(attributes.lineHeight) : null;
      return v !== null ? { style: `line-height:${v}` } : {};
    },
  },
  firstLineIndentMm: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-first-line-indent-mm");
      const n = v ? parseFloat(v) : NaN;
      return validateIndentMm(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.firstLineIndentMm === "number" ? validateIndentMm(attributes.firstLineIndentMm) : null;
      // Batch 16B — visual preview via a real inline style (TipTap's
      // mergeAttributes concatenates style fragments from multiple
      // attrs, confirmed safe). Logical CSS property so it flips with
      // the element's own dir automatically.
      return v !== null && v > 0 ? { "data-first-line-indent-mm": String(v), style: `text-indent:${v}mm` } : {};
    },
  },
  indentStartMm: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-indent-start-mm");
      const n = v ? parseFloat(v) : NaN;
      return validateIndentMm(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.indentStartMm === "number" ? validateIndentMm(attributes.indentStartMm) : null;
      return v !== null ? { "data-indent-start-mm": String(v), style: `margin-inline-start:${v}mm` } : {};
    },
  },
  indentEndMm: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-indent-end-mm");
      const n = v ? parseFloat(v) : NaN;
      return validateIndentMm(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.indentEndMm === "number" ? validateIndentMm(attributes.indentEndMm) : null;
      return v !== null ? { "data-indent-end-mm": String(v), style: `margin-inline-end:${v}mm` } : {};
    },
  },
  spaceBeforePt: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-space-before-pt");
      const n = v ? parseFloat(v) : NaN;
      return validateSpacingPt(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.spaceBeforePt === "number" ? validateSpacingPt(attributes.spaceBeforePt) : null;
      return v !== null ? { "data-space-before-pt": String(v), style: `margin-block-start:${v}pt` } : {};
    },
  },
  spaceAfterPt: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-space-after-pt");
      const n = v ? parseFloat(v) : NaN;
      return validateSpacingPt(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.spaceAfterPt === "number" ? validateSpacingPt(attributes.spaceAfterPt) : null;
      return v !== null ? { "data-space-after-pt": String(v), style: `margin-block-end:${v}pt` } : {};
    },
  },
};

// Batch 16A.1 correction (item 2) — the editor's [data-block-style] CSS
// previously hardcoded 1.9rem/1.25rem/0.7rem, diverging from
// documentStyles.ts's canonical 28pt/18pt/10pt (the same values PDF and
// DOCX both already use). Generated here directly from BLOCK_STYLES so
// there is exactly one source of truth — pt values convert to rem at
// the browser's standard 16px root (1pt = 1/12rem), matching how the
// rest of this file already treats pt-to-rem conversions.
export const BLOCK_STYLE_EDITOR_CSS = (Object.values(BLOCK_STYLES) as typeof BLOCK_STYLES[BlockStyleId][])
  .filter((style) => style.blockStyleAttr)
  .map((style) => {
    const declarations = [
      style.defaultFontSizePt ? `font-size:${style.defaultFontSizePt / 12}rem;` : "",
      style.bold ? "font-weight:700;" : "",
      style.align ? `text-align:${style.align};` : "",
      style.blockStyleAttr === "caption" ? "color:#666;" : "",
    ]
      .filter(Boolean)
      .join("");
    return `.qalam-editor-content .ProseMirror p[data-block-style="${style.blockStyleAttr}"] { ${declarations} }`;
  })
  .join("\n");

export const ParagraphWithDir = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dir: {
        default: "rtl",
        parseHTML: (element) => {
          const d = element.getAttribute("dir");
          return d === "rtl" || d === "ltr" ? d : "rtl";
        },
        renderHTML: (attributes) => {
          if (!attributes.dir) return { dir: "rtl" };
          return { dir: attributes.dir };
        },
      },
      ...PARAGRAPH_STYLE_ATTRS,
    };
  },
});

export const HeadingWithDir = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dir: {
        default: "rtl",
        parseHTML: (element) => {
          const d = element.getAttribute("dir");
          return d === "rtl" || d === "ltr" ? d : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.dir) return {};
          return { dir: attributes.dir };
        },
      },
      // Headings get line-height/spacing (real, persistent) but not
      // blockStyle/indent — headings already have their own canonical
      // per-level presentation (H1-H4), and paragraph-style indentation
      // concepts don't apply to headings.
      lineHeight: PARAGRAPH_STYLE_ATTRS.lineHeight,
      spaceBeforePt: PARAGRAPH_STYLE_ATTRS.spaceBeforePt,
      spaceAfterPt: PARAGRAPH_STYLE_ATTRS.spaceAfterPt,
    };
  },
});

/** Apply toolbar direction to every textblock so caret side persists across empty/new paragraphs. */
function applyDocumentDirection(editor: Editor, nextDir: "rtl" | "ltr") {
  const { state } = editor;
  let tr = state.tr;
  let changed = false;
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
    if (node.attrs.dir === nextDir) return;
    tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir: nextDir });
    changed = true;
  });
  if (changed) {
    // Avoid adding to history noise for pure direction sync from toolbar
    tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
  }
  const dom = editor.view.dom as HTMLElement;
  dom.setAttribute("dir", nextDir);
  dom.style.direction = nextDir;
}

const STUDIO_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  ...listEditorFonts().map((f) => ({
    label: f.availability === "local-preview-only" ? `${f.label} — Local` : f.label,
    value: f.editorFamily,
  })),
];

function Toolbar({ editor, dir, setDir }: { editor: Editor | null; dir: "rtl" | "ltr"; setDir: (d: "rtl" | "ltr") => void }) {
  if (!editor) return null;

  const currentFont =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) || "";

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 pb-3 sm:pb-4 border-b border-gray-100 overflow-x-auto" dir="ltr">
      <label className="sr-only" htmlFor="studio-block-style">
        Style
      </label>
      <select
        id="studio-block-style"
        value={
          editor.isActive("heading", { level: 1 })
            ? "heading-1"
            : editor.isActive("heading", { level: 2 })
              ? "heading-2"
              : editor.isActive("heading", { level: 3 })
                ? "heading-3"
                : editor.isActive("heading", { level: 4 })
                  ? "heading-4"
                  : editor.isActive("blockquote")
                    ? "quote"
                    : (editor.getAttributes("paragraph").blockStyle as string) || "normal"
        }
        onChange={(e) => {
          const id = e.target.value as BlockStyleId;
          const style = BLOCK_STYLES[id];
          if (!style) return;
          const chain = editor.chain().focus();
          if (style.kind === "heading" && style.headingLevel) {
            chain.setHeading({ level: style.headingLevel }).run();
          } else if (style.kind === "blockquote") {
            chain.setBlockquote().run();
          } else {
            // Batch 16A fix: block-style presentation (font size, bold,
            // alignment) now comes ENTIRELY from `blockStyle` driving CSS
            // (see the editor's [data-block-style] rules below) — it no
            // longer stamps real FontSize/Bold/TextAlign marks. Previously,
            // applying "Title" stamped 28pt+bold as literal marks, so
            // switching to "Normal" right after left them behind (the
            // Normal branch never had anything to unset because it never
            // needed to remove marks the OTHER branches shouldn't have
            // stamped in the first place). Now every style switch — including
            // Normal — is a single, symmetric attribute assignment with no
            // leftover state, and a user's own genuinely manual formatting
            // (applied via the separate Bold/Italic/Align toolbar buttons)
            // is never touched by this control at all.
            chain.setParagraph().run();
            chain.updateAttributes("paragraph", { blockStyle: style.blockStyleAttr ?? null }).run();
          }
        }}
        className="h-[38px] max-w-[7.5rem] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Paragraph style"
      >
        {BLOCK_STYLE_IDS.map((id) => (
          <option key={id} value={id}>
            {BLOCK_STYLES[id].label}
          </option>
        ))}
      </select>
      <ToolbarDivider />
      <label className="sr-only" htmlFor="studio-line-height">
        Line spacing
      </label>
      <select
        id="studio-line-height"
        // Batch 16A — real per-block line-spacing control. Reads/writes
        // the genuine `lineHeight` schema attr added above (paragraph or
        // heading, whichever is active) — "Default" means null (clears
        // the block-level override, falling back to the document-wide
        // --qalam-line-height CSS variable / documentSettings default).
        value={(() => {
          // Batch 16A.1 correction (item 5) — editor.getAttributes() reads
          // the RAW stored node attrs directly (bypasses renderHTML
          // entirely), so a corrupted JSON-loaded value could otherwise
          // reach this <select>'s value unvalidated (e.g. rendering an
          // <option> that doesn't exist, or displaying "999" instead of
          // falling back to Default).
          const pAttr = editor.getAttributes("paragraph").lineHeight;
          const hAttr = editor.getAttributes("heading").lineHeight;
          const validated =
            (typeof pAttr === "number" ? validateLineHeight(pAttr) : null) ??
            (typeof hAttr === "number" ? validateLineHeight(hAttr) : null);
          return validated !== null ? String(validated) : "default";
        })()}
        onChange={(e) => {
          const raw = e.target.value;
          const value = raw === "default" ? null : Number(raw);
          const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
          editor.chain().focus().updateAttributes(nodeType, { lineHeight: value }).run();
        }}
        className="h-[38px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Line spacing"
      >
        <option value="default">Default</option>
        {LINE_HEIGHT_OPTIONS.map((lh) => (
          <option key={lh} value={lh}>
            {lh}
          </option>
        ))}
      </select>
      <ToolbarDivider />
      <label className="sr-only" htmlFor="studio-font-family">
        Font family
      </label>
      <select
        id="studio-font-family"
        value={currentFont}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) {
            editor.chain().focus().unsetFontFamily().run();
          } else {
            editor.chain().focus().setFontFamily(v).run();
          }
        }}
        className="h-[38px] max-w-[11rem] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Font family"
      >
        {STUDIO_FONT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="studio-font-size">
        Font size
      </label>
      <select
        id="studio-font-size"
        value={
          (() => {
            const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
            const pt = resolveFontSizePt(raw);
            return pt ? String(pt) : "";
          })()
        }
        onChange={(e) => {
          const v = e.target.value;
          if (!v) {
            editor.chain().focus().unsetFontSize().run();
          } else {
            editor.chain().focus().setFontSize(`${v}pt`).run();
          }
        }}
        className="h-[38px] max-w-[4.5rem] rounded-md border border-gray-200 bg-white px-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Font size"
      >
        <option value="">Default</option>
        {FONT_SIZE_OPTIONS_PT.map((pt) => (
          <option key={pt} value={pt}>
            {pt}
          </option>
        ))}
      </select>
      <ToolbarDivider />
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        I
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        U
      </ToolbarButton>
      <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        H1
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton label="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton label="Numbered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
      <ToolbarButton label="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        " Quote
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const url = window.prompt("URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}
      >
        Link
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        ⇤
      </ToolbarButton>
      <ToolbarButton label="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        ⇔
      </ToolbarButton>
      <ToolbarButton label="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        ⇥
      </ToolbarButton>
      <ToolbarButton label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        ☰
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        ↶ Undo
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        ↷ Redo
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Right-to-left (Urdu/Arabic/Persian)" active={dir === "rtl"} onClick={() => setDir("rtl")}>
        RTL
      </ToolbarButton>
      <ToolbarButton label="Left-to-right (English)" active={dir === "ltr"} onClick={() => setDir("ltr")}>
        LTR
      </ToolbarButton>
    </div>
  );
}

function editorToPlainText(editor: Editor, dir: "rtl" | "ltr"): string {
  return extractPlainText(editor.getJSON() as DocNode, dir);
}

function getInitialDraftContent(): DocNode | string {
  if (typeof window === "undefined") return "<p></p>";
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return "<p></p>";
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed as DocNode;
    }
  } catch (err) {
    console.error("Failed to parse initial draft from localStorage:", err);
  }
  return "<p></p>";
}

// Suggestion Review Workflow (2026-08-09) — finds a suggestion's real
// position in the LIVE ProseMirror document by searching individual text
// nodes for the first verbatim occurrence of its originalText. Limited
// to matches within a single text node (won't find text split across
// separately-marked runs, e.g. half-bold half-plain) — an accepted,
// documented limitation for v1, since the vast majority of flagged
// issues (typos, spacing, stray characters) occur in plain, unformatted
// text anyway. Returns null (stale-safe) if no longer found, e.g. the
// user already edited that text some other way.
function findSuggestionRange(editor: Editor, searchText: string): { from: number; to: number } | null {
  let result: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (result) return false;
    if (node.isText && node.text) {
      const idx = node.text.indexOf(searchText);
      if (idx !== -1) {
        result = { from: pos + idx, to: pos + idx + searchText.length };
        return false;
      }
    }
    return true;
  });
  return result;
}

// Phase 1 Professional Usability (2026-08-09) — Find & Replace. Walks
// every text node in the live document collecting ALL occurrences of
// `searchText` (not just the first, unlike findSuggestionRange above),
// using the exact same non-overlapping match logic as the pure
// findAllTextMatches() (app/tools/document-studio/utils/findReplace.ts)
// applied per text node. Same documented limitation as
// findSuggestionRange: won't find a match split across two differently-
// marked runs (e.g. half-bold half-plain) — the common case (plain
// prose) is unaffected.
function findAllRangesInEditor(editor: Editor, searchText: string): { from: number; to: number }[] {
  if (!searchText) return [];
  const ranges: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (const match of findAllTextMatches(node.text, searchText)) {
        ranges.push({ from: pos + match.index, to: pos + match.index + match.length });
      }
    }
    return true;
  });
  return ranges;
}

// Phase 1 Professional Usability (2026-08-09) — Document Outline
// navigation. Maps a heading's position within doc.content (blockIndex,
// from extractDocumentOutline) to its real starting ProseMirror position
// in the live editor, by counting top-level nodes the same way
// doc.content is indexed — headings are always top-level siblings (see
// documentOutline.ts's own comment), so this stays in sync with
// extractDocumentOutline's indexing by construction.
function findBlockStartPosition(editor: Editor, blockIndex: number): number | null {
  let currentIndex = 0;
  let foundPos: number | null = null;
  editor.state.doc.forEach((node, offset) => {
    if (currentIndex === blockIndex) {
      foundPos = offset + 1; // +1: move past the block node's own opening boundary, into its text content
    }
    currentIndex++;
  });
  return foundPos;
}

export default function DocumentStudioEditor() {
  const { language: uiLanguage } = useLanguage();
  const isUr = uiLanguage === "ur";
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [documentSettings, setDocumentSettings] = useState<DocumentStudioSettings>(() => loadDocumentSettings());
  // Batch 16B — computed once per render, shared by the page preview and
  // the ruler so their boundaries always agree (single geometry source).
  const pageLayout = resolvePageLayout({
    size: documentSettings.page.size,
    orientation: documentSettings.page.orientation,
    marginPreset: documentSettings.page.margins.preset,
    customMargins: documentSettings.page.margins,
  });

  useEffect(() => {
    saveDocumentSettings(documentSettings);
  }, [documentSettings]);


  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("auto");
  const [lastResolved, setLastResolved] = useState<ResolvedLanguage | null>(null);

  useEffect(() => {
    trackToolOpenOnce("document_studio");
  }, []);

  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [exampleJustLoaded, setExampleJustLoaded] = useState(false);
  const standardizeButtonRef = useRef<HTMLButtonElement>(null);

  // Publishing Preset Foundation — Phase 1 (2026-08-09). Batch 16A
  // (2026-08-11) wired this through documentSettings.typography into the
  // editor CSS variables, PDF body defaults, and DOCX paragraph/run
  // defaults — no longer "selection only"; changing settings.typography
  // genuinely changes rendered output across Editor/PDF/DOCX.
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>(() => loadSelectedPresetId());
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  const [preview, setPreview] = useState<{
    document: DocNode;
    report: NormalizeReport;
    beforePlain: string;
  } | null>(null);
  const [alreadyClean, setAlreadyClean] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docxImportNotice, setDocxImportNotice] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSummary, setPdfSummary] = useState<{
    pages: number;
    fileSizeLabel: string;
    fontsUsed: string[];
    fontFallbacks: Array<{ requested: string; used: string }>;
  } | null>(null);

  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [health, setHealth] = useState<DocumentHealthReport | null>(null);
  const [reviewState, setReviewState] = useState<SuggestionReviewState>(createReviewState([]));

  // Phase 1 Professional Usability (2026-08-09) — Find & Replace state.
  // Document Studio Simplification (2026-08-10) — replaces the previous
  // "everything stacked and visible at once" layout (Find & Replace,
  // Outline, Stats, Quality Audit, Suggestions, Glossary, Settings all
  // shown simultaneously) with a single-tab system: at most ONE
  // secondary panel is visible at a time, and the editor itself stays
  // the clean, unchanged default view. All existing state/handlers below
  // are unchanged — this only reorganizes how they're rendered.
  type StudioTab = "none" | "find" | "outline" | "quality" | "glossary" | "settings";
  const [activeTab, setActiveTab] = useState<StudioTab>("none");
  const toggleTab = (tab: StudioTab) => setActiveTab((prev) => (prev === tab ? "none" : tab));
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Phase 1 Professional Usability (2026-08-09) — Document Outline state.
  const [outline, setOutline] = useState<OutlineEntry[]>([]);

  // User-defined Terminology Glossary MVP (2026-08-09) — loaded once from
  // localStorage on mount, same lazy-initializer pattern already used for
  // the draft content above (getInitialDraftContent).
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => loadGlossary());
  // Mirrors `glossary` state but as a ref, so the onUpdate callback below
  // (captured once when the editor is created — same reasoning as
  // hasAuditReportRef above) always reads the CURRENT glossary rather
  // than whatever it was when the editor was first created.
  const glossaryRef = useRef<GlossaryEntry[]>(glossary);
  useEffect(() => {
    glossaryRef.current = glossary;
    saveGlossary(glossary);
    // Refresh suggestions immediately when the glossary itself changes
    // (add/edit/delete/import) — otherwise a newly-added glossary term
    // wouldn't be reflected in the Suggestions panel until the next
    // document edit, which would feel like the glossary "didn't work".
    if (editor) {
      const json = editor.getJSON();
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, undefined, glossary)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glossary]);
  const [isAuditStale, setIsAuditStale] = useState(false);
  // Mirrors "auditReport !== null" but as a ref, so the onUpdate callback
  // below (captured once when the editor is created) can check it without
  // reading stale React state from a closure.
  const hasAuditReportRef = useRef(false);

  // Browser-safe timeout ref (avoids Node types dependency)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Maintenance Batch (2026-08-09) — separate debounce timer for the
  // Stats/Health/Suggestions analysis specifically (independent of the
  // autosave timer above, which has its own longer interval and purpose).
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialContent] = useState(() => getInitialDraftContent());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
      }),
      ParagraphWithDir,
      HeadingWithDir,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontFamily,
      FontSize.configure({ types: ["textStyle"] }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: "focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (hasAuditReportRef.current) {
        setIsAuditStale(true);
      }
      setAlreadyClean(false);
      setPdfSummary(null);

      // Maintenance Batch (2026-08-09) — run the analysis immediately for
      // small documents (preserves today's exact instant behavior, no
      // delay), but debounce it for large ones so rapid typing doesn't
      // trigger a full re-scan on every single keystroke. The cheap
      // JSON-length check below is only an approximate size proxy —
      // deliberately cheap so deciding whether to debounce doesn't itself
      // add meaningful cost.
      const json = editor.getJSON();

      // Phase 1 Professional Usability (2026-08-09) — Document Outline
      // updates immediately (not debounced with the rest of the analysis
      // below): extracting headings is a cheap plain-array walk, not a
      // regex-heavy scan, so there's no performance reason to delay it,
      // and a lagging outline would feel wrong for a navigation aid.
      setOutline(extractDocumentOutline(json));

      // Shared Analysis Context (2026-08-09) — computed ONCE per
      // analysis run (inside runAnalysis, so it's still properly
      // debounced for large documents — computing it here, outside
      // runAnalysis, would defeat the debounce entirely since context
      // creation IS the expensive getBlockTexts traversal) and passed to
      // all three analysis functions, replacing what was previously 8
      // independent getBlockTexts(doc) calls with exactly 1.
      const runAnalysis = () => {
        const context = createDocumentAnalysisContext(json);
        setStats(buildDocumentStats(json, context));
        setHealth(buildDocumentHealthReport(json, context));
        setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, context, glossaryRef.current)));
      };

      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

      const approximateSize = JSON.stringify(json).length;
      if (approximateSize < LARGE_DOCUMENT_CHAR_THRESHOLD) {
        runAnalysis();
      } else {
        analysisTimerRef.current = setTimeout(runAnalysis, ANALYSIS_DEBOUNCE_MS);
      }

      // Deliberately NOT clearing docxImportNotice here anymore (2026-08-08
      // requirement change): it must be a genuinely persistent, explicitly-
      // dismissed notice (the "Got it" button below), not one that quietly
      // vanishes the moment the user types — that was too easy to miss.

      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        try {
          const json = editor.getJSON();
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(json));
          setSaveStatus("saved");
        } catch (err) {
          console.error("Autosave error:", err);
          setSaveStatus("idle");
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const syncEmpty = () => {
      const empty = editor.isEmpty;
      setIsEditorEmpty(empty);
      if (empty) setExampleJustLoaded(false);
    };
    syncEmpty();
    editor.on("update", syncEmpty);
    editor.on("create", syncEmpty);
    return () => {
      editor.off("update", syncEmpty);
      editor.off("create", syncEmpty);
    };
  }, [editor]);

  // Persist direction on root + every paragraph/heading so empty RTL
  // documents place the caret on the right and new blocks inherit RTL.
  useEffect(() => {
    if (!editor) return;
    applyDocumentDirection(editor, dir);
  }, [editor, dir]);

  const handleLoadExample = () => {
    if (!editor) return;
    const html =
      "<p>مسودہ: یہ  ایک  نمونہ دستاویز ہے ,جس میں غیر ضروری spaces ہیں۔</p><p>Draft notes: Review spacing and punctuation, then standardize and run Quality Audit before export.</p><p>آخری مرحلہ: تصدیق کے بعد TXT، DOCX یا PDF ایکسپورٹ کریں۔</p>";
    editor.chain().focus().setContent(html).run();
    applyDocumentDirection(editor, dir);
    setExampleJustLoaded(true);
    trackEvent("tool_example", { tool: "document_studio" });
    requestAnimationFrame(() => {
      standardizeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleFocusPaste = () => {
    editor?.chain().focus().run();
  };


  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    };
  }, []);

  // Initial stats/health for whatever content loaded first (fresh empty
  // doc or a restored draft) — onUpdate only fires on subsequent user
  // edits, not on the editor's own first mount.
  useEffect(() => {
    if (editor) {
      const json = editor.getJSON();
      setOutline(extractDocumentOutline(json));
      const context = createDocumentAnalysisContext(json);
      setStats(buildDocumentStats(json, context));
      setHealth(buildDocumentHealthReport(json, context));
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, context, glossaryRef.current)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    if (!editor.isFocused) {
      editor.commands.focus(editor.isEmpty ? "start" : "end");
    }
  };

  const handleNewDocument = () => {
    if (!editor) return;
    if (window.confirm(isUr ? "کیا آپ نیا مسودہ شروع کرنا چاہتے ہیں؟ غیر محفوظ شدہ تبدیلیاں ختم ہو جائیں گی۔" : "Start a new document? Unsaved changes will be lost.")) {
      editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", attrs: { dir }, content: [] }] });
      applyDocumentDirection(editor, dir);
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to clear localStorage", e);
      }
      setSaveStatus("idle");
      setPreview(null);
      setAlreadyClean(false);
      setExampleJustLoaded(false);
      setLastResolved(null);
      setDocxImportNotice(false);
      setAuditReport(null);
      hasAuditReportRef.current = false;
      setIsAuditStale(false);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm("کیا آپ محفوظ شدہ ڈرافٹ کو حذف کرنا چاہتے ہیں؟ / Clear saved draft from browser storage?")) {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setSaveStatus("idle");
      } catch (e) {
        console.error("Failed to remove draft", e);
      }
    }
  };

  /** Clear TipTap content + related UI state (parallel to Quality Checker Clear). */
  const handleClearText = () => {
    if (!editor) return;
    editor.commands.clearContent(true);
    setExampleJustLoaded(false);
    setPreview(null);
    setAlreadyClean(false);
    setLastResolved(null);
    setDocxImportNotice(false);
    setAuditReport(null);
    hasAuditReportRef.current = false;
    setIsAuditStale(false);
    setUploadError(null);
    setPdfError(null);
    setPdfSummary(null);
    setCopied(false);
  };

  // v1 file import (Option A, per Sajjad's 2026-08-08 decision): both .txt
  // and .docx come in as PLAIN TEXT only — extractTextFromFile() uses
  // mammoth.extractRawText() for .docx, which does not preserve headings/
  // bold/lists/layout. A formatting-preserving import (mammoth.convertToHtml
  // + TipTap's generateJSON) is a separate, later "Option B" spike, not part
  // of this change. Reuses the exact same validateFile/extractTextFromFile
  // Document Cleaner already uses, and the newly-shared plainTextToDocNode.
  const handleUploadFile = async (file: File) => {
    setUploadError(null);
    setDocxImportNotice(false);

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "فائل ناکام ہو گئی / File validation failed.");
      return;
    }

    // Pre-import warning (added 2026-08-08, per Sajjad's requirement that the
    // formatting-loss warning appear BEFORE import, not only after): a .docx
    // file always loses its original formatting on import in v1 (Option A —
    // plain text only), so this needs saying before the user commits to it,
    // not just as an after-the-fact notice.
    if (file.name.toLowerCase().endsWith(".docx")) {
      const proceedWithDocx = window.confirm(
        "یہ .docx فائل صرف خام متن کے طور پر درآمد ہوگی — عنوانات (headings)، بولڈ، فہرستیں (lists) اور صفحہ بندی محفوظ نہیں رہیں گی۔ جاری رکھیں؟\n\nThis .docx file will be imported as plain text only — headings, bold, lists, and layout will NOT be preserved. Continue?"
      );
      if (!proceedWithDocx) return;
    }

    if (editor && !editor.isEmpty) {
      const confirmed = window.confirm(
        "موجودہ متن کو اپلوڈ شدہ فائل سے تبدیل کر دیا جائے گا۔ جاری رکھیں؟ / This will replace the current content in the editor. Continue?"
      );
      if (!confirmed) return;
    }

    setIsImporting(true);
    try {
      const rawText = await extractTextFromFile(file);
      const isDocxFile = file.name.toLowerCase().endsWith(".docx");
      // DOCX-only fix (2026-08-08): collapse mammoth's artificial "\n\n"
      // paragraph separators (and its trailing end-of-document artifact)
      // before this reaches plainTextToDocNode (unchanged) — see
      // normalizeDocxParagraphBreaks' own comment for the full empirical
      // basis. .txt files skip this entirely; their blank lines and
      // trailing newline (if any) are already meaningful as typed.
      const text = isDocxFile ? normalizeDocxParagraphBreaks(rawText) : rawText;
      const docNode = plainTextToDocNode(text);
      editor?.commands.setContent(docNode);

      // Same full-state reset as New Document — the previous document's
      // preview/audit/save state no longer describes what's in the editor.
      setSaveStatus("idle");
      setPreview(null);
      setAlreadyClean(false);
      setAuditReport(null);
      hasAuditReportRef.current = false;
      setIsAuditStale(false);

      if (isDocxFile) {
        setDocxImportNotice(true);
      }
    } catch (err) {
      console.error("Failed to import file:", err);
      setUploadError("فائل درآمد کرنے میں خرابی ہوئی / Failed to import file.");
    } finally {
      setIsImporting(false);
    }
  };


  // Mode change: never present a preview generated under a different language
  useEffect(() => {
    setPreview(null);
    setAlreadyClean(false);
    setLastResolved(null);
    if (processingLanguage === "en") setDir("ltr");
    else if (processingLanguage === "ur" || processingLanguage === "ar") setDir("rtl");
    // Auto: display dir stays user-controlled until process runs
  }, [processingLanguage]);

  /** Write normalized TipTap JSON into the live editor (with undo history). */
  const applyNormalizedDocument = (normalized: DocNode): boolean => {
    if (!editor) return false;
    try {
      const { state, view } = editor;
      const normalizedDoc = state.schema.nodeFromJSON(normalized);
      if (normalizedDoc.type.name !== state.doc.type.name) {
        console.error("Invalid doc type during normalization application");
        return false;
      }
      const tr = state.tr.replaceWith(0, state.doc.content.size, normalizedDoc.content);
      tr.setMeta("addToHistory", true);
      view.dispatch(tr);
      return true;
    } catch (err) {
      console.error("Failed to apply standardization transaction:", err);
      try {
        editor.commands.setContent(normalized);
        return true;
      } catch (err2) {
        console.error("Fallback setContent also failed:", err2);
        return false;
      }
    }
  };

  const handleStandardizeClick = () => {
    setExampleJustLoaded(false);
    if (!editor) return;
    try {
      const currentJson = editor.getJSON() as DocNode;
      const beforePlain = extractPlainText(currentJson, dir === "ltr" ? "ltr" : "rtl");
      const result = normalizeDocumentNodes(currentJson, processingLanguage);
      setLastResolved(result.report.resolvedLanguage);
      trackEvent("tool_process", {
        tool: "document_studio",
        mode: processingLanguage,
        resolved_mode: result.report.resolvedLanguage,
        success: true,
      });
      // Do not force a single editor dir from document-level resolve.

      if (!result.changed) {
        setAlreadyClean(true);
        setPreview(null);
        requestAnimationFrame(() => {
          standardizeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        return;
      }

      // Apply into TipTap immediately so the editor shows normalized text
      // (preview/confirm alone left the editor looking "unchanged").
      const applied = applyNormalizedDocument(result.document);
      if (applied) {
        trackEvent("preview_confirm", {
          tool: "document_studio",
          mode: processingLanguage,
          success: true,
        });
      }
      setAlreadyClean(false);
      setPreview({
        document: result.document,
        report: result.report,
        beforePlain,
      });
      requestAnimationFrame(() => {
        standardizeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch (err) {
      console.error("Standardize failed:", err);
      setAlreadyClean(false);
      setPreview(null);
    }
  };

  const handleConfirmStandardize = () => {
    // Changes are applied on Standardize; Confirm only dismisses the summary.
    if (!preview) return;
    trackEvent("preview_confirm", { tool: "document_studio", mode: processingLanguage, success: true });
    setPreview(null);
  };

  const handleCancelStandardize = () => {
    trackEvent("preview_cancel", { tool: "document_studio", mode: processingLanguage });
    setPreview(null);
  };

  const handleRunAudit = () => {
    if (!editor) return;
    const report = buildDocumentAuditReport(editor.getJSON() as DocNode, undefined, processingLanguage);
    setAuditReport(report);
    hasAuditReportRef.current = true;
    setIsAuditStale(false);
  };

  // Phase 1 Professional Usability (2026-08-09) — Find & Replace.
  // Recomputes matches fresh from the live editor on every keystroke in
  // the search box, matching document text at that moment (never a
  // stale/cached position list). Selecting a match uses TipTap's own
  // setTextSelection command — a native selection, giving the browser's
  // real, built-in highlight for the current match, rather than a custom
  // decoration overlay (keeping this to "TipTap commands only", per the
  // explicit requirement).
  const currentMatches = editor ? findAllRangesInEditor(editor, findQuery) : [];

  const handleFindQueryChange = (value: string) => {
    setFindQuery(value);
    setCurrentMatchIndex(value ? 0 : -1);
    if (editor && value) {
      const matches = findAllRangesInEditor(editor, value);
      if (matches.length > 0) {
        editor.chain().setTextSelection(matches[0]).scrollIntoView().run();
      }
    }
  };

  const handleFindNext = () => {
    if (!editor || currentMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % currentMatches.length;
    setCurrentMatchIndex(nextIndex);
    editor.chain().focus().setTextSelection(currentMatches[nextIndex]).scrollIntoView().run();
  };

  const handleFindPrevious = () => {
    if (!editor || currentMatches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
    setCurrentMatchIndex(prevIndex);
    editor.chain().focus().setTextSelection(currentMatches[prevIndex]).scrollIntoView().run();
  };

  // Replaces only the CURRENT match — a real, targeted ProseMirror
  // transaction (insertContentAt), automatically undoable via TipTap's
  // built-in History extension, same as the Suggestion Review workflow's
  // own apply mechanism. Never touches any other match.
  const handleReplaceCurrent = () => {
    if (!editor || currentMatches.length === 0 || currentMatchIndex < 0) return;
    const range = currentMatches[currentMatchIndex];
    editor.chain().focus().insertContentAt(range, replaceQuery).run();
    // Matches shift after a replacement — recompute fresh rather than
    // trusting the now-stale `currentMatches` array.
    const refreshed = findAllRangesInEditor(editor, findQuery);
    setCurrentMatchIndex(refreshed.length > 0 ? Math.min(currentMatchIndex, refreshed.length - 1) : -1);
  };

  // Replaces every match, one targeted transaction at a time — never a
  // single blind bulk operation. Recomputes matches fresh after each
  // replacement (rather than trusting pre-computed positions), since
  // earlier replacements can shift later matches' positions when the
  // replacement text is a different length than the search text.
  const handleReplaceAll = () => {
    if (!editor || !findQuery) return;
    let remaining = findAllRangesInEditor(editor, findQuery);
    while (remaining.length > 0) {
      editor.chain().focus().insertContentAt(remaining[0], replaceQuery).run();
      remaining = findAllRangesInEditor(editor, findQuery);
    }
    setCurrentMatchIndex(-1);
  };

  const handleCloseFindReplace = () => {
    setActiveTab("none");
    setFindQuery("");
    setReplaceQuery("");
    setCurrentMatchIndex(-1);
  };

  // Phase 1 Professional Usability (2026-08-09) — Document Outline
  // navigation. Moves the cursor to the clicked heading via TipTap's own
  // setTextSelection + scrollIntoView commands — a real, native cursor
  // move, not a custom scroll implementation.
  // Publishing Preset Foundation — Phase 1 (2026-08-09). Persists the
  // choice only — no export or editor-formatting side effect yet.
  const handlePresetChange = (id: PresetId) => {
    setSelectedPresetId(id);
    saveSelectedPresetId(id);
    setDocumentSettings((prev) => {
      const next = applyPresetToSettings(prev, id);
      saveDocumentSettings(next);
      return next;
    });
    setPdfSummary(null);
    saveSelectedPresetId(id);
  };

  const handleOutlineNavigate = (blockIndex: number) => {
    if (!editor) return;
    const pos = findBlockStartPosition(editor, blockIndex);
    if (pos !== null) {
      editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    }
  };

  // User-defined Terminology Glossary MVP (2026-08-09) — thin wrappers
  // around the pure functions in glossary.ts. All persistence happens
  // via the useEffect above (triggered by the `glossary` state change),
  // not here directly, keeping these handlers simple.
  const handleGlossaryAdd = (incorrectTerm: string, correctTerm: string, note: string): string | null => {
    const { entries, error } = addGlossaryEntry(glossary, incorrectTerm, correctTerm, note || undefined);
    if (!error) setGlossary(entries);
    return error;
  };

  const handleGlossaryUpdate = (id: string, incorrectTerm: string, correctTerm: string, note: string): string | null => {
    const { entries, error } = updateGlossaryEntry(glossary, id, incorrectTerm, correctTerm, note || undefined);
    if (!error) setGlossary(entries);
    return error;
  };

  const handleGlossaryDelete = (id: string) => {
    setGlossary((prev) => removeGlossaryEntry(prev, id));
  };

  const handleGlossaryExport = () => {
    const json = exportGlossaryToJson(glossary);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-glossary.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGlossaryImport = (jsonText: string): string | null => {
    const { entries, error } = importGlossaryFromJson(jsonText);
    if (error) return error;
    // Imported entries are MERGED with the existing glossary (via
    // addGlossaryEntry's own duplicate handling — an imported term that
    // already exists updates that entry rather than duplicating it),
    // rather than replacing the whole glossary outright.
    let merged = glossary;
    for (const entry of entries) {
      merged = addGlossaryEntry(merged, entry.incorrectTerm, entry.correctTerm, entry.note).entries;
    }
    setGlossary(merged);
    return null;
  };

  // Suggestion Review Workflow (2026-08-09) — Accept/Ignore only move a
  // suggestion between the pending/accepted/ignored lists; neither one
  // touches the editor's content. No text changes until "Apply Accepted"
  // is pressed, and even then only the specific accepted items are
  // applied (never a blind bulk find-replace).
  const handleAcceptSuggestion = (key: string) => {
    setReviewState((prev) => acceptSuggestion(prev, key));
  };

  const handleIgnoreSuggestion = (key: string) => {
    setReviewState((prev) => ignoreSuggestion(prev, key));
  };

  // Batch Actions — only ever affect PENDING items in the given
  // category; already-accepted/ignored items and other categories are
  // untouched. No global "Fix All".
  const handleAcceptCategory = (category: DocumentSuggestion["category"]) => {
    setReviewState((prev) => acceptCategory(prev, category));
  };

  const handleIgnoreCategory = (category: DocumentSuggestion["category"]) => {
    setReviewState((prev) => ignoreCategory(prev, category));
  };

  // Applies each currently-accepted suggestion as its own real,
  // targeted ProseMirror transaction (editor.chain()...insertContentAt),
  // not a raw string replace on the document — this is what makes it
  // automatically undoable via TipTap's built-in History extension
  // (part of StarterKit by default), satisfying "preserve undo safety"
  // without any extra plumbing. A suggestion whose original text can no
  // longer be found (stale — the user already changed that part of the
  // document some other way) is safely skipped, never force-applied.
  const handleApplyAccepted = () => {
    if (!editor) return;
    for (const suggestion of reviewState.accepted) {
      const range = findSuggestionRange(editor, suggestion.originalText);
      if (range) {
        editor.chain().focus().insertContentAt(range, suggestion.suggestedText).run();
      }
    }
    // State Refresh Verification (2026-08-09): each insertContentAt above
    // already triggers onUpdate (which itself calls setStats/setHealth/
    // refreshPendingSuggestions), but that refresh runs against the
    // state BEFORE `accepted` is cleared below, and the ordering of
    // several rapid transactions vs this final state update is worth
    // being explicit about rather than relying solely on React's
    // batching. Recomputing directly here from the editor's final JSON
    // guarantees stats/health reflect the truly-final document, and
    // accepted is cleared in the same update.
    const finalJson = editor.getJSON();
    const finalContext = createDocumentAnalysisContext(finalJson);
    setStats(buildDocumentStats(finalJson, finalContext));
    setHealth(buildDocumentHealthReport(finalJson, finalContext));
    setReviewState((prev) => refreshPendingSuggestions({ ...prev, accepted: [] }, generateDocumentSuggestions(finalJson, finalContext, glossaryRef.current)));
  };

  const handleCopy = async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editorToPlainText(editor, dir));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback
    }
  };

  const handleDownload = () => {
    trackEvent("tool_download", { tool: "document_studio", export_format: "txt", mode: processingLanguage, success: true });
    if (!editor) return;
    const text = editorToPlainText(editor, dir);
    // A leading BOM (U+FEFF) makes apps that guess a text file's encoding —
    // Word chief among them — reliably detect UTF-8 instead of guessing.
    // Without it, Word's "open this .txt file directly" path could mis-detect
    // the encoding and mangle the invisible RTL isolation marks (U+200F)
    // used elsewhere in this file for correct bracket/digit ordering, even
    // though the exact same text pasted from the clipboard rendered fine
    // (clipboard content always carries unambiguous Unicode metadata).
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-document.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Async — unlike handleDownload above — because buildDocxBlob is async
  // (docx's Packer.toBlob() genuinely is; see PHASE-3C-DOCX-SPEC.md §3).
  const handleDownloadDocx = async () => {
    trackEvent("tool_download", { tool: "document_studio", export_format: "docx", mode: processingLanguage, success: true });
    if (!editor) return;
    try {
      const blob = await buildDocxBlob(editor.getJSON() as DocNode, dir, documentSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qalam-document.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate .docx:", err);
    }
  };

  // v1 — visual/print quality only, no searchable text layer (see
  // docs/KNOWN-LIMITATIONS.md's "PDF Export" section for the full
  // investigation behind that decision). Sends structured DocNode JSON
  // to the server, not raw HTML — the server (app/api/export-pdf/route.ts)
  // builds the actual HTML and renders it, keeping the request small and
  // the server's own template in full control of what markup ever exists.
  const handleDownloadPdf = async () => {
    trackEvent("tool_download", { tool: "document_studio", export_format: "pdf", mode: processingLanguage, success: true });
    if (!editor) return;
    setPdfError(null);
    setPdfSummary(null);
    setIsExportingPdf(true);
    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: editor.getJSON(), dir, settings: documentSettings }),
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const pageCountHeader = response.headers.get("X-Pdf-Page-Count");
      const fileSizeHeader = response.headers.get("X-Pdf-File-Size-Bytes");
      const fontsUsedHeader = response.headers.get("X-Pdf-Fonts-Used");
      const fontFallbacksHeader = response.headers.get("X-Pdf-Font-Fallbacks");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qalam-document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (pageCountHeader && fileSizeHeader) {
        let fontsUsed: string[] = [];
        let fontFallbacks: Array<{ requested: string; used: string }> = [];
        try {
          fontsUsed = fontsUsedHeader ? JSON.parse(fontsUsedHeader) : [];
        } catch {
          fontsUsed = [];
        }
        try {
          fontFallbacks = fontFallbacksHeader ? JSON.parse(fontFallbacksHeader) : [];
        } catch {
          fontFallbacks = [];
        }
        setPdfSummary({
          pages: parseInt(pageCountHeader, 10),
          fileSizeLabel: formatFileSize(parseInt(fileSizeHeader, 10)),
          fontsUsed,
          fontFallbacks,
        });
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setPdfError("PDF بنانے میں خرابی ہوئی / Failed to generate PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const TAB_DEFINITIONS: { id: "find" | "outline" | "quality" | "glossary" | "settings"; label: string }[] = isUr
    ? [
        { id: "find", label: "🔍 تلاش اور تبدیلی" },
        { id: "outline", label: "📑 خاکہ" },
        { id: "quality", label: "✓ معیار اور تجاویز" },
        { id: "glossary", label: `📖 اصطلاحات${glossary.length > 0 ? ` (${glossary.length})` : ""}` },
        { id: "settings", label: "⚙️ ترتیبات" },
      ]
    : [
        { id: "find", label: "🔍 Find & Replace" },
        { id: "outline", label: "📑 Outline" },
        { id: "quality", label: "✓ Quality & Suggestions" },
        { id: "glossary", label: `📖 Glossary${glossary.length > 0 ? ` (${glossary.length})` : ""}` },
        { id: "settings", label: "⚙️ Settings" },
      ];

  return (
    <div className="site-container">
      {/* Document Studio Simplification (2026-08-10) — the editor card
          below is now the ONLY thing shown by default: toolbar, the text
          area itself, and export/save actions. Every analysis/utility
          system (Find & Replace, Outline, Quality Audit + Suggestions,
          Glossary, Ruler + Publishing Presets) moved into the tab bar
          further down — at most one of those panels is ever visible at
          once, and none of them show unless explicitly opened. */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#1A3A2A]/10 shadow-[0_2px_20px_rgba(26,58,42,0.06)]">
        <div className="flex justify-between items-center mb-3">
          <Toolbar editor={editor} dir={dir} setDir={setDir} />
          <div className="text-xs text-stone-500 font-sans" dir="ltr">
            {saveStatus === "saving" && "💾 Saving..."}
            {saveStatus === "saved" && "✓ Saved to browser"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="file"
            accept=".txt,.docx"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) handleUploadFile(f);
              e.target.value = ""; // allow re-selecting the same file later
            }}
            className="hidden"
            id="document-studio-upload-input"
            disabled={isImporting}
          />
          <label
            htmlFor="document-studio-upload-input"
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-md text-[15px] font-semibold border-2 transition-all ${
              isImporting
                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                : "border-[#1A3A2A] bg-[#1A3A2A] text-white hover:bg-[#244E38] hover:border-[#244E38] cursor-pointer shadow-sm"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className={isUr ? "font-naskh" : ""}>
              {isImporting ? (isUr ? "درآمد ہو رہا ہے..." : "Importing…") : (isUr ? "فائل اپلوڈ کریں" : "Upload File")}
            </span>
          </label>
          {!isImporting && (
            <span className="text-[13px] text-gray-400 font-mono select-none" dir="ltr">TXT · DOCX</span>
          )}
        </div>

        {uploadError && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium" dir="rtl">
            {uploadError}
          </div>
        )}

        {pdfError && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium" dir="rtl">
            {pdfError}
          </div>
        )}

        {docxImportNotice && (
          <div className="mb-3 bg-amber-50 border-2 border-amber-400 text-amber-900 p-3 rounded-lg text-xs flex items-start justify-between gap-3" dir="rtl">
            <span>
              ⚠️ .docx فائل صرف خام متن کے طور پر درآمد ہوئی ہے — اصل فارمیٹنگ (headings، bold، lists، ترتیب) محفوظ نہیں رہی۔ / The .docx file was imported as plain text only — original formatting (headings, bold, lists, layout) was not preserved.
            </span>
            <button
              type="button"
              onClick={() => setDocxImportNotice(false)}
              className="shrink-0 px-2 py-1 rounded-md border border-amber-400 text-amber-800 hover:bg-amber-100 transition text-xs font-semibold"
              dir="ltr"
            >
              سمجھ گیا / Got it
            </button>
          </div>
        )}

        {/* A4-style document canvas */}
        <div className="rounded-xl bg-[#E8E4DB] px-2 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
          {/* OUTER PAGE — constrains size and shows page appearance (border/shadow/bg).
               NO publishing padding here: percentage padding on this element would
               resolve against the canvas containing block (e.g. 800px) rather than
               the page's own constrained width (e.g. 546px), producing margins that
               are too large on desktop (97px instead of ~66px for A4 normal). */}
          <div
            className="relative mx-auto w-full rounded-lg border border-[#1A3A2A]/8 bg-white shadow-[0_8px_30px_rgba(26,58,42,0.10)] focus-within:ring-2 focus-within:ring-[#B8935A]/40"
            style={(() => {
              const layout = pageLayout;
              const scale = Math.min(2.6, 860 / layout.widthMm);
              return {
                maxWidth: `${layout.widthMm * scale}px`,
                aspectRatio: `${layout.widthMm} / ${layout.heightMm}`,
                fontSize: `${documentSettings.typography.bodyFontSizePt}pt`,
                lineHeight: documentSettings.typography.lineHeight,
              };
            })()}
            dir={dir}
            onClick={handleWrapperClick}
            role="textbox"
            aria-label={isUr ? "دستاویز ایڈیٹر" : "Document editor"}
          >
            {/* Empty-state overlay covers the full page box including the
                margin areas below — inset-0 is correct here on the outer div. */}
            {isEditorEmpty && editor && (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 py-10"
                aria-hidden={false}
              >
                <p className="mb-2 text-3xl text-[#B8935A]/80 select-none" aria-hidden>
                  ✎
                </p>
                <p
                  className={`mb-5 text-sm sm:text-base text-gray-500 ${isUr ? "font-naskh" : ""}`}
                  dir={dir}
                >
                  {isUr ? "یہاں لکھنا شروع کریں…" : "Start writing here…"}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadExample();
                  }}
                  className={`pointer-events-auto h-10 px-5 rounded-lg text-sm font-semibold border border-[#1A3A2A]/20 bg-white text-[#1A3A2A] hover:bg-[#F7F5EF] shadow-sm ${isUr ? "font-naskh" : ""}`}
                >
                  {isUr ? "مثال لوڈ کریں" : "Load Example"}
                </button>
              </div>
            )}

            {/* INNER PAGE CONTENT — 100% width of the outer page div, so its
                containing block IS the constrained page width (e.g. 546px).
                Percentage padding here resolves against 546px, not the 800px
                canvas, giving the correct ~66px for a 12.095% A4 normal margin. */}
            <div
              className="cursor-text"
              style={(() => {
                const padding = resolveResponsivePagePadding(pageLayout, dir);
                return {
                  width: "100%",
                  minHeight: "100%",
                  paddingTop: `${padding.topPct}%`,
                  paddingBottom: `${padding.bottomPct}%`,
                  paddingLeft: `${padding.leftPct}%`,
                  paddingRight: `${padding.rightPct}%`,
                };
              })()}
            >
            <EditorContent
              editor={editor}
              className={`qalam-editor-content qalam-doc-page focus:outline-none ${
                dir === "rtl" ? "font-nastaliq" : ""
              }`}
              style={
                {
                  // Batch 16A — document-wide typography defaults, applied
                  // as CSS variables the .ProseMirror rules above fall back
                  // to. Explicit per-block attrs (rendered as real inline
                  // styles, e.g. lineHeight) still win via normal CSS
                  // cascade specificity — inline style on the block itself
                  // beats an inherited custom-property-based rule.
                  "--qalam-body-size": `${documentSettings.typography.bodyFontSizePt / 12}rem`,
                  "--qalam-line-height": documentSettings.typography.lineHeight,
                  // Batch 16A.1 (item 3) — direction-specific default font
                  // stacks, resolved through fontRegistry (never bypassed).
                  // An explicit textStyle.fontFamily mark still renders as
                  // a real inline style on its own <span> via TipTap's
                  // FontFamily extension, which wins over these inherited,
                  // direction-scoped rules via normal CSS cascade.
                  "--qalam-rtl-font": `"${getFontById(documentSettings.typography.defaultRtlFontId).editorFamily}"`,
                  "--qalam-ltr-font": `"${getFontById(documentSettings.typography.defaultLtrFontId).editorFamily}"`,
                  // Batch 16B.1 (item 2) — document-wide paragraph
                  // defaults (indent/spacing), same precedence pattern:
                  // an explicit per-block inline style (from
                  // firstLineIndentMm/spaceBeforePt/spaceAfterPt)
                  // overrides these via normal cascade.
                  "--qalam-first-line-indent": `${documentSettings.typography.firstLineIndentMm}mm`,
                  "--qalam-paragraph-before": `${documentSettings.typography.paragraphBeforePt}pt`,
                  "--qalam-paragraph-after": `${documentSettings.typography.paragraphAfterPt}pt`,
                } as React.CSSProperties
              }
            />
            </div>
          </div>
        </div>

        {/* Primary processing actions — directly under editor (mobile + desktop) */}
        <div className="mt-4 space-y-3" dir={dir}>
          {exampleJustLoaded && (
            <p
              className={`rounded-lg border border-[#1A3A2A]/15 bg-[#F3F7F2] px-3 py-2.5 text-sm font-medium text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}
              role="status"
            >
              {isUr
                ? "مثال لوڈ ہوگئی۔ اردو حروف کی اصلاح کے لیے Standardize سے پہلے اردو موڈ منتخب کریں۔ مخلوط متن کے لیے Auto محفوظ صفائی کرتا ہے۔"
                : "Example loaded. For Urdu letter normalization, choose Urdu mode before Standardize. Auto performs safe mixed-language cleanup."}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end">
            <div className="w-full sm:w-auto">
              <label htmlFor="studio-proc-lang-main" className={`block text-xs font-semibold text-gray-700 mb-1 ${isUr ? "font-naskh" : ""}`}>
                {isUr ? "متن کی زبان" : "Text language"}
              </label>
              <select
                id="studio-proc-lang-main"
                value={processingLanguage}
                onChange={(e) => {
                  const next = e.target.value as ProcessingLanguage;
                  setProcessingLanguage(next);
                  trackEvent("tool_mode_change", { tool: "document_studio", mode: next });
                }}
                className="w-full sm:w-44 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30"
              >
                <option value="auto">{isUr ? "آٹو" : "Auto"}</option>
                <option value="ur">{isUr ? "اردو" : "Urdu"}</option>
                <option value="en">{isUr ? "انگریزی" : "English"}</option>
                <option value="ar">{isUr ? "عربی" : "Arabic"}</option>
              </select>
              <p className={`mt-1 text-[11px] text-gray-500 leading-snug max-w-xs ${isUr ? "font-naskh" : ""}`}>
                {isUr
                  ? "Auto mode مخلوط زبان کے متن کو محفوظ طریقے سے process کرتا ہے اور زبان کے مطابق مناسب handling منتخب کرتا ہے۔"
                  : "Auto processes mixed-language text safely and chooses appropriate handling for each language."}
              </p>
            </div>
            <button
              ref={standardizeButtonRef}
              type="button"
              onClick={handleStandardizeClick}
              className={`w-full sm:w-auto min-h-[48px] h-12 px-6 rounded-lg text-[15px] font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-900/20 ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "معیاری بنائیں" : "Standardize Document"}
            </button>
            <button
              type="button"
              onClick={handleRunAudit}
              className={`w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-lg text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "معیار جانچیں" : "Run Quality Audit"}
            </button>
            <button
              type="button"
              onClick={handleClearText}
              disabled={isEditorEmpty}
              className={`w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "متن صاف کریں" : "Clear Text"}
            </button>
          </div>

          {preview && editor && (
            <div className="border border-amber-300 rounded-lg p-4 bg-amber-50 space-y-3">
              <p className={`text-sm font-semibold text-gray-800 ${isUr ? "font-naskh" : ""}`}>
                {isUr ? "تبدیلیاں ایڈیٹر میں لگ گئی ہیں (Undo سے واپس)" : "Changes applied in the editor (use Undo to revert)"}
              </p>
              <ul className="text-sm text-gray-700 space-y-1" dir="ltr">
                <li>Total corrections: {preview.report.totalCorrections}</li>
                <li>Script: {preview.report.scriptNormalizations} · Spacing: {preview.report.spacingFixes} · Punctuation: {preview.report.punctuationFixes}</li>
                <li>Mode: {preview.report.resolvedLanguage} · Direction: {preview.report.direction}</li>
              </ul>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs font-semibold text-gray-600 mb-1 ${isUr ? "font-naskh" : ""}`}>
                    {isUr ? "قبل" : "Before"}
                  </p>
                  <div
                    className="rounded-md border border-gray-200 bg-white p-2 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
                    dir={dir}
                  >
                    {preview.beforePlain}
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-semibold text-gray-600 mb-1 ${isUr ? "font-naskh" : ""}`}>
                    {isUr ? "بعد" : "After"}
                  </p>
                  <div
                    className="rounded-md border border-green-200 bg-green-50/50 p-2 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
                    dir={preview.report.direction}
                  >
                    {extractPlainText(preview.document, preview.report.direction)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={handleConfirmStandardize}
                  className="min-h-[44px] px-5 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  {isUr ? "ٹھیک ہے" : "Dismiss"}
                </button>
              </div>
            </div>
          )}

          {alreadyClean && !preview && (
            <div className={`rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-900 ${isUr ? "font-naskh" : ""}`}>
              <p>
                ✓ {isUr
                  ? "معیاری بنانا مکمل۔ کچھ زبان مخصوص اصلاحات کے لیے مماثل موڈ منتخب کریں۔"
                  : "Standardization complete. Some language-specific corrections require selecting the matching mode."}
              </p>
              {processingLanguage === "auto" && lastResolved === "rtl-neutral" && (
                <p className="mt-1 text-amber-900">
                  {isUr
                    ? "آٹو محفوظ مخلوط صفائی کرتا ہے۔ اردو حروف کی تبدیلی کے لیے «اردو» موڈ منتخب کریں۔"
                    : "Auto performs safe mixed-language cleanup. Choose “Urdu” mode for Urdu letter normalization."}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-5" dir="ltr">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-4 rounded-lg text-[15px] font-semibold bg-[#B8935A] text-white hover:bg-[#C9A46B] shadow-sm transition"
            >
              {copied ? "✓ Copied" : "Copy Text"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className={`h-10 px-4 rounded-lg text-[15px] font-semibold bg-[#1A3A2A] text-white hover:bg-[#204a35] focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 shadow-sm transition ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? (
                <span dir="rtl">
                  <span dir="ltr" className="inline-block">TXT</span>
                  {" فائل ڈاؤن لوڈ کریں"}
                </span>
              ) : (
                "Download TXT File"
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              className={`h-10 px-4 rounded-lg text-[15px] font-semibold bg-[#1A3A2A] text-white hover:bg-[#204a35] focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 shadow-sm transition ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? (
                <span dir="rtl">
                  <span dir="ltr" className="inline-block">DOCX</span>
                  {" فائل ڈاؤن لوڈ کریں"}
                </span>
              ) : (
                "Download DOCX"
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className={`h-10 px-4 rounded-lg text-[15px] font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 ${
                isExportingPdf
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#1A3A2A] text-white hover:bg-[#204a35]"
              }`}
            >
              {isExportingPdf
                ? (isUr ? "PDF بن رہی ہے..." : "Generating…")
                : isUr
                  ? `PDF ڈاؤن لوڈ کریں${pdfSummary ? ` (${pdfSummary.fileSizeLabel})` : ""}`
                  : `Download PDF${pdfSummary ? ` (${pdfSummary.fileSizeLabel})` : ""}`}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs items-center">
            <button
              type="button"
              onClick={handleClearText}
              disabled={isEditorEmpty}
              className="h-9 px-3 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUr ? "متن صاف کریں" : "Clear Text"}
            </button>
            <button
              type="button"
              onClick={handleNewDocument}
              className="h-9 px-3 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
            >
              {isUr ? "نیا مسودہ" : "New Document"}
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="h-9 px-3 rounded-md text-red-500 hover:bg-red-50 transition"
            >
              {isUr ? "ڈرافٹ صاف کریں" : "Clear Draft"}
            </button>
          </div>
        </div>

        <p className={`mt-2 text-[12px] text-gray-500 leading-relaxed ${isUr ? "font-naskh" : ""}`} dir={dir}>
          {isUr
            ? "تدوین آپ کے براؤزر میں ہوتی ہے۔ PDF ایکسپورٹ صرف فائل بنانے کے لیے سرور استعمال کرتا ہے — دستاویز محفوظ نہیں کی جاتی。"
            : "Editing stays in your browser. PDF export uses the server only to generate your file — documents are not stored."}
        </p>

        {pdfSummary && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs" dir="ltr">
            <div className="font-semibold text-amber-800 mb-1.5">✓ PDF Export Complete</div>
            <div className="text-stone-700 space-y-0.5">
              <div>Pages: {pdfSummary.pages}</div>
              <div>File Size: {pdfSummary.fileSizeLabel}</div>
              {pdfSummary.fontsUsed.length > 0 && (
                <div>Fonts Used: {pdfSummary.fontsUsed.map((f) => `✓ ${f}`).join("  ")}</div>
              )}
              {pdfSummary.fontFallbacks.length > 0 && (
                <div className="text-amber-800 mt-1">
                  {pdfSummary.fontFallbacks.map((f) =>
                    isUr
                      ? `${f.requested} مقامی ایڈیٹر میں دستیاب ہے۔ PDF میں ${f.used} استعمال کیا گیا ہے۔`
                      : `${f.requested} is available as a local editor preview. PDF export used ${f.used}.`
                  ).join(" ")}
                </div>
              )}
              <div>Format: Visual / Print PDF</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar — at most one panel below is ever open. Clicking an
          already-active tab closes it, returning to the clean editor-only
          view. */}
      <div className="flex flex-wrap justify-center gap-2 mt-5 bg-[#D8EBDC] rounded-xl border border-[#1A3A2A]/20 shadow-md p-3" dir="ltr">
        {TAB_DEFINITIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => toggleTab(tab.id)}
            className={`h-10 px-5 rounded-lg text-[15px] font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-[#1A3A2A] text-white shadow-sm"
                : "bg-white/80 text-[#1A3A2A]/80 border border-[#1A3A2A]/10 hover:bg-white hover:text-[#1A3A2A] hover:border-[#1A3A2A]/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "find" && (
        <div className="mt-3">
          <FindReplacePanel
            isOpen={true}
            searchQuery={findQuery}
            replaceQuery={replaceQuery}
            matchCount={currentMatches.length}
            currentMatchIndex={currentMatchIndex}
            onSearchChange={handleFindQueryChange}
            onReplaceChange={setReplaceQuery}
            onNext={handleFindNext}
            onPrevious={handleFindPrevious}
            onReplaceCurrent={handleReplaceCurrent}
            onReplaceAll={handleReplaceAll}
            onClose={handleCloseFindReplace}
          />
        </div>
      )}

      {activeTab === "outline" && (
        <div className="mt-3">
          <DocumentOutlinePanel outline={outline} onNavigate={handleOutlineNavigate} />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="mt-3 space-y-4 rounded-xl border border-[#1A3A2A]/10 bg-white p-4">
          <WordRuler dir={dir} layout={pageLayout} />
          <div>
            <h3 className="text-sm font-semibold text-[#1A3A2A] mb-2">Document Style</h3>
            <PublishingPresetSelector selectedId={selectedPresetId} onChange={handlePresetChange} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-600">
              Page size
              <select
                className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                value={documentSettings.page.size}
                onChange={(e) => {
                  const size = e.target.value as "a4" | "a5" | "letter";
                  setDocumentSettings((s) => ({ ...s, page: { ...s.page, size } }));
                  setPdfSummary(null);
                }}
              >
                <option value="a4">A4</option>
                <option value="a5">A5</option>
                <option value="letter">Letter</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Orientation
              <select
                className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                value={documentSettings.page.orientation}
                onChange={(e) => {
                  const orientation = e.target.value as "portrait" | "landscape";
                  setDocumentSettings((s) => ({ ...s, page: { ...s.page, orientation } }));
                  setPdfSummary(null);
                }}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Margins
              <select
                className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                value={documentSettings.page.margins.preset}
                onChange={(e) => {
                  const preset = e.target.value as "normal" | "narrow" | "wide" | "custom";
                  setDocumentSettings((s) => ({
                    ...s,
                    page: { ...s.page, margins: { ...s.page.margins, preset } },
                  }));
                  setPdfSummary(null);
                }}
              >
                <option value="normal">Normal</option>
                <option value="narrow">Narrow</option>
                <option value="wide">Wide</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {documentSettings.page.margins.preset === "custom" && (
              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["topMm", "bottomMm", "startMm", "endMm"] as const).map((key) => (
                  <label key={key} className="text-xs font-medium text-gray-600">
                    {key === "topMm" ? "Top" : key === "bottomMm" ? "Bottom" : key === "startMm" ? "Start" : "End"} (mm)
                    <input
                      type="number"
                      min={MARGIN_MIN_MM}
                      max={MARGIN_MAX_MM}
                      className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                      value={documentSettings.page.margins[key]}
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const value = clampMarginMm(raw);
                        setDocumentSettings((s) => ({
                          ...s,
                          page: { ...s.page, margins: { ...s.page.margins, [key]: value } },
                        }));
                        setPdfSummary(null);
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            <label className="text-xs font-medium text-gray-600">
              Body size (pt)
              <select
                className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                value={documentSettings.typography.bodyFontSizePt}
                onChange={(e) => {
                  const bodyFontSizePt = Number(e.target.value);
                  setDocumentSettings((s) => ({
                    ...s,
                    typography: { ...s.typography, bodyFontSizePt },
                  }));
                }}
              >
                {FONT_SIZE_OPTIONS_PT.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt} pt
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Default line spacing
              <select
                className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                value={documentSettings.typography.lineHeight}
                onChange={(e) => {
                  const lineHeight = Number(e.target.value);
                  setDocumentSettings((s) => ({
                    ...s,
                    typography: { ...s.typography, lineHeight },
                  }));
                }}
              >
                {LINE_HEIGHT_OPTIONS.map((lh) => (
                  <option key={lh} value={lh}>
                    {lh}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Header settings */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={documentSettings.headerFooter.headerEnabled}
                  onChange={(e) => {
                    setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, headerEnabled: e.target.checked } }));
                    setPdfSummary(null);
                  }}
                />
                {isUr ? "ہیڈر" : "Header"}
              </label>
              {documentSettings.headerFooter.headerEnabled && (
                <>
                  <select
                    className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-xs"
                    value={documentSettings.headerFooter.headerMode}
                    onChange={(e) => {
                      setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, headerMode: e.target.value as "auto-title" | "custom" } }));
                      setPdfSummary(null);
                    }}
                  >
                    <option value="auto-title">{isUr ? "خودکار عنوان" : "Auto title"}</option>
                    <option value="custom">{isUr ? "حسب ضرورت" : "Custom"}</option>
                  </select>
                  {documentSettings.headerFooter.headerMode === "custom" && (
                    <input
                      type="text"
                      maxLength={120}
                      placeholder={isUr ? "ہیڈر متن…" : "Header text…"}
                      className="w-full h-9 rounded-md border border-gray-200 px-2 text-xs"
                      value={documentSettings.headerFooter.headerText}
                      onChange={(e) => {
                        setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, headerText: e.target.value } }));
                        setPdfSummary(null);
                      }}
                    />
                  )}
                </>
              )}
            </div>
            {/* Footer settings */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={documentSettings.headerFooter.footerEnabled}
                  onChange={(e) => {
                    setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, footerEnabled: e.target.checked } }));
                    setPdfSummary(null);
                  }}
                />
                {isUr ? "فوٹر" : "Footer"}
              </label>
              {documentSettings.headerFooter.footerEnabled && (
                <>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder={isUr ? "فوٹر متن…" : "Footer text…"}
                    className="w-full h-9 rounded-md border border-gray-200 px-2 text-xs"
                    value={documentSettings.headerFooter.footerText}
                    onChange={(e) => {
                      setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, footerText: e.target.value } }));
                      setPdfSummary(null);
                    }}
                  />
                  <select
                    className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-xs"
                    value={documentSettings.headerFooter.pageNumbers}
                    onChange={(e) => {
                      const pageNumbers = e.target.value as "none" | "current" | "current-total";
                      setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, pageNumbers } }));
                      setPdfSummary(null);
                    }}
                  >
                    <option value="none">{isUr ? "صفحہ نمبر نہیں" : "No page numbers"}</option>
                    <option value="current">{isUr ? "موجودہ صفحہ" : "Current page"}</option>
                    <option value="current-total">{isUr ? "موجودہ / کل" : "Current / Total"}</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "glossary" && (
        <div className="mt-3">
          <GlossaryPanel
            entries={glossary}
            onAdd={handleGlossaryAdd}
            onUpdate={handleGlossaryUpdate}
            onDelete={handleGlossaryDelete}
            onExport={handleGlossaryExport}
            onImport={handleGlossaryImport}
          />
        </div>
      )}

      {activeTab === "quality" && (
        <div className="bg-white p-6 rounded-2xl border border-[#1A3A2A]/10 shadow-[0_2px_20px_rgba(26,58,42,0.06)] mt-3" dir="rtl">
          <div className="mb-4">
            <DocumentStatsBar stats={stats} health={health} />
          </div>

          <h2 className="text-sm font-bold text-amber-800 mb-3">قلم ٹولز / Qalam Tools</h2>

          <div className="mb-4" dir="ltr">
            <label htmlFor="studio-proc-lang" className="block text-xs font-semibold text-gray-700 mb-1">
              {isUr ? "متن کی زبان" : "Text language"}
            </label>
            <select
              id="studio-proc-lang"
              value={processingLanguage}
              onChange={(e) => {
              const next = e.target.value as ProcessingLanguage;
              setProcessingLanguage(next);
              trackEvent("tool_mode_change", { tool: "document_studio", mode: next });
            }}
              className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30"
            >
              <option value="auto">{isUr ? "آٹو" : "Auto"}</option>
              <option value="ur">{isUr ? "اردو" : "Urdu"}</option>
              <option value="en">{isUr ? "انگریزی" : "English"}</option>
              <option value="ar">{isUr ? "عربی" : "Arabic"}</option>
            </select>
            <p className="mt-1 text-[11px] text-gray-500 leading-snug max-w-xl">
              {isUr
                ? "آٹو غیر یقینی عربی رسم الخط پر صرف محفوظ صفائی کرتا ہے۔ مخصوص اصلاح کے لیے اردو یا عربی منتخب کریں۔"
                : "Auto safely detects English or uses non-destructive RTL cleanup when the script is uncertain. Choose Urdu or Arabic for language-specific normalization."}
            </p>
            {lastResolved && (
              <p className="mt-2 text-xs font-medium text-gray-800">
                {lastResolved === "ur"
                  ? (isUr ? "عمل کی زبان: اردو" : "Processed as: Urdu")
                  : lastResolved === "en"
                    ? (isUr ? "عمل کی زبان: انگریزی" : "Processed as: English")
                    : lastResolved === "ar"
                      ? (isUr ? "عمل کی زبان: عربی" : "Processed as: Arabic")
                      : (isUr ? "عمل کی نوعیت: محفوظ آر ٹی ایل" : "Processed as: Safe RTL")}
              </p>
            )}
            {lastResolved === "rtl-neutral" && (
              <p className="mt-1 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                {isUr
                  ? "عربی رسم الخط کا متن پایا گیا — صرف محفوظ عمومی صفائی۔ مخصوص اصلاح کے لیے اردو یا عربی منتخب کریں۔"
                  : "Arabic-script text detected — safe cleanup only. Choose Urdu or Arabic for language-specific processing."}
              </p>
            )}
          </div>

          <div className="mt-4">
            <QualityAuditPanel report={auditReport} isStale={isAuditStale} />
          </div>

          <div className="mt-4">
            <SuggestionsPanel
              pending={reviewState.pending}
              accepted={reviewState.accepted}
              ignored={reviewState.ignored}
              onAccept={handleAcceptSuggestion}
              onIgnore={handleIgnoreSuggestion}
              onApplyAccepted={handleApplyAccepted}
              onAcceptCategory={handleAcceptCategory}
              onIgnoreCategory={handleIgnoreCategory}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Document page canvas: Word/Docs-like reading surface.
           Batch 16A: font-size/line-height now come from CSS variables
           set on the wrapper element from documentSettings.typography
           (see the inline style on .qalam-doc-page below) — the px/rem
           values here are only the FALLBACK for when no variable is set,
           never an override of a genuine document setting. Any per-block
           inline style="line-height:…" (from the real lineHeight attr
           above) naturally wins via normal CSS cascade specificity. */
        .qalam-editor-content.qalam-doc-page .ProseMirror {
          min-height: 60vh;
          /* Batch 16B — page wrapper owns publishing margins (see its
             inline style above); this is minimal caret/click safety
             padding only, not a second publishing margin. */
          padding: 0.5rem;
          outline: none;
          text-align: start;
          font-size: var(--qalam-body-size, 1.05rem);
          line-height: var(--qalam-line-height, 1.85);
          color: #1a1a1a;
        }
        /* Root direction from toolbar RTL/LTR — controls empty caret side */
        .qalam-editor-content .ProseMirror[dir="rtl"] {
          direction: rtl;
        }
        .qalam-editor-content .ProseMirror[dir="ltr"] {
          direction: ltr;
        }
        @media (min-width: 640px) {
          .qalam-editor-content.qalam-doc-page .ProseMirror {
            padding: 0.75rem;
            font-size: var(--qalam-body-size, 1.1rem);
            line-height: var(--qalam-line-height, 1.9);
          }
        }
        /* Explicit block direction (from paragraph attrs) controls caret side. */
        .qalam-editor-content .ProseMirror p[dir="rtl"],
        .qalam-editor-content .ProseMirror h1[dir="rtl"],
        .qalam-editor-content .ProseMirror h2[dir="rtl"],
        .qalam-editor-content .ProseMirror h3[dir="rtl"],
        .qalam-editor-content .ProseMirror h4[dir="rtl"] {
          direction: rtl;
          unicode-bidi: isolate;
          text-align: start;
          /* Batch 16A.1 (item 3) — document default RTL font; an explicit
             textStyle.fontFamily mark on a run still wins (its own inline
             style on the span beats this inherited block-level rule). */
          font-family: var(--qalam-rtl-font, "Noto Nastaliq Urdu");
        }
        .qalam-editor-content .ProseMirror p[dir="ltr"],
        .qalam-editor-content .ProseMirror h1[dir="ltr"],
        .qalam-editor-content .ProseMirror h2[dir="ltr"],
        .qalam-editor-content .ProseMirror h3[dir="ltr"],
        .qalam-editor-content .ProseMirror h4[dir="ltr"] {
          direction: ltr;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-ltr-font, "Inter");
        }
        /* Blocks without dir: content-based mixed rendering */
        .qalam-editor-content .ProseMirror p:not([dir]),
        .qalam-editor-content .ProseMirror h1:not([dir]),
        .qalam-editor-content .ProseMirror h2:not([dir]),
        .qalam-editor-content .ProseMirror h3:not([dir]),
        .qalam-editor-content .ProseMirror h4:not([dir]) {
          unicode-bidi: plaintext;
          text-align: start;
        }
        /* Batch 16A.1 — canonical block-style rules generated from
           BLOCK_STYLES above (single source of truth with PDF/DOCX). */
        ${BLOCK_STYLE_EDITOR_CSS}
        /* Batch 16A correction — these previously hardcoded 1.95/1.7
           unconditionally, defeating --qalam-line-height for every
           ordinary paragraph regardless of documentSettings. Now
           inherits the document-wide variable; an explicit per-block
           lineHeight attr still wins (it renders as a real inline
           style on the element itself, which beats an inherited rule
           via normal CSS cascade specificity — untouched by this). */
        .qalam-editor-content p {
          margin-block-start: var(--qalam-paragraph-before, 0);
          margin-block-end: var(--qalam-paragraph-after, 0.55rem);
          text-indent: var(--qalam-first-line-indent, 0);
          line-height: inherit;
        }
        /* Latin-leaning paragraphs: only nudge if no document-wide
           value has been explicitly set on the wrapper, so a genuine
           documentSettings choice is never silently overridden. */
        .qalam-editor-content p:lang(en) {
          line-height: inherit;
        }
        .qalam-editor-content h1 {
          font-size: 1.55rem;
          font-weight: 700;
          margin: 1rem 0 0.55rem;
          line-height: 1.45;
        }
        .qalam-editor-content h2 {
          font-size: 1.28rem;
          font-weight: 700;
          margin: 0.85rem 0 0.45rem;
          line-height: 1.45;
        }
        .qalam-editor-content h3 {
          font-size: 1.12rem;
          font-weight: 700;
          margin: 0.7rem 0 0.4rem;
          line-height: 1.45;
        }
        .qalam-editor-content h4 {
          font-size: 1.02rem;
          font-weight: 700;
          margin: 0.6rem 0 0.35rem;
          line-height: 1.45;
        }
        .qalam-editor-content ul {
          list-style: disc;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content ol {
          list-style: decimal;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content li {
          margin: 0.15rem 0;
          unicode-bidi: plaintext;
          text-align: start;
        }
        .qalam-editor-content blockquote {
          border-inline-start: 3px solid #d97706;
          padding-inline-start: 1rem;
          color: #57534e;
          font-style: italic;
          margin: 0.5rem 0;
          unicode-bidi: plaintext;
          text-align: start;
        }
        .qalam-editor-content a {
          color: #b45309;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
