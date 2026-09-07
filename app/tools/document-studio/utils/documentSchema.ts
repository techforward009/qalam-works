/**
 * Document Studio TipTap schema — independent of React UI.
 * ParagraphWithDir / HeadingWithDir and canvas block-style CSS live here
 * so editor, tests, and future toolbar/menu/shortcuts share one schema.
 */
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { BLOCK_STYLES, isBlockStyleId, type BlockStyleId } from "./documentStyles";
import { validateLineHeight, validateIndentMm, validateSpacingPt } from "./documentSettings";

/** Persist writing direction on textblocks so empty RTL paragraphs place the caret on the right. */
// Batch 16A (2026-08-11) — real, persistent schema attrs. Previously
// only `dir` was declared here; block-style/line-height/indent/spacing
// attrs were being set via updateAttributes() WITHOUT being declared in
// the schema, which TipTap does not persist through getJSON()/reload —
// a real, verified bug (confirmed via round-trip test). `blockStyle`
// renders as `data-block-style` (CSS-driven presentation — see
// BLOCK_STYLE_EDITOR_CSS — never stamps inline FontSize/Bold/TextAlign
// marks, so switching styles is always a clean, symmetric reset).
const PARAGRAPH_STYLE_ATTRS = {
  blockStyle: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-block-style");
      return v && isBlockStyleId(v) ? v : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
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
      lineHeight: PARAGRAPH_STYLE_ATTRS.lineHeight,
      spaceBeforePt: PARAGRAPH_STYLE_ATTRS.spaceBeforePt,
      spaceAfterPt: PARAGRAPH_STYLE_ATTRS.spaceAfterPt,
    };
  },
});

/** Production editor extension list — one assembly point for UI and tests. */
export function createDocumentStudioExtensions() {
  return [
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
  ];
}
