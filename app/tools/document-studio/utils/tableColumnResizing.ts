import {Extension} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import {Plugin} from "@tiptap/pm/state";
import type {EditorView} from "@tiptap/pm/view";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {TABLE_MIN_COL_WIDTH,tableResizeColumnLine} from "./tableOperations";

type Handle={table:HTMLTableElement;lineIndex:number;rtl:boolean;initialIndentMm:number};
function getHandle(view:EditorView,event:PointerEvent):Handle|null {
  const element=event.target instanceof Element?event.target:null;
  let table=element?.closest<HTMLTableElement>("table.qalam-document-table");
  if(!table){
    const tables=Array.from(view.dom.querySelectorAll<HTMLTableElement>("table.qalam-document-table"));
    table=tables.find(t=>{
      const b=t.getBoundingClientRect();
      return event.clientX>=b.left-8&&event.clientX<=b.right+8&&
             event.clientY>=b.top-2&&event.clientY<=b.bottom+2;
    }) ?? null;
  }
  if(!table)return null;
  const box=table.getBoundingClientRect();
  if(event.clientX<box.left-8||event.clientX>box.right+8||
     event.clientY<box.top-2||event.clientY>box.bottom+2)return null;
  const row=Array.from(table.rows).find(r=>{
    const rect=r.getBoundingClientRect();
    return event.clientY>=rect.top&&event.clientY<=rect.bottom;
  }) ?? table.rows[0];
  const cells=Array.from(row?.cells||[]);
  if(cells.length===0)return null;
  const rtl=getComputedStyle(table).direction==="rtl";
  const pos=tablePosition(view,table),node=pos===null?null:view.state.doc.nodeAt(pos);
  const initialIndentMm=Number(node?.attrs?.tableIndentMm)||0;
  // In RTL:
  // line 0: outer right line of cell 0 (rect.right)
  // line 1: boundary between cell 0 and cell 1 (cell 0 rect.left / cell 1 rect.right)
  // ...
  // line n: outer left line of cell n-1 (rect.left)
  if(rtl){
    const firstRect=cells[0].getBoundingClientRect();
    if(Math.abs(event.clientX-firstRect.right)<=8){
      return {table,lineIndex:0,rtl,initialIndentMm};
    }
    for(let index=0;index<cells.length;index++){
      const rect=cells[index].getBoundingClientRect();
      if(Math.abs(event.clientX-rect.left)<=8){
        return {table,lineIndex:index+1,rtl,initialIndentMm};
      }
    }
  }else{
    const firstRect=cells[0].getBoundingClientRect();
    if(Math.abs(event.clientX-firstRect.left)<=8){
      return {table,lineIndex:0,rtl,initialIndentMm};
    }
    for(let index=0;index<cells.length;index++){
      const rect=cells[index].getBoundingClientRect();
      if(Math.abs(event.clientX-rect.right)<=8){
        return {table,lineIndex:index+1,rtl,initialIndentMm};
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
function updateWidths(view:EditorView,table:HTMLTableElement,widths:number[],newIndentMm?:number) {
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
 const tableAttrs:Record<string,unknown>={...node.attrs,tableFormatWidthPx:total};
 if(typeof newIndentMm==="number")tableAttrs.tableIndentMm=Math.round(newIndentMm*1000)/1000;
 tr.setNodeMarkup(pos,undefined,tableAttrs);
 if(tr.docChanged){view.dispatch(closeHistory(tr.setMeta(TABLE_DIALOG_CHANGE,true)));view.dispatch(closeHistory(view.state.tr));}
}
export const QalamTableColumnResizing=Extension.create({
 name:"qalamTableColumnResizing",
 addProseMirrorPlugins(){
   return [new Plugin({
     view(view){
       let drag:{handle:Handle;startX:number;widths:number[];preview:number[];previewIndentMm:number}|null=null;
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
         // line 0: outer right line. Moving right (clientX - startX > 0) widens col 0 and decreases right indent.
         // Moving left (clientX - startX < 0) narrows col 0 and increases right indent.
         // Inner lines & outer left line keep indent unchanged.
         const pxPerMm=96/25.4;
         let delta=0;
         let newIndentMm=handle.initialIndentMm;
         if(handle.rtl){
           if(handle.lineIndex===0){
             delta=event.clientX-startX;
             const newW0=Math.max(TABLE_MIN_COL_WIDTH,widths[0]+delta);
             const actualChange=newW0-widths[0];
             newIndentMm=Math.max(0,handle.initialIndentMm-actualChange/pxPerMm);
             delta=actualChange;
           }else{
             delta=-(event.clientX-startX);
           }
         }else{
           if(handle.lineIndex===0){
             delta=-(event.clientX-startX);
             const newW0=Math.max(TABLE_MIN_COL_WIDTH,widths[0]+delta);
             const actualChange=newW0-widths[0];
             newIndentMm=Math.max(0,handle.initialIndentMm-actualChange/pxPerMm);
             delta=actualChange;
           }else{
             delta=event.clientX-startX;
           }
         }
         drag.preview=tableResizeColumnLine(widths,handle.lineIndex,delta);
         drag.previewIndentMm=newIndentMm;
         const cols=handle.table.querySelectorAll<HTMLTableColElement>("colgroup col");
         drag.preview.forEach((w,i)=>{if(cols[i])cols[i].style.width=Math.round(w)+"px";});
         if(handle.lineIndex===0){
           if(handle.rtl)handle.table.style.marginRight=`${newIndentMm}mm`;
           else handle.table.style.marginLeft=`${newIndentMm}mm`;
         }
         const total=drag.preview.reduce((a,b)=>a+b,0);
         handle.table.style.width=`${Math.round(total)}px`;
         handle.table.style.minWidth=`${Math.round(total)}px`;
         event.preventDefault();
       };
       const finish=()=>{
         if(!drag)return;
         const {handle,preview,previewIndentMm}=drag;
         drag=null;
         document.removeEventListener("pointermove",move,true);
         document.removeEventListener("pointerup",finish,true);
         document.removeEventListener("pointercancel",finish,true);
         setHover(null);

         updateWidths(view,handle.table,preview,handle.lineIndex===0?previewIndentMm:undefined);
       };
       const onMove=(event:PointerEvent)=>{if(!drag)setHover(getHandle(view,event)?.table??null);};
       const onDown=(event:PointerEvent)=>{
         if(event.button!==0)return;
         const handle=getHandle(view,event);if(!handle)return;
         const widths=geometry(handle.table);
         if(widths.length<2)return;
         drag={handle,startX:event.clientX,widths,preview:widths,previewIndentMm:handle.initialIndentMm};

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
