"use client";

import { useEffect, useState } from "react";
import type { DocumentListItem } from "../utils/documentLibrary";
import { useMovableStudioDialog } from "./useMovableStudioDialog";

function Icon({kind,size=24}:{kind:'document'|'folder'|'computer'|'clock';size?:number}) {
  return <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{display:"inline-block",verticalAlign:"middle"}}>
    {kind==='document'?<><path fill="#fff" stroke="#7f99ad" d="M5 2h10l4 4v16H5z"/><path fill="#d7e8f6" d="M15 2v5h4"/><path stroke="#8ca1b1" d="M8 10h8M8 13h8M8 16h6"/></>:kind==='folder'?<><path fill="#ecc15d" stroke="#a5843e" d="M2 6h8l2 3h10v12H2z"/><path fill="#f9df89" stroke="#a5843e" d="m3 12 2-2h17l-3 11H2z"/></>:kind==='computer'?<><rect x="2" y="3" width="20" height="14" fill="#cbd9e2" stroke="#647d8e"/><path fill="#5797bf" d="M4 5h16v10H4z"/><path stroke="#647d8e" d="M12 17v4M7 22h10"/></>:<><circle cx="12" cy="12" r="9" fill="#fff" stroke="#80a0b2"/><path stroke="#4c667b" d="M12 5v7l5 2"/></>}
  </svg>;
}

const btn = { font:"11px Tahoma,Arial,sans-serif", background:"#f0f0f0", color:"#000", border:"1px solid #8d8d8d", boxShadow:"inset 1px 1px white, inset -1px -1px #aaa", height:23, minWidth:75, cursor:"pointer" } as const;
export default function DocumentLibraryDialog({ isUr, documents, activeId, onOpen, onNew, onOpenInPage, onRename, onDelete, onClose }: {
  isUr: boolean; documents: DocumentListItem[]; activeId: string | null;
  onOpen: (id:string)=>void; onNew:()=>void; onOpenInPage:()=>void;
  onRename:(id:string)=>void; onDelete:(id:string)=>void; onClose:()=>void;
}) {
  const drag=useMovableStudioDialog<HTMLDivElement>();
  const root=drag.dialogRef;
  useEffect(()=>{(root.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ?? root.current?.querySelector<HTMLElement>('select'))?.focus();},[]);
  const close=()=>{onClose();document.querySelector<HTMLButtonElement>('[data-menu-root="file"]')?.focus();};
  const [selected,setSelected] = useState<string|null>(activeId && documents.some(d=>d.id===activeId) ? activeId : null);
  useEffect(()=>{if(selected&&!documents.some(doc=>doc.id===selected))setSelected(activeId&&documents.some(doc=>doc.id===activeId)?activeId:null);},[documents,activeId,selected]);
  const [order,setOrder] = useState<"recent"|"all">("all");
  const [fileType,setFileType] = useState<"qalam"|"inpage">("qalam");
  const items = order==="recent" ? [...documents].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()) : documents;
  const chosen=items.find(d=>d.id===selected);
  const open=()=>{if(fileType==="inpage")onOpenInPage();else if(chosen)onOpen(chosen.id);};
  return <div data-studio-dialog={isUr?"ur":"en"} className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-2" role="dialog" aria-modal="true" aria-labelledby="document-library-title" onKeyDown={e=>{
      if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}
      if(e.key==="Tab"){
        const fields=[...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,[role="option"]')];const index=fields.indexOf(document.activeElement as HTMLElement);
        if(index>=0){e.preventDefault();fields[(index+(e.shiftKey?fields.length-1:1))%fields.length]?.focus();}
      }
    }}>
    <style>{`@media(max-width:600px){[data-studio-open-dialog] [data-open-path]{padding-left:7px!important;}[data-studio-open-dialog] [data-open-footer]{padding-left:7px!important;}[data-studio-open-dialog] [data-open-footer] label span{width:65px!important;}}`}</style>
    <div ref={root} data-studio-open-dialog="true" dir="ltr" style={{...drag.style,width:570,maxWidth:"calc(100vw - 16px)",height:423,maxHeight:"calc(100vh - 16px)",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden",background:"#f0f0f0",border:"7px solid rgb(164,181,199)",outline:"1px solid #191e23",borderRadius:6,boxShadow:"0 3px 14px #0006",font:"11px Tahoma,Arial,sans-serif",color:"#000"}}>
      <div {...drag.handleProps} style={{...drag.handleProps.style,height:22,display:"flex",alignItems:"center",background:"linear-gradient(#f2faff,#bfdef6)",padding:"0 7px",flexShrink:0}}>
        <span aria-hidden="true" style={{marginRight:5}}><Icon kind="document" size={16}/></span><span id="document-library-title" style={{flex:1}}>Open</span>
        <button type="button" aria-label="Close" onClick={close} style={{width:44,height:18,background:"linear-gradient(#f5c6bd,#cc5143)",color:"white",border:"1px solid #943d36",cursor:"pointer"}}>×</button>
      </div>
      <div data-open-path style={{height:38,display:"flex",alignItems:"center",gap:6,padding:"4px 7px 4px 52px",flexShrink:0}}>
        <label htmlFor="qalam-look-in">Look in:</label>
        <select id="qalam-look-in" aria-label="Look in" value={order} onChange={e=>setOrder(e.target.value as "recent"|"all")} style={{height:22,width:260,flex:"0 1 260px",minWidth:0,background:"#fff",border:"1px solid #888"}}>
          <option value="all">Qalam Page documents</option><option value="recent">Recent Places</option>
        </select>
        <button type="button" title="Browse your device" aria-label="Browse computer" onClick={onOpenInPage} style={btn}>Browse…</button>
      </div>
      <div style={{display:"flex",gap:8,padding:"0 9px",flex:1,minHeight:0}}>
        <nav aria-label="Locations" style={{width:86,flexShrink:0,border:"1px solid #ccd4dd",background:"#f6f8fb",display:"flex",flexDirection:"column",alignItems:"stretch",padding:3,gap:3}}>
          <button type="button" onClick={()=>setOrder("recent")} style={{...btn,minWidth:0,height:48,border:0,background:order==="recent"?"#d6e8fa":"transparent"}}><Icon kind="clock"/><div>Recent Places</div></button>
          <button type="button" onClick={()=>setOrder("all")} style={{...btn,minWidth:0,height:48,border:0,background:order==="all"?"#d6e8fa":"transparent"}}><Icon kind="folder"/><div>Documents</div></button>
          <button type="button" onClick={onOpenInPage} style={{...btn,minWidth:0,height:48,border:0,background:"transparent"}}><Icon kind="computer"/><div>Computer</div></button>
        </nav>
        <div role="listbox" aria-label="Saved documents" style={{flex:1,minWidth:0,overflowY:"auto",border:"1px solid #96a8b6",background:"#fff",padding:5}}>
          {items.length===0?<p style={{padding:12,color:"#666"}}>{isUr?"اس براؤزر میں کوئی محفوظ دستاویز نہیں۔":"No documents saved in this browser."}</p>:items.map(doc=><div key={doc.id} role="option" aria-selected={selected===doc.id} tabIndex={0} onDoubleClick={()=>onOpen(doc.id)} onClick={()=>setSelected(doc.id)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();onOpen(doc.id);}if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const index=items.findIndex(item=>item.id===doc.id),next=items[(index+(e.key==="ArrowDown"?1:items.length-1))%items.length];setSelected(next.id);root.current?.querySelectorAll<HTMLElement>('[role="option"]')[items.indexOf(next)]?.focus();}}} style={{padding:"5px 6px",cursor:"default",display:"flex",gap:8,alignItems:"center",background:selected===doc.id?"#c5ddfb":"transparent"}}>
            <span aria-hidden="true" style={{fontSize:18}}><Icon kind="document"/></span><span style={{minWidth:0}}><span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.title}</span><small style={{color:"#555"}}>{new Date(doc.updatedAt).toLocaleDateString()}</small></span>
          </div>)}
        </div>
      </div>
      <div data-open-footer style={{padding:"6px 7px 6px 100px",display:"grid",gridTemplateColumns:"minmax(0,1fr) 75px",rowGap:5,columnGap:7,alignItems:"center",flexShrink:0}}>
        <label style={{display:"flex",alignItems:"center",gap:5}}><span style={{whiteSpace:"nowrap",width:90,flexShrink:0}}>File name:</span><input aria-label="File name" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();open();}}} readOnly value={chosen?.title??""} style={{flex:1,minWidth:0,height:22,border:"1px solid #8e8e8e",background:"#fff",paddingLeft:4}}/></label>
        <button type="button" style={btn} onClick={open} disabled={fileType==="qalam"&&!chosen}>Open</button>
        <label style={{display:"flex",alignItems:"center",gap:5}}><span style={{whiteSpace:"nowrap",width:90,flexShrink:0}}>Files of type:</span><select aria-label="Files of type" value={fileType} onChange={e=>setFileType(e.target.value as "qalam"|"inpage")} style={{flex:1,minWidth:0,height:22,border:"1px solid #8e8e8e",background:"#fff"}}>
          <option value="qalam">Qalam Page Documents</option><option value="inpage">InPage files (*.inp)</option>
        </select></label>
        <button type="button" style={btn} onClick={close}>Cancel</button>
      </div>
      <div style={{height:27,overflowX:"auto",display:"flex",alignItems:"center",gap:5,padding:"0 11px 6px",flexShrink:0}}>
        <button type="button" style={{...btn,minWidth:90,flexShrink:0}} onClick={onNew}>New document</button>
        <button type="button" style={{...btn,minWidth:60,flexShrink:0}} onClick={()=>chosen&&onRename(chosen.id)} disabled={!chosen}>Rename</button>
        <button type="button" style={{...btn,minWidth:50,flexShrink:0}} onClick={()=>chosen&&onDelete(chosen.id)} disabled={!chosen}>Delete</button>
        <span style={{marginLeft:"auto",color:"#666"}} title="Browsers cannot enumerate local Windows folders">Browser storage</span>
      </div>
    </div>
  </div>;
}
