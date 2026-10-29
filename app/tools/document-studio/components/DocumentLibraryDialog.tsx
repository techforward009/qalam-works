"use client";

import { useState } from "react";
import type { DocumentListItem } from "../utils/documentLibrary";

const btn = { font:"11px Tahoma,Arial,sans-serif", background:"#f0f0f0", color:"#000", border:"1px solid #8d8d8d", boxShadow:"inset 1px 1px white, inset -1px -1px #aaa", height:23, minWidth:75, cursor:"pointer" } as const;
export default function DocumentLibraryDialog({ isUr, documents, activeId, onOpen, onNew, onOpenInPage, onRename, onDelete, onClose }: {
  isUr: boolean; documents: DocumentListItem[]; activeId: string | null;
  onOpen: (id:string)=>void; onNew:()=>void; onOpenInPage:()=>void;
  onRename:(id:string)=>void; onDelete:(id:string)=>void; onClose:()=>void;
}) {
  const [selected,setSelected] = useState<string|null>(activeId && documents.some(d=>d.id===activeId) ? activeId : null);
  const [order,setOrder] = useState<"recent"|"all">("all");
  const [fileType,setFileType] = useState<"qalam"|"inpage">("qalam");
  const items = order==="recent" ? [...documents].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()) : documents;
  const chosen=items.find(d=>d.id===selected);
  const open=()=>{if(fileType==="inpage")onOpenInPage();else if(selected)onOpen(selected);};
  return <div data-studio-dialog={isUr?"ur":"en"} className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-2" role="dialog" aria-modal="true" aria-labelledby="document-library-title" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose();}}}>
    <div data-studio-open-dialog="true" dir="ltr" style={{width:575,maxWidth:"calc(100vw - 16px)",height:423,maxHeight:"calc(100vh - 16px)",boxSizing:"border-box",display:"flex",flexDirection:"column",overflow:"hidden",background:"#f0f0f0",border:"1px solid #81A7C3",borderRadius:6,boxShadow:"0 3px 14px #0006",font:"11px Tahoma,Arial,sans-serif",color:"#000"}}>
      <div style={{height:29,display:"flex",alignItems:"center",background:"linear-gradient(#f2faff,#bfdef6)",padding:"0 9px",flexShrink:0}}>
        <span aria-hidden="true" style={{marginRight:5}}>📄</span><span id="document-library-title" style={{flex:1}}>Open</span>
        <button type="button" aria-label="Close" onClick={onClose} style={{width:44,height:18,background:"linear-gradient(#f5c6bd,#cc5143)",color:"white",border:"1px solid #943d36",cursor:"pointer"}}>×</button>
      </div>
      <div style={{height:38,display:"flex",alignItems:"center",gap:6,padding:"4px 9px",flexShrink:0}}>
        <label htmlFor="qalam-look-in">Look in:</label>
        <select id="qalam-look-in" aria-label="Look in" value={order} onChange={e=>setOrder(e.target.value as "recent"|"all")} style={{height:22,flex:1,background:"#fff",border:"1px solid #888"}}>
          <option value="all">Qalam Page documents</option><option value="recent">Recent Places</option>
        </select>
        <button type="button" title="Browse your device" aria-label="Browse computer" onClick={onOpenInPage} style={btn}>Browse…</button>
      </div>
      <div style={{display:"flex",gap:8,padding:"0 9px",flex:1,minHeight:0}}>
        <nav aria-label="Locations" style={{width:99,flexShrink:0,border:"1px solid #ccd4dd",background:"#f6f8fb",display:"flex",flexDirection:"column",alignItems:"stretch",padding:3,gap:3}}>
          <button type="button" onClick={()=>setOrder("recent")} style={{...btn,minWidth:0,height:48,border:0,background:order==="recent"?"#d6e8fa":"transparent"}}>🕘<div>Recent Places</div></button>
          <button type="button" onClick={()=>setOrder("all")} style={{...btn,minWidth:0,height:48,border:0,background:order==="all"?"#d6e8fa":"transparent"}}>📂<div>Documents</div></button>
          <button type="button" onClick={onOpenInPage} style={{...btn,minWidth:0,height:48,border:0,background:"transparent"}}>💻<div>Computer</div></button>
        </nav>
        <div role="listbox" aria-label="Saved documents" style={{flex:1,overflowY:"auto",border:"1px solid #96a8b6",background:"#fff",padding:5}}>
          {items.length===0?<p style={{padding:12,color:"#666"}}>{isUr?"اس براؤزر میں کوئی محفوظ دستاویز نہیں۔":"No documents saved in this browser."}</p>:items.map(doc=><div key={doc.id} role="option" aria-selected={selected===doc.id} tabIndex={0} onDoubleClick={()=>onOpen(doc.id)} onClick={()=>setSelected(doc.id)} onKeyDown={e=>{if(e.key==="Enter")onOpen(doc.id);}} style={{padding:"5px 6px",cursor:"default",display:"flex",gap:8,alignItems:"center",background:selected===doc.id?"#c5ddfb":"transparent"}}>
            <span aria-hidden="true" style={{fontSize:18}}>📄</span><span style={{minWidth:0}}><span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.title}</span><small style={{color:"#555"}}>{new Date(doc.updatedAt).toLocaleDateString()}</small></span>
          </div>)}
        </div>
      </div>
      <div style={{padding:"6px 11px",display:"grid",gridTemplateColumns:"1fr 80px",rowGap:5,columnGap:7,alignItems:"center",flexShrink:0}}>
        <label style={{display:"flex",alignItems:"center",gap:5}}>File name:<input aria-label="File name" readOnly value={chosen?.title??""} style={{flex:1,minWidth:0,height:22,border:"1px solid #8e8e8e",background:"#fff",paddingLeft:4}}/></label>
        <button type="button" style={btn} onClick={open} disabled={fileType==="qalam"&&!selected}>Open</button>
        <label style={{display:"flex",alignItems:"center",gap:5}}>Files of type:<select aria-label="Files of type" value={fileType} onChange={e=>setFileType(e.target.value as "qalam"|"inpage")} style={{flex:1,minWidth:0,height:22,border:"1px solid #8e8e8e",background:"#fff"}}>
          <option value="qalam">Qalam Page Documents</option><option value="inpage">InPage files (*.inp;*.int)</option>
        </select></label>
        <button type="button" style={btn} onClick={onClose}>Cancel</button>
      </div>
      <div style={{height:27,display:"flex",alignItems:"center",gap:5,padding:"0 11px 6px",flexShrink:0}}>
        <button type="button" style={{...btn,minWidth:90}} onClick={onNew}>New document</button>
        <button type="button" style={{...btn,minWidth:90}} onClick={onOpenInPage} aria-label="Open InPage file…">Open InPage file…</button>
        <button type="button" style={{...btn,minWidth:60}} onClick={()=>selected&&onRename(selected)} disabled={!selected}>Rename</button>
        <button type="button" style={{...btn,minWidth:50}} onClick={()=>selected&&onDelete(selected)} disabled={!selected}>Delete</button>
        <span style={{marginLeft:"auto",color:"#666"}} title="Browsers cannot enumerate local Windows folders">Browser storage</span>
      </div>
    </div>
  </div>;
}
