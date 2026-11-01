import {Extension} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import {Plugin} from "@tiptap/pm/state";
import type {EditorView} from "@tiptap/pm/view";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {TABLE_MIN_COL_WIDTH,tableResizePair} from "./tableOperations";

type Handle={table:HTMLTableElement;index:number;outer:boolean;rtl:boolean};
const cellFrom=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLTableCellElement>("td,th"):null;
function getHandle(event:MouseEvent):Handle|null {
 const cell=cellFrom(event.target),table=cell?.closest<HTMLTableElement>("table.qalam-document-table");
 if(!cell||!table)return null;
 const row=cell.parentElement,entries=Array.from(row?.children||[]).filter((e):e is HTMLTableCellElement=>e instanceof HTMLTableCellElement);
 if(entries.length<2)return null;
 const rtl=getComputedStyle(table).direction==="rtl",index=entries.indexOf(cell);
 if(index<0)return null;
 const box=cell.getBoundingClientRect(),inside=rtl?box.left:box.right;
 if(Math.abs(event.clientX-inside)>7)return null;
 return {table,index,outer:index===entries.length-1,rtl};
}
function geometry(table:HTMLTableElement) {
 return Array.from(table.rows[0]?.cells||[]).map(cell=>cell.getBoundingClientRect().width);
}
function tablePosition(view:EditorView,table:HTMLTableElement):number|null {
 const p=view.posAtDOM(table,0),$pos=view.state.doc.resolve(Math.min(p,view.state.doc.content.size));
 for(let depth=$pos.depth;depth>=0;depth--)if($pos.node(depth).type.name==="table")return $pos.before(depth);
 if(view.state.doc.nodeAt(p)?.type.name==="table")return p;
 return null;
}
function updateWidths(view:EditorView,table:HTMLTableElement,widths:number[]) {
 const pos=tablePosition(view,table),node=pos===null?null:view.state.doc.nodeAt(pos);
 if(pos===null||!node||node.type.name!=="table")return;
 const tr=view.state.tr;
 node.forEach((row,rowOffset)=>{
   let col=0;
   row.forEach((cell,cellOffset)=>{
     const colspan=Number(cell.attrs.colspan)||1;
     const attrs={...cell.attrs,colwidth:widths.slice(col,col+colspan).map(w=>Math.round(w))};
     const at=pos+2+rowOffset+cellOffset;
     if(cell.type.name==="tableCell"||cell.type.name==="tableHeader")tr.setNodeMarkup(at,undefined,attrs);
     col+=colspan;
   });
 });
 if(tr.docChanged){view.dispatch(closeHistory(tr.setMeta(TABLE_DIALOG_CHANGE,true)));view.dispatch(closeHistory(view.state.tr));}
}
export const QalamTableColumnResizing=Extension.create({
 name:"qalamTableColumnResizing",
 addProseMirrorPlugins(){
   return [new Plugin({
     view(view){
       let drag:{handle:Handle;startX:number;widths:number[];preview:number[]}|null=null;
       let hover:HTMLTableElement|null=null;
       const setHover=(table:HTMLTableElement|null)=>{
         if(hover&&hover!==table)hover.style.cursor="";
         hover=table;
         if(table)table.style.cursor="col-resize";
       };
       const move=(event:MouseEvent)=>{
         if(!drag)return;
         const {handle,startX,widths}=drag;
         const raw=(event.clientX-startX)*(handle.rtl?-1:1);
         drag.preview=handle.outer
          ?tableResizePair(widths,widths.length-2,-raw)
          :tableResizePair(widths,handle.index,raw);
         const cols=handle.table.querySelectorAll<HTMLTableColElement>("colgroup col");
         drag.preview.forEach((w,i)=>{if(cols[i])cols[i].style.width=Math.round(w)+"px";});
         event.preventDefault();
       };
       const finish=()=>{
         if(!drag)return;
         const {handle,preview}=drag;
         drag=null;
         document.removeEventListener("mousemove",move,true);
         document.removeEventListener("mouseup",finish,true);
         setHover(null);
         updateWidths(view,handle.table,preview);
       };
       const onMove=(event:MouseEvent)=>{if(!drag)setHover(getHandle(event)?.table??null);};
       const onDown=(event:MouseEvent)=>{
         if(event.button!==0)return;
         const handle=getHandle(event);if(!handle)return;
         const widths=geometry(handle.table);
         if(widths.length<2)return;
         drag={handle,startX:event.clientX,widths,preview:widths};
         setHover(handle.table);
         document.addEventListener("mousemove",move,true);
         document.addEventListener("mouseup",finish,true);
         event.preventDefault();
       };
       view.dom.addEventListener("mousemove",onMove);
       view.dom.addEventListener("mousedown",onDown,true);
       return {update(){
         if(drag)return;
         view.dom.querySelectorAll<HTMLTableElement>("table.qalam-document-table").forEach(table=>{
           const pos=tablePosition(view,table),node=pos===null?null:view.state.doc.nodeAt(pos);
           const row=node?.type.name==="table"?node.firstChild:null;
           if(!row)return;
           const widths:number[]=[];
           row.forEach(cell=>{
             const colspan=Number(cell.attrs.colspan)||1;
             for(let i=0;i<colspan;i++)widths.push(cell.attrs.colwidth?.[i]||0);
           });
           table.querySelectorAll<HTMLTableColElement>("colgroup col").forEach((col,i)=>{
             const expected=widths[i]?Math.round(widths[i])+"px":"";
             if(col.style.width!==expected)col.style.width=expected;
           });
           if(widths.every(w=>!w)){table.style.width="";table.style.minWidth="";}
         });
       },destroy(){
         view.dom.removeEventListener("mousemove",onMove);
         view.dom.removeEventListener("mousedown",onDown,true);
         document.removeEventListener("mousemove",move,true);
         document.removeEventListener("mouseup",finish,true);
         setHover(null);
       }};
     }
   })];
 }
});
