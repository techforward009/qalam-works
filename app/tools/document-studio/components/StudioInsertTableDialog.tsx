"use client";
import {useEffect,useState,type KeyboardEvent} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import type {RulerUnit} from "../utils/documentView";
import {createTableContent,parseTableColumnWidth} from "../utils/tableConversions";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {TABLE_DIALOG_CHANGE} from "../utils/formattingSafety";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {ClassicTitle,ClassicSpinner,at,classicField,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";

export function StudioInsertTableDialog({editor,unit,onClose}:{editor:Editor;unit:RulerUnit;onClose:()=>void}) {
 const [rows,setRows]=useState("1"),[columns,setColumns]=useState("2"),[width,setWidth]=useState("Auto"),[error,setError]=useState(""),[help,setHelp]=useState(false);
 const drag=useInPage2009Dialog<HTMLFormElement>(320,163,20);
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=()=>{
   try {
     const r=Number(rows),c=Number(columns),px=parseTableColumnWidth(width,unit);
     const direction=editor.state.selection.$from.parent.attrs.dir === "ltr" || editor.view.dom.getAttribute("dir") === "ltr" ? "ltr" : "rtl";
     const table=createTableContent(r,c,px,direction);
     if (!editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).focus().insertContent(table).run()) throw new Error("Unable to insert table.");
     close();
   }catch(e){setError(e instanceof Error?e.message:"Invalid table dimensions");}
 };
 useEffect(()=>{drag.dialogRef.current?.querySelector<HTMLInputElement>('[aria-label="Rows"]')?.focus();},[]);
 const key=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={key} onMouseDown={e=>e.stopPropagation()}>
  <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Insert Table" data-studio-insert-table-dialog="true" data-inpage2009-dialog="true" dir="ltr" onSubmit={e=>{e.preventDefault();apply();}} style={drag.style}>
   <ClassicTitle title="Insert Table" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
   <label style={at(12,40)}>Rows:</label><ClassicSpinner label="Rows" box={[100,37,92,20]} value={rows} onChange={setRows} min={1} max={100}/>
   <label style={at(12,67)}>Columns:</label><ClassicSpinner label="Columns" box={[100,64,92,20]} value={columns} onChange={setColumns} min={1} max={50}/>
   <label style={at(12,94)}>Column Width:</label>
   <input aria-label="Column Width" value={width} onChange={e=>setWidth(e.target.value)} style={{...classicField,...at(100,91,92,20)}} placeholder={`Auto or ${unit}`}/>
   <button type="submit" style={{...classicButton,...at(229,37,78,23)}}>OK</button>
   <button type="button" onClick={close} style={{...classicButton,...at(229,64,78,23)}}>Cancel</button>
   <button type="button" onClick={()=>setHelp(true)} style={{...classicButton,...at(229,91,78,23)}}>Help</button>
   {help?<p style={{...at(9,120,298,31),fontSize:11}}>Auto divides the printable width equally. Width accepts cm, in, mm, pt or px.</p>:null}
   {error?<p role="alert" style={{...at(9,126,302),color:"#b00000",fontSize:11}}>{error}</p>:null}
  </form>
 </div>,studioOverlayRoot());
}
