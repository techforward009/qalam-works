"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FORMATTING_TARGET_CHANGE, isFormattingSurface, readFormattingTarget } from "../utils/formattingSafety";
import { registerFrameStyleUpdater } from "../utils/formattingSafety";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { defaultDocumentSettings } from "../utils/documentSettings";
import { editorFontFamilyStack, getFontById } from "../utils/fontRegistry";
import type { StudioFrame } from "./StudioObjectLayer";
import { blockLeadingPt } from "../utils/autoLeading";
import { selectedLineBoxes, lineBoxTop, type TextLineBox } from "../utils/textLineBoxes";

export function normalizeSingleLineText(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
}

/** A natural-size mirror preserves textarea wrapping even inside a zoom transform. */
export function StudioTextFrame({ text, singleLine = false, editable, typography, textColor, textAlign, onFocus, onText, onStyle }: {
  text: string; singleLine?: boolean; editable: boolean; typography?: DocumentStudioSettings["typography"];
  textColor?: string; textAlign?: "left" | "center" | "right" | "justify" | "justify-all";
  onFocus: () => void; onText: (text: string) => void; onStyle: (patch: Partial<Pick<StudioFrame, "typography" | "textColor" | "textAlign">>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null), mirror = useRef<HTMLDivElement>(null);
  const dismissed = useRef(false);
  const [boxes,setBoxes] = useState<TextLineBox[]>([]);
  const [caret,setCaret] = useState<TextLineBox | null>(null);
  const family = typography ? editorFontFamilyStack(typography.defaultRtlFontId) : '"Jameel Noori Nastaleeq", serif';
  const size = typography?.bodyFontSizePt ?? 12;
  const editorFamily = typography ? getFontById(typography.defaultRtlFontId).editorFamily : "Jameel Noori Nastaleeq";
  const leading = blockLeadingPt({type:"paragraph"},family,typography ?? {bodyFontSizePt:12,lineHeight:1.5},"rtl");
  const measure = useCallback(() => {
    const input=ref.current, clone=mirror.current;
    const target = input ? readFormattingTarget(input) : undefined;
    const focused = document.activeElement === input;
    const ownsSelection = target ? target.owner === "frame" && target.input === input : focused;
    if(!input || !clone || !ownsSelection || !editable || dismissed.current) { setCaret(null);setBoxes(prev=>prev.length?[]:prev);return; }
    clone.textContent=input.value+"\u200b";
    clone.style.transform = `translate(${-input.scrollLeft}px,${-input.scrollTop}px)`;
    const selectionStart = input.selectionStart ?? 0, selectionEnd = input.selectionEnd ?? selectionStart;
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
      setCaret({left:input.value.length === 0 ? emptyPosition : Math.max(3,Math.min(input.clientWidth-3-2/scale,(rect.left-bounds.left)/scale-3/scale)),top,width:2/scale,height:Math.min(pitch,input.clientHeight-top-2)});
    }else{
      setCaret(null);
      const next=selectedLineBoxes(clone,range,bounds).map(box=>({...box,left:(box.left-bounds.left)/scale,top:(box.top-bounds.top)/scale,width:box.width/scale,height:box.height/scale}));
      setBoxes(prev=>prev.length||next.length?next:prev);
    }
  }, [editable, leading, family, textAlign]);
  useLayoutEffect(measure,[text,leading,family,editable,textAlign]);
  useEffect(() => {
    const input = ref.current;
    return input ? registerFrameStyleUpdater(input, onStyle) : undefined;
  }, [onStyle]);
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
  const style: React.CSSProperties = { position:"absolute",inset:0,width:"100%",height:"100%",boxSizing:"border-box",border:"1px solid #000",padding:2,fontFamily:family,fontSize:`${size}pt`,lineHeight:`${leading}pt`,fontVariantLigatures:"normal",fontFeatureSettings:"normal",direction:"rtl",unicodeBidi:"plaintext",textIndent:0,tabSize:8,fontKerning:"auto",whiteSpace:singleLine?"nowrap":"pre-wrap",overflowWrap:singleLine?"normal":"break-word",overflow:singleLine?"hidden":undefined,color:textColor ?? "#000",textAlign:textAlign === "justify-all" ? "justify" : textAlign,textAlignLast:textAlign === "justify-all" ? "justify" : undefined };
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!singleLine) return;
    event.preventDefault();
    const input = event.currentTarget, normalized = normalizeSingleLineText(event.clipboardData.getData("text/plain"));
    const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
    const value = input.value.slice(0, start) + normalized + input.value.slice(end);
    onText(value);
    requestAnimationFrame(() => { input.setSelectionRange(start + normalized.length, start + normalized.length); });
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (singleLine && (event.key === "Enter" || event.key === "NumpadEnter")) event.preventDefault();
  };
  const sharedProps = { ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => { ref.current = node; }, "data-studio-text-frame": true, "data-studio-text-single-line": singleLine || undefined, "data-studio-frame-font-family": editorFamily, "data-studio-frame-font-size-pt": size, "data-studio-frame-text-color": textColor ?? "", "data-studio-frame-text-align": textAlign ?? "", "data-studio-frame-typography": JSON.stringify(typography ?? { ...defaultDocumentSettings().typography, defaultRtlFontId: "jameel-noori-nastaleeq" }), value: singleLine ? normalizeSingleLineText(text) : text, readOnly: !editable, tabIndex: editable?0:-1, dir:"rtl" as const, "aria-label": singleLine ? "Title text" : "Text box", onPointerDown:(event: React.PointerEvent<HTMLInputElement | HTMLTextAreaElement>)=>{if(editable){event.stopPropagation();onFocus();}}, onFocus:()=>{dismissed.current=false;onFocus();measure();}, onChange:(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>)=>onText(singleLine?normalizeSingleLineText(event.target.value):event.target.value), onSelect:measure, onScroll:measure, onPaste:handlePaste, onKeyDown:handleKeyDown, onBlur:()=>{setCaret(null);requestAnimationFrame(measure);}, style:{...style,resize:"none" as const,pointerEvents:editable?"auto" as const:"none" as const,cursor:editable?"text":"inherit",background:"transparent",outline:"none",caretColor:"transparent"} };
  return <>
    {singleLine ? <input {...sharedProps} type="text" data-studio-text-frame data-studio-text-single-line="true" /> : <textarea {...sharedProps} data-studio-selection-painted={boxes.length?"true":undefined} />}
    <div ref={mirror} aria-hidden style={{...style,height:"auto",minHeight:"100%",visibility:"hidden",pointerEvents:"none",transform:`translate(${- (ref.current?.scrollLeft??0)}px,${- (ref.current?.scrollTop??0)}px)`}} />
    {caret?<div key={`${caret.left}:${caret.top}:${caret.height}`} data-studio-frame-caret style={{position:"absolute",...caret,background:"#000",pointerEvents:"none",animation:"qalam-studio-caret-blink 1060ms step-end infinite"}} />:null}
    {boxes.length>0?<div data-studio-text-frame-selection style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>{boxes.map((box,i)=><div key={i} data-studio-line-selection style={{position:"absolute",...box,background:"#000",overflow:"hidden"}}><div style={{...style,inset:undefined,left:-box.left,top:-box.top,width:ref.current?.offsetWidth,height:"auto",minHeight:"100%",color:"#fff",borderColor:"transparent",background:"transparent"}}>{text+"\u200b"}</div></div>)}</div>:null}
  </>;
}
