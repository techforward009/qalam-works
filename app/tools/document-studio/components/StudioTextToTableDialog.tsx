"use client";
import {useEffect,useRef,useState,type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {convertSelectionToTable,type TextTableMode} from "../utils/tableConversions";
import {ClassicTitle,ClassicGroup,at,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";

export function StudioTextToTableDialog({editor,onClose}:{editor:Editor;onClose:()=>void}) {
 const [mode,setMode]=useState<TextTableMode>("tabs"),[error,setError]=useState(""),[help,setHelp]=useState(false);
 const drag=useInPage2009Dialog<HTMLFormElement>(312,155,20);
 const selection=useRef({from:editor.state.selection.from,to:editor.state.selection.to,fragment:editor.state.selection.content().content});
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=()=>{
  try{
   const {from,to,fragment}=selection.current;
   if(from===to)throw new Error("Select text first.");
   const content=convertSelectionToTable(fragment,mode);
   if(!editor.chain().focus().insertContentAt({from,to},content,{updateSelection:true}).run())throw new Error("Cannot convert this selection.");
   close();
  }catch(e){setError(e instanceof Error?e.message:"Cannot convert text.");}
 };
 useEffect(()=>{drag.dialogRef.current?.querySelector<HTMLInputElement>('[value="tabs"]')?.focus();},[]);
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={key} onMouseDown={e=>e.stopPropagation()}>
  <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Text To Table" data-studio-text-to-table-dialog="true" data-inpage2009-dialog="true" dir="ltr" onSubmit={e=>{e.preventDefault();apply();}} style={drag.style}>
   <ClassicTitle title="Text To Table" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
   <ClassicGroup name="Convert From" box={[12,37,188,90]}>
     <label style={{...at(11,26),display:"flex",alignItems:"center",gap:8}}><input type="radio" value="tabs" name="convertFrom" checked={mode==="tabs"} onChange={()=>setMode("tabs")}/>Tabs</label>
     <label style={{...at(11,55),display:"flex",alignItems:"center",gap:8}}><input type="radio" value="paragraph" name="convertFrom" checked={mode==="paragraph"} onChange={()=>setMode("paragraph")}/>Paragraph</label>
   </ClassicGroup>
   <button type="submit" style={{...classicButton,...at(223,37,76,23)}}>OK</button>
   <button type="button" onClick={close} style={{...classicButton,...at(223,64,76,23)}}>Cancel</button>
   <button type="button" onClick={()=>setHelp(true)} style={{...classicButton,...at(223,91,76,23)}}>Help</button>
   {help?<p style={{...at(12,128,287),fontSize:11}}>Tabs separate columns. Paragraph creates one column.</p>:null}
   {error?<p role="alert" style={{...at(12,128,287),color:"#b00000",fontSize:11}}>{error}</p>:null}
  </form>
 </div>,studioOverlayRoot());
}
