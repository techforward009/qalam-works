/**
 * Effective toolbar formatting — display only.
 * Does not write marks/attrs into the document.
 */
import type { Editor } from "@tiptap/react";
import { BLOCK_STYLES, type BlockStyleId } from "./documentStyles";
import { activeBlockStyleId, activeToolbarFontFamily } from "./documentCommands";
import {
  defaultDocumentSettings,
  resolveFontSizePt,
  validateLineHeight,
  type DocumentStudioSettings,
} from "./documentSettings";
import { getFontById, normalizeEditorFontFamily } from "./fontRegistry";

export const MIXED_TOOLBAR_VALUE = "__mixed__";

export interface ActiveToolbarFormatting {
  fontFamily: string;
  fontSizePt: number | null;
  lineHeight: number | null;
  blockStyle: BlockStyleId;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: "left" | "center" | "right" | "justify" | "start" | null;
  bullet: boolean;
  ordered: boolean;
  mixed: {
    fontFamily: boolean;
    fontSize: boolean;
    lineHeight: boolean;
  };
}

function blockDirAt(editor: Editor, pos: number, globalDir: "rtl" | "ltr"): "rtl" | "ltr" {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const dir = $pos.node(depth).attrs.dir;
    if (dir === "rtl" || dir === "ltr") return dir;
  }
  return globalDir;
}

function lineHeightAt(editor: Editor, pos: number, settings: DocumentStudioSettings): number {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const raw = validateLineHeight($pos.node(depth).attrs.lineHeight);
    if (raw !== null) return raw;
  }
  return settings.typography.lineHeight;
}

function blockStyleAt(editor: Editor, pos: number): BlockStyleId {
  const $pos = editor.state.doc.resolve(Math.min(pos, editor.state.doc.content.size));
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      if (level === 1) return "heading-1";
      if (level === 2) return "heading-2";
      if (level === 3) return "heading-3";
      if (level === 4) return "heading-4";
    }
    if (node.type.name === "blockquote") return "quote";
    if (node.type.name === "paragraph") {
      const attr = node.attrs.blockStyle as string | undefined;
      if (attr === "title" || attr === "subtitle" || attr === "caption") return attr;
      return "normal";
    }
  }
  return "normal";
}

function effectiveFamily(
  explicit: string,
  dir: "rtl" | "ltr",
  settings: DocumentStudioSettings,
): string {
  if (explicit) return explicit;
  const id = dir === "ltr" ? settings.typography.defaultLtrFontId : settings.typography.defaultRtlFontId;
  return getFontById(id).editorFamily || (dir === "ltr" ? "Inter" : "Noto Nastaliq Urdu");
}

function effectiveSize(explicit: number | null, blockStyle: BlockStyleId, settings: DocumentStudioSettings): number {
  if (explicit !== null) return explicit;
  return BLOCK_STYLES[blockStyle].defaultFontSizePt ?? settings.typography.bodyFontSizePt;
}

export function resolveActiveToolbarFormatting(
  editor: Editor,
  settings: DocumentStudioSettings = defaultDocumentSettings(),
  globalDir: "rtl" | "ltr" = "rtl",
): ActiveToolbarFormatting {
  const blockStyle = activeBlockStyleId(editor);
  const style = BLOCK_STYLES[blockStyle];
  const { from, to, empty } = editor.state.selection;
  const families = new Set<string>();
  const sizes = new Set<number>();
  const lineHeights = new Set<number>();

  const addFromText = (pos: number, explicitFamily: string, explicitSize: number | null) => {
    const dir = blockDirAt(editor, pos, globalDir);
    const localStyle = blockStyleAt(editor, pos);
    families.add(effectiveFamily(explicitFamily, dir, settings));
    sizes.add(effectiveSize(explicitSize, localStyle, settings));
    lineHeights.add(lineHeightAt(editor, pos, settings));
  };

  if (empty) {
    addFromText(
      from,
      activeToolbarFontFamily(editor),
      resolveFontSizePt(editor.getAttributes("textStyle").fontSize),
    );
  } else {
    let sawText = false;
    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return;
      sawText = true;
      const mark = node.marks.find((item) => item.type.name === "textStyle");
      addFromText(
        pos,
        normalizeEditorFontFamily(mark?.attrs?.fontFamily),
        resolveFontSizePt(mark?.attrs?.fontSize),
      );
    });
    if (!sawText) {
      addFromText(
        from,
        activeToolbarFontFamily(editor),
        resolveFontSizePt(editor.getAttributes("textStyle").fontSize),
      );
    }
  }

  const mixed = {
    fontFamily: families.size > 1,
    fontSize: sizes.size > 1,
    lineHeight: lineHeights.size > 1,
  };

  const explicitAlign = editor.isActive({ textAlign: "justify" })
    ? "justify"
    : editor.isActive({ textAlign: "center" })
      ? "center"
      : editor.isActive({ textAlign: "right" })
        ? "right"
        : editor.isActive({ textAlign: "left" })
          ? "left"
          : null;

  return {
    fontFamily: mixed.fontFamily ? MIXED_TOOLBAR_VALUE : [...families][0] ?? effectiveFamily("", globalDir, settings),
    fontSizePt: mixed.fontSize ? null : [...sizes][0] ?? settings.typography.bodyFontSizePt,
    lineHeight: mixed.lineHeight ? null : [...lineHeights][0] ?? settings.typography.lineHeight,
    blockStyle,
    bold: editor.isActive("bold") || Boolean(style.bold),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    textAlign: explicitAlign ?? style.align ?? null,
    bullet: editor.isActive("bulletList"),
    ordered: editor.isActive("orderedList"),
    mixed,
  };
}
