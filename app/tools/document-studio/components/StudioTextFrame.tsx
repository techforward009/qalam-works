"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent as ReactChangeEvent, type ClipboardEvent as ReactClipboardEvent, type CSSProperties, type FormEvent as ReactFormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { FORMATTING_TARGET_CHANGE, isFormattingSurface, readFormattingTarget, registerFrameHistory, registerFrameStyleUpdater } from "../utils/formattingSafety";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { defaultDocumentSettings } from "../utils/documentSettings";
import { editorFontFamilyStack, getFontById } from "../utils/fontRegistry";
import type { StudioFrame } from "./StudioObjectLayer";
import { blockLeadingPt } from "../utils/autoLeading";
import { emptyFrameCaretLeft } from "../utils/frameCaret";
import { centerSingleLinePadding, normalizeSingleLineText, SINGLE_LINE_OVERFLOW_WRAP, SINGLE_LINE_WHITE_SPACE } from "../utils/singleLineFrame";
import { textColumnFlowStyle, textScreenChrome, type TextColumnFrame } from "../utils/textColumns";
export { normalizeSingleLineText };
import { selectedLineBoxes, lineBoxTop, type TextLineBox } from "../utils/textLineBoxes";
import { mapLatinText, resolveKey, type KeyboardLayout } from "../utils/inpageKeyboard";
import { frameParagraphNavigationSelection } from "../utils/frameParagraphNavigation";
import type { StudioTextAlign } from "../utils/documentCommands";
import { applyParagraphAlignment, createFrameHistory, paragraphIndexAt, toolbarParagraphAlign, type FrameAlignSnapshot, type ParagraphAlign, type TextEditRange } from "../utils/paragraphAlign";
import type { ParagraphFormat } from "../utils/paragraphFormats";
import { textboxPmEnabled } from "../utils/textboxPmFlag";
import { bindFrameScrollLock, caretInClippedOverflow, frameContentBox, frameOverflowEdge, frameOverflowMarkStyle, pinFrameScroll, type FrameOverflowEdge } from "../utils/frameOverflow";

function paragraphStyle(align: ParagraphAlign | undefined, format?: ParagraphFormat, fallbackLeadingPt?: number): CSSProperties {
  const style: CSSProperties = {};
  if (align === "justify-all") {
    style.textAlign = "justify";
    style.textAlignLast = "justify";
  } else if (align) {
    style.textAlign = align;
  }
  if (format) {
    if (typeof format.firstLineIndentMm === "number" && format.firstLineIndentMm > 0) {
      style.textIndent = `${format.firstLineIndentMm}mm`;
    }
    if (typeof format.spaceBeforePt === "number") {
      style.marginBlockStart = `${format.spaceBeforePt}pt`;
    }
    if (typeof format.spaceAfterPt === "number") {
      style.marginBlockEnd = `${format.spaceAfterPt}pt`;
    }
    if (typeof format.indentStartMm === "number") {
      style.marginInlineStart = `${format.indentStartMm}mm`;
    }
    if (typeof format.indentEndMm === "number") {
      style.marginInlineEnd = `${format.indentEndMm}mm`;
    }
    const gap = typeof format.lineGapPt === "number" && format.lineGapPt > 0 ? format.lineGapPt : 0;
    if (format.leading?.mode === "points") {
      style.lineHeight = `${format.leading.value + gap}pt`;
    } else if (typeof format.lineHeight === "number") {
      style.lineHeight = format.lineHeight;
    } else if (gap > 0 && typeof fallbackLeadingPt === "number") {
      style.lineHeight = `${fallbackLeadingPt + gap}pt`;
    }
  }
  return style;
}

function ParagraphColumn({ parts, aligns, formats, textAlign, fallbackLeadingPt }: { parts: string[]; aligns?: readonly ParagraphAlign[]; formats?: readonly ParagraphFormat[]; textAlign?: StudioTextAlign; fallbackLeadingPt?: number }) {
  return <>{parts.map((part, index) => {
    const stored = aligns?.[index];
    const align = stored === undefined ? textAlign ?? null : stored;
    const format = formats?.[index];
    return <p key={index} data-studio-frame-paragraph={index} style={{ margin: 0, padding: 0, unicodeBidi: "plaintext", whiteSpace: "pre-wrap", overflowWrap: "break-word", ...paragraphStyle(align, format, fallbackLeadingPt) }}>{part.length ? part : "\u200b"}</p>;
  })}</>;
}

/** A natural-size mirror preserves textarea wrapping even inside a zoom transform. */
export function StudioTextFrame({ text, singleLine = false, editable, typography, textColor, textAlign, paragraphAligns, paragraphFormats, keyboardLayout, flow, onFocus, onText, onRestore, onStyle, onPmEdit }: {
  text: string; singleLine?: boolean; editable: boolean; typography?: DocumentStudioSettings["typography"];
  keyboardLayout?: KeyboardLayout | null;
  textColor?: string; textAlign?: StudioTextAlign; paragraphAligns?: ParagraphAlign[]; paragraphFormats?: ParagraphFormat[];
  flow?: Partial<TextColumnFrame>;
  onFocus: () => void; onText: (text: string, edit?: TextEditRange) => void;
  onRestore: (snap: { text: string; textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  onStyle: (patch: Partial<Pick<StudioFrame, "typography" | "textColor">> & { textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  onPmEdit?: (point: { x: number; y: number } | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null), mirror = useRef<HTMLDivElement>(null), textRef = useRef<HTMLDivElement>(null), visible = useRef<HTMLDivElement>(null);
  const dismissed = useRef(false);
  const [boxes,setBoxes] = useState<TextLineBox[]>([]);
  const [caret,setCaret] = useState<TextLineBox | null>(null);
  const [overflow,setOverflow] = useState<FrameOverflowEdge | null>(null);
  const boxFlow = { ...flow, singleLine };
  const chrome = textScreenChrome(boxFlow);
  const columnFlow = textColumnFlowStyle(boxFlow);
  const [padY,setPadY] = useState({ top: chrome.paddingPx, bottom: chrome.paddingPx });
  const [fontEpoch,setFontEpoch] = useState(0);
  const [alignLabel,setAlignLabel] = useState(textAlign ?? "");
  const padShifts = useRef(0);
  const history = useRef(createFrameHistory());
  const restoreSelection = useRef<[number, number] | null>(null);
  const remembered = useRef(false);
  const historyKey = useRef(false);
  const pendingEdit = useRef<TextEditRange | null>(null);
  const model = useRef({ text, textAlign, paragraphAligns });
  model.current = { text, textAlign, paragraphAligns };
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const family = typography ? editorFontFamilyStack(typography.defaultRtlFontId) : '"Jameel Noori Nastaleeq", serif';
  const size = typography?.bodyFontSizePt ?? 12;
  const editorFamily = typography ? getFontById(typography.defaultRtlFontId).editorFamily : "Jameel Noori Nastaleeq";
  const leading = blockLeadingPt({type:"paragraph"},family,typography ?? {bodyFontSizePt:12,lineHeight:1.5},"rtl");
  const paragraphPaint = !singleLine && (Boolean(paragraphAligns?.length) || Boolean(paragraphFormats?.length));
  const parts = text.split("\n");
  const snapshot = useCallback((): FrameAlignSnapshot => {
    const input = ref.current;
    const current = model.current;
    return { text: current.text, textAlign: current.textAlign, paragraphAligns: current.paragraphAligns ? [...current.paragraphAligns] : undefined, start: input?.selectionStart ?? 0, end: input?.selectionEnd ?? 0 };
  }, []);
  const rememberAt = useCallback((text: string, start: number, end: number) => {
    if (singleLine) return;
    const current = model.current;
    history.current.remember({ text, textAlign: current.textAlign, paragraphAligns: current.paragraphAligns ? [...current.paragraphAligns] : undefined, start, end });
  }, [singleLine]);
  const remember = useCallback(() => {
    const input = ref.current;
    rememberAt(model.current.text, input?.selectionStart ?? 0, input?.selectionEnd ?? 0);
  }, [rememberAt]);
  const applySnapshot = useCallback((next: FrameAlignSnapshot) => {
    restoreSelection.current = [next.start, next.end];
    onRestoreRef.current({ text: next.text, textAlign: next.textAlign ?? null, paragraphAligns: next.paragraphAligns ?? null });
  }, []);
  const undo = useCallback(() => { const next = history.current.undo(snapshot()); if (next) applySnapshot(next); return true; }, [applySnapshot, snapshot]);
  const redo = useCallback(() => { const next = history.current.redo(snapshot()); if (next) applySnapshot(next); return true; }, [applySnapshot, snapshot]);
  const publishAlign = useCallback((input: HTMLInputElement | HTMLTextAreaElement, start: number, end: number) => {
    const current = model.current;
    const label = singleLine ? current.textAlign ?? "" : toolbarParagraphAlign(input.value, current.textAlign, current.paragraphAligns, start, end);
    input.dataset.studioFrameTextAlign = label;
    setAlignLabel(prev => prev === label ? prev : label);
    if (input.dataset.studioFrameAlignPublished !== label) {
      input.dataset.studioFrameAlignPublished = label;
      input.closest<HTMLElement>("[data-studio-root]")?.dispatchEvent(new Event(FORMATTING_TARGET_CHANGE));
    }
  }, [singleLine]);
  const measure = useCallback(() => {
    const input=ref.current, clone=mirror.current;
    if (input) {
      pinFrameScroll(input, singleLine);
      const edge = frameOverflowEdge({ singleLine, scrollHeight: input.scrollHeight, clientHeight: input.clientHeight, scrollWidth: input.scrollWidth, clientWidth: input.clientWidth });
      setOverflow(prev => prev === edge ? prev : edge);
    }
    const target = input ? readFormattingTarget(input) : undefined;
    const focused = document.activeElement === input;
    const ownsSelection = target ? target.owner === "frame" && target.input === input : focused;
    if(!input || !clone || !ownsSelection || !editable || dismissed.current) { setCaret(null);setBoxes(prev=>prev.length?[]:prev);return; }
    const selectionStart = input.selectionStart ?? 0, selectionEnd = input.selectionEnd ?? selectionStart;
    publishAlign(input, selectionStart, selectionEnd);
    // Scroll is locked to the anchor, so paint must not follow a transient viewport.
    const commitCaret = (rawLeft: number, rawTop: number, pitch: number, scale: number, preserveLeft: boolean) => {
      const computed = getComputedStyle(input);
      const width = 2 / scale;
      const visibleBox = frameContentBox(input.clientWidth, input.clientHeight, parseFloat(computed.borderTopWidth) || 0, parseFloat(computed.borderLeftWidth) || 0);
      if (caretInClippedOverflow({ left: rawLeft, top: rawTop, width, height: pitch }, visibleBox)) { setCaret(null); return; }
      const top = Math.max(3, rawTop);
      const left = preserveLeft ? rawLeft : Math.max(3, Math.min(input.clientWidth - 3 - width, rawLeft));
      const height = Math.min(pitch, input.clientHeight - top - 2);
      if (height < 2) { setCaret(null); return; }
      setCaret({ left, top, width, height });
    };
    if (paragraphPaint) {
      clone.style.transform = "none";
      const visibleText = visible.current?.firstElementChild;
      if (visibleText instanceof HTMLElement) visibleText.style.transform = "none";
      const paragraphs = [...clone.querySelectorAll<HTMLElement>("[data-studio-frame-paragraph]")];
      const value = input.value;
      const chunks = value.split("\n");
      if (paragraphs.length !== chunks.length) return;
      const collapsed = selectionStart === selectionEnd;
      const paragraphOffset = (index: number) => {
        const paragraph = paragraphIndexAt(value, index);
        const breakBefore = index <= 0 ? -1 : value.lastIndexOf("\n", index - 1);
        return { paragraph, offset: index - (breakBefore < 0 ? 0 : breakBefore + 1) };
      };
      const caretPlace = paragraphOffset(selectionStart);
      paragraphs.forEach((paragraph, index) => {
        const part = chunks[index] ?? "";
        const atEnd = collapsed && index === caretPlace.paragraph && caretPlace.offset === part.length;
        const node = paragraph.firstChild;
        const shown = part.length === 0 || atEnd ? `${part}\u200b` : part;
        if (node?.nodeType === Node.TEXT_NODE && node.textContent !== shown) node.textContent = shown;
      });
      const locate = (index: number) => {
        const place = paragraphOffset(index);
        const node = paragraphs[place.paragraph]?.firstChild;
        if (node?.nodeType !== Node.TEXT_NODE) return null;
        return { node: node as Text, offset: Math.max(0, Math.min(place.offset, node.textContent?.length ?? 0)) };
      };
      const startPoint = locate(selectionStart), endPoint = locate(selectionEnd);
      if (!startPoint || !endPoint) return;
      const range = document.createRange();
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      const bounds = clone.getBoundingClientRect(), scale = bounds.width / clone.offsetWidth || 1;
      const origin = input.getBoundingClientRect();
      if (collapsed) {
        setBoxes(prev => prev.length ? [] : prev);
        if (!focused) { setCaret(null); return; }
        let rect = range.getBoundingClientRect();
        if (!rect.height && startPoint.offset < startPoint.node.length) { range.setEnd(startPoint.node, startPoint.offset + 1); rect = range.getBoundingClientRect(); }
        const pitch = leading * 4 / 3;
        const rawTop = (lineBoxTop(rect.top, rect.height, pitch * scale) - origin.top) / scale;
        const computed = getComputedStyle(input);
        const rightInset = parseFloat(computed.borderRightWidth) + parseFloat(computed.paddingRight);
        const emptyRight = input.offsetWidth - rightInset - 2 / scale;
        const leftInset = parseFloat(computed.borderLeftWidth) + parseFloat(computed.paddingLeft);
        const emptyLeft = leftInset + 2 / scale;
        const emptyCenter = input.offsetWidth / 2;
        const paragraphAlign = paragraphAligns?.[caretPlace.paragraph] ?? textAlign;
        const alignName = paragraphAlign === "justify-all" ? "justify" : paragraphAlign ?? computed.textAlign;
        const measured = (rect.left - origin.left) / scale - 3 / scale;
        const emptyLine = emptyFrameCaretLeft(value, selectionStart, alignName, computed.direction === "ltr" ? "ltr" : "rtl", { left: emptyLeft, right: emptyRight, center: emptyCenter });
        commitCaret(emptyLine ?? measured, rawTop, pitch, scale, emptyLine != null);
      } else {
        setCaret(null);
        const next = selectedLineBoxes(clone, range, bounds).map(box => ({ ...box, left: (box.left - origin.left) / scale, top: (box.top - origin.top) / scale, width: box.width / scale, height: box.height / scale }));
        setBoxes(prev => prev.length || next.length ? next : prev);
      }
      return;
    }
    clone.textContent=input.value+"\u200b";
    clone.style.transform = "none";
    const range=document.createRange();range.setStart(clone.firstChild!,selectionStart);range.setEnd(clone.firstChild!,selectionEnd);
    const bounds=clone.getBoundingClientRect(),scale=bounds.width/clone.offsetWidth || 1;
    if(selectionStart===selectionEnd){
      setBoxes(prev=>prev.length?[]:prev);
      if (!focused) { setCaret(null); return; }
      let rect=range.getBoundingClientRect();
      if(!rect.height){range.setEnd(clone.firstChild!,selectionEnd+1);rect=range.getBoundingClientRect();}
      const pitch=leading*4/3;
      const rawTop=(lineBoxTop(rect.top,rect.height,pitch*scale)-bounds.top)/scale;
      const computed = getComputedStyle(input);
      const rightInset = parseFloat(computed.borderRightWidth) + parseFloat(computed.paddingRight);
      const emptyRight = input.offsetWidth - rightInset - 2/scale;
      const leftInset = parseFloat(computed.borderLeftWidth) + parseFloat(computed.paddingLeft);
      const emptyLeft = leftInset + 2/scale;
      const emptyCenter = input.offsetWidth / 2;
      const emptyPosition = textAlign === "left" ? emptyLeft : textAlign === "center" || textAlign === "justify" || textAlign === "justify-all" ? emptyCenter : emptyRight;
      const measured = (rect.left - bounds.left) / scale - 3 / scale;
      const emptyLine = singleLine ? null : emptyFrameCaretLeft(input.value, selectionStart, computed.textAlign, computed.direction === "ltr" ? "ltr" : "rtl", { left: emptyLeft, right: emptyRight, center: emptyCenter });
      const preserveLeft = emptyLine != null || input.value.length === 0;
      commitCaret(emptyLine ?? (input.value.length === 0 ? emptyPosition : measured), rawTop, pitch, scale, preserveLeft);
    }else{
      setCaret(null);
      const next=selectedLineBoxes(clone,range,bounds).map(box=>({...box,left:(box.left-bounds.left)/scale,top:(box.top-bounds.top)/scale,width:box.width/scale,height:box.height/scale}));
      setBoxes(prev=>prev.length||next.length?next:prev);
    }
  }, [editable, leading, family, textAlign, paragraphAligns, paragraphPaint, singleLine, publishAlign]);
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    return bindFrameScrollLock(input, singleLine);
  }, [singleLine]);
  useLayoutEffect(() => {
    const pending = restoreSelection.current;
    const input = ref.current;
    if (pending && input) {
      restoreSelection.current = null;
      const start = Math.max(0, Math.min(pending[0], input.value.length));
      const end = Math.max(start, Math.min(pending[1], input.value.length));
      input.setSelectionRange(start, end);
    }
    measure();
  }, [measure, text, leading, family, size, editable, textAlign, paragraphAligns, paragraphFormats, padY.top, padY.bottom]);
  const alignKey = `${text}\0${leading}\0${family}\0${size}\0${fontEpoch}`;
  const alignKeyRef = useRef(alignKey);
  useLayoutEffect(() => {
    if (alignKeyRef.current !== alignKey) { alignKeyRef.current = alignKey; padShifts.current = 0; }
    if (!singleLine) return;
    const node = textRef.current;
    const pad = chrome.paddingPx;
    if (!node?.textContent) {
      setPadY(prev => prev.top === pad && prev.bottom === pad ? prev : { top: pad, bottom: pad });
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const ink = range.getBoundingClientRect();
    if (ink.height < 0.5) return;
    const linePx = leading * (96 / 72);
    if (ink.height > linePx * 1.75) {
      setPadY(prev => prev.top === pad && prev.bottom === pad ? prev : { top: pad, bottom: pad });
      return;
    }
    const box = node.getBoundingClientRect();
    const computed = getComputedStyle(node);
    const above = ink.top - (box.top + (parseFloat(computed.borderTopWidth) || 0));
    const below = box.bottom - (parseFloat(computed.borderBottomWidth) || 0) - ink.bottom;
    if (Math.abs(below - above) < 0.5) { padShifts.current = 0; return; }
    if (padShifts.current >= 5) return;
    padShifts.current += 1;
    setPadY(prev => {
      const next = centerSingleLinePadding(prev, above, below);
      return Math.abs(next.top - prev.top) < 0.25 && Math.abs(next.bottom - prev.bottom) < 0.25 ? prev : next;
    });
  }, [singleLine, alignKey, leading, padY.top, padY.bottom, chrome.paddingPx]);
  useEffect(() => {
    if (!singleLine) return;
    const rerun = () => setFontEpoch(epoch => epoch + 1);
    document.fonts.addEventListener("loadingdone", rerun);
    return () => document.fonts.removeEventListener("loadingdone", rerun);
  }, [singleLine]);
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    return registerFrameStyleUpdater(input, (patch) => {
      if (!patch.textAlign || singleLine || !(input instanceof HTMLTextAreaElement)) { onStyle(patch); return; }
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? start;
      const next = applyParagraphAlignment(input.value, model.current.textAlign, model.current.paragraphAligns, start, end, patch.textAlign);
      const unchanged = (next.textAlign ?? null) === (model.current.textAlign ?? null) && JSON.stringify(next.paragraphAligns) === JSON.stringify(model.current.paragraphAligns ?? null);
      if (!unchanged) remember();
      onStyle({ ...patch, ...next });
    });
  }, [onStyle, remember, singleLine]);
  useEffect(() => {
    const input = ref.current;
    if (!input || singleLine) return;
    return registerFrameHistory(input, { undo, redo });
  }, [singleLine, undo, redo]);
  useEffect(() => {
    let raf = 0;
    const update = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    const root = ref.current?.closest<HTMLElement>("[data-studio-root]");
    const pointer = (event: PointerEvent) => {
      const target=event.target instanceof Element?event.target:null;
      if(target===ref.current) dismissed.current=false;
      else if(!isFormattingSurface(target)) dismissed.current=true;
      update();
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("selectionchange", update);
    root?.addEventListener(FORMATTING_TARGET_CHANGE, update);
    document.fonts.addEventListener("loadingdone", update);
    const observer = new ResizeObserver(update);
    if (ref.current) observer.observe(ref.current);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener("pointerdown", pointer, true); document.removeEventListener("selectionchange", update); root?.removeEventListener(FORMATTING_TARGET_CHANGE, update); document.fonts.removeEventListener("loadingdone", update); };
  }, [measure]);
  useEffect(() => { padShifts.current = 0; setPadY({ top: chrome.paddingPx, bottom: chrome.paddingPx }); }, [chrome.paddingPx]);
  const style: CSSProperties = { position:"absolute",inset:0,width:"100%",height:"100%",boxSizing:"border-box",border:chrome.border,outline:chrome.outline,borderRadius:chrome.radius,background:chrome.background,...(singleLine ? { paddingTop: padY.top, paddingRight: chrome.paddingPx, paddingBottom: padY.bottom, paddingLeft: chrome.paddingPx } : { padding: chrome.paddingPx }),fontFamily:family,fontSize:`${size}pt`,lineHeight:`${leading}pt`,fontVariantLigatures:"normal",fontFeatureSettings:"normal",direction:"rtl",unicodeBidi:"plaintext",textIndent:0,tabSize:8,fontKerning:"auto",whiteSpace:SINGLE_LINE_WHITE_SPACE,overflowWrap:SINGLE_LINE_OVERFLOW_WRAP,overflow:"hidden",color:textColor ?? "#000",textAlign:textAlign === "justify-all" ? "justify" : textAlign,textAlignLast:textAlign === "justify-all" ? "justify" : undefined };
  const handlePaste = (event: ReactClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!singleLine) return;
    event.preventDefault();
    const input = event.currentTarget, normalized = normalizeSingleLineText(event.clipboardData.getData("text/plain"));
    const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
    const value = input.value.slice(0, start) + normalized + input.value.slice(end);
    onText(value);
    requestAnimationFrame(() => { input.setSelectionRange(start + normalized.length, start + normalized.length); });
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (singleLine && (event.key === "Enter" || event.key === "NumpadEnter")) event.preventDefault();
    if (keyboardLayout) {
      const mapped = resolveKey(keyboardLayout, event);
      if (mapped !== null) {
        event.preventDefault();
        const input = event.currentTarget, start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
        const insertion = singleLine ? normalizeSingleLineText(mapped) : mapped;
        rememberAt(input.value, start, end);
        onText(input.value.slice(0, start) + insertion + input.value.slice(end), { start, end });
        requestAnimationFrame(() => input.setSelectionRange(start + insertion.length, start + insertion.length));
      }
    }
    // Ctrl/Cmd+Up/Down: logical paragraph starts in a multi-line textarea.
    // resolveKey already ignores ctrl/meta, so this does not fight Monotype mapping.
    if (!singleLine && !event.altKey && (event.ctrlKey || event.metaKey)
        && (event.key === "ArrowUp" || event.key === "ArrowDown")
        && event.currentTarget instanceof HTMLTextAreaElement) {
      const input = event.currentTarget;
      const next = frameParagraphNavigationSelection(
        input.value,
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
        input.selectionDirection,
        event.key,
        event.shiftKey,
      );
      event.preventDefault();
      event.stopPropagation();
      input.setSelectionRange(next.start, next.end, next.direction);
      measure();
      return;
    }
    if (singleLine || event.altKey || !(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "z" || (key === "y" && !event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      historyKey.current = true;
      if (key === "y" || event.shiftKey) redo(); else undo();
    }
  };
  const handleCompositionEnd = (input: HTMLInputElement | HTMLTextAreaElement, data: string) => {
    if (!keyboardLayout || !data) return;
    const mapped = mapLatinText(keyboardLayout, data);
    if (mapped === data) return;
    const end = input.selectionStart ?? input.value.length;
    const start = Math.max(0, end - data.length);
    // compositionend may precede the committed input event on some keyboards;
    // in that case let beforeinput handle it instead of replacing old text.
    if (input.value.slice(start, end) !== data) return;
    const insertion = singleLine ? normalizeSingleLineText(mapped) : mapped;
    rememberAt(input.value, start, end);
    onText(input.value.slice(0, start) + insertion + input.value.slice(end), { start, end });
    requestAnimationFrame(() => input.setSelectionRange(start + insertion.length, start + insertion.length));
  };
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input || !keyboardLayout) return;
    const beforeInput = (rawEvent: Event) => {
      const event = rawEvent as InputEvent;
      if (event.inputType !== "insertText" || !event.data || !event.cancelable) return;
      const mapped = mapLatinText(keyboardLayout, event.data);
      if (mapped === event.data) return;
      event.preventDefault();
      event.stopPropagation();
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
      const insertion = singleLine ? normalizeSingleLineText(mapped) : mapped;
      rememberAt(input.value, start, end);
      onText(input.value.slice(0, start) + insertion + input.value.slice(end), { start, end });
      requestAnimationFrame(() => input.setSelectionRange(start + insertion.length, start + insertion.length));
    };
    const compositionEnd = (rawEvent: Event) => handleCompositionEnd(input, (rawEvent as CompositionEvent).data);
    input.addEventListener("beforeinput", beforeInput);
    input.addEventListener("compositionend", compositionEnd);
    return () => {
      input.removeEventListener("beforeinput", beforeInput);
      input.removeEventListener("compositionend", compositionEnd);
    };
  }, [keyboardLayout, onText, rememberAt, singleLine]);
  const handleBeforeInput = (event: ReactFormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (singleLine) {
      const native = event.nativeEvent as InputEvent;
      if (native.inputType === "insertLineBreak" || native.inputType === "insertParagraph") event.preventDefault();
      return;
    }
    const native = event.nativeEvent as InputEvent;
    if (native.inputType === "historyUndo" || native.inputType === "historyRedo") {
      event.preventDefault();
      pendingEdit.current = null;
      if (!historyKey.current) { if (native.inputType === "historyUndo") undo(); else redo(); }
      return;
    }
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    pendingEdit.current = { start, end };
    if (!remembered.current) { remembered.current = true; rememberAt(input.value, start, end); }
  };
  const paragraphBlock = () => <div style={{ minHeight: "100%" }}><ParagraphColumn parts={parts} aligns={paragraphAligns} formats={paragraphFormats} textAlign={textAlign} fallbackLeadingPt={leading} /></div>;
  const sharedProps = { ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => { ref.current = node; }, "data-studio-text-frame": true, "data-studio-text-single-line": singleLine || undefined, "data-studio-frame-guide": chrome.guide ? "true" : undefined, "data-studio-text-shape": flow?.textShape === "ellipse" ? "ellipse" : undefined, "data-studio-text-inset-mm": flow?.insetMm === undefined ? undefined : String(flow.insetMm), "data-studio-text-columns": columnFlow ? String(columnFlow.columnCount) : undefined, "data-studio-column-direction": columnFlow ? columnFlow.direction : undefined, "data-studio-frame-font-family": editorFamily, "data-studio-frame-font-size-pt": size, "data-studio-frame-text-color": textColor ?? "", "data-studio-frame-text-align": alignLabel, "data-studio-frame-typography": JSON.stringify(typography ?? { ...defaultDocumentSettings().typography, defaultRtlFontId: "jameel-noori-nastaleeq" }), value: singleLine ? normalizeSingleLineText(text) : text, readOnly: !editable, tabIndex: editable?0:-1, dir:"rtl" as const, autoCorrect: keyboardLayout ? "off" : undefined, autoCapitalize: keyboardLayout ? "none" : undefined, spellCheck: keyboardLayout ? false : undefined, "aria-label": singleLine ? "Title text" : "Text box", onPointerDown:(event: ReactPointerEvent<HTMLInputElement | HTMLTextAreaElement>)=>{if(!editable)return; if(!singleLine && onPmEdit && textboxPmEnabled()){event.preventDefault();event.stopPropagation();onPmEdit({x:event.clientX,y:event.clientY});return;} event.stopPropagation();onFocus();}, onFocus:()=>{if(!singleLine && editable && onPmEdit && textboxPmEnabled()){onPmEdit(null);return;} dismissed.current=false;onFocus();measure();}, onChange:(event: ReactChangeEvent<HTMLInputElement | HTMLTextAreaElement>)=>{ const edit = pendingEdit.current; pendingEdit.current = null; if (!singleLine && !remembered.current) remember(); remembered.current = false; onText(singleLine?normalizeSingleLineText(event.target.value):event.target.value, edit ?? undefined); }, onSelect:measure, onScroll:measure, onPaste:handlePaste, onKeyDown:handleKeyDown, onKeyUp:()=>{ historyKey.current = false; }, onBeforeInput:handleBeforeInput, onBlur:()=>{setCaret(null);requestAnimationFrame(measure);}, style:{...style,resize:"none" as const,pointerEvents:editable?"auto" as const:"none" as const,cursor:editable?"text":"inherit",background:"transparent",outline:"none",caretColor:"transparent"} };
  const displayText = singleLine ? normalizeSingleLineText(text) : text;
  const fieldStyle = paragraphPaint || columnFlow ? { ...sharedProps.style, color: "transparent", WebkitTextFillColor: "transparent" } : sharedProps.style;
  const columnText = paragraphPaint ? paragraphBlock() : text;
  return <>
    {singleLine ? <div ref={textRef} aria-hidden data-studio-single-line-text style={{ ...style, pointerEvents: "none", userSelect: "none" }}>{displayText}</div> : null}
    {columnFlow ? <div aria-hidden data-studio-text-columns={columnFlow.columnCount} data-studio-column-direction={columnFlow.direction} style={{ ...style, borderColor: "transparent", background: "transparent", pointerEvents: "none", columnCount: columnFlow.columnCount, columnGap: columnFlow.columnGap, columnFill: columnFlow.columnFill, columnRule: columnFlow.columnRule, direction: columnFlow.direction, color: textColor ?? "#000" }}><div style={{ direction: "rtl" }}>{columnText}</div></div> : null}
    {paragraphPaint && !columnFlow ? <div ref={visible} aria-hidden data-studio-frame-paragraphs style={{ ...style, borderColor: "transparent", overflow: "hidden", pointerEvents: "none", background: "transparent" }}>{paragraphBlock()}</div> : null}
    {singleLine ? <textarea {...sharedProps} rows={1} wrap="soft" data-studio-text-frame data-studio-text-single-line="true" data-studio-selection-painted="true" style={{ ...sharedProps.style, color: "transparent", WebkitTextFillColor: "transparent", scrollbarWidth: "none", minHeight: 0 }} /> : <textarea {...sharedProps} data-studio-paragraph-paint={paragraphPaint ? "true" : undefined} data-studio-selection-painted={boxes.length?"true":undefined} style={{ ...fieldStyle, scrollbarWidth: "none" }} />}
    <div ref={mirror} aria-hidden style={{...style,height:"auto",minHeight:"100%",visibility:"hidden",pointerEvents:"none",borderColor:"transparent",transform:"none"}}>{paragraphPaint ? paragraphBlock() : null}</div>
    {caret?<div key={`${caret.left}:${caret.top}:${caret.height}`} data-studio-frame-caret style={{position:"absolute",...caret,background:"#000",pointerEvents:"none",animation:"qalam-studio-caret-blink 1060ms step-end infinite"}} />:null}
    {boxes.length>0?<div data-studio-text-frame-selection style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>{boxes.map((box,i)=><div key={i} data-studio-line-selection style={{position:"absolute",...box,background:"#000",overflow:"hidden"}}><div style={{...style,inset:undefined,left:-box.left,top:-box.top,width:ref.current?.offsetWidth,height:"auto",minHeight:"100%",color:"#fff",borderColor:"transparent",background:"transparent"}}>{paragraphPaint ? paragraphBlock() : `${singleLine ? displayText : text}\u200b`}</div></div>)}</div>:null}
    {overflow ? <div data-studio-frame-overflow={overflow} aria-hidden style={frameOverflowMarkStyle(overflow)} /> : null}
  </>;
}
