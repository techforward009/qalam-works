"use client";
import {useEffect,useRef,useState,type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import {CellSelection} from "@tiptap/pm/tables";
import {closeHistory} from "@tiptap/pm/history";
import {TABLE_DIALOG_CHANGE} from "../utils/formattingSafety";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {ClassicTitle,ClassicGroup,at,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";

export function StudioTableLayoutDialog({editor,onClose}:{editor:Editor;onClose:()=>void}){
 const [axis,setAxis]=useState<"row"|"column">("row"),[position,setPosition]=useState<"before"|"after">("before"),[help,setHelp]=useState(false),[error,setError]=useState("");
 const drag=useInPage2009Dialog<HTMLFormElement>(335,209,20);
 const bookmark=useRef(editor.state.selection.getBookmark());
 const selection=editor.state.selection;
 const merge=selection instanceof CellSelection && selection.ranges.length>1;
 const split=editor.can().splitCell();
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=(action:"insert"|"delete"|"merge"|"split")=>{
  try{
   // Restore the original table caret/cell selection after dialog button focus.
   editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
   editor.view.dispatch(closeHistory(editor.state.tr));
   const cmd=editor.chain().focus().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;});
   const done=action==="merge"?cmd.mergeCells().run():action==="split"?cmd.splitCell().run():
    action==="delete"?(axis==="row"?cmd.deleteRow().run():cmd.deleteColumn().run()):
    axis==="row"?(position==="before"?cmd.addRowBefore().run():cmd.addRowAfter().run()):
    position==="before"?cmd.addColumnBefore().run():cmd.addColumnAfter().run();
   if(!done)throw new Error("This table operation is unavailable.");
   editor.view.dispatch(closeHistory(editor.state.tr));
   close();
  }catch(e){setError(e instanceof Error?e.message:"Cannot change table.");}
 };
 useEffect(()=>{drag.dialogRef.current?.querySelector<HTMLInputElement>('input[name="table-axis"]')?.focus();},[]);
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 return createPortal(<div className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" data-studio-dialog="en" onKeyDown={key} onMouseDown={e=>e.stopPropagation()}>
 <form role="dialog" aria-modal="true" aria-label="Table Layout" ref={drag.dialogRef} data-inpage2009-dialog="true" dir="ltr" style={drag.style} onSubmit={e=>{e.preventDefault();apply("insert");}}>
  <ClassicTitle title="Table Layout" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
  <ClassicGroup name="Direction" box={[11,36,190,78]}>
   <label style={{...at(11,27),display:"flex",gap:5}}><input type="radio" name="table-axis" checked={axis==="row"} onChange={()=>setAxis("row")}/>Row</label>
   <label style={{...at(100,27),display:"flex",gap:5}}><input type="radio" name="table-axis" checked={axis==="column"} onChange={()=>setAxis("column")}/>Column</label>
  </ClassicGroup>
  <ClassicGroup name="Position" box={[11,119,190,67]}>
   <label style={{...at(11,27),display:"flex",gap:5}}><input type="radio" name="table-position" checked={position==="before"} onChange={()=>setPosition("before")}/>Before</label>
   <label style={{...at(100,27),display:"flex",gap:5}}><input type="radio" name="table-position" checked={position==="after"} onChange={()=>setPosition("after")}/>After</label>
  </ClassicGroup>
  <button type="submit" style={{...classicButton,...at(227,37,96,22)}}>Insert</button>
  <button type="button" onClick={()=>apply("delete")} style={{...classicButton,...at(227,64,96,22)}}>Delete</button>
  <button type="button" onClick={close} style={{...classicButton,...at(227,91,96,22)}}>Cancel</button>
  <button type="button" onClick={()=>setHelp(true)} style={{...classicButton,...at(227,118,96,22)}}>Help</button>
  <button type="button" disabled={!merge&&!split} onClick={()=>apply(merge?"merge":"split")} style={{...classicButton,...at(227,149,96,27),opacity:merge||split?1:.45}}>{merge?"Merge Selection":"Split Cell"}</button>
  {error?<p role="alert" style={{...at(10,190,310),color:"#b00000",fontSize:11}}>{error}</p>:null}
  {help?<p style={{...at(10,190,310),fontSize:11}}>Insert or delete rows and columns. Select cells to merge.</p>:null}
 </form></div>,studioOverlayRoot());
}
