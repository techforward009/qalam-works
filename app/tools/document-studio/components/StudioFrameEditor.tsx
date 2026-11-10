"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { defaultDocumentSettings } from "../utils/documentSettings";
import type { StudioTextAlign } from "../utils/documentCommands";
import { blockLeadingPt } from "../utils/autoLeading";
import { caretGeometry } from "../utils/caretGeometry";
import { editorFontFamilyStack, getFontById } from "../utils/fontRegistry";
import { FORMATTING_TARGET_CHANGE, registerFrameEditor, registerFrameHistory, registerFrameStyleUpdater } from "../utils/formattingSafety";
import type { ParagraphFormat } from "../utils/paragraphFormats";
import { docToFrame, frameContentPatch, frameToDoc, type FrameDocNode, type FrameTextState } from "../utils/frameEditorDoc";
import { createFrameEditorExtensions } from "../utils/frameEditorExtensions";
import type { KeyboardLayout } from "../utils/inpageKeyboard";
import { toolbarParagraphAlign, type ParagraphAlign } from "../utils/paragraphAlign";
import { handleStudioDocumentNavigation } from "../utils/studioDocumentNavigation";
import { bindFrameScrollLock, caretInClippedOverflow, frameOverflowEdge, frameOverflowMarkStyle, pinFrameScroll, type FrameOverflowEdge } from "../utils/frameOverflow";
import type { StudioFrame } from "./StudioObjectLayer";

const FRAME_EDITOR_CSS = `
[data-studio-frame-editor]{box-sizing:border-box;height:100%;min-height:100%;max-height:100%;border:1px solid #000;padding:2px;margin:0;text-indent:0;overflow:hidden;scrollbar-width:none;caret-color:transparent;outline:none;background:transparent;white-space:pre-wrap;overflow-wrap:break-word;tab-size:8;font-kerning:auto;font-variant-ligatures:normal;font-feature-settings:normal;}
[data-studio-frame-editor]::-webkit-scrollbar{display:none;}
[data-studio-frame-editor] p{margin:0;padding:0;unicode-bidi:plaintext;white-space:pre-wrap;overflow-wrap:break-word;}
`;

function pmPlainOffset(doc: PMNode, pos: number): number {
  let offset = 0;
  let result = 0;
  let found = false;
  doc.descendants((node, nodePos) => {
    if (found || !node.isTextblock) return false;
    const start = nodePos + 1;
    if (pos <= start + node.content.size) {
      result = offset + Math.max(0, Math.min(node.textContent.length, pos - start));
      found = true;
      return false;
    }
    offset += node.textContent.length + 1;
    result = offset;
    return false;
  });
  return result;
}

function publishAlign(editor: Editor) {
  const dom = editor.view.dom as HTMLElement;
  const next = docToFrame(editor.getJSON() as FrameDocNode);
  const start = pmPlainOffset(editor.state.doc, editor.state.selection.from);
  const end = pmPlainOffset(editor.state.doc, editor.state.selection.to);
  const label = toolbarParagraphAlign(next.text, next.textAlign, next.paragraphAligns ?? undefined, start, end);
  if (dom.dataset.studioFrameTextAlign === label && dom.dataset.studioFrameAlignPublished === label) return;
  dom.dataset.studioFrameTextAlign = label;
  dom.setAttribute("data-studio-frame-text-align", label);
  dom.dataset.studioFrameAlignPublished = label;
  dom.closest<HTMLElement>("[data-studio-root]")?.dispatchEvent(new Event(FORMATTING_TARGET_CHANGE));
}

function placeClick(editor: Editor, point: { x: number; y: number }): boolean {
  let hit: { pos: number } | null = null;
  try {
    hit = editor.view.posAtCoords({ left: point.x, top: point.y });
  } catch {
    return false;
  }
  if (!hit) return false;
  const doc = editor.state.doc;
  const clamped = Math.max(0, Math.min(hit.pos, doc.content.size));
  const selection = TextSelection.near(doc.resolve(clamped));
  if (!selection.eq(editor.state.selection)) editor.view.dispatch(editor.state.tr.setSelection(selection));
  return true;
}

/** Box-local caret. The frame scroll is pinned first, so coords are top-anchored. */
function measureFrameCaret(editor: Editor, pageWidthPx: number, zoom: number) {
  if (editor.isDestroyed || !editor.isFocused || !editor.state.selection.empty) return null;
  const view = editor.view;
  const dom = view.dom as HTMLElement;
  pinFrameScroll(dom, false);
  const shell = dom.closest<HTMLElement>("[data-studio-frame-editor-shell]");
  if (!shell) return null;
  let coords: { left: number; top: number; bottom: number };
  try {
    coords = view.coordsAtPos(editor.state.selection.head);
  } catch {
    return null;
  }
  const origin = shell.getBoundingClientRect();
  const surface = shell.closest<HTMLElement>("[data-studio-zoom-surface]");
  const scaled = surface && pageWidthPx > 0 ? surface.getBoundingClientRect().width / pageWidthPx : zoom;
  const scale = scaled > 0 && Number.isFinite(scaled) ? scaled : 1;
  const head = editor.state.selection.$head;
  const resolved = view.domAtPos(head.pos);
  const anchor = resolved.node.nodeType === Node.TEXT_NODE
    ? resolved.node.parentElement
    : resolved.node instanceof HTMLElement ? resolved.node : dom;
  const block = anchor?.closest<HTMLElement>("p") ?? dom;
  const bounds = block.getBoundingClientRect();
  const blockStyle = getComputedStyle(block);
  const rtl = getComputedStyle(anchor ?? dom).direction === "rtl";
  const empty = head.parent.isTextblock && head.parent.content.size === 0;
  const alignment = blockStyle.textAlign;
  const point = empty
    ? alignment === "center" ? (bounds.left + bounds.right) / 2
      : alignment === "left" || (alignment === "start" && !rtl) || (alignment === "end" && rtl) ? bounds.left
        : bounds.right
    : coords.left;
  const editorRect = dom.getBoundingClientRect();
  const editorStyle = getComputedStyle(dom);
  const padLeft = (parseFloat(editorStyle.paddingLeft) || 0) + (parseFloat(editorStyle.borderLeftWidth) || 0);
  const padRight = (parseFloat(editorStyle.paddingRight) || 0) + (parseFloat(editorStyle.borderRightWidth) || 0);
  const padTop = (parseFloat(editorStyle.paddingTop) || 0) + (parseFloat(editorStyle.borderTopWidth) || 0);
  const padBottom = (parseFloat(editorStyle.paddingBottom) || 0) + (parseFloat(editorStyle.borderBottomWidth) || 0);
  const leading = parseFloat(blockStyle.lineHeight);
  const height = Number.isFinite(leading) ? leading : Math.max(0, (coords.bottom - coords.top) / scale);
  const contentLeft = (editorRect.left - origin.left) / scale + padLeft;
  const contentRight = (editorRect.right - origin.left) / scale - padRight;
  const contentTop = (editorRect.top - origin.top) / scale + padTop;
  const contentBottom = (editorRect.bottom - origin.top) / scale - padBottom;
  const rawTop = (coords.top - origin.top) / scale;
  const rawX = (point - origin.left) / scale;
  const inkWidth = 2 / scale;
  if (caretInClippedOverflow(
    { left: rtl ? rawX - inkWidth : rawX, top: rawTop, width: inkWidth, height },
    { left: contentLeft, top: contentTop, right: contentRight, bottom: contentBottom },
  )) return null;
  return caretGeometry({
    x: rawX,
    top: rawTop,
    height,
    scale,
    rtl,
    blockLeft: (bounds.left - origin.left) / scale,
    blockRight: (bounds.right - origin.left) / scale,
    contentLeft,
    contentRight,
    contentTop,
    contentBottom,
  });
}

export function StudioFrameEditor({
  text,
  textAlign,
  paragraphAligns,
  paragraphFormats,
  typography,
  textColor,
  pageWidthPx,
  zoom = 1,
  getKeyboardLayout,
  clickPoint,
  onDoc,
  onStyle,
  onCommit,
}: {
  text: string;
  textAlign?: StudioTextAlign;
  paragraphAligns?: ParagraphAlign[];
  paragraphFormats?: readonly ParagraphFormat[] | null;
  typography?: DocumentStudioSettings["typography"];
  textColor?: string;
  pageWidthPx: number;
  zoom?: number;
  getKeyboardLayout: () => KeyboardLayout | null;
  clickPoint: { x: number; y: number } | null;
  onDoc: (frame: FrameTextState, doc: FrameDocNode) => void;
  onStyle: (patch: Partial<Pick<StudioFrame, "typography" | "textColor">> & { textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  onCommit: () => void;
}) {
  const onDocRef = useRef(onDoc);
  onDocRef.current = onDoc;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const onStyleRef = useRef(onStyle);
  onStyleRef.current = onStyle;
  const layoutRef = useRef(getKeyboardLayout);
  layoutRef.current = getKeyboardLayout;
  const frameRef = useRef<FrameTextState>({ text, textAlign, paragraphAligns, paragraphFormats });
  frameRef.current = { text, textAlign, paragraphAligns, paragraphFormats };
  const clickRef = useRef(clickPoint);
  const seed = useRef({ text, textAlign, paragraphAligns, paragraphFormats });
  const [caret, setCaret] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [overflow, setOverflow] = useState<FrameOverflowEdge | null>(null);
  const formatKey = JSON.stringify(paragraphFormats ?? null);
  const family = typography ? editorFontFamilyStack(typography.defaultRtlFontId) : "\"Jameel Noori Nastaleeq\", serif";
  const size = typography?.bodyFontSizePt ?? 12;
  const editorFamily = typography ? getFontById(typography.defaultRtlFontId).editorFamily : "Jameel Noori Nastaleeq";
  const leading = blockLeadingPt({ type: "paragraph" }, family, typography ?? { bodyFontSizePt: 12, lineHeight: 1.5 }, "rtl");
  const extensions = useMemo(() => createFrameEditorExtensions(() => layoutRef.current()), []);
  const content = useMemo(() => frameToDoc(seed.current.text, seed.current.textAlign, seed.current.paragraphAligns, seed.current.paragraphFormats), []);
  const editorProps = useMemo(() => ({
    attributes: {
      "data-studio-text-frame": "true",
      "data-studio-frame-editor": "true",
      "aria-label": "Text box",
      dir: "rtl",
      spellcheck: "false",
    },
    handleKeyDown: (view: Editor["view"], event: KeyboardEvent) => {
      if (handleStudioDocumentNavigation(view, event)) return true;
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        onCommitRef.current();
        return true;
      }
      return false;
    },
    handleDOMEvents: {
      compositionstart: (view: Editor["view"]) => {
        view.dom.setAttribute("data-studio-frame-composing", "true");
        return false;
      },
      compositionend: (view: Editor["view"]) => {
        view.dom.removeAttribute("data-studio-frame-composing");
        return false;
      },
    },
  }), []);
  const editor = useEditor({
    extensions,
    content,
    immediatelyRender: true,
    injectCSS: false,
    shouldRerenderOnTransaction: false,
    editorProps,
    onUpdate: ({ editor: current, transaction }) => {
      if (transaction.docChanged) onDocRef.current(frameRef.current, current.getJSON() as FrameDocNode);
      publishAlign(current);
    },
    onSelectionUpdate: ({ editor: current }) => publishAlign(current),
  }, [extensions, content, editorProps]);

  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom as HTMLElement;
    dom.dataset.studioFrameFontFamily = editorFamily;
    dom.dataset.studioFrameFontSizePt = String(size);
    dom.dataset.studioFrameTextColor = textColor ?? "";
    dom.dataset.studioFrameTypography = JSON.stringify(typography ?? { ...defaultDocumentSettings().typography, defaultRtlFontId: "jameel-noori-nastaleeq" });
    dom.style.fontFamily = family;
    dom.style.fontSize = `${size}pt`;
    dom.style.lineHeight = `${leading}pt`;
    dom.style.color = textColor ?? "#000";
    dom.style.direction = "rtl";
    dom.style.overflow = "hidden";
    dom.style.maxHeight = "100%";
    publishAlign(editor);
  }, [editor, editorFamily, family, leading, size, textColor, typography]);

  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const point = clickRef.current;
    const focus = () => {
      try {
        editor.view.dom.focus({ preventScroll: true });
      } catch {
        /* detached */
      }
    };
    if (point && !placeClick(editor, point)) {
      const raf = requestAnimationFrame(() => {
        if (!editor.isDestroyed) placeClick(editor, point);
        focus();
      });
      focus();
      return () => cancelAnimationFrame(raf);
    }
    focus();
  }, [editor]);

  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    const unregisterEditor = registerFrameEditor(dom, editor);
    const unregisterStyle = registerFrameStyleUpdater(dom, (patch) => {
      if (patch.textAlign) editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign(patch.textAlign).run();
      if (patch.typography || patch.textColor !== undefined) {
        onStyleRef.current({
          ...(patch.typography ? { typography: patch.typography } : {}),
          ...(patch.textColor !== undefined ? { textColor: patch.textColor } : {}),
        });
      }
    });
    const unregisterHistory = registerFrameHistory(dom, {
      undo: () => { editor.commands.undo(); return true; },
      redo: () => { editor.commands.redo(); return true; },
    });
    return () => { unregisterEditor(); unregisterStyle(); unregisterHistory(); };
  }, [editor]);

  // Prop echo matches the mounted doc and is left alone. A later external frame edit replaces that doc before the next keystroke can write the stale seed back.
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.view.dom.hasAttribute("data-studio-frame-composing")) return;
    const incoming: FrameTextState = { text, textAlign, paragraphAligns, paragraphFormats };
    if (frameContentPatch(incoming, editor.getJSON() as FrameDocNode) === null) return;
    editor.chain().command(({ tr }) => {
      tr.setMeta("addToHistory", false);
      return true;
    }).setContent(frameToDoc(text, textAlign, paragraphAligns, paragraphFormats), { emitUpdate: false }).run();
  }, [editor, text, textAlign, paragraphAligns, paragraphFormats]);

  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    const dom = editor.view.dom as HTMLElement;
    const releaseScroll = bindFrameScrollLock(dom, false);
    const measure = () => {
      if (editor.isDestroyed) return;
      pinFrameScroll(dom, false);
      const edge = frameOverflowEdge({
        singleLine: false,
        scrollHeight: dom.scrollHeight,
        clientHeight: dom.clientHeight,
        scrollWidth: dom.scrollWidth,
        clientWidth: dom.clientWidth,
      });
      setOverflow((prev) => prev === edge ? prev : edge);
      const next = measureFrameCaret(editor, pageWidthPx, zoom);
      setCaret((prev) => {
        if (!next) return prev ? null : prev;
        if (prev && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height) return prev;
        return next;
      });
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    schedule();
    editor.on("selectionUpdate", schedule);
    editor.on("transaction", schedule);
    editor.on("focus", schedule);
    editor.on("blur", schedule);
    dom.addEventListener("scroll", schedule);
    document.addEventListener("selectionchange", schedule);
    document.fonts?.addEventListener("loadingdone", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(dom);
    const shell = dom.closest<HTMLElement>("[data-studio-frame-editor-shell]");
    if (shell) observer.observe(shell);
    return () => {
      cancelAnimationFrame(raf);
      releaseScroll();
      observer.disconnect();
      editor.off("selectionUpdate", schedule);
      editor.off("transaction", schedule);
      editor.off("focus", schedule);
      editor.off("blur", schedule);
      dom.removeEventListener("scroll", schedule);
      document.removeEventListener("selectionchange", schedule);
      document.fonts?.removeEventListener("loadingdone", schedule);
    };
  }, [editor, leading, pageWidthPx, zoom, size, family, formatKey]);

  return (
    <div data-studio-frame-editor-shell style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <style>{FRAME_EDITOR_CSS}</style>
      <EditorContent editor={editor} style={{ height: "100%", minHeight: "100%", maxHeight: "100%", overflow: "hidden" }} />
      {caret ? <div key={`${caret.left}:${caret.top}:${caret.height}`} data-studio-frame-caret style={{ position: "absolute", ...caret, background: "#000", pointerEvents: "none", animation: "qalam-studio-caret-blink 1060ms step-end infinite" }} /> : null}
      {overflow ? <div data-studio-frame-overflow={overflow} aria-hidden style={frameOverflowMarkStyle(overflow)} /> : null}
    </div>
  );
}
