"use client";

import { useEffect, useLayoutEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { clampMarginMm, resolvePageDimensions, type PageOrientation, type PageSizeId } from "../utils/pageLayout";
import { useMovableStudioDialog } from "./useMovableStudioDialog";

export type StudioPageSetupValues = {
  size: PageSizeId;
  orientation: PageOrientation;
  left: number; right: number; top: number; bottom: number;
  columns: number; gutter: number; facing: boolean;
};

const field: CSSProperties = { background:"#fff",color:"#000",border:"1px solid #8c8c8c",boxShadow:"inset 1px 1px #777,inset -1px -1px #fff",boxSizing:"border-box",height:18,padding:"1px 3px",font:"11px Tahoma,Arial,sans-serif" };
const btn: CSSProperties = { height:23,width:60,background:"#f0f0f0",border:"1px solid #888",boxShadow:"inset 1px 1px white,inset -1px -1px #aaa",font:"11px Tahoma,Arial,sans-serif",cursor:"pointer" };
const group: CSSProperties = { position:"absolute",minWidth:0,margin:0,padding:"5px 5px 4px",border:"1px solid #9b9b9b",background:"#f0f0f0",boxSizing:"border-box" };
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
  const drag=useMovableStudioDialog<HTMLFormElement>();
  const root=drag.dialogRef;
  const [scale,setScale]=useState(1);
  useLayoutEffect(()=>{const update=()=>setScale(Math.min(1,(window.innerWidth-16)/392,(window.innerHeight-16)/190));update();window.addEventListener("resize",update);return()=>window.removeEventListener("resize",update);},[]);
  const [marginText,setMarginText]=useState(()=>({left:`${draft.left}mm`,right:`${draft.right}mm`,top:`${draft.top}mm`,bottom:`${draft.bottom}mm`}));
  const [error,setError]=useState('');
  const [help,setHelp]=useState(false);
  const set = (patch: Partial<StudioPageSetupValues>) => setDraft(old=>({...old,...patch}));
  const dims = resolvePageDimensions(draft.size,draft.orientation,draft.size===settings.page.size?settings.page.customSizeMm:undefined);
  useEffect(()=>{root.current?.querySelector<HTMLSelectElement>('select')?.focus();},[]);
  const submit = (event:FormEvent) => {
    event.preventDefault();
    const parsed={left:0,right:0,top:0,bottom:0};
    for(const key of ['left','right','top','bottom'] as const){
      const raw=marginText[key].trim();const value=/^\d+(?:\.\d+)?\s*(?:mm)?$/i.test(raw)?Number(raw.replace(/mm/i,'')):NaN;
      if(!Number.isFinite(value)||value<5||value>50){setError('Margins must be between 5 and 50 mm.');root.current?.querySelector<HTMLInputElement>(`[aria-label="${key} margin"]`)?.focus();return;}
      parsed[key]=clampMarginMm(value);
    }
    if(!Number.isInteger(draft.columns)||draft.columns<1||draft.columns>4||!Number.isFinite(draft.gutter)||draft.gutter<0||draft.gutter>50){setError('Use 1–4 column guides and a gutter between 0 and 50 mm.');return;}
    onApply({...draft,...parsed});
  };
  return <div data-studio-page-setup-backdrop="true" className="fixed inset-0 z-[125] grid place-items-center bg-black/25 p-2" style={{gridTemplateColumns:"minmax(0,1fr)"}} onPointerDown={event=>event.stopPropagation()}>
    <form ref={root} data-studio-page-setup="true" role="dialog" aria-modal="true" aria-label="Page Setup" dir="ltr" onSubmit={submit} onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
        if(event.key==='Tab'){
          const controls=[...root.current!.querySelectorAll<HTMLElement>('input:not(:disabled),select,button:not(:disabled)')];const index=controls.indexOf(document.activeElement as HTMLElement);
          if(index>=0){event.preventDefault();controls[(index+(event.shiftKey?controls.length-1:1))%controls.length]?.focus();}
        }
      }}
      style={{position:"relative",width:392,minWidth:392,transform:`${drag.style.transform} scale(${scale})`,justifySelf:"center",height:183,overflow:"hidden",background:"#f0f0f0",color:"#000",border:"7px solid rgb(164,181,199)",outline:"1px solid #191e23",borderRadius:5,boxShadow:"0 2px 8px #3337,inset 1px 1px #fff",font:"11px Tahoma,Arial,sans-serif",boxSizing:"border-box"}}>
      <div {...drag.handleProps} style={{...drag.handleProps.style,position:"absolute",top:0,left:0,right:0,height:23,background:"linear-gradient(#ecf7ff,#c6e3fa)",padding:"5px 9px",boxSizing:"border-box"}}>Page Setup</div>
      <button type="button" aria-label="Close" onClick={onClose} style={{position:"absolute",right:6,top:2,width:47,height:19,background:"linear-gradient(#f1aaaa,#bb3d31)",border:"1px solid #a23b30",color:"#fff",cursor:"pointer"}}>×</button>
      <fieldset style={{...group,left:0,top:23,width:124,height:140}}><legend>Page</legend>
        <select aria-label="Page size" style={{...field,width:112}} value={draft.size} onChange={e=>set({size:e.target.value as PageSizeId})}>{sizes.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>Width: <input style={{...field,width:68}} value={dims.widthMm+"mm"} readOnly aria-label="Width"/></label>
        <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4}}>Height: <input style={{...field,width:68}} value={dims.heightMm+"mm"} readOnly aria-label="Height"/></label>
        <fieldset style={{border:"1px solid #999",margin:"6px 0 0",padding:"2px 4px",height:45,boxSizing:"border-box"}}><legend>Orientation</legend>
          <label style={{display:"block"}}><input type="radio" name="page-orientation" checked={draft.orientation==="portrait"} onChange={()=>set({orientation:"portrait"})}/>Portrait</label>
          <label style={{display:"block"}}><input type="radio" name="page-orientation" checked={draft.orientation==="landscape"} onChange={()=>set({orientation:"landscape"})}/>Landscape</label>
        </fieldset>
      </fieldset>
      <fieldset style={{...group,left:126,top:23,width:107,height:109,padding:"5px 3px 4px"}}><legend>Margins</legend>
        {(["left","right","top","bottom"] as const).map(key=><label key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:2,marginBottom:5}}>
          <span>{key==="left"?("Left:"):key==="right"?("Right:"):key==="top"?"Top:":"Bottom:"}</span>
          <input aria-label={key+" margin"} style={{...field,width:58}} value={marginText[key]} onChange={e=>setMarginText(old=>({...old,[key]:e.target.value}))} />
        </label>)}
      </fieldset>
      <fieldset style={{...group,left:236,top:23,width:75,height:84,padding:"5px 4px 4px"}}><legend>Columns</legend>
        <input type="number" min={1} max={4} aria-label="Columns" style={{...field,width:65}} value={draft.columns} onChange={e=>set({columns:Number(e.target.value)||1})}/>
        <label style={{display:"block",marginTop:5}}>Gutter:</label>
        <input aria-label="Gutter" type="number" min={0} max={50} step={0.01} style={{...field,width:65}} value={draft.gutter} onChange={e=>set({gutter:Number(e.target.value)||0})}/>
      </fieldset>
      <label style={{position:"absolute",left:243,top:119,whiteSpace:"nowrap",color:"#777"}}><input type="checkbox" aria-label="Double Sided" checked={false} readOnly disabled title="Duplex printing is not supported"/>Double Sided</label>
      <label style={{position:"absolute",left:243,top:139,whiteSpace:"nowrap"}}><input type="checkbox" aria-label="Facing Pages" checked={draft.facing} onChange={e=>set({facing:e.target.checked})}/>Facing Pages</label>
      <div style={{position:"absolute",right:3,top:31,display:"flex",flexDirection:"column",gap:3}}>
        <button type="submit" style={btn}>OK</button>
        <button type="button" style={btn} onClick={onClose}>Cancel</button>
        <button type="button" style={btn} onClick={()=>setHelp(v=>!v)}>Help</button>
      </div>
      {error?<div role="alert" style={{position:"absolute",left:0,right:0,bottom:0,background:"#ffffdf",border:"1px solid #a00",padding:3}}>{error}</div>:null}
      {help?<div role="status" style={{position:"absolute",left:5,right:72,bottom:0,background:"#ffffdf",border:"1px solid #ccc",padding:2}}>Page size and margins are saved. Facing Pages changes only the view; duplex/mirrored margins and PDF columns are not yet supported.</div>:null}
    </form>
  </div>;
}
