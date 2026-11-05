import type {Editor} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import type {Transaction} from "@tiptap/pm/state";
import {TableMap,addColumnAfter,addColumnBefore,deleteColumn,isInTable,selectedRect} from "@tiptap/pm/tables";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {TABLE_PX_PER_MM} from "./tableFormatUnits";
export type TableAxis="row"|"column";
export type TablePlace="before"|"after";
export const TABLE_MIN_COL_WIDTH=64;
export function tableContextMode(inTable:boolean,selectionOutside:boolean):"table"|"text" {
 return inTable&&!selectionOutside?"table":"text";
}
export function normalizeTableWidths(widths:number[],total:number):number[] {
 const sum=widths.reduce((a,b)=>a+b,0)||1;
 const values=widths.map(w=>Math.round(w/sum*total));
 if(values.length)values[values.length-1]+=Math.round(total)-values.reduce((a,b)=>a+b,0);
 return values;
}
export function tableResizePair(widths:number[],boundary:number,delta:number,min=TABLE_MIN_COL_WIDTH):number[] {
 if(boundary<0||boundary>=widths.length-1)return widths;
 const result=[...widths],allowed=Math.max(min-widths[boundary],Math.min(widths[boundary+1]-min,delta));
 result[boundary]+=allowed;result[boundary+1]-=allowed;
 return result;
}
export function tableResizeColumnLine(widths:number[],lineIndex:number,delta:number,min=TABLE_MIN_COL_WIDTH):number[] {
 const n=widths.length;
 if(n<1)return widths;
 if(lineIndex===0){
  // Outer line for column 0 (e.g. outer right in RTL, outer left in LTR)
  const result=[...widths];
  result[0]=Math.max(min,widths[0]+delta);
  return result;
 }
 if(lineIndex===n){
  // Outer line for column n-1 (e.g. outer left in RTL, outer right in LTR)
  const result=[...widths];
  result[n-1]=Math.max(min,widths[n-1]+delta);
  return result;
 }
 if(lineIndex>=1&&lineIndex<n){
  // Inner line between column lineIndex - 1 and column lineIndex
  return tableResizePair(widths,lineIndex-1,delta,min);
 }
 return widths;
}
function measureExistingColumnWidths(editor:Editor,rect:ReturnType<typeof selectedRect>):number[] {
 const tablePos=rect.tableStart-1;
 const directDom=editor.view.nodeDOM(tablePos) as HTMLElement|null;
 const firstCellDom=rect.map.map.length>0?(editor.view.nodeDOM(rect.tableStart+rect.map.map[0]) as HTMLElement|null):null;
 const domTable=(directDom?.tagName==="TABLE"?directDom as HTMLTableElement:directDom?.querySelector("table"))??firstCellDom?.closest("table")??null;
 const zoomScale=domTable&&domTable.offsetWidth>0?(domTable.getBoundingClientRect().width/domTable.offsetWidth||1):1;
 const domWidths=new Array<number>(rect.map.width).fill(0);
 if(domTable?.rows[0]){
  let col=0;
  for(const td of Array.from(domTable.rows[0].cells)){
   const span=Math.max(1,td.colSpan||1);
   const each=(td.getBoundingClientRect().width/zoomScale)/span;
   for(let k=0;k<span&&col+k<domWidths.length;k++)domWidths[col+k]=each;
   col+=span;
  }
 }
 const explicitTotal=Number(rect.table.attrs.tableFormatWidthPx)||0;
 const widths=new Array<number>(rect.map.width).fill(0);
 for(let c=0;c<rect.map.width;c++){
  for(let r=0;r<rect.map.height;r++){
   const rel=rect.map.map[r*rect.map.width+c];
   const cellRect=rect.map.findCell(rel);
   const cellNode=rect.table.nodeAt(rel);
   const saved=Number((cellNode?.attrs?.colwidth as number[]|null)?.[c-cellRect.left])||0;
   if(saved>0){widths[c]=saved;break;}
  }
  if(widths[c]<=0&&domWidths[c]>0)widths[c]=domWidths[c];
  if(widths[c]<=0&&explicitTotal>0)widths[c]=explicitTotal/rect.map.width;
 }
 return widths;
}
export function tableLayoutCommand(editor:Editor,axis:TableAxis,place:TablePlace,action:"insert"|"delete"):boolean {
 if(axis==="row"){
  const command=action==="delete"?"deleteRow":place==="before"?"addRowBefore":"addRowAfter";
  return editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).focus()[command]().run();
 }
 if(!isInTable(editor.state))return false;
 const rect=selectedRect(editor.state);
 const tablePos=rect.tableStart-1;
 const oldWidths=measureExistingColumnWidths(editor,rect);
 const pmCommand=action==="delete"?deleteColumn:place==="before"?addColumnBefore:addColumnAfter;
 let nextTr:Transaction|null=null;
 const ok=pmCommand(editor.state,tr=>{nextTr=tr;});
 if(!ok||!nextTr)return false;
 const tr:Transaction=nextTr;
 const updatedTable=tr.doc.nodeAt(tablePos);
 if(updatedTable&&updatedTable.type.name==="table"){
  const tableDir=updatedTable.attrs.tableFlow==="ltr"||updatedTable.attrs.dir==="ltr"?"ltr":"rtl";
  if(action==="insert"){
   const insertAt=place==="before"?rect.left:rect.right;
   const newMap=TableMap.get(updatedTable);
   const visited=new Set<number>();
   for(let r=0;r<newMap.height;r++){
    const rel=newMap.map[r*newMap.width+insertAt];
    if(visited.has(rel))continue;
    visited.add(rel);
    const cellNode=updatedTable.nodeAt(rel);
    const firstPara=cellNode?.firstChild;
    if(cellNode&&firstPara?.type.name==="paragraph"&&!firstPara.attrs.dir){
     tr.setNodeMarkup(tablePos+2+rel,undefined,{...firstPara.attrs,dir:tableDir});
    }
   }
  }
  if(oldWidths.some(w=>w>0)){
   const positive=oldWidths.filter(w=>w>0);
   const fallback=positive.reduce((a,b)=>a+b,0)/positive.length;
   const resolvedOld=oldWidths.map(w=>w>0?w:fallback);
   let newWidths:number[];
   if(action==="delete"){
    newWidths=resolvedOld.filter((_,idx)=>idx<rect.left||idx>=rect.right);
   }else{
    const insertAt=place==="before"?rect.left:rect.right;
    const refIdx=place==="before"?rect.left:Math.max(0,rect.right-1);
    const insertedWidth=resolvedOld[refIdx]??fallback;
    const desired=[...resolvedOld.slice(0,insertAt),insertedWidth,...resolvedOld.slice(insertAt)];
    const desiredTotal=desired.reduce((a,b)=>a+b,0);
    let availablePx=0;
    const pmDom=editor.view.dom;
    if(pmDom&&pmDom.clientWidth>0){
     const cs=getComputedStyle(pmDom);
     const pad=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
     const indentPx=(Number(updatedTable.attrs.tableIndentMm)||0)*TABLE_PX_PER_MM;
     availablePx=Math.max(0,pmDom.clientWidth-pad-indentPx);
    }
    newWidths=availablePx>0&&desiredTotal>availablePx+.5
     ?normalizeTableWidths(desired,Math.floor(availablePx))
     :desired;
   }
   const tableAfterDir=tr.doc.nodeAt(tablePos);
   if(tableAfterDir&&tableAfterDir.type.name==="table"&&newWidths.length>0){
    const newMap=TableMap.get(tableAfterDir);
    const seen=new Set<number>();
    for(const rel of newMap.map){
     if(seen.has(rel))continue;
     seen.add(rel);
     const cellRect=newMap.findCell(rel);
     const cellNode=tableAfterDir.nodeAt(rel);
     if(cellNode&&(cellNode.type.name==="tableCell"||cellNode.type.name==="tableHeader")){
      const slice=newWidths.slice(cellRect.left,cellRect.right).map(w=>Math.round(w));
      tr.setNodeMarkup(tablePos+1+rel,undefined,{...cellNode.attrs,colwidth:slice});
     }
    }
    const finalTable=tr.doc.nodeAt(tablePos)!;
    const totalPx=newWidths.reduce((a,b)=>a+Math.round(b),0);
    const alignment=finalTable.attrs.tableAlignment||(tableDir==="rtl"?"right":"left");
    tr.setNodeMarkup(tablePos,undefined,{...finalTable.attrs,tableFormatWidthPx:totalPx,tableAlignment:alignment});
   }
  }
 }
 editor.view.dispatch(closeHistory(editor.state.tr));
 editor.view.dispatch(tr.setMeta(TABLE_DIALOG_CHANGE,true));
 editor.view.dispatch(closeHistory(editor.state.tr));
 editor.view.focus();
 return true;
}
