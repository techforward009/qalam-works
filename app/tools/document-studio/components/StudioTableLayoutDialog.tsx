"use client";
import {useRef,useState,type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {TABLE_DIALOG_CHANGE} from "../utils/formattingSafety";
import {CellSelection} from "@tiptap/pm/tables";
import {closeHistory} from "@tiptap/pm/history";
import {tableLayoutCommand,type TableAxis,type TablePlace} from "../utils/tableOperations";
import {ClassicTitle,ClassicGroup,at,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";
export function StudioTableLayoutDialog({editor,onClose}:{editor:Editor;onClose:()=>void}) {
 const [axis,setAxis]=useState<TableAxis>("row"),[place,setPlace]=useState<TablePlace>("before"),[help,setHelp]=useState(false),[error,setError]=useState("");
 const drag=useInPage2009Dialog<HTMLFormElement>(380,208,20);
 const bookmark=useRef(editor.state.selection.getBookmark());
 const selected=editor.state.selection;
 const canMerge=selected instanceof CellSelection && selected.ranges.length>1;
 const canSplit=editor.can().splitCell();
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=(action:"insert"|"delete"|"merge"|"split")=>{
   try {
     editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
     editor.view.dispatch(closeHistory(editor.state.tr));
     const ok=action==="merge"?editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).focus().mergeCells().run()
       :action==="split"?editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).focus().splitCell().run()
       :tableLayoutCommand(editor,axis,place,action);
     if(!ok)throw Error("Choose a table cell or a valid selection.");
     editor.view.dispatch(closeHistory(editor.state.tr));
     close();
   } catch(e){setError(e instanceof Error?e.message:"Unable to change table");}
 };
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 const groupLabel=(group:string,values:string[],selected:string,set:(value:string)=>void,x:number)=>(
  <ClassicGroup name={group} box={[x,39,118,96]}>
   {values.map((value,i)=><label key={value} style={{...at(10,24+i*30,101,22),display:"flex",gap:8,alignItems:"center"}}>
    <input type="radio" name={group} value={value} checked={selected===value.toLowerCase()} onChange={()=>set(value)}/>{value}
   </label>)}
  </ClassicGroup>);
 return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onMouseDown={e=>e.stopPropagation()} onKeyDown={key}>
  <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Table Layout" data-inpage2009-dialog="true" data-studio-table-layout-dialog="true" dir="ltr" onSubmit={e=>{e.preventDefault();apply("insert");}} style={drag.style}>
   <ClassicTitle title="Table Layout" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
   {groupLabel("Type",["Row","Column"],axis,value=>setAxis(value.toLowerCase() as TableAxis),12)}
   {groupLabel("Position",["Before","After"],place,value=>setPlace(value.toLowerCase() as TablePlace),139)}
   <button type="submit" style={{...classicButton,...at(276,40,88,23)}}>Insert</button>
   <button type="button" style={{...classicButton,...at(276,69,88,23)}} onClick={()=>apply("delete")}>Delete</button>
   <button type="button" style={{...classicButton,...at(276,98,88,23)}} onClick={close}>Cancel</button>
   <button type="button" style={{...classicButton,...at(276,127,88,23)}} onClick={()=>setHelp(true)}>Help</button>
   <button type="button" disabled={!canMerge&&!canSplit} style={{...classicButton,...at(12,159,352,24)}} onClick={()=>apply(canMerge?"merge":"split")}>{canMerge?"Merge Selection":canSplit?"Split Cell":"Merge Selection"}</button>
   {help?<p style={{...at(12,187,352),fontSize:10}}>Insert/Delete rows or columns. Select cells to merge or split.</p>:null}
   {error?<p role="alert" style={{...at(12,187,352),color:"#b00000",fontSize:10}}>{error}</p>:null}
  </form>
 </div>,studioOverlayRoot());
}
