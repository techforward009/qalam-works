import { CONTENT_REPLACEMENT } from "./formattingSafety";
import type { Leading } from "./leading";
/**
 * Shared Document Studio editor commands.
 * Toolbar, future menus/shortcuts, and tests call these — not TipTap chains
 * inlined in React. Does not own React state, export, or normalization.
 */
import type { Editor } from "@tiptap/react";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Mark, Node as PMNode } from "@tiptap/pm/model";
import { Slice, Fragment as pmFragment } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import { liftTarget } from "@tiptap/pm/transform";
import { detectParagraphDirection, type ParagraphDirectionMode } from "./paragraphDirection";
import { BLOCK_STYLES, isBlockStyleId, type BlockStyleId } from "./documentStyles";
import { findAllTextMatches } from "./findReplace";
import { extractPlainText, type DocNode } from "./extractPlainText";
import { detectBlockDirection } from "./plainTextToDocNode";
import { normalizeEditorFontFamily, quoteEditorFontFamily } from "./fontRegistry";
import { normalizeSafeHex } from "./studioColors";
import type { TextEffect } from "./inpageToolbar";
import { isLatinFamilyName, hasScript, scriptRanges } from "../extensions/LatinScriptRuns";
import {
  defaultDocumentSettings,
  resolveAddSpaceAfterPt,
  resolveAddSpaceBeforePt,
  type DocumentStudioSettings,
} from "./documentSettings";

export function applyDocumentDirection(editor: Editor, nextDir: "rtl" | "ltr"): void {
  const dom = editor.view.dom as HTMLElement;
  dom.setAttribute("dir", nextDir);
  dom.style.direction = nextDir;
}

/** Explicit direction affects only selected/current textblocks, never alignment. */
export function applyParagraphDirection(editor: Editor, mode: ParagraphDirectionMode): void {
  const { state } = editor;
  const tr = state.tr;
  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
    if (node.type.name !== "paragraph" && node.type....[truncated]