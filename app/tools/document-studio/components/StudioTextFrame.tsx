"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent as ReactChangeEvent, type ClipboardEvent as ReactClipboardEvent, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type UIEvent as ReactUIEvent, type WheelEvent as ReactWheelEvent } from "react";
import { FORMATTING_TARGET_CHANGE, isFormattingSurface, readFormattingTarget, registerFrameHistory, registerFrameStyleUpdater } from "../utils/formattingSafety";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { defaultDocumentSettings } from "../utils/documentSettings";
import { editorFontFamilyStack, getFontById } from "../utils/fontRegistry";
import type { StudioFrame } from "./StudioObjectLayer";
import { blockLeadingPt } from "../utils/autoLeading";
import { emptyFrameCaretLeft } from "../utils/frameCaret";
import { autoExpandOuterHeightPx, singleLineOuterHeightPx } from "../utils/singleLineFrame";
import { selectedLineBoxes, lineBoxTop, type TextLineBox } from "../utils/textLineBoxes";
import { mapLatinText, resolveKey, type KeyboardLayout } from "../utils/inpageKeyboard";
import { frameParagraphNavigationSelection } from "../utils/frameParagraphNavigation";
import type { StudioTextAlign } from "../utils/documentCommands";
import { applyParagraphAlignment, createFrameHistory, paragraphIndexAt, toolbarParagraphAlign, type FrameAlignSnapshot, type FrameRememberOptions, type ParagraphAlign, type TextEditRange } from "../utils/paragraphAlign";

export type StudioFrameHistoryBridge = {
  recordFrameEdit: (frameId: string, before: FrameAlignSnapshot, options?: FrameRememberOptions) => void;
  closeFrameGroup: (frameId: string) => void;
  runHistoryCommand: (action: "undo" | "redo") => boolean;
  registerFrameControl: (frameId: string, control: { getSnapshot: () => FrameAlignSnapshot; applySnapshot: (snap: FrameAlignSnapshot) => void }) => () => void;
};

const PX_PER_MM = 96 / 25.4;

export function normalizeSingleLineText(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
}

function paragraphStyle(align: ParagraphAlign | undefined): CSSProperties {
  if (align === "justify-all") return { textAlign: "justify", textAlignLast: "justify" };
  return align ? { textAlign: align } : {};
}

function ParagraphColumn({ parts, aligns, textAlign }: { parts: string[]; aligns?: readonly ParagraphAlign[]; textAlign?: StudioTextAlign }) {
  return <>{parts.map((part, index) => {
    const stored = aligns?.[index];
    const align = stored === undefined ? textAlign ?? null : stored;
    return <p key={index} data-studio-frame-paragraph={index} style={{ margin: 0, padding: 0, unicodeBidi: "plaintext", whiteSpace: "pre-wrap", overflowWrap: "break-word", ...paragraphStyle(align) }}>{part.length ? part : "\u200b"}</p>;
  })}</>;
}

/** A natural-size mirror preserves textarea wrapping even inside a zoom transform. */
export function StudioTextFrame({ frameId, historyBridge, text, singleLine = false, frameWidthPx, frameHeightMm, editable, typography, textColor, textAlign, paragraphAligns, keyboardLayout, onFocus, onText, onRestore, onStyle, onAutoHeight }: {
  frameId?: string; historyBridge?: StudioFrameHistoryBridge;
  text: string; singleLine?: boolean; frameWidthPx?: number; frameHeightMm?: number; editable: boolean; typography?: DocumentStudioSettings["typography"];
  keyboardLayout?: KeyboardLayout | null;
  textColor?: string; textAlign?: StudioTextAlign; paragraphAligns?: ParagraphAlign[];
  onFocus: () => void; onText: (text: string, edit?: TextEditRange) => void;
  onRestore: (snap: { text: string; textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  onStyle: (patch: Partial<Pick<StudioFrame, "typography" | "textColor">> & { textAlign?: StudioTextAlign | null; paragraphAligns?: ParagraphAlign[] | null }) => void;
  onAutoHeight?: (outerHeightPx: number) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null), mirror = useRef<HTMLDivElement>(null), sizerRef = useRef<HTMLDivElement>(null), visible = useRef<HTMLDivElement>(null);
  const dismissed = useRef(false);
  const [boxes,setBoxes] = useState<TextLineBox[]>([]);
  const [caret,setCaret] = useState<TextLineBox | null>(null);
  const [fontEpoch,setFontEpoch] = useState(0);
  const [overflows,setOverflows] = useState(false);
  const [alignLabel,setAlignLabel] = useState(textAlign ?? "");
  const customMinHeightMmRef = useRef<number | null>(null);
  const customMinInitRef = useRef(false);
  const autoHeightFloorRef = useRef<{ key: string; heightPx: number }>({ key: "", heightPx: 0 });
  const frameHeightMmRef = useRef(frameHeightMm);
  frameHeightMmRef.current = frameHeightMm;
  const onAutoHeightRef = useRef(onAutoHeight);
  onAutoHeightRef.current = onAutoHeight;
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
  const paragraphPaint = !singleLine && Boolean(paragraphAligns?.length);
  const parts = text.split("\n");
  const snapshot = useCallback((): FrameAlignSnapshot => {
    const input = ref.current;
    const current = model.current;
    return { text: current.text, textAlign: current.textAlign, paragraphAligns: current.paragraphAligns ? [...current.paragraphAligns] : undefined, start: input?.selectionStart ?? 0, end: input?.selectionEnd ?? 0 };
  }, []);
  const rememberAt = useCallback((text: string, start: number, end: number, options?: FrameRememberOptions) => {
    const current = model.current;
    const snap: FrameAlignSnapshot = {
      text,
      textAlign: current.textAlign,
      paragraphAligns: current.paragraphAligns ? [...current.paragraphAligns] : undefined,
      start,
      end,
    };
    if (historyBridge && frameId) {
      historyBridge.recordFrameEdit(frameId, snap, options);
    } else {
      history.current.remember(snap, options);
    }
  }, [frameId, historyBridge]);
  const remember = useCallback((options?: FrameRememberOptions) => {
    const input = ref.current;
    rememberAt(model.current.text, input?.selectionStart ?? 0, input?.selectionEnd ?? 0, options);
  }, [rememberAt]);
  const applySnapshot = useCallback((next: FrameAlignSnapshot) => {
    restoreSelection.current = [next.start, next.end];
    onRestoreRef.current({ text: next.text, textAlign: next.textAlign ?? null, paragraphAligns: next.paragraphAligns ?? null });
  }, []);
  const undo = useCallback(() => {
    if (historyBridge) return historyBridge.runHistoryCommand("undo");
    const next = history.current.undo(snapshot());
    if (next) applySnapshot(next);
    return true;
  }, [applySnapshot, historyBridge, snapshot]);
  const redo = useCallback(() => {
    if (historyBridge) return historyBridge.runHistoryCommand("redo");
    const next = history.current.redo(snapshot());
    if (next) applySnapshot(next);
    return true;
  }, [applySnapshot, historyBridge, snapshot]);
  const publishAlign = useCallback((input: HTMLTextAreaElement, start: number, end: number) => {
    const current = model.current;
    const label = singleLine ? current.textAlign ?? "" : toolbarParagraphAlign(input.value, current.textAlign, current.paragraphAligns, start, end);
    input.dataset.studioFrameTextAlign = label;
    setAlignLabel(prev => prev === label ? prev : label);
    if (input.dataset.studioFrameAlignPublished !== label) {
      input.dataset.studioFrameAlignPublished = label;
      input.closest<HTMLElement>("[data-studio-root]")?.dispatchEvent(new Event(FORMATTING_TARGET_CHANGE));
    }
  }, [singleLine]);
  const resetScroll = useCallback((input = ref.current) => {
    if (!input) return;
    if (input.scrollLeft) input.scrollLeft = 0;
    if (input.scrollTop) input.scrollTop = 0;
  }, []);
  const syncAutoHeight = useCallback(() => {
    if (!singleLine) {
      customMinInitRef.current = false;
      customMinHeightMmRef.current = null;
      return;
    }
    const textarea = ref.current, sizer = sizerRef.current;
    if (!textarea || !sizer || !textarea.offsetWidth || !sizer.offsetWidth) return;
    const typographyMinPx = singleLineOuterHeightPx(leading);
    if (!customMinInitRef.current) {
      customMinInitRef.current = true;
      const loadedMm = frameHeightMmRef.current;
      if (loadedMm !== undefined) {
        const loadedPx = loadedMm * PX_PER_MM;
        const sizerChromeY = Math.max(0, sizer.offsetHeight - sizer.clientHeight);
        const initialSizerOuter = Math.max(sizer.offsetHeight, sizer.scrollHeight + sizerChromeY);
        if (loadedPx > typographyMinPx + 1.5 && initialSizerOuter < loadedPx - 4) {
          customMinHeightMmRef.current = loadedMm;
        }
      }
    }
    const minOuterHeightPx = customMinHeightMmRef.current !== null
      ? Math.max(customMinHeightMmRef.current * PX_PER_MM, typographyMinPx)
      : typographyMinPx;
    const heightKey = `${text}\0${leading}\0${family}\0${size}\0${fontEpoch}\0${textAlign ?? ""}\0${Math.round(textarea.offsetWidth)}`;
    if (autoHeightFloorRef.current.key !== heightKey) {
      autoHeightFloorRef.current = { key: heightKey, heightPx: 0 };
    }
    const measured = autoExpandOuterHeightPx({
      minOuterHeightPx,
      sizerOffsetHeight: sizer.offsetHeight,
      sizerClientHeight: sizer.clientHeight,
      sizerScrollHeight: sizer.scrollHeight,
      textareaOffsetHeight: textarea.offsetHeight,
      textareaClientHeight: textarea.clientHeight,
      textareaScrollHeight: textarea.scrollHeight,
    });
    if (textarea.scrollHeight > textarea.clientHeight + 1) {
      autoHeightFloorRef.current.heightPx = Math.max(autoHeightFloorRef.current.heightPx, measured);
    }
    const required = Math.max(measured, autoHeightFloorRef.current.heightPx);
    onAutoHeightRef.current?.(required);
  }, [family, fontEpoch, leading, singleLine, size, text, textAlign]);
  const refreshOverflow = useCallback(() => {
    if (singleLine) {
      setOverflows(false);
      return;
    }
    const input = ref.current, clone = mirror.current;
    if (!input) return;
    resetScroll(input);
    const contentHeight = Math.max(input.scrollHeight, clone?.scrollHeight ?? 0);
    setOverflows(contentHeight > input.clientHeight + 1);
  }, [resetScroll, singleLine]);
  const measure = useCallback(() => {
    const input=ref.current, clone=mirror.current;
    const target = input ? readFormattingTarget(input) : undefined;
    const focused = document.activeElement === input;
    const ownsSelection = target ? target.owner === "frame" && target.input === input : focused;
    if(!input || !clone || !ownsSelection || !editable || dismissed.current) { setCaret(null);setBoxes(prev=>prev.length?[]:prev);return; }
    const selectionStart = input.selectionStart ?? 0, selectionEnd = input.selectionEnd ?? selectionStart;
    publishAlign(input, selectionStart, selectionEnd);
    const shift = `translate(${-input.scrollLeft}px,${-input.scrollTop}px)`;
    if (paragraphPaint) {
      clone.style.transform = shift;
      const visibleText = visible.current?.firstElementChild;
      if (visibleText instanceof HTMLElement) visibleText.style.transform = shift;
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
        const pitch = leading * 4 / 3, top = Math.max(3, Math.min(input.clientHeight - pitch - 2, (lineBoxTop(rect.top, rect.height, pitch * scale) - origin.top) / scale));
        const computed = getComputedStyle(input);
        const rightInset = parseFloat(computed.borderRightWidth) + parseFloat(computed.paddingRight);
        const emptyRight = input.offsetWidth - rightInset - 2 / scale;
        const leftInset = parseFloat(computed.borderLeftWidth) + parseFloat(computed.paddingLeft);
        const emptyLeft = leftInset + 2 / scale;
        const emptyCenter = input.offsetWidth / 2;
        const paragraphAlign = paragraphAligns?.[caretPlace.paragraph] ?? textAlign;
        const alignName = paragraphAlign === "justify-all" ? "justify" : paragraphAlign ?? computed.textAlign;
        const measured = Math.max(3, Math.min(input.clientWidth - 3 - 2 / scale, (rect.left - origin.left) / scale - 3 / scale));
        const emptyLine = emptyFrameCaretLeft(value, selectionStart, alignName, computed.direction === "ltr" ? "ltr" : "rtl", { left: emptyLeft, right: emptyRight, center: emptyCenter });
        setCaret({ left: emptyLine ?? measured, top, width: 2 / scale, height: Math.min(pitch, input.clientHeight - top - 2) });
      } else {
        setCaret(null);
        const next = selectedLineBoxes(clone, range, bounds).map(box => ({ ...box, left: (box.left - origin.left) / scale, top: (box.top - origin.top) / scale, width: box.width / scale, height: box.height / scale }));
        setBoxes(prev => prev.length || next.length ? next : prev);
      }
      return;
    }
    clone.textContent=input.value+"\u200b";
    clone.style.transform = shift;
    const range=document.createRange();range.setStart(clone.firstChild!,selectionStart);range.setEnd(clone.firstChild!,selectionEnd);
    const bounds=clone.getBoundingClientRect(),scale=bounds.width/clone.offsetWidth || 1;
    if(selectionStart===selectionEnd){
      setBoxes(prev=>prev.length?[]:prev);
      if (!focused) { setCaret(null); return; }
      let rect=range.getBoundingClientRect();
      if(!rect.height){range.setEnd(clone.firstChild!,selectionEnd+1);rect=range.getBoundingClientRect();}
      const pitch=leading*4/3,top=Math.max(3,Math.min(input.clientHeight-pitch-2,(lineBoxTop(rect.top,rect.height,pitch*scale)-bounds.top)/scale));
      const computed = getComputedStyle(input);
      const rightInset = parseFloat(computed.borderRightWidth) + parseFloat(computed.paddingRight);
      const emptyRight = input.offsetWidth - rightInset - 2/scale;
      const leftInset = parseFloat(computed.borderLeftWidth) + parseFloat(computed.paddingLeft);
      const emptyLeft = leftInset + 2/scale;
      const emptyCenter = input.offsetWidth / 2;
      const emptyPosition = textAlign === "left" ? emptyLeft : textAlign === "center" || textAlign === "justify" || textAlign === "justify-all" ? emptyCenter : emptyRight;
      const measured = Math.max(3, Math.min(input.clientWidth - 3 - 2 / scale, (rect.left - bounds.left) / scale - 3 / scale));
      const emptyLine = emptyFrameCaretLeft(input.value, selectionStart, computed.textAlign, computed.direction === "ltr" ? "ltr" : "rtl", { left: emptyLeft, right: emptyRight, center: emptyCenter });
      setCaret({left: emptyLine ?? (input.value.length === 0 ? emptyPosition : measured), top, width: 2 / scale, height: Math.min(pitch, input.clientHeight - top - 2)});
    }else{
      setCaret(null);
      const next=selectedLineBoxes(clone,range,bounds).map(box=>({...box,left:(box.left-bounds.left)/scale,top:(box.top-bounds.top)/scale,width:box.width/scale,height:box.height/scale}));
      setBoxes(prev=>prev.length||next.length?next:prev);
    }
  }, [editable, leading, family, textAlign, paragraphAligns, paragraphPaint, publishAlign]);
  useLayoutEffect(() => {
    const pending = restoreSelection.current;
    const input = ref.current;
    if (pending && input) {
      restoreSelection.current = null;
      const start = Math.max(0, Math.min(pending[0], input.value.length));
      const end = Math.max(start, Math.min(pending[1], input.value.length));
      input.setSelectionRange(start, end);
    }
    syncAutoHeight();
    resetScroll();
    refreshOverflow();
    measure();
  }, [measure, refreshOverflow, resetScroll, syncAutoHeight, text, leading, family, editable, textAlign, paragraphAligns, frameWidthPx]);
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
      if (!patch.textAlign || singleLine) { onStyle(patch); return; }
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
    if (!input) return;
    const unregisterDoc = registerFrameHistory(input, { undo, redo });
    const unregisterBridge = historyBridge && frameId
      ? historyBridge.registerFrameControl(frameId, { getSnapshot: snapshot, applySnapshot })
      : undefined;
    return () => {
      unregisterDoc();
      unregisterBridge?.();
    };
  }, [applySnapshot, frameId, historyBridge, redo, snapshot, undo]);
  useEffect(() => {
    let raf = 0;
    const update = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; syncAutoHeight(); resetScroll(); refreshOverflow(); measure(); }); };
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
  }, [measure, refreshOverflow, resetScroll, syncAutoHeight]);
  const style: CSSProperties = { position:"absolute",inset:0,width:"100%",height:"100%",boxSizing:"border-box",border:"1px solid #000",padding:2,fontFamily:family,fontSize:`${size}pt`,lineHeight:`${leading}pt`,fontVariantLigatures:"normal",fontFeatureSettings:"normal",direction:"rtl",unicodeBidi:"plaintext",textIndent:0,tabSize:8,fontKerning:"auto",whiteSpace:"pre-wrap",overflowWrap:"break-word",overflow:"hidden",color:textColor ?? "#000",textAlign:textAlign === "justify-all" ? "justify" : textAlign,textAlignLast:textAlign === "justify-all" ? "justify" : undefined };
  const handlePaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    if (!singleLine) return;
    const pasted = event.clipboardData?.getData("text/plain");
    if (typeof pasted !== "string") return;
    event.preventDefault();
    const input = event.currentTarget, normalized = pasted.replace(/\r\n?/g, "\n");
    const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
    rememberAt(input.value, start, end);
    const value = input.value.slice(0, start) + normalized + input.value.slice(end);
    onText(value, { start, end });
    requestAnimationFrame(() => { input.setSelectionRange(start + normalized.length, start + normalized.length); });
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      if (historyBridge && frameId) historyBridge.closeFrameGroup(frameId);
      else history.current.closeGroup();
    }
    if (keyboardLayout) {
      const mapped = resolveKey(keyboardLayout, event);
      if (mapped !== null) {
        event.preventDefault();
        const input = event.currentTarget, start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
        rememberAt(input.value, start, end, /\s/.test(mapped) ? undefined : { groupKey: "insert" });
        onText(input.value.slice(0, start) + mapped + input.value.slice(end), { start, end });
        requestAnimationFrame(() => input.setSelectionRange(start + mapped.length, start + mapped.length));
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
      requestAnimationFrame(() => resetScroll());
      measure();
      return;
    }
    if (event.altKey || !(event.ctrlKey || event.metaKey)) return;
    const isZKey = event.code === "KeyZ" || event.key.toLowerCase() === "z";
    if (isZKey) {
      event.preventDefault();
      event.stopPropagation();
      historyKey.current = true;
      if (event.shiftKey) redo(); else undo();
    }
    if (!singleLine && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) requestAnimationFrame(() => resetScroll());
  };
  const handleCompositionEnd = (input: HTMLTextAreaElement, data: string) => {
    if (!keyboardLayout || !data) return;
    const mapped = mapLatinText(keyboardLayout, data);
    if (mapped === data) return;
    const end = input.selectionStart ?? input.value.length;
    const start = Math.max(0, end - data.length);
    // compositionend may precede the committed input event on some keyboards;
    // in that case let beforeinput handle it instead of replacing old text.
    if (input.value.slice(start, end) !== data) return;
    rememberAt(input.value, start, end, /\s/.test(mapped) ? undefined : { groupKey: "insert" });
    onText(input.value.slice(0, start) + mapped + input.value.slice(end), { start, end });
    requestAnimationFrame(() => input.setSelectionRange(start + mapped.length, start + mapped.length));
  };
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input) return;
    const beforeInput = (rawEvent: Event) => {
      const event = rawEvent as InputEvent;
      if (!editable || event.defaultPrevented) return;
      const inputType = event.inputType ?? "";
      const data = event.data ?? "";
      if (inputType === "historyUndo" || inputType === "historyRedo") {
        event.preventDefault();
        pendingEdit.current = null;
        if (!historyKey.current) {
          if (inputType === "historyUndo") undo();
          else redo();
        }
        return;
      }
      if (keyboardLayout && inputType === "insertText" && data && event.cancelable) {
        const mapped = mapLatinText(keyboardLayout, data);
        if (mapped !== data) {
          event.preventDefault();
          event.stopPropagation();
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? start;
          rememberAt(input.value, start, end, /\s/.test(mapped) ? undefined : { groupKey: "insert" });
          onText(input.value.slice(0, start) + mapped + input.value.slice(end), { start, end });
          requestAnimationFrame(() => input.setSelectionRange(start + mapped.length, start + mapped.length));
          return;
        }
      }
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? start;
      if (
        (inputType === "deleteContentBackward" && start === 0 && end === 0)
        || (inputType === "deleteContentForward" && start === input.value.length && end === input.value.length)
      ) {
        return;
      }
      pendingEdit.current = { start, end };
      const groupKey = inputType.startsWith("delete")
        ? "delete"
        : inputType === "insertText" && data.length > 0 && !/\s/.test(data)
          ? "insert"
          : undefined;
      if (!remembered.current) {
        remembered.current = true;
        rememberAt(input.value, start, end, groupKey ? { groupKey } : undefined);
      }
    };
    const compositionEnd = (rawEvent: Event) => handleCompositionEnd(input, (rawEvent as CompositionEvent).data);
    input.addEventListener("beforeinput", beforeInput);
    if (keyboardLayout) input.addEventListener("compositionend", compositionEnd);
    return () => {
      input.removeEventListener("beforeinput", beforeInput);
      if (keyboardLayout) input.removeEventListener("compositionend", compositionEnd);
    };
  }, [editable, keyboardLayout, onText, redo, rememberAt, undo]);
  const paragraphBlock = () => <div style={{ minHeight: "100%" }}><ParagraphColumn parts={parts} aligns={paragraphAligns} textAlign={textAlign} /></div>;
  const handleWheel = (event: ReactWheelEvent<HTMLTextAreaElement>) => {
    if (singleLine) return;
    event.preventDefault();
    event.stopPropagation();
    resetScroll(event.currentTarget);
  };
  const sharedProps = { ref: (node: HTMLTextAreaElement | null) => { ref.current = node; }, "data-studio-text-frame": true, "data-studio-text-single-line": singleLine || undefined, "data-studio-frame-font-family": editorFamily, "data-studio-frame-font-size-pt": size, "data-studio-frame-text-color": textColor ?? "", "data-studio-frame-text-align": alignLabel, "data-studio-frame-typography": JSON.stringify(typography ?? { ...defaultDocumentSettings().typography, defaultRtlFontId: "jameel-noori-nastaleeq" }), value: text, readOnly: !editable, tabIndex: editable?0:-1, dir:"rtl" as const, autoCorrect: keyboardLayout ? "off" : undefined, autoCapitalize: keyboardLayout ? "none" : undefined, spellCheck: keyboardLayout ? false : undefined, "aria-label": singleLine ? "Title text" : "Text box", onPointerDown:(event: ReactPointerEvent<HTMLTextAreaElement>)=>{if(editable){event.stopPropagation();onFocus();}}, onFocus:()=>{dismissed.current=false;resetScroll();onFocus();measure();}, onChange:(event: ReactChangeEvent<HTMLTextAreaElement>)=>{ const edit = pendingEdit.current; pendingEdit.current = null; if (!remembered.current) remember(); remembered.current = false; onText(event.target.value, edit ?? undefined); }, onSelect:()=>{ resetScroll(); measure(); }, onScroll:(event: ReactUIEvent<HTMLTextAreaElement>)=>{ resetScroll(event.currentTarget); measure(); }, onWheel:handleWheel, onPaste:handlePaste, onKeyDown:handleKeyDown, onKeyUp:()=>{ historyKey.current = false; resetScroll(); }, onBlur:()=>{ remembered.current = false; if (historyBridge && frameId) historyBridge.closeFrameGroup(frameId); else history.current.closeGroup(); setCaret(null);requestAnimationFrame(measure);}, style:{...style,resize:"none" as const,pointerEvents:editable?"auto" as const:"none" as const,cursor:editable?"text":"inherit",background:"transparent",outline:"none",caretColor:"transparent"} };
  const fieldStyle = paragraphPaint ? { ...sharedProps.style, color: "transparent", WebkitTextFillColor: "transparent" } : sharedProps.style;
  return <>
    {singleLine ? <div ref={sizerRef} aria-hidden data-studio-auto-height-sizer style={{ ...style, inset: undefined, top: 0, left: 0, width: "100%", height: "auto", minHeight: 0, visibility: "hidden", pointerEvents: "none", borderColor: "transparent", background: "transparent" }}>{text.length === 0 ? "\u200b" : text.endsWith("\n") ? `${text}\u200b` : text}</div> : null}
    {paragraphPaint ? <div ref={visible} aria-hidden data-studio-frame-paragraphs style={{ ...style, borderColor: "transparent", overflow: "hidden", pointerEvents: "none", background: "transparent" }}>{paragraphBlock()}</div> : null}
    <textarea {...sharedProps} data-studio-paragraph-paint={paragraphPaint ? "true" : undefined} data-studio-selection-painted={boxes.length?"true":undefined} style={{ ...fieldStyle, scrollbarWidth: "none" }} />
    <div ref={mirror} aria-hidden style={{...style,height:"auto",minHeight:"100%",visibility:"hidden",pointerEvents:"none",borderColor:"transparent",transform:`translate(${- (ref.current?.scrollLeft??0)}px,${- (ref.current?.scrollTop??0)}px)`}}>{paragraphPaint ? paragraphBlock() : null}</div>
    {!singleLine && overflows ? <div data-studio-text-frame-overflow aria-hidden style={{ position:"absolute",left:1,right:1,bottom:1,height:4,background:"#dc2626",pointerEvents:"none" }} /> : null}
    {caret?<div key={`${caret.left}:${caret.top}:${caret.height}`} data-studio-frame-caret style={{position:"absolute",...caret,background:"#000",pointerEvents:"none",animation:"qalam-studio-caret-blink 1060ms step-end infinite"}} />:null}
    {boxes.length>0?<div data-studio-text-frame-selection style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>{boxes.map((box,i)=><div key={i} data-studio-line-selection style={{position:"absolute",...box,background:"#000",overflow:"hidden"}}><div style={{...style,inset:undefined,left:-box.left,top:-box.top,width:ref.current?.offsetWidth,height:"auto",minHeight:"100%",color:"#fff",borderColor:"transparent",background:"transparent",transform:paragraphPaint?`translate(0,${-(ref.current?.scrollTop??0)}px)`:undefined}}>{paragraphPaint ? paragraphBlock() : text+"\u200b"}</div></div>)}</div>:null}
  </>;
}
