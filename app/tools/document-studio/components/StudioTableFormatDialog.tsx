"use client";
import {useRef,useState,type KeyboardEvent,type ReactNode} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {ClassicTitle,ClassicGroup,at,classicButton,classicField,classicFont,useInPage2009Dialog} from "./inpage2009DialogChrome";
import {getTableFormat,applyTableFormat,splitTableRow,type TableFormatValues,type TableBorderStyle,type TableAlignment} from "../utils/tableFormat";

const palette=[
 ["None","None"],["Black","#000000"],["White","#ffffff"],["Yellow","#ffe082"],["Light Green","#a5d6a7"],["Light Blue","#90caf9"],
 ["Red","#ef9a9a"],["Orange","#ffcc80"],["Purple","#ce93d8"],["Grey","#bdbdbd"],
] as const;
const borderPalette:readonly (readonly [string,string])[]=[["Black","#000000"],["Red","#990000"],["Blue","#1d4ed8"],["Green","#166534"],["Grey","#777777"]];
const labelStyle={font:classicFont,color:"#000",whiteSpace:"nowrap" as const};
const inputStyle={...classicField,font:classicFont,height:22};
export function StudioTableFormatDialog({editor,onClose}:{editor:Editor;onClose:()=>void}){
 const initial=useRef<TableFormatValues>(getTableFormat(editor));
 const bookmark=useRef(editor.state.selection.getBookmark());
 const [v,setV]=useState<TableFormatValues>(initial.current),[error,setError]=useState(""),[help,setHelp]=useState(false);
 const drag=useInPage2009Dialog<HTMLFormElement>(530,352,18);
 const update=<K extends keyof TableFormatValues>(key:K,value:TableFormatValues[K])=>setV(old=>({...old,[key]:value}));
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=()=>{
  try{
   editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
   applyTableFormat(editor,v);
   close();
  }catch(e){setError(e instanceof Error?e.message:"Table formatting failed.");}
 };
 const split=()=>{
  try {
   editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
   if(!splitTableRow(editor))throw Error("Position the caret inside a row.");
   close();
  }catch(e){setError(e instanceof Error?e.message:"Cannot split row.");}
 };
 const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 const field=(text:string,top:number,left:number,width:number,child:ReactNode)=><label key={text} style={{...at(left,top,width,23),display:"flex",gap:4,alignItems:"center",...labelStyle}}><span style={{minWidth:75}}>{text}</span>{child}</label>;
 const number=(name:string,value:number,change:(n:number)=>void,step:number,max:number)=>(
  <input aria-label={name} style={{...inputStyle,width:72}} type="number" min={0} max={max} step="any" value={Number.isNaN(value)?"":value} onChange={e=>change(Number(e.target.value))}/>
 );
 const select=(name:string,value:string,options:readonly (readonly [string,string])[],change:(value:string)=>void)=>(
  <select aria-label={name} autoFocus={name==="Fill Color"} style={{...inputStyle,width:93}} value={value} onChange={e=>change(e.target.value)}>
   {options.map(([label,code])=><option key={code} value={code}>{label}</option>)}
  </select>
 );
 return createPortal(
  <div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onPointerDown={e=>e.stopPropagation()} onKeyDown={onKey}>
   <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Table Format" data-inpage2009-dialog="true" data-studio-table-format-dialog="true" dir="ltr"
     style={drag.style} onSubmit={e=>{e.preventDefault();apply();}}>
    <ClassicTitle title="Table Format" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
    <ClassicGroup name="Cell" box={[11,37,255,160]}>
     {field("Fill Color",17,8,235,select("Fill Color",v.fill??"None",palette,x=>update("fill",x==="None"?null:x)))}
     <div style={{...at(9,50),...labelStyle,fontWeight:"bold"}}>Border</div>
     {field("Color",66,8,235,select("Border Color",v.borderColor,borderPalette,x=>update("borderColor",x)))}
     {field("Style",94,8,235,select("Border Style",v.borderStyle,[["None","none"],["Solid","solid"],["Dotted","dotted"],["Dashed","dashed"],["Double","double"]],x=>update("borderStyle",x as TableBorderStyle)))}
     {field("Width",122,8,235,number("Border Width",v.borderWidthPt,n=>update("borderWidthPt",n),.25,8))}
    </ClassicGroup>
    <ClassicGroup name="Column" box={[275,37,243,100]}>
     {field("Width",17,8,227,number("Column Width",v.columnWidthPx,n=>update("columnWidthPx",n),1,2000))}
     {field("Gap",49,8,227,number("Column Gap",v.columnGapMm,n=>update("columnGapMm",n),.01,20))}
    </ClassicGroup>
    <ClassicGroup name="Table" box={[275,145,243,104]}>
     {field("Indent",16,8,226,number("Table Indent",v.indentMm,n=>update("indentMm",n),.1,120))}
     {field("Alignment",49,8,226,select("Table Alignment",v.alignment,[["Left","left"],["Centre","center"],["Right","right"]],x=>update("alignment",x as TableAlignment)))}
    </ClassicGroup>
    <ClassicGroup name="Flow" box={[11,206,255,58]}>
     {(["rtl","ltr"] as const).map((flow,i)=><label key={flow} style={{...at(14+i*118,21,105,23),...labelStyle,display:"flex",gap:7,alignItems:"center"}}>
       <input type="radio" name="tableFlow" checked={v.flow===flow} value={flow} onChange={()=>update("flow",flow)}/>{flow==="rtl"?"Right to Left":"Left to Right"}
      </label>)}
    </ClassicGroup>
    <button type="button" onClick={split} style={{...classicButton,...at(275,260,243,27)}}>Split Table Row</button>
    <button type="submit" style={{...classicButton,...at(232,304,88,25)}}>OK</button>
    <button type="button" onClick={close} style={{...classicButton,...at(327,304,88,25)}}>Cancel</button>
    <button type="button" onClick={()=>setHelp(true)} style={{...classicButton,...at(422,304,88,25)}}>Help</button>
    {help?<p style={{...at(11,285,210),fontSize:10}}>Changes affect selected cells, columns and table.</p>:null}
    {error?<p role="alert" style={{...at(11,331,500),color:"#b00000",fontSize:10}}>{error}</p>:null}
   </form>
  </div>,studioOverlayRoot()
 );
}
