"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { clampMarginMm, resolvePageDimensions, type PageOrientation, type PageSizeId } from "../utils/pageLayout";

export type StudioPageSetupValues = {
  size: PageSizeId;
  orientation: PageOrientation;
  left: number; right: number; top: number; bottom: number;
  columns: number; gutter: number; facing: boolean;
};

const field: CSSProperties = { background:"#fff",color:"#000",border:"1px solid #8c8c8c",boxShadow:"inset 1px 1px #777,inset -1px -1px #fff",boxSizing:"border-box",height:20,padding:"1px 3px",font:"11px Tahoma,Arial,sans-serif" };
const btn: CSSProperties = { height:23,width:60,background:"#f0f0f0",border:"1px solid #888",boxShadow:"inset 1px 1px white,inset -1px -1px #aaa",font:"11px Tahoma,Arial,sans-serif",cursor:"pointer" };
const group: CSSProperties = { position:"absolute",margin:0,padding:"5px 5px 4px",border:"1px solid #9b9b9b",background:"#f0f0f0",boxSizing:"border-box" };
const sizes: {id:PageSizeId,label:string}[] = [{id:"a4",label:"A4 210x297mm"},{id:"a5",label:"A5 148x210mm"},{id:"letter",label:"Letter 216x279mm"}];

export default function StudioPageSetupDialog({ settings, direction, columns, gutter, facing, onApply, onClose }: {
  settings: DocumentStudioSettings;
  direction: "ltr" | "rtl";
  columns: number; gutter: number; facing: boolean;
  onApply: (values: StudioPageSetupValues) => void; onClose: () => void;
}) {
  const margins = settings.page.margins;
  const [draft, setDraft] = useState<StudioPageSetupValues>(() => ({
    size:settings.page.size, orientation:settings.page.orientation,
    left:direction==="rtl"?margins.endMm:margins.startMm,
    right:direction==="rtl"?margins.startMm:margins.endMm,
    top:margins.topMm,bottom:margins.bottomMm,columns,gutter,facing,
  }));
  const [help,setHelp]=useState(false);
  const set = (patch: Partial<StudioPageSetupValues>) => setDraft(old=>({...old,...patch}));
  const dims = resolvePageDimensions(draft.size,draft.orientation);
  useEffect(()=>{
    const key = (event: KeyboardEvent) => { if(event.key==="Escape"){event.preventDefault();event.stopPropagation();onClose();} };
    document.addEventListener("keydown",key,true);
    return ()=>document.removeEventListener("keydown",key,true);
  },[onClose]);
  const submit = (event:FormEvent) => {
    event.preventDefault();
    onApply({...draft,
      left:clampMarginMm(draft.left),right:clampMarginMm(draft.right),
      top:clampMarginMm(draft.top),bottom:clampMarginMm(draft.bottom),
      columns:Math.max(1,Math.min(4,Math.round(draft.columns)||1)),
      gutter:Math.max(0,Math.min(50,draft.gutter)),
    });
  };
  return <div data-studio-page-setup-backdrop="true" className="fixed inset-0 z-[125] grid place-items-center bg-black/25 p-2" onPointerDown={event=>event.stopPropagation()}>
    <form data-studio-page-setup="true" role="dialog" aria-modal="true" aria-label="Page Setup" dir="ltr" onSubmit={submit}
      style={{position:"relative",width:390,maxWidth:"calc(100vw - 16px)",height:183,maxHeight:"calc(100vh - 16px)",overflow:"auto",background:"#f0f0f0",color:"#000",border:"1px solid #8094a5",borderRadius:5,boxShadow:"0 2px 8px #3337,inset 1px 1px #fff",font:"11px Tahoma,Arial,sans-serif",boxSizing:"border-box"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:26,background:"linear-gradient(#ecf7ff,#c6e3fa)",padding:"5px 9px",boxSizing:"border-box"}}>Page Setup</div>
      <button type="button" aria-label="Close" onClick={onClose} style={{position:"absolute",right:6,top:2,width:47,height:19,background:"linear-gradient(#f1aaaa,#bb3d31)",border:"1px solid #a23b30",color:"#fff",cursor:"pointer"}}>×</button>
      <fieldset style={{...group,left:7,top:31,width:121,height:146}}><legend>Page</legend>
        <select aria-label="Page size" style={{...field,width:110}} value={draft.size} onChange={e=>set({size:e.target.value as PageSizeId})}>{sizes.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>Width: <input style={{...field,width:68}} value={dims.widthMm+"mm"} readOnly aria-label="Width"/></label>
        <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>Height: <input style={{...field,width:68}} value={dims.heightMm+"mm"} readOnly aria-label="Height"/></label>
        <fieldset style={{border:"1px solid #999",margin:"6px 0 0",padding:"2px 4px",height:45,boxSizing:"border-box"}}><legend>Orientation</legend>
          <label style={{display:"block"}}><input type="radio" name="page-orientation" checked={draft.orientation==="portrait"} onChange={()=>set({orientation:"portrait"})}/>Portrait</label>
          <label style={{display:"block"}}><input type="radio" name="page-orientation" checked={draft.orientation==="landscape"} onChange={()=>set({orientation:"landscape"})}/>Landscape</label>
        </fieldset>
      </fieldset>
      <fieldset style={{...group,left:133,top:31,width:105,height:146}}><legend>Margins</legend>
        {(["left","right","top","bottom"] as const).map(key=><label key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:2,marginBottom:5}}>
          <span>{key==="left"?(draft.facing?"Inside:":"Left:"):key==="right"?(draft.facing?"Outside:":"Right:"):key==="top"?"Top:":"Bottom:"}</span>
          <input aria-label={key+" margin"} style={{...field,width:59}} value={String(draft[key])+"mm"} onChange={e=>{const v=Number(e.target.value.replace(/mm/i,""));if(Number.isFinite(v))set({[key]:v});}} />
        </label>)}
      </fieldset>
      <fieldset style={{...group,left:244,top:31,width:73,height:84}}><legend>Columns</legend>
        <input type="number" min={1} max={4} aria-label="Columns" style={{...field,width:62}} value={draft.columns} onChange={e=>set({columns:Number(e.target.value)||1})}/>
        <label style={{display:"block",marginTop:5}}>Gutter:</label>
        <input aria-label="Gutter" type="number" min={0} max={50} step={0.01} style={{...field,width:62}} value={draft.gutter} onChange={e=>set({gutter:Number(e.target.value)||0})}/>
      </fieldset>
      <label style={{position:"absolute",left:246,top:123,whiteSpace:"nowrap",color:"#777"}}><input type="checkbox" checked={draft.facing} readOnly disabled/>Double Sided</label>
      <label style={{position:"absolute",left:246,top:142,whiteSpace:"nowrap"}}><input type="checkbox" aria-label="Facing Pages" checked={draft.facing} onChange={e=>set({facing:e.target.checked})}/>Facing Pages</label>
      <div style={{position:"absolute",right:9,top:36,display:"flex",flexDirection:"column",gap:4}}>
        <button type="submit" style={btn}>OK</button>
        <button type="button" style={btn} onClick={onClose}>Cancel</button>
        <button type="button" style={btn} onClick={()=>setHelp(v=>!v)}>Help</button>
      </div>
      {help?<div role="status" style={{position:"absolute",left:5,right:72,bottom:3,background:"#ffffdf",border:"1px solid #ccc",padding:2}}>Changes page layout, not document text.</div>:null}
    </form>
  </div>;
}
