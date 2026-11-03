"use client";
import {useRef,useState,type KeyboardEvent,type ReactNode} from "react";
import type {Editor} from "@tiptap/react";
import {restoreEditorFocus} from "../utils/restoreEditorFocus";
import {InPageWin7DialogFrame,Win7Group,at,win7Button,win7DefaultButton,win7Field,win7Font} from "./inpage2009DialogChrome";
import {getTableFormat,applyTableFormat,splitTableRow,type TableFormatValues,type TableBorderStyle,type TableAlignment} from "../utils/tableFormat";
import {formatTableLength,parseTableLength,mmToTablePx,tablePxToMm} from "../utils/tableFormatUnits";

const pureColours=[
 ["White","#FFFFFF"],["Black","#000000"],["Gray","#808080"],["Red","#FF0000"],
 ["Yellow","#FFFF00"],["Green","#00FF00"],["Cyan","#00FFFF"],["Blue","#0000FF"],["Magenta","#FF00FF"],
] as const;
const palette:readonly (readonly [string,string])[]=[["None","None"],...pureColours];
const borderPalette:readonly (readonly [string,string])[]=pureColours;
const labelStyle={font:win7Font,color:"#000",whiteSpace:"nowrap" as const};

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
  border:initial.current.borderWidthPt===null?"":initial.current.borderStyle==="none"?"0.5pt":formatTableLength(initial.current.borderWidthPt,"pt"),
 });
 const length=(name:keyof typeof lengths,inputWidth:number)=>(
  <input aria-label={name==="width"?"Column Width":name==="gap"?"Column Gap":name==="indent"?"Table Indent":"Border Width"}
   type="text" inputMode="decimal" onFocus={e=>e.currentTarget.select()} onClick={e=>e.currentTarget.select()} onMouseUp={e=>e.currentTarget.select()} onMouseDown={e=>{e.preventDefault();e.currentTarget.focus();e.currentTarget.select();}} style={{...win7Field,width:inputWidth}} value={lengths[name]} onChange={e=>setLengths(old=>({...old,[name]:e.target.value}))}/>
 );
 const update=<K extends keyof TableFormatValues>(key:K,value:TableFormatValues[K])=>setV(old=>({...old,[key]:value}));
 const close=()=>{onClose();restoreEditorFocus(editor);};
 const apply=()=>{
  try{
   editor.view.dispatch(editor.state.tr.setSelection(bookmark.current.resolve(editor.state.doc)));
   applyTableFormat(editor,{...v,
    borderStyle:!borderStyleEdited&&initial.current.borderStyle==="none"
     ?(v.borderColor!==initial.current.borderColor||parseFloat(lengths.border)!==initial.current.borderWidthPt?"solid":"none")
     :v.borderStyle,
    columnWidthPx:mmToTablePx(parseTableLength(lengths.width,"mm",10,500)),
    columnGapMm:parseTableLength(lengths.gap,"mm",0,20),
    indentMm:parseTableLength(lengths.indent,"mm",0,120),
    borderWidthPt:lengths.border.trim()===""?null:parseTableLength(lengths.border,"pt",.25,8),
   });
   if(splitRequested)splitTableRow(editor);
   close();
  }catch(e){setError(e instanceof Error?e.message:"Table formatting failed.");}
 };
 const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();if(openPicker)setOpenPicker(null);else close();}};
 const field=(text:string,top:number,left:number,width:number,labelMinWidth:number,child:ReactNode)=>(
  <label key={text} style={{...at(left,top,width,18),display:"flex",gap:3,alignItems:"center",...labelStyle}}>
   <span style={{minWidth:labelMinWidth,flexShrink:0}}>{text}:</span>{child}
  </label>
 );
 const select=(name:string,value:string,options:readonly (readonly [string,string])[],change:(value:string)=>void,pickerWidth:number,colours=false)=>{
  const optionsWithLegacy=options.some(o=>o[1].toLowerCase()===value.toLowerCase())||!value
   ?options:[...options,[`Custom ${value}`,value] as const];
  const resolved=optionsWithLegacy.find(o=>o[1].toLowerCase()===value.toLowerCase())?.[1]??value;
  const displayOptions=value===""?[["",""] as const,...optionsWithLegacy]:optionsWithLegacy;
  return <span data-classic-picker={name} style={{position:"relative",display:"inline-flex",width:pickerWidth,height:18}}>
   <select aria-label={name} tabIndex={-1} value={resolved} onChange={e=>{change(e.target.value);setOpenPicker(null);}}
    style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0,pointerEvents:"none"}}>
    {displayOptions.map(([label,code])=><option key={code} value={code}>{label}</option>)}
   </select>
   <button type="button" data-picker-box autoFocus={name==="Fill Color"} aria-label={name==="Fill Color"?"Open fill palette":name==="Border Color"?"Open border palette":name==="Border Style"?"Open line patterns":"Open alignment list"} aria-expanded={openPicker===name}
    onClick={e=>{e.preventDefault();setOpenPicker(old=>old===name?null:name);}}
    style={{...win7Field,width:"100%",height:18,padding:0,display:"flex",alignItems:"center",textAlign:"left",cursor:"default"}}>
    {colours?<span data-picker-swatch aria-hidden style={{flex:"0 0 10px",width:10,height:10,marginLeft:4,marginRight:3,
      border:"1px solid #777",background:value==="None"||!value?"#fff":value}}/>:null}
    {name==="Border Style" && value
     ?<span data-style-line aria-hidden style={{display:"block",marginLeft:4,marginRight:3,width:40,flex:"1 1 auto",
       borderTop:`3px ${value==="dotted"?"dotted":value==="dashed"?"dashed":value==="double"?"double":"solid"} #000`}}/>
     :<span style={{font:win7Font,flex:1,overflow:"hidden",whiteSpace:"nowrap",marginLeft:colours?0:4}}>{optionsWithLegacy.find(o=>o[1].toLowerCase()===value.toLowerCase())?.[0]??value}</span>}
    <span data-picker-arrow aria-hidden style={{display:"grid",placeItems:"center",width:14,height:16,flex:"0 0 14px",
      borderLeft:"1px solid #808080",background:"linear-gradient(#f6f6f6,#dcdcdc)",boxShadow:"inset 1px 1px #fff",
      fontSize:8,color:"#111"}}>▼</span>
   </button>
   {openPicker===name?<div role="listbox" aria-label={name}
    style={{position:"absolute",zIndex:40,top:18,left:0,minWidth:colours?116:98,maxHeight:196,overflowY:"auto",
      background:"#fff",border:"1px solid #666",boxShadow:"2px 2px 3px rgba(0,0,0,0.28)"}}>
    {displayOptions.map(([label,code])=><button key={code} type="button" role="option" aria-selected={value===code}
     onClick={e=>{e.preventDefault();change(code);setOpenPicker(null);}}
     style={{width:"100%",height:19,border:0,padding:"0 4px",background:"#fff",display:"flex",gap:4,alignItems:"center",
       textAlign:"left",font:win7Font,color:"#000",whiteSpace:"nowrap"}}>
     {colours?<span data-option-swatch aria-hidden style={{height:10,width:10,flex:"0 0 10px",border:"1px solid #666",
      background:code==="None"||!code?"#fff":code}}/>:null}
     {name==="Border Style"
      ?<span data-option-line aria-label={label} style={{width:68,
        borderTop:`3px ${code==="dotted"?"dotted":code==="dashed"?"dashed":code==="double"?"double":"solid"} #000`}}/>
      :<span>{label}</span>}
    </button>)}
   </div>:null}
  </span>;
 };
 const changeBorderWidth=(step:number)=>{
  const n=parseFloat(lengths.border);
  const next=Math.max(.25,Math.min(8,Math.round(((Number.isFinite(n)?n:.5)+step)*100)/100));
  setLengths(old=>({...old,border:next+"pt"}));
 };
 return (
  <InPageWin7DialogFrame
   title="Table Format"
   width={352}
   height={182}
   onClose={close}
   onSubmit={e=>{e.preventDefault();apply();}}
   onKeyDown={onKey}
   dialogDataAttr={{"data-studio-table-format-dialog":"true"}}
   help={help?"Changes affect selected cells, columns and table.":undefined}
   error={error||undefined}
  >
   <Win7Group name="Cell" box={[5,8,144,136]}>
    {field("Fill Color",12,6,132,48,select("Fill Color",v.fill??"None",palette,x=>update("fill",x==="None"?null:x),81,true))}
    <Win7Group name="Border" box={[5,39,134,90]}>
     {field("Color",12,6,122,35,select("Border Color",v.borderColor??"",borderPalette,x=>update("borderColor",x),84,true))}
     {field("Style",37,6,122,35,select("Border Style",v.borderStyle==="none"?"solid":v.borderStyle??"",[
      ["━━━━━━━━","solid"],["┄┄┄┄┄","dotted"],["━ ━ ━","dashed"],["══════","double"],
     ],x=>{update("borderStyle",x as TableBorderStyle);setBorderStyleEdited(true);},84))}
     {field("Width",62,6,122,35,<span data-border-width-spinner style={{...win7Field,position:"relative",display:"inline-flex",width:84,height:18,padding:0}}>
      <input aria-label="Border Width" type="text" inputMode="decimal" onFocus={e=>e.currentTarget.select()}
       onClick={e=>e.currentTarget.select()} onMouseUp={e=>e.currentTarget.select()} onMouseDown={e=>{e.preventDefault();e.currentTarget.focus();e.currentTarget.select();}}
       style={{...win7Field,width:"100%",height:16,paddingRight:15,border:0,boxShadow:"none",background:"transparent"}} value={lengths.border}
       onChange={e=>setLengths(old=>({...old,border:e.target.value}))}/>
      <span style={{position:"absolute",top:1,right:0,width:14,height:15,display:"flex",flexDirection:"column",
       borderLeft:"1px solid #808080"}}>
       <button type="button" aria-label="Increase line weight" onClick={()=>changeBorderWidth(.5)}
        style={{height:8,lineHeight:"7px",padding:0,fontSize:7,border:0,borderBottom:"1px solid #999",
         background:"linear-gradient(#f8f8f8,#dcdcdc)",color:"#000"}}>▲</button>
       <button type="button" aria-label="Decrease line weight" onClick={()=>changeBorderWidth(-.5)}
        style={{height:7,lineHeight:"7px",padding:0,fontSize:7,border:0,background:"linear-gradient(#f8f8f8,#dcdcdc)",
         color:"#000"}}>▼</button>
      </span>
     </span>)}
    </Win7Group>
   </Win7Group>
   <Win7Group name="Column" box={[154,8,124,58]}>
    {field("Width",12,6,112,38,length("width",70))}
    {field("Gap",34,6,112,38,length("gap",70))}
   </Win7Group>
   <Win7Group name="Table" box={[154,73,124,71]}>
    {field("Indent",11,6,112,50,length("indent",59))}
    {field("Alignment",32,6,112,50,select("Table Alignment",v.alignment,[["Left","left"],["Centre","center"],["Right","right"]],x=>update("alignment",x as TableAlignment),59))}
    <label style={{...at(6,52,112,15),display:"flex",alignItems:"center",gap:4,...labelStyle}}>
     <input type="checkbox" checked={splitRequested} onChange={e=>setSplitRequested(e.target.checked)}/>Split Table Row
    </label>
   </Win7Group>
   <button type="submit" style={{...win7DefaultButton,...at(283,9,50,20)}}>OK</button>
   <button type="button" onClick={close} style={{...win7Button,...at(283,33,50,20)}}>Cancel</button>
   <button type="button" onClick={()=>setHelp(h=>!h)} style={{...win7Button,...at(283,57,50,20)}}>Help</button>
  </InPageWin7DialogFrame>
 );
}
