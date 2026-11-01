import type {Editor} from "@tiptap/react";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {closeHistory} from "@tiptap/pm/history";
export const MIN_TABLE_COLUMN_PX=64;
export function tableWidths(values:(number|null)[],width:number):number[]{
 const preset=values.every(x=>typeof x==="number"&&x>=MIN_TABLE_COLUMN_PX);
 return preset?values as number[]:values.map(()=>Math.round(width/Math.max(1,values.length)));
}
/** Logical divider index: 0..n-2 for neighbours; -1 for RTL far edge. */
export function resizeTableColumns(values:number[],divider:number,delta:number,min=MIN_TABLE_COLUMN_PX,_dir:"rtl"|"ltr"="ltr"):number[]{
 if(values.length<2)return values;
 const a=divider<0?values.length-2:divider,b=a+1;
 if(a<0||b>=values.length)return values;
 const applied=divider<0?-delta:delta;
 const d=Math.max(min-values[a],Math.min(values[b]-min,applied));
 return values.map((v,i)=>i===a?v+d:i===b?v-d:v);
}

export function installTableColumnResize(editor:Editor):()=>void{
 const root=editor.view.dom;
 type Drag={table:HTMLTableElement;index:number;startX:number;start:number[];rtl:boolean;outer:boolean};
 let drag:Drag|null=null;
 const locate=(event:PointerEvent)=>{
  const element=event.target instanceof Element?event.target:null;
  const cell=element?.closest<HTMLTableCellElement>("td,th");
  const table=cell?.closest<HTMLTableElement>("table.qalam-document-table");
  if(!table||!root.contains(table)||!cell)return null;
  const first=table.rows[0],cells=first?Array.from(first.cells):[];
  if(cells.length<2||cell.cellIndex<0||cell.cellIndex>=cells.length)return null;
  const rtl=getComputedStyle(table).direction==="rtl";
  const rect=cell.getBoundingClientRect(),edge=rtl?rect.left:rect.right;
  const outer=rtl?cell.cellIndex===cells.length-1:cell.cellIndex===0;
  const nearInner=Math.abs(event.clientX-edge)<=6 && cell.cellIndex<cells.length-1;
  const outerEdge=rtl?rect.left:rect.left;
  const nearOuter=outer&&Math.abs(event.clientX-outerEdge)<=6;
  if(!nearInner&&!nearOuter)return null;
  return {table,index:nearInner?cell.cellIndex:-1,rtl,outer:nearOuter&&!nearInner};
 };
 const draw=(table:HTMLTableElement,widths:number[])=>{
   // Reuse the column group owned by TipTap TableView; inserting another
   // colgroup doubles the table width and corrupts the editor's DOM mapping.
   const colgroup=table.querySelector("colgroup");
   if(colgroup)Array.from(colgroup.children).forEach((col,i)=>{
     if(i<widths.length){const style=(col as HTMLElement).style;style.minWidth="";style.width=widths[i]+"px";}
   });
 };
 const initialize=()=>{
  for(const table of Array.from(root.querySelectorAll<HTMLTableElement>("table.qalam-document-table"))){
   const widths=Array.from(table.rows[0]?.cells??[]).map(cell=>Number(cell.getAttribute("colwidth")?.split(",")[0]??0));
   if(widths.length>1&&widths.every(x=>x>=MIN_TABLE_COLUMN_PX))draw(table,widths);
  }
 };
 const move=(e:PointerEvent)=>{
  if(drag){const factor=drag.rtl?-1:1,delta=(e.clientX-drag.startX)*factor;draw(drag.table,resizeTableColumns(drag.start,drag.index,drag.outer?-delta:delta,MIN_TABLE_COLUMN_PX,drag.rtl?'rtl':'ltr'));return;}
  const hit=locate(e);root.style.cursor=hit?"col-resize":"";
 };
 const down=(e:PointerEvent)=>{
  if(e.button!==0)return;
  const hit=locate(e);if(!hit)return;
  e.preventDefault();e.stopPropagation();
  const first=hit.table.rows[0];
  drag={...hit,startX:e.clientX,start:Array.from(first.cells).map(cell=>cell.getBoundingClientRect().width)};
  root.setPointerCapture?.(e.pointerId);
 };
 const up=(e:PointerEvent)=>{
  if(!drag)return;
  const d=drag;drag=null;
  const factor=d.rtl?-1:1,delta=(e.clientX-d.startX)*factor;
  const widths=resizeTableColumns(d.start,d.index,d.outer?-delta:delta,MIN_TABLE_COLUMN_PX,d.rtl?'rtl':'ltr');
  const pos=Math.max(0,editor.view.posAtDOM(d.table,0)-1),node=editor.state.doc.nodeAt(pos);
  if(node?.type.name==="table"){
    editor.view.dispatch(closeHistory(editor.state.tr));
    let tr=editor.state.tr;
    node.forEach((row,rowOffset)=>{row.forEach((cell,cellOffset,index)=>{
      if(index>=widths.length)return;
      const width=Math.round(widths[index]);
      tr=tr.setNodeMarkup(pos+1+rowOffset+1+cellOffset,undefined,{...cell.attrs,colwidth:[width]});
    });});
    tr.setMeta(TABLE_DIALOG_CHANGE,true);
    if(tr.docChanged){editor.view.dispatch(tr);editor.view.dispatch(closeHistory(editor.state.tr));}
  }
  draw(d.table,widths);
  root.style.cursor="";
 };
 const over=()=>queueMicrotask(initialize);
 root.addEventListener("pointermove",move);
 root.addEventListener("pointerdown",down,true);
 root.addEventListener("pointerup",up,true);
 editor.on("update",over);
 initialize();
 return()=>{root.removeEventListener("pointermove",move);root.removeEventListener("pointerdown",down,true);root.removeEventListener("pointerup",up,true);editor.off("update",over);root.style.cursor="";};
}
