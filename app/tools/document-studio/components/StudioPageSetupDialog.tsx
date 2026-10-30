"use client";

import { useEffect, useLayoutEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { clampMarginMm, resolvePageDimensions, type CustomPageSizeMm, type PageOrientation, type PageSizeId } from "../utils/pageLayout";
import { useMovableStudioDialog } from "./useMovableStudioDialog";

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
const field:CSSProperties={background:'#fff',color:'#000',border:'1px solid #808080',boxShadow:'inset 1px 1px #aaa',boxSizing:'border-box',height:19,padding:'0 2px',font:'11px Tahoma,Arial,sans-serif',minWidth:0};
const button:CSSProperties={width:60,height:23,background:'#f0f0f0',color:'#000',border:'1px solid #808080',boxShadow:'inset 1px 1px #fff,inset -1px -1px #404040',font:'11px Tahoma,Arial,sans-serif'};
const group:CSSProperties={position:'absolute',minWidth:0,margin:0,padding:'4px 5px',border:'1px solid #999',boxSizing:'border-box'};
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
  const [columnCount,setColumnCount]=useState(columns),[gutterMm,setGutterMm]=useState(String(gutter));
  const margins=settings.page.margins;
  const [marginText,setMarginText]=useState(()=>({left:`${direction==='rtl'?margins.endMm:margins.startMm}mm`,right:`${direction==='rtl'?margins.startMm:margins.endMm}mm`,top:`${margins.topMm}mm`,bottom:`${margins.bottomMm}mm`}));
  const [error,setError]=useState(''),[help,setHelp]=useState(false),[scale,setScale]=useState(1);
  const drag=useMovableStudioDialog<HTMLFormElement>(),root=drag.dialogRef;
  useEffect(()=>{root.current?.querySelector('select')?.focus();},[]);
  useLayoutEffect(()=>{const update=()=>setScale(Math.min(1,(window.innerWidth-16)/389,(window.innerHeight-16)/179));update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
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
  return <div data-studio-page-setup-backdrop="true" className="fixed inset-0 z-[125] grid place-items-center bg-black/25 p-2" style={{gridTemplateColumns:'minmax(0,1fr)'}} onPointerDown={e=>e.stopPropagation()}>
    <form ref={root} data-studio-page-setup="true" role="dialog" aria-modal="true" aria-label="Page Setup" dir="ltr" onSubmit={submit} onKeyDown={event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
      if(event.key==='Tab'){const controls=[...root.current!.querySelectorAll<HTMLElement>('input:not(:disabled),select,button:not(:disabled)')],index=controls.indexOf(document.activeElement as HTMLElement);if(index>=0){event.preventDefault();controls[(index+(event.shiftKey?controls.length-1:1))%controls.length]?.focus();}}
    }} style={{position:'relative',width:389,minWidth:389,height:179,transform:`${drag.style.transform} scale(${scale})`,justifySelf:'center',background:'#f0f0f0',color:'#000',border:'1px solid #808080',boxShadow:'inset 1px 1px #fff,1px 2px 6px #3337',font:'11px Tahoma,Arial,sans-serif',boxSizing:'border-box'}}>
      <div {...drag.handleProps} style={{...drag.handleProps.style,position:'absolute',top:2,left:2,right:2,height:22,background:'linear-gradient(90deg,#d5eafd,#f2faff)',border:'1px solid #8da8c1',padding:'3px 6px',boxSizing:'border-box'}}>Page Setup</div>
      <button type="button" aria-label="Close" onClick={onClose} style={{...button,position:'absolute',right:5,top:4,width:24,height:18}}>×</button>
      <fieldset style={{...group,left:6,top:29,width:131,height:141}}><legend>Page</legend>
        <select aria-label="Page size" style={{...field,width:'100%'}} value={paper} onChange={e=>choosePaper(e.target.value)}>{papers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}<option value="custom">Custom Size</option></select>
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:5}}>Width:<input aria-label="Width" style={{...field,width:70}} value={width} onChange={e=>{setWidth(e.target.value);setPaper('custom');}}/></label>
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:4}}>Height:<input aria-label="Height" style={{...field,width:70}} value={height} onChange={e=>{setHeight(e.target.value);setPaper('custom');}}/></label>
        <fieldset style={{border:'1px solid #999',margin:'5px 0 0',padding:'0 4px 2px',height:45,boxSizing:'border-box'}}><legend>Orientation</legend>
          <label style={{display:'block',lineHeight:'14px'}}><input type="radio" name="page-orientation" checked={orientation==='portrait'} onChange={()=>turn('portrait')}/>Portrait</label>
          <label style={{display:'block',lineHeight:'14px'}}><input type="radio" name="page-orientation" checked={orientation==='landscape'} onChange={()=>turn('landscape')}/>Landscape</label>
        </fieldset>
      </fieldset>
      <fieldset style={{...group,left:142,top:29,width:91,height:124,padding:'4px'}}><legend>Margins</legend>
        {(['left','right','top','bottom'] as const).map(key=><label key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:2,marginBottom:6}}><span>{key[0].toUpperCase()+key.slice(1)}:</span><input aria-label={`${key} margin`} style={{...field,width:46}} value={marginText[key]} onChange={e=>setMarginText(old=>({...old,[key]:e.target.value}))}/></label>)}
      </fieldset>
      <fieldset style={{...group,left:238,top:29,width:77,height:90,padding:'4px'}}><legend>Columns</legend>
        <input type="number" aria-label="Columns" min={1} max={4} style={{...field,width:'100%'}} value={columnCount} onChange={e=>setColumnCount(Number(e.target.value))}/>
        <label style={{display:'block',marginTop:6}}>Gutter:<span style={{display:'flex',alignItems:'center'}}><input aria-label="Gutter" type="number" min={0} max={50} step={.01} style={{...field,width:54}} value={gutterMm} onChange={e=>setGutterMm(e.target.value)}/><span>mm</span></span></label>
      </fieldset>
      <div style={{position:'absolute',right:7,top:35,display:'flex',flexDirection:'column',gap:6}}><button type="submit" style={button}>OK</button><button type="button" style={button} onClick={onClose}>Cancel</button><button type="button" style={button} onClick={()=>setHelp(v=>!v)}>Help</button></div>
      {error?<div role="alert" style={{position:'absolute',left:4,right:4,bottom:3,background:'#ffffdf',border:'1px solid #a00',padding:3}}>{error}</div>:null}
      {help?<div role="status" style={{position:'absolute',left:4,right:70,bottom:3,background:'#ffffdf',border:'1px solid #aaa',padding:3}}>Size and margins update this document without replacing text. Columns and gutter retain the existing column guides.</div>:null}
    </form>
  </div>;
}
