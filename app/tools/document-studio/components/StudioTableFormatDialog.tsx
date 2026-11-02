"use client";
import {useRef,useState,type KeyboardEvent,type ReactNode} from "react";
import {createPortal} from "react-dom";
import type {Editor} from "@tiptap/react";
import {studioOverlayRoot} from "../utils/inpageToolbar";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {ClassicTitle,ClassicGroup,at,classicButton,classicField,classicFont,useInPage2009Dialog} from "./inpage2009DialogChrome";
import {getTableFormat,applyTableFormat,splitTableRow,type TableFormatValues,type TableBorderStyle,type TableAlignment} from "../utils/tableFormat";
import {formatTableLength,parseTableLength,mmToTablePx,tablePxToMm} from "../utils/tableFormatUnits";

const palette=[
 ["None","None"],["Black","#000000"],["White","#ffffff"],["Yellow","#ffe082"],["Light Green","#a5d6a7"],["Light Blue","#90caf9"],
 ["Red","#ef9a9a"],["Magenta","#ff00ff"],["Orange","#ffcc80"],["Purple","#ce93d8"],["Gray","#bdbdbd"],
] as const;
const borderPalette:readonly (readonly [string,string])[]=[["Black","#000000"],["Gray","#777777"],["Red","#990000"],["Magenta","#ff00ff"],["Blue","#1d4ed8"],["Green","#166534"]];
const labelStyle={font:classicFont,color:"#000",whiteSpace:"nowrap" as const};
const inputStyle={...classicField,font:classicFont,height:22};
export function StudioTableFormatDialog({editor,onClose}:{editor:Editor;onClose:()=>void}){
 const initial=useRef<TableFormatValues>(getTableFormat(editor));
 const bookmark=useRef(editor.state.selection.getBookmark());
 const [v,setV]=useState<TableFormatValues>(initial.current),[error,setError]=useState(""),[help,setHelp]=useState(false);
 const [splitRequested,setSplitRequested]=useState(false),[borderStyleEdited,setBorderStyleEdited]=useState(false);
 const [openPicker,setOpenPicker]=useState<string|null>(null);
 const [lengths,setLengths]=useState({
  width:formatTableLength(tablePxToMm(initial.current.columnWidthPx),"mm"),
  gap:formatTableLength(initial.current.columnGapMm,"mm"),
  indent:formatTableLength(initial.current.indentMm,"mm"),
  border:initial.current.borderStyle==="none"?"0.5pt":formatTableLength(initial.current.borderWidthPt,"pt"),
 });
 const length=(name:keyof typeof lengths)=>(
  <input aria-label={name==="width"?"Column Width":name==="gap"?"Column Gap":name==="indent"?"Table Indent":"Border Width"}
   type="text" inputMode="decimal" onFocus={e=>e.currentTarget.select()} onClick={e=>e.currentTarget.select()} onMouseUp={e=>e.currentTarget.select()} onMouseDown={e=>{e.preventDefault();e.currentTarget.focus();e.currentTarget.select();}} style={{...inputStyle,width:82}} value={lengths[name]} onChange={e=>setLengths(old=>({...old,[name]:e.target.value}))}/>
 );
 const drag=useInPage2009Dialog<HTMLFormElement>(505,282,18);
 const update=<K extends keyof TableFormatValues>(key:K,value:TableFormatValues[K])=>setV(old=>({...old,[key]:value}));
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=()=>{
  try{
   editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
   applyTableFormat(editor,{...v,
    borderStyle:!borderStyleEdited&&initial.current.borderStyle==="none"?"none":v.borderStyle,
    columnWidthPx:mmToTablePx(parseTableLength(lengths.width,"mm",10,500)),
    columnGapMm:parseTableLength(lengths.gap,"mm",0,20),
    indentMm:parseTableLength(lengths.indent,"mm",0,120),
    borderWidthPt:parseTableLength(lengths.border,"pt",.25,8),
   });
   if(splitRequested)splitTableRow(editor);
   close();
  }catch(e){setError(e instanceof Error?e.message:"Table formatting failed.");}
 };
 const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();close();}};
 const field=(text:string,top:number,left:number,width:number,child:ReactNode)=><label key={text} style={{...at(left,top,width,23),display:"flex",gap:4,alignItems:"center",...labelStyle}}><span style={{minWidth:width<170?55:73}}>{text}:</span>{child}</label>;
 const select=(name:string,value:string,options:readonly (readonly [string,string])[],change:(value:string)=>void,colours=false)=>(
  <span data-classic-picker={name} style={{position:"relative",display:"inline-flex",width:colours?100:90,height:22}}>
   <select aria-label={name} tabIndex={-1} value={value} onChange={e=>{change(e.target.value);setOpenPicker(null);}}
    style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,pointerEvents:"none"}}>
    {options.map(([label,code])=><option key={code} value={code}>{label}</option>)}
   </select>
   <button type="button" data-picker-box autoFocus={name==="Fill Color"} aria-label={name==="Fill Color"?"Open fill palette":name==="Border Color"?"Open border palette":name==="Border Style"?"Open line patterns":"Open alignment list"} aria-expanded={openPicker===name}
    onClick={e=>{e.preventDefault();setOpenPicker(old=>old===name?null:name);}}
    style={{...inputStyle,width:"100%",padding:0,display:"flex",alignItems:"center",textAlign:"left",border:"1px solid #7a7a7a",borderRadius:0,
     background:"#fff",color:"#000",boxShadow:"inset 1px 1px #fff",cursor:"default"}}>
    {colours?<span data-picker-swatch aria-hidden style={{flex:"0 0 11px",width:11,height:11,marginLeft:5,marginRight:4,
      border:"1px solid #777",background:value==="None"?"#fff":value}}/>:null}
    {name==="Border Style"
     ?<span data-style-line aria-hidden style={{display:"block",marginLeft:5,width:49,flex:"1 1 auto",
       borderTop:`3px ${value==="dotted"?"dotted":value==="dashed"?"dashed":value==="double"?"double":"solid"} #000`}}/>
     :<span style={{font:classicFont,fontSize:11,flex:1,overflow:"hidden",whiteSpace:"nowrap",marginLeft:colours?0:5}}>{options.find(o=>o[1]===value)?.[0]??value}</span>}
    <span data-picker-arrow aria-hidden style={{display:"grid",placeItems:"center",width:18,height:20,flex:"0 0 18px",
      borderLeft:"1px solid #777",background:"linear-gradient(#fafafa,#d6d6d6)",boxShadow:"inset 1px 1px #fff",
      fontSize:9,color:"#111"}}>▼</span>
   </button>
   {openPicker===name?<div role="listbox" aria-label={name}
    style={{position:"absolute",zIndex:40,top:22,left:0,minWidth:colours?124:110,maxHeight:180,overflowY:"auto",
      background:"#fff",border:"1px solid #666",boxShadow:"2px 2px 2px #999"}}>
    {options.map(([label,code])=><button key={code} type="button" role="option" aria-selected={value===code}
     onClick={e=>{e.preventDefault();change(code);setOpenPicker(null);}}
     style={{width:"100%",height:22,border:0,padding:"0 5px",background:"#fff",display:"flex",gap:5,alignItems:"center",
       textAlign:"left",font:classicFont,color:"#000",whiteSpace:"nowrap"}}>
     {colours?<span data-option-swatch aria-hidden style={{height:11,width:11,flex:"0 0 11px",border:"1px solid #666",
      background:code==="None"?"#fff":code}}/>:null}
     {name==="Border Style"
      ?<span data-option-line aria-label={label} style={{width:75,
        borderTop:`3px ${code==="dotted"?"dotted":code==="dashed"?"dashed":code==="double"?"double":"solid"} #000`}}/>
      :<span>{label}</span>}
    </button>)}
   </div>:null}
  </span>
 );
 const changeBorderWidth=(step:number)=>{
  const n=parseFloat(lengths.border);
  const next=Math.max(.25,Math.min(8,Math.round(((Number.isFinite(n)?n:.5)+step)*100)/100));
  setLengths(old=>({...old,border:next+"pt"}));
 };
 return createPortal(
  <div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onPointerDown={e=>e.stopPropagation()} onKeyDown={onKey}>
   <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Table Format" data-inpage2009-dialog="true" data-studio-table-format-dialog="true" dir="ltr"
     style={drag.style} onSubmit={e=>{e.preventDefault();apply();}}>
    <style>{`
      [data-studio-table-format-dialog] button[aria-label="Title bar help"]{display:none}
      [data-studio-table-format-dialog] [data-picker-box]:focus-visible{outline:1px dotted #333;outline-offset:-3px}
      [data-studio-table-format-dialog] [role=option]:hover{background:#e4e4e4!important}
    `}</style>
    <ClassicTitle hideHelp title="Table Format" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
    <ClassicGroup name="Cell" box={[11,37,226,205]}>
     {field("Fill Color",18,8,209,select("Fill Color",v.fill??"None",palette,x=>update("fill",x==="None"?null:x),true))}
     <ClassicGroup name="Border" box={[8,60,210,137]}>
      {field("Color",19,8,195,select("Border Color",v.borderColor,borderPalette,x=>update("borderColor",x),true))}
      {field("Style",54,8,195,select("Border Style",v.borderStyle==="none"?"solid":v.borderStyle,[
       ["━━━━━━━━","solid"],["┄┄┄┄┄","dotted"],["━ ━ ━","dashed"],["══════","double"],
      ],x=>{update("borderStyle",x as TableBorderStyle);setBorderStyleEdited(true);}))}
      {field("Width",88,8,195,<span data-border-width-spinner style={{position:"relative",display:"inline-flex",width:95,height:22,
        border:"1px solid #777",background:"#fff"}}>
       <input aria-label="Border Width" type="text" inputMode="decimal" onFocus={e=>e.currentTarget.select()}
        onClick={e=>e.currentTarget.select()} style={{...inputStyle,width:"100%",height:20,
         paddingRight:19,border:0,boxShadow:"none"}} value={lengths.border}
        onChange={e=>setLengths(old=>({...old,border:e.target.value}))}/>
       <span style={{position:"absolute",top:0,right:0,width:17,height:20,display:"flex",flexDirection:"column",
        borderLeft:"1px solid #888"}}>
        <button type="button" aria-label="Increase line weight" onClick={()=>changeBorderWidth(.5)}
         style={{height:10,lineHeight:"9px",padding:0,fontSize:8,border:0,borderBottom:"1px solid #aaa",
          background:"linear-gradient(#fff,#ddd)",color:"#000"}}>▲</button>
        <button type="button" aria-label="Decrease line weight" onClick={()=>changeBorderWidth(-.5)}
         style={{height:10,lineHeight:"9px",padding:0,fontSize:8,border:0,background:"linear-gradient(#fff,#ddd)",
          color:"#000"}}>▼</button>
       </span>
      </span>)}
     </ClassicGroup>
    </ClassicGroup>
    <ClassicGroup name="Column" box={[246,37,164,88]}>
     {field("Width",17,8,151,length("width"))}
     {field("Gap",49,8,151,length("gap"))}
    </ClassicGroup>
    <ClassicGroup name="Table" box={[246,135,164,107]}>
     {field("Indent",16,8,151,length("indent"))}
     {field("Alignment",44,8,151,select("Table Alignment",v.alignment,[["Left","left"],["Centre","center"],["Right","right"]],x=>update("alignment",x as TableAlignment)))}
     <label style={{...at(10,77,148,21),display:"flex",alignItems:"center",gap:5,...labelStyle}}>
      <input type="checkbox" checked={splitRequested} onChange={e=>setSplitRequested(e.target.checked)}/>Split Table Row
     </label>
    </ClassicGroup>
    <button type="submit" style={{...classicButton,...at(421,40,73,24)}}>OK</button>
    <button type="button" onClick={close} style={{...classicButton,...at(421,72,73,24)}}>Cancel</button>
    <button type="button" onClick={()=>setHelp(h=>!h)} style={{...classicButton,...at(421,104,73,24)}}>Help</button>
    {help?<p style={{...at(247,250,240),fontSize:10}}>Changes affect selected cells, columns and table.</p>:null}
    {error?<p role="alert" style={{...at(11,257,480),color:"#b00000",fontSize:10}}>{error}</p>:null}
   </form>
  </div>,studioOverlayRoot()
 );
}
