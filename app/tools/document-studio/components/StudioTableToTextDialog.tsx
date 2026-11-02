"use client";
import {useEffect,useRef,useState,type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {getTableToTextTarget,applyTableToText} from "../utils/tableToText";
import type {TextTableMode} from "../utils/tableConversions";
import {ClassicTitle,ClassicGroup,at,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";

export function StudioTableToTextDialog({editor,onClose}:{editor:Editor;onClose:()=>void}){
 const [mode,setMode]=useState<TextTableMode>("tabs"),[error,setError]=useState(""),[help,setHelp]=useState(false);
 const target=useRef(getTableToTextTarget(editor));
 const drag=useInPage2009Dialog<HTMLFormElement>(312,155,20);
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=()=>{
  try {
   if(!target.current)throw Error("Select a table cell first.");
   applyTableToText(editor,target.current.pos,mode);
   close();
  }catch(e){setError(e instanceof Error?e.message:"Cannot convert table.");}
 };
 useEffect(()=>{drag.dialogRef.current?.querySelector<HTMLInputElement>('[value="tabs"]')?.focus();},[]);
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={key} onMouseDown={e=>e.stopPropagation()}>
  <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Table To Text" data-inpage2009-dialog="true" data-studio-table-to-text-dialog="true" dir="ltr" onSubmit={e=>{e.preventDefault();apply();}} style={drag.style}>
   <ClassicTitle title="Table To Text" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
   <ClassicGroup name="Convert To" box={[12,37,188,90]}>
    <label style={{...at(11,26),display:"flex",alignItems:"center",gap:8}}><input type="radio" value="tabs" name="convertTo" checked={mode==="tabs"} onChange={()=>setMode("tabs")}/>Tabs</label>
    <label style={{...at(11,55),display:"flex",alignItems:"center",gap:8}}><input type="radio" value="paragraph" name="convertTo" checked={mode==="paragraph"} onChange={()=>setMode("paragraph")}/>Paragraph</label>
   </ClassicGroup>
   <button type="submit" style={{...classicButton,...at(223,37,76,23)}}>OK</button>
   <button type="button" onClick={close} style={{...classicButton,...at(223,64,76,23)}}>Cancel</button>
   <button type="button" onClick={()=>setHelp(true)} style={{...classicButton,...at(223,91,76,23)}}>Help</button>
   {help?<p style={{...at(12,133,280,17),fontSize:10}}>Convert the current table to tabs or separate paragraphs.</p>:null}
   {error?<p role="alert" style={{...at(12,133,285,17),color:"#a00000",fontSize:10}}>{error}</p>:null}
  </form>
 </div>,studioOverlayRoot());
}
