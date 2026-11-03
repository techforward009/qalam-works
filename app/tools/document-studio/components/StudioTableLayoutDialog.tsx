"use client";
import {useRef,useState,type KeyboardEvent} from "react";
import type {Editor} from "@tiptap/react";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {TABLE_DIALOG_CHANGE} from "../utils/formattingSafety";
import {CellSelection} from "@tiptap/pm/tables";
import {closeHistory} from "@tiptap/pm/history";
import {tableLayoutCommand,type TableAxis,type TablePlace} from "../utils/tableOperations";
import {InPageWin7DialogFrame,Win7Group,at,win7Button,win7DefaultButton,win7Font} from "./inpage2009DialogChrome";

export function StudioTableLayoutDialog({editor,onClose}:{editor:Editor;onClose:()=>void}) {
 const [axis,setAxis]=useState<TableAxis>("row"),[place,setPlace]=useState<TablePlace>("before"),[help,setHelp]=useState(false),[error,setError]=useState("");
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
 const radioGroup=(ariaLabel:string,groupName:string,values:readonly string[],selectedValue:string,set:(value:string)=>void,top:number)=>(
  <Win7Group ariaLabel={ariaLabel} box={[7,top,160,45]}>
   {values.map((value,i)=><label key={value} style={{...at(9,6+i*18,142,16),display:"flex",gap:6,alignItems:"center",font:win7Font,color:"#000",whiteSpace:"nowrap"}}>
    <input type="radio" name={groupName} value={value} checked={selectedValue===value.toLowerCase()} onChange={()=>set(value)}/>{value}
   </label>)}
  </Win7Group>);
 return (
  <InPageWin7DialogFrame
   title="Table Layout"
   width={282}
   height={168}
   onClose={close}
   onSubmit={e=>{e.preventDefault();apply("insert");}}
   onKeyDown={key}
   dialogDataAttr={{"data-studio-table-layout-dialog":"true"}}
   help={help?"Insert/Delete rows or columns. Select cells to merge or split.":undefined}
   error={error||undefined}
  >
   {radioGroup("Row or Column","Type",["Row","Column"],axis,value=>setAxis(value.toLowerCase() as TableAxis),6)}
   {radioGroup("Before or After","Position",["Before","After"],place,value=>setPlace(value.toLowerCase() as TablePlace),55)}
   <button type="button" style={{...win7Button,...at(175,6,86,21)}} onClick={close}>Cancel</button>
   <button type="button" style={{...win7Button,...at(175,30,86,21)}} onClick={()=>setHelp(h=>!h)}>Help</button>
   <button type="submit" autoFocus style={{...win7DefaultButton,...at(175,54,86,21)}}>Insert</button>
   <button type="button" style={{...win7Button,...at(175,78,86,21)}} onClick={()=>apply("delete")}>Delete</button>
   <button type="button" disabled={!canMerge&&!canSplit} style={{...win7Button,...at(7,107,254,22)}} onClick={()=>apply(canMerge?"merge":"split")}>{canMerge?"Merge Selection":canSplit?"Split Cell":"Merge Selection"}</button>
  </InPageWin7DialogFrame>
 );
}
