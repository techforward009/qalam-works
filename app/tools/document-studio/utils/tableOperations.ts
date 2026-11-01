import type {Editor} from "@tiptap/core";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
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
export function tableLayoutCommand(editor:Editor,axis:TableAxis,place:TablePlace,action:"insert"|"delete"):boolean {
 const command=action==="delete"?(axis==="row"?"deleteRow":"deleteColumn")
   :axis==="row"?(place==="before"?"addRowBefore":"addRowAfter"):(place==="before"?"addColumnBefore":"addColumnAfter");
 return editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).focus()[command]().run();
}
