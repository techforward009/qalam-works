/**
 * Shared Document Studio editor commands.
 * Toolbar, future menus/shortcuts, and tests call these — not TipTap chains
 * inlined in React. Does not own React state, export, or normalization.
 */
import type { Editor } from "@tiptap/react";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Mark, Node as PMNode } from "@tiptap/pm/model";
import { Slice, Fragment as pmFragment } from "@tiptap/pm/model";
import { BLOCK_STYLES, isBlockStyleId, type BlockStyleId } from "./documentStyles";
import { findAllTextMatches } from "./findReplace";
import { extractPlainText, type DocNode } from "./extractPlainText";
import { detectBlockDirection } from "./plainTextToDocNode";
import { normalizeEditorFontFamily } from "./fontRegistry";
import { normalizeSafeHex } from "./studioColors";
import {
  defaultDocumentSettings,
  resolveAddSpaceAfterPt,
  resolveAddSpaceBeforePt,
  type DocumentStudioSettings,
} from "./documentSettings";

export function applyDocumentDirection(editor: Editor, nextDir: "rtl" | "ltr"): void {
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
    tr.setMeta("addToHistory", false);
    editor.view.dispatch(tr);
  }
  const dom = editor.view.dom as HTMLElement;
  dom.setAttribute("dir", nextDir);
  dom.style.direction = nextDir;
}

export function applyBlockStyle(editor: Editor, id: BlockStyleId): void {
  const style = BLOCK_STYLES[id];
  if (!style) return;
  const chain = editor.chain().focus();
  if (style.kind === "heading" && style.headingLevel) {
    chain.setHeading({ level: style.headingLevel }).run();
  } else if (style.kind === "blockquote") {
    chain.setBlockquote().run();
  } else {
    chain.setParagraph().run();
    chain.updateAttributes("paragraph", { blockStyle: style.blockStyleAttr ?? null }).run();
  }
}

export function activeBlockStyleId(editor: Editor): BlockStyleId {
  if (editor.isActive("heading", { level: 1 })) return "heading-1";
  if (editor.isActive("heading", { level: 2 })) return "heading-2";
  if (editor.isActive("heading", { level: 3 })) return "heading-3";
  if (editor.isActive("heading", { level: 4 })) return "heading-4";
  if (editor.isActive("blockquote")) return "quote";
  const attr = editor.getAttributes("paragraph").blockStyle as string | undefined;
  return attr && isBlockStyleId(attr) ? attr : "normal";
}

export function applyLineHeight(editor: Editor, value: number | null): void {
  applyParagraphAttrs(editor, { lineHeight: value });
}

const HEADING_INDENT_KEYS = new Set(["firstLineIndentMm", "indentStartMm", "indentEndMm"]);

export type ParagraphSpacingAttrs = {
  lineHeight?: number | null;
  spaceBeforePt?: number | null;
  spaceAfterPt?: number | null;
  firstLineIndentMm?: number | null;
  indentStartMm?: number | null;
  indentEndMm?: number | null;
};

export function applyParagraphAttrs(editor: Editor, attrs: ParagraphSpacingAttrs): void {
  const { state } = editor;
  if (!state?.selection || typeof state.doc?.nodesBetween !== "function") {
    const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
    editor.chain().focus().updateAttributes(nodeType, attrs).run();
    return;
  }
  const { from, to } = state.selection;
  let tr = state.tr;
  let changed = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
    const next = { ...node.attrs };
    let nodeChanged = false;
    (Object.keys(attrs) as (keyof ParagraphSpacingAttrs)[]).forEach((key) => {
      if (!(key in attrs)) return;
      if (node.type.name === "heading" && HEADING_INDENT_KEYS.has(key)) return;
      if (next[key] !== attrs[key]) {
        next[key] = attrs[key] ?? null;
        nodeChanged = true;
      }
    });
    if (nodeChanged) {
      tr = tr.setNodeMarkup(pos, undefined, next);
      changed = true;
    }
    return false;
  });
  if (changed) editor.view.dispatch(tr);
  editor.commands.setTextSelection({ from, to });
  editor.chain().focus().run();
}

export function addSpaceBeforeParagraph(editor: Editor, settings: DocumentStudioSettings = defaultDocumentSettings()): void {
  applyParagraphAttrs(editor, { spaceBeforePt: resolveAddSpaceBeforePt(settings) });
}

export function removeSpaceBeforeParagraph(editor: Editor): void {
  applyParagraphAttrs(editor, { spaceBeforePt: 0 });
}

export function addSpaceAfterParagraph(editor: Editor, settings: DocumentStudioSettings = defaultDocumentSettings()): void {
  applyParagraphAttrs(editor, { spaceAfterPt: resolveAddSpaceAfterPt(settings) });
}

export function removeSpaceAfterParagraph(editor: Editor): void {
  applyParagraphAttrs(editor, { spaceAfterPt: 0 });
}

export function applyCustomParagraphSpacing(editor: Editor, attrs: ParagraphSpacingAttrs): void {
  applyParagraphAttrs(editor, attrs);
}

export function applyFontFamily(editor: Editor, family: string): void {
  if (!family) {
    editor.chain().focus().unsetFontFamily().run();
  } else {
    editor.chain().focus().setFontFamily(family).run();
  }
}

export function activeToolbarFontFamily(editor: Editor): string {
  return normalizeEditorFontFamily(editor.getAttributes("textStyle").fontFamily);
}

export function applyFontSize(editor: Editor, pt: string): void {
  if (!pt) {
    editor.chain().focus().unsetFontSize().run();
  } else {
    editor.chain().focus().setFontSize(`${pt}pt`).run();
  }
}

export function toggleBold(editor: Editor): void {
  editor.chain().focus().toggleBold().run();
}
export function toggleItalic(editor: Editor): void {
  editor.chain().focus().toggleItalic().run();
}
export function toggleUnderline(editor: Editor): void {
  editor.chain().focus().toggleUnderline().run();
}
export function toggleHeading(editor: Editor, level: 1 | 2 | 3 | 4): void {
  editor.chain().focus().toggleHeading({ level }).run();
}
export function toggleBulletList(editor: Editor): void {
  editor.chain().focus().toggleBulletList().run();
}
export function toggleOrderedList(editor: Editor): void {
  editor.chain().focus().toggleOrderedList().run();
}
export function toggleBlockquote(editor: Editor): void {
  editor.chain().focus().toggleBlockquote().run();
}
export function setLinkHref(editor: Editor, url: string | null): void {
  if (url) editor.chain().focus().setLink({ href: url }).run();
  else editor.chain().focus().unsetLink().run();
}
export function setAlign(editor: Editor, align: "left" | "center" | "right" | "justify"): void {
  editor.chain().focus().setTextAlign(align).run();
}
export function undo(editor: Editor): void {
  editor.chain().focus().undo().run();
}
export function redo(editor: Editor): void {
  editor.chain().focus().redo().run();
}
export function selectAll(editor: Editor): void {
  editor.chain().focus().selectAll().run();
}

export function editorToPlainText(editor: Editor, dir: "rtl" | "ltr"): string {
  return extractPlainText(editor.getJSON() as DocNode, dir);
}

export function findSuggestionRange(editor: Editor, searchText: string): { from: number; to: number } | null {
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

export function findAllRangesInEditor(editor: Editor, searchText: string): { from: number; to: number }[] {
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

export function buildReplaceAllTransaction(
  state: EditorState,
  searchText: string,
  replaceText: string,
): Transaction | null {
  if (!searchText) return null;
  const results: { from: number; to: number; marks: Mark[] }[] = [];
  state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (const match of findAllTextMatches(node.text, searchText)) {
        results.push({ from: pos + match.index, to: pos + match.index + match.length, marks: [...node.marks] });
      }
    }
    return true;
  });
  if (results.length === 0) return null;
  results.sort((a, b) => b.from - a.from);
  const tr = state.tr;
  for (const m of results) {
    const textNode = replaceText ? state.schema.text(replaceText, m.marks) : null;
    tr.replaceWith(m.from, m.to, textNode ? [textNode] : []);
  }
  return tr;
}

export function replaceAll(editor: Editor, searchText: string, replaceText: string): boolean {
  const tr = buildReplaceAllTransaction(editor.state, searchText, replaceText);
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
}

export function findBlockStartPosition(editor: Editor, blockIndex: number): number | null {
  let currentIndex = 0;
  let foundPos: number | null = null;
  editor.state.doc.forEach((_node, offset) => {
    if (currentIndex === blockIndex) {
      foundPos = offset + 1;
    }
    currentIndex++;
  });
  return foundPos;
}

export function transformPastedSlice(slice: Slice, fallbackDir: "rtl" | "ltr"): Slice {
  if (!slice.content.size) return slice;
  function assignDir(node: PMNode): PMNode {
    if (!node.isTextblock) {
      const mapped = node.content.content.map(assignDir);
      return node.copy(pmFragment.from(mapped));
    }
    const text = node.textContent;
    if (!text.trim()) return node;
    const detectedDir = detectBlockDirection(text, fallbackDir);
    return node.type.create({ ...node.attrs, dir: detectedDir }, node.content, node.marks);
  }
  const nodes = slice.content.content.map(assignDir);
  return new Slice(pmFragment.from(nodes), slice.openStart, slice.openEnd);
}

export function buildDocumentStudioExample(fallbackDir: "rtl" | "ltr" = "rtl"): DocNode {
  const paragraphs = [
    "مسودہ: یہ  ایک  نمونہ دستاویز ہے ,جس میں غیر ضروری spaces ہیں۔",
    "Draft notes: Review spacing and punctuation, then standardize and run Quality Audit before export.",
    "آخری مرحلہ: تصدیق کے بعد TXT، DOCX یا PDF ایکسپورٹ کریں۔",
  ];
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      attrs: { dir: detectBlockDirection(text, fallbackDir) },
      content: [{ type: "text", text }],
    })),
  };
}

export function applyTextColor(editor: Editor, hex: string): void {
  const safe = normalizeSafeHex(hex);
  if (!safe) {
    editor.chain().focus().unsetColor().run();
    return;
  }
  editor.chain().focus().setColor(safe).run();
}

export function applyHighlight(editor: Editor, hex: string): void {
  const safe = normalizeSafeHex(hex);
  if (!safe) {
    editor.chain().focus().unsetHighlight().run();
    return;
  }
  editor.chain().focus().setHighlight({ color: safe }).run();
}

export function clearHighlight(editor: Editor): void {
  editor.chain().focus().unsetHighlight().run();
}
