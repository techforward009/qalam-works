"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { clampMarginMm, resolvePageDimensions, type CustomPageSizeMm, type PageOrientation, type PageSizeId } from "../utils/pageLayout";
import {ClassicTitle,ClassicGroup,ClassicSelect,ClassicSpinner,at,classicField,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";

export type StudioPageSetupValues = {
  size: PageSizeId; orientation: PageOrientation; customSizeMm?: CustomPageSizeMm;
  left: number; right: number; top: number; bottom: number;
  columns: number; gutter: number;
};
const papers = [
  {id:'a4',label:'A4 210x297mm',width:210,height:297},
  {id:'a5',label:'A5 148x210mm',width:148,height:210},
  {id:'b4',label:'B4 250x353mm',width:250,height:353},
  {id:'b5',label:'B5 176x250mm',width:176,height:250},
  {id:'folio',label:'Folio 8.5x13"',width:215.9,height:330.2},
  {id:'quarto',label:'Quarto 215x275mm',width:215,height:275},
];
function millimetres(raw:string):number {return /^\d+(?:\.\d+)?\s*(?:mm)?$/i.test(raw.trim())?Number(raw.trim().replace(/mm/i,'')):NaN;}

export default function StudioPageSetupDialog({settings,direction,columns,gutter,onApply,onClose}:{
  settings:DocumentStudioSettings;direction:'ltr'|'rtl';columns:number;gutter:number;
  onApply:(values:StudioPageSetupValues)=>void;onClose:()=>void;
}) {
  const initial=resolvePageDimensions(settings.page.size,settings.page.orientation,settings.page.customSizeMm);
  const portrait=resolvePageDimensions(settings.page.size,'portrait',settings.page.customSizeMm);
  const [paper,setPaper]=useState(()=>papers.find(p=>Math.abs(p.width-portrait.widthMm)<.01&&Math.abs(p.height-portrait.heightMm)<.01)?.id??'custom');
  const [orientation,setOrientation]=useState(settings.page.orientation);
  const [width,setWidth]=useState(`${initial.widthMm}mm`),[height,setHeight]=useState(`${initial.heightMm}mm`);
  const [columnCount,setColumnCount]=useState(columns),[gutterMm,setGutterMm]=useState(`${gutter}mm`);
  const margins=settings.page.margins;
  const [marginText,setMarginText]=useState(()=>({left:`${direction==='rtl'?margins.endMm:margins.startMm}mm`,right:`${direction==='rtl'?margins.startMm:margins.endMm}mm`,top:`${margins.topMm}mm`,bottom:`${margins.bottomMm}mm`}));
  const [error,setError]=useState(''),[help,setHelp]=useState(false);
  const drag=useInPage2009Dialog<HTMLFormElement>(388,179),root=drag.dialogRef;
  useEffect(()=>{root.current?.querySelector('select')?.focus();},[]);
  const choosePaper=(id:string)=>{setPaper(id);const p=papers.find(item=>item.id===id);if(p){setWidth(`${orientation==='landscape'?p.height:p.width}mm`);setHeight(`${orientation==='landscape'?p.width:p.height}mm`);}};
  const turn=(next:PageOrientation)=>{if(next!==orientation){setWidth(height);setHeight(width);setOrientation(next);}};
  const submit=(event:FormEvent)=>{
    event.preventDefault();const w=millimetres(width),h=millimetres(height);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1||w>2000||h>2000){setError('Width and height must be between 1 and 2000 mm.');return;}
    const parsed={left:0,right:0,top:0,bottom:0};
    for(const key of ['left','right','top','bottom'] as const){const value=millimetres(marginText[key]);if(!Number.isFinite(value)||value<5||value>50){setError('Margins must be between 5 and 50 mm.');root.current?.querySelector<HTMLInputElement>(`[aria-label="${key} margin"]`)?.focus();return;}parsed[key]=clampMarginMm(value);}
    if(parsed.left+parsed.right>=w||parsed.top+parsed.bottom>=h){setError('Margins must leave room for the document text.');return;}
    const gap=millimetres(gutterMm);
    if(!Number.isInteger(columnCount)||columnCount<1||columnCount>4||!Number.isFinite(gap)||gap<0||gap>50){setError('Use 1–4 column guides and a gutter between 0 and 50 mm.');return;}
    const size:PageSizeId=paper==='a4'||paper==='a5'?paper:'a4';
    const customSizeMm=paper==='a4'||paper==='a5'?undefined:orientation==='landscape'?{widthMm:h,heightMm:w}:{widthMm:w,heightMm:h};
    onApply({size,orientation,customSizeMm,...parsed,columns:columnCount,gutter:gap});
  };
  const label=(text:string,x:number,y:number,id:string)=><label htmlFor={id} style={{...at(x,y),whiteSpace:'nowrap'}}><u>{text[0]}</u>{text.slice(1)}:</label>;
  return <div data-studio-page-setup-backdrop="true" className="fixed inset-0 z-[125] grid place-items-center bg-black/25 p-2" style={{gridTemplateColumns:'minmax(0,1fr)'}} onPointerDown={e=>e.stopPropagation()}>
    <form ref={root} data-studio-page-setup="true" data-inpage2009-dialog="true" role="dialog" aria-modal="true" aria-label="Page Setup" dir="ltr" onSubmit={submit} onKeyDown={event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
      if(event.key==='Tab'){const controls=[...root.current!.querySelectorAll<HTMLElement>('input:not(:disabled),select,button:not(:disabled):not([tabindex="-1"])')],index=controls.indexOf(document.activeElement as HTMLElement);if(index>=0){event.preventDefault();controls[(index+(event.shiftKey?controls.length-1:1))%controls.length]?.focus();}}
    }} style={drag.style}>
      <ClassicTitle title="Page Setup" closeTabIndex={0} onClose={onClose} handleProps={drag.handleProps}/>
      <ClassicGroup name="Page" box={[9,34,120,136]}>
        <ClassicSelect aria-label="Page size" box={[3,11,113,20]} value={paper} onChange={e=>choosePaper(e.target.value)}>{papers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}<option value="custom">Custom Size</option></ClassicSelect>
        {label('Width',3,37,'setup-width')}<input id="setup-width" aria-label="Width" style={{...classicField,...at(48,36,68,20)}} value={width} onChange={e=>{setWidth(e.target.value);setPaper('custom');}}/>
        {label('Height',3,59,'setup-height')}<input id="setup-height" aria-label="Height" style={{...classicField,...at(48,58,68,20)}} value={height} onChange={e=>{setHeight(e.target.value);setPaper('custom');}}/>
        <ClassicGroup name="Orientation" box={[3,83,114,50]}>
          <label style={{...at(4,15),display:'flex',gap:4,alignItems:'center'}}><input type="radio" name="page-orientation" checked={orientation==='portrait'} onChange={()=>turn('portrait')}/><span><u>P</u>ortrait</span></label>
          <label style={{...at(4,33),display:'flex',gap:4,alignItems:'center'}}><input type="radio" name="page-orientation" checked={orientation==='landscape'} onChange={()=>turn('landscape')}/><span><u>L</u>andscape</span></label>
        </ClassicGroup>
      </ClassicGroup>
      <ClassicGroup name="Margins" box={[132,34,107,102]}>
        {(['left','right','top','bottom'] as const).map((key,index)=><span key={key}>{label(key[0].toUpperCase()+key.slice(1),3,15+index*23,`margin-${key}`)}<input id={`margin-${key}`} aria-label={`${key} margin`} style={{...classicField,...at(45,11+index*23,60,20)}} value={marginText[key]} onChange={e=>setMarginText(old=>({...old,[key]:e.target.value}))}/></span>)}
      </ClassicGroup>
      <ClassicGroup name="Columns" box={[242,34,74,81]}>
        <ClassicSpinner label="Columns" box={[4,11,67,20]} value={String(columnCount)} onChange={value=>setColumnCount(Number(value))} min={1} max={4}/>
        <label htmlFor="inpage-spinner-gutter" style={at(4,40)}><u>G</u>utter:</label>
        <ClassicSpinner label="Gutter" box={[4,57,67,20]} value={gutterMm} onChange={setGutterMm} min={0} max={50} step={.01} unit="mm" onBlur={()=>{const n=millimetres(gutterMm);if(Number.isFinite(n))setGutterMm(`${n}mm`);}}/>
      </ClassicGroup>
      <div style={at(249,129)}><label style={{display:'flex',gap:3,alignItems:'center',color:'#aaa',whiteSpace:'nowrap'}}><input type="checkbox" aria-label="Double Sided" aria-disabled="true" disabled checked={false} readOnly/>Double Sided</label></div>
      <div style={at(249,146)}><label style={{display:'flex',gap:3,alignItems:'center',color:'#aaa',whiteSpace:'nowrap'}}><input type="checkbox" aria-label="Facing Pages" aria-disabled="true" disabled checked={false} readOnly/>Facing Pages</label></div>
      <button type="submit" style={{...classicButton,...at(320,36,60,23)}}>OK</button><button type="button" style={{...classicButton,...at(320,62,60,23)}} onClick={onClose}>Cancel</button><button type="button" style={{...classicButton,...at(320,88,60,23)}} onClick={()=>setHelp(v=>!v)}>Help</button>
      {error?<div role="alert" style={{position:'absolute',left:4,right:4,top:'100%',marginTop:4,background:'#ffffdf',border:'1px solid #a00',padding:3,zIndex:3}}>{error}</div>:null}
      {help?<div role="status" style={{position:'absolute',left:4,right:4,top:'100%',marginTop:4,background:'#ffffdf',border:'1px solid #aaa',padding:3,zIndex:3}}>Size and margins update this document without replacing text. Columns and gutter retain the existing column guides.</div>:null}
    </form>
  </div>;
}
