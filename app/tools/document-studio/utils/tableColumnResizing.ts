import {Extension} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import {Plugin} from "@tiptap/pm/state";
import type {EditorView} from "@tiptap/pm/view";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {TABLE_MIN_COL_WIDTH,tableResizeColumnLine} from "./tableOperations";

type Handle={table:HTMLTableElement;lineIndex:number;rtl:boolean};
function getHandle(event:PointerEvent):Handle|null {
  const element=event.target instanceof Element?event.target:null;
  // At a collapsed border the browser may hit a TR or the neighbouring cell
  // rather than the TD owning that edge. Detect by physical coordinates.
  const table=element?.closest<HTMLTableElement>("table.qalam-document-table");
  if(!table)return null;
  const box=table.getBoundingClientRect();
  if(event.clientX<box.left-8||event.clientX>box.right+8||
     event.clientY<box.top||event.clientY>box.bottom)return null;
  const row=Array.from(table.rows).find(r=>{
    const rect=r.getBoundingClientRect();
    return event.clientY>=rect.top&&event.clientY<=rect.bottom;
  }) ?? table.rows[0];
  const cells=Array.from(row?.cells||[]);
  if(cells.length===0)return null;
  const rtl=getComputedStyle(table).direction==="rtl";
  // In RTL:
  // line 0: outer right line of cell 0 (rect.right)
  // line 1: boundary between cell 0 and cell 1 (cell 0 rect.left / cell 1 rect.right)
  // ...
  // line n: outer left line of cell n-1 (rect.left)
  // In LTR:
  // line 0: outer left line of cell 0 (rect.left)
  // line 1: boundary between cell 0 and cell 1 (cell 0 rect.right / cell 1 rect.left)
  // ...
  // line n: outer right line of cell n-1 (rect.right)
  if(rtl){
    // line 0: outer right
    const firstRect=cells[0].getBoundingClientRect();
    if(Math.abs(event.clientX-firstRect.right)<=8){
      return {table,lineIndex:0,rtl};
    }
    // line 1..n: left edges of cells 0..n-1
    for(let index=0;index<cells.length;index++){
      const rect=cells[index].getBoundingClientRect();
      if(Math.abs(event.clientX-rect.left)<=8){
        return {table,lineIndex:index+1,rtl};
      }
    }
  }else{
    // line 0: outer left
    const firstRect=cells[0].getBoundingClientRect();
    if(Math.abs(event.clientX-firstRect.left)<=8){
      return {table,lineIndex:0,rtl};
    }
    // line 1..n: right edges of cells 0..n-1
    for(let index=0;index<cells.length;index++){
      const rect=cells[index].getBoundingClientRect();
      if(Math.abs(event.clientX-rect.right)<=8){
        return {table,lineIndex:index+1,rtl};
      }
    }
  }
  return null;
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
 const total=widths.reduce((sum,w)=>sum+Math.round(w),0);
 tr.setNodeMarkup(pos,undefined,{...node.attrs,tableFormatWidthPx:total});
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
         if(hover&&hover!==table){hover.style.cursor="";delete hover.dataset.tableResizeHover;}
         hover=table;
         if(table){table.dataset.tableResizeHover="true";table.style.cursor="col-resize";}
       };
       const move=(event:PointerEvent)=>{
         if(!drag)return;
         const {handle,startX,widths}=drag;
         // In RTL:
         // line 0 is outer right line: moving right (clientX - startX > 0) widens col 0 -> raw = event.clientX - startX
         // line 1..n-1 are inner lines: moving left (clientX - startX < 0) widens left of line (col i-1) -> raw = (event.clientX - startX) * -1
         // line n is outer left line: moving left (clientX - startX < 0) widens col n-1 -> raw = (event.clientX - startX) * -1
         // In LTR:
         // line 0 is outer left line: moving left (clientX - startX < 0) widens col 0 -> raw = -(event.clientX - startX)
         // line 1..n: moving right (clientX - startX > 0) widens col i-1 / col n-1 -> raw = event.clientX - startX
         const delta=handle.rtl
          ?(handle.lineIndex===0?(event.clientX-startX):-(event.clientX-startX))
          :(handle.lineIndex===0?-(event.clientX-startX):(event.clientX-startX));
         drag.preview=tableResizeColumnLine(widths,handle.lineIndex,delta);
         const cols=handle.table.querySelectorAll<HTMLTableColElement>("colgroup col");
         drag.preview.forEach((w,i)=>{if(cols[i])cols[i].style.width=Math.round(w)+"px";});
         event.preventDefault();
       };
       const finish=()=>{
         if(!drag)return;
         const {handle,preview}=drag;
         drag=null;
         document.removeEventListener("pointermove",move,true);
         document.removeEventListener("pointerup",finish,true);
         document.removeEventListener("pointercancel",finish,true);
         setHover(null);

         updateWidths(view,handle.table,preview);
       };
       const onMove=(event:PointerEvent)=>{if(!drag)setHover(getHandle(event)?.table??null);};
       const onDown=(event:PointerEvent)=>{
         if(event.button!==0)return;
         const handle=getHandle(event);if(!handle)return;
         const widths=geometry(handle.table);
         if(widths.length<2)return;
         drag={handle,startX:event.clientX,widths,preview:widths};

         setHover(handle.table);
         document.addEventListener("pointermove",move,true);
         document.addEventListener("pointerup",finish,true);
         document.addEventListener("pointercancel",finish,true);
         event.preventDefault();
       };
       view.dom.addEventListener("pointermove",onMove,true);
       view.dom.addEventListener("pointerdown",onDown,true);
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
         view.dom.removeEventListener("pointermove",onMove,true);
         view.dom.removeEventListener("pointerdown",onDown,true);
         document.removeEventListener("pointermove",move,true);
         document.removeEventListener("pointerup",finish,true);
         document.removeEventListener("pointercancel",finish,true);
         setHover(null);
       }};
     }
   })];
 }
});
