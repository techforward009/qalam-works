/** Canonical block styles for Document Studio. */

export type BlockStyleId =
  | "normal"
  | "title"
  | "subtitle"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "quote"
  | "caption";

export interface BlockStyleDefinition {
  id: BlockStyleId;
  label: string;
  labelUr: string;
  /** TipTap node transformation */
  kind: "paragraph" | "heading" | "blockquote";
  headingLevel?: 1 | 2 | 3 | 4;
  /** Default presentation hints (not forced as marks) */
  defaultFontSizePt?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  blockStyleAttr?: "title" | "subtitle" | "caption";
}

export const BLOCK_STYLES: Record<BlockStyleId, BlockStyleDefinition> = {
  normal: {
    id: "normal",
    label: "Normal",
    labelUr: "عام",
    kind: "paragraph",
  },
  title: {
    id: "title",
    label: "Title",
    labelUr: "عنوان",
    kind: "paragraph",
    defaultFontSizePt: 28,
    bold: true,
    align: "center",
    blockStyleAttr: "title",
  },
  subtitle: {
    id: "subtitle",
    label: "Subtitle",
    labelUr: "ذیلی عنوان",
    kind: "paragraph",
    defaultFontSizePt: 18,
    align: "center",
    blockStyleAttr: "subtitle",
  },
  "heading-1": {
    id: "heading-1",
    label: "Heading 1",
    labelUr: "سرخی 1",
    kind: "heading",
    headingLevel: 1,
    defaultFontSizePt: 24,
    bold: true,
  },
  "heading-2": {
    id: "heading-2",
    label: "Heading 2",
    labelUr: "سرخی 2",
    kind: "heading",
    headingLevel: 2,
    defaultFontSizePt: 20,
    bold: true,
  },
  "heading-3": {
    id: "heading-3",
    label: "Heading 3",
    labelUr: "سرخی 3",
    kind: "heading",
    headingLevel: 3,
    defaultFontSizePt: 16,
    bold: true,
  },
  "heading-4": {
    id: "heading-4",
    label: "Heading 4",
    labelUr: "سرخی 4",
    kind: "heading",
    headingLevel: 4,
    defaultFontSizePt: 14,
    bold: true,
  },
  quote: {
    id: "quote",
    label: "Quote",
    labelUr: "اقتباس",
    kind: "blockquote",
  },
  caption: {
    id: "caption",
    label: "Caption",
    labelUr: "کیپشن",
    kind: "paragraph",
    defaultFontSizePt: 10,
    align: "center",
    blockStyleAttr: "caption",
  },
};

export const BLOCK_STYLE_IDS = Object.keys(BLOCK_STYLES) as BlockStyleId[];

export function isBlockStyleId(v: unknown): v is BlockStyleId {
  return typeof v === "string" && v in BLOCK_STYLES;
}
