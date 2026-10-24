"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { editorFontFamilyStack } from "../utils/fontRegistry";
import { blockLeadingPt } from "../utils/autoLeading";
import { selectedLineBoxes, lineBoxTop, type TextLineBox } from "../utils/textLineBoxes";

/** A natural-size mirror preserves textarea wrapping even inside a zoom transform. */
export function StudioTextFrame({ text, editable, typography, onFocus, onText }: {
  text: string; editable: boolean; typography?: DocumentStudioSettings["typography"];
  onFocus: () => void; onText: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null), mirror = useRef<HTMLDivElement>(null);
  const [boxes,setBoxes] = useState<TextLineBox[]>([]);
  const [caret,setCaret] = useState<TextLineBox | null>(null);
  const family = typography ? editorFontFamilyStack(typography.defaultRtlFontId) : '"Jameel Noori Nastaleeq", serif';
  const size = typography?.bodyFontSizePt ?? 12;
  const leading = blockLeadingPt({type:"paragraph"},family,typography ?? {bodyFontSizePt:12,lineHeight:1.5},"rtl");
  const measure = () => {
    const input=ref.current, clone=mirror.current;
    if(!input || !clone || document.activeElement!==input || !editable) { setCaret(null);setBoxes(prev=>prev.length?[]:prev);return; }
    clone.textContent=input.value+"\u200b";
    const range=document.createRange();range.setStart(clone.firstChild!,input.selectionStart);range.setEnd(clone.firstChild!,input.selectionEnd);
    const bounds=clone.getBoundingClientRect(),scale=bounds.width/clone.offsetWidth || 1;
    if(input.selectionStart===input.selectionEnd){
      setBoxes(prev=>prev.length?[]:prev);
      let rect=range.getBoundingClientRect();
      if(!rect.height){range.setEnd(clone.firstChild!,input.selectionEnd+1);rect=range.getBoundingClientRect();}
      const pitch=leading*4/3,top=Math.max(3,Math.min(input.clientHeight-pitch-2,(lineBoxTop(rect.top,rect.height,pitch*scale)-bounds.top)/scale));
      setCaret({left:Math.max(3,Math.min(input.clientWidth-3-2/scale,(rect.left-bounds.left)/scale-3/scale)),top,width:2/scale,height:Math.min(pitch,input.clientHeight-top-2)});
    }else{
      setCaret(null);
      const next=selectedLineBoxes(clone,range,bounds).map(box=>({...box,left:(box.left-bounds.left)/scale,top:(box.top-bounds.top)/scale,width:box.width/scale,height:box.height/scale}));
      setBoxes(prev=>prev.length||next.length?next:prev);
    }
  };
  useLayoutEffect(measure,[text,leading,family,editable]);
  useEffect(()=>{ let raf=0; const update=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(measure);};document.addEventListener("selectionchange",update);return()=>{cancelAnimationFrame(raf);document.removeEventListener("selectionchange",update);}; });
  const style: React.CSSProperties = { position:"absolute",inset:0,width:"100%",height:"100%",boxSizing:"border-box",border:"1px solid #000",padding:2,fontFamily:family,fontSize:`${size}pt`,lineHeight:`${leading}pt`,fontVariantLigatures:"normal",fontFeatureSettings:"normal",direction:"rtl",unicodeBidi:"plaintext",textIndent:0,tabSize:8,fontKerning:"auto",whiteSpace:"pre-wrap",overflowWrap:"break-word" };
  return <>
    <textarea ref={ref} data-studio-text-frame data-studio-selection-painted={boxes.length?"true":undefined} value={text} readOnly={!editable} tabIndex={editable?0:-1} dir="rtl" aria-label="Text box" onPointerDown={event=>{if(editable)event.stopPropagation();}} onFocus={()=>{onFocus();measure();}} onChange={event=>onText(event.target.value)} onSelect={measure} onScroll={measure} onBlur={()=>{setBoxes([]);setCaret(null);}} style={{...style,resize:"none",pointerEvents:editable?"auto":"none",cursor:editable?"text":"inherit",background:"transparent",color:"#000",outline:"none",caretColor:"transparent"}} />
    <div ref={mirror} aria-hidden style={{...style,height:"auto",minHeight:"100%",visibility:"hidden",pointerEvents:"none",transform:`translate(${- (ref.current?.scrollLeft??0)}px,${- (ref.current?.scrollTop??0)}px)`}} />
    {caret?<div key={`${caret.left}:${caret.top}:${caret.height}`} data-studio-frame-caret style={{position:"absolute",...caret,background:"#000",pointerEvents:"none",animation:"qalam-studio-caret-blink 1060ms step-end infinite"}} />:null}
    {boxes.length>0?<div data-studio-text-frame-selection style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>{boxes.map((box,i)=><div key={i} data-studio-line-selection style={{position:"absolute",...box,background:"#000",overflow:"hidden"}}><div style={{...style,inset:undefined,left:-box.left,top:-box.top,width:ref.current?.offsetWidth,height:"auto",minHeight:"100%",color:"#fff",borderColor:"transparent",background:"transparent"}}>{text+"\u200b"}</div></div>)}</div>:null}
  </>;
}
