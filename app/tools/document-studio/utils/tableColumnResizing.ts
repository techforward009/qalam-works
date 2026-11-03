import {Extension} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import {Plugin} from "@tiptap/pm/state";
import type {EditorView} from "@tiptap/pm/view";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {TABLE_MIN_COL_WIDTH,tableResizeColumnLine} from "./tableOperations";
import {TABLE_PX_PER_MM,tableFormatAlignedMargins} from "./tableFormatUnits";

type Handle={table:HTMLTableElement;lineIndex:number;rtl:boolean};

function findTable(event:PointerEvent):HTMLTableElement|null {
  const element=event.target instanceof Element?event.target:null;
  const table=element?.closest<HTMLTableElement>("table.qalam-document-table");
  if(table)return table;
  const root=(element?.getRootNode() as Document|ShadowRoot|undefined)??document;
  const tables=Array.from(root.querySelectorAll<HTMLTableElement>("table.qalam-document-table"));
  for(const t of tables){
    const box=t.getBoundingClientRect();
    if(event.clientX>=box.left-12&&event.clientX<=box.right+12&&
       event.clientY>=box.top-4&&event.clientY<=box.bottom+4){
      return t;
    }
  }
  return null;
}

export const TABLE_RESIZE_HIT_PX=5;

export function getHandle(event:PointerEvent):Handle|null {
  const table=findTable(event);
  if(!table)return null;
  const box=table.getBoundingClientRect();
  if(event.clientX<box.left-12||event.clientX>box.right+12||
     event.clientY<box.top-4||event.clientY>box.bottom+4)return null;
  const row=Array.from(table.rows).find(r=>{
    const rect=r.getBoundingClientRect();
    return event.clientY>=rect.top&&event.clientY<=rect.bottom;
  }) ?? table.rows[0];
  const cells=Array.from(row?.cells||[]);
  if(cells.length===0)return null;
  const rtl=getComputedStyle(table).direction==="rtl";
  if(rtl){
    // line 0: outer right
    const firstRect=cells[0].getBoundingClientRect();
    if(Math.abs(event.clientX-firstRect.right)<=TABLE_RESIZE_HIT_PX){
      return {table,lineIndex:0,rtl};
    }
    // line 1..n-1: left edges of cells 0..n-2
    for(let index=0;index<cells.length-1;index++){
      const rect=cells[index].getBoundingClientRect();
      if(Math.abs(event.clientX-rect.left)<=TABLE_RESIZE_HIT_PX){
        return {table,lineIndex:index+1,rtl};
      }
    }
    // line n: outer left
    const lastRect=cells[cells.length-1].getBoundingClientRect();
    if(Math.abs(event.clientX-lastRect.left)<=TABLE_RESIZE_HIT_PX){
      return {table,lineIndex:cells.length,rtl};
    }
  }else{
    // line 0: outer left
    const firstRect=cells[0].getBoundingClientRect();
    if(Math.abs(event.clientX-firstRect.left)<=TABLE_RESIZE_HIT_PX){
      return {table,lineIndex:0,rtl};
    }
    // line 1..n-1: right edges of cells 0..n-2
    for(let index=0;index<cells.length-1;index++){
      const rect=cells[index].getBoundingClientRect();
      if(Math.abs(event.clientX-rect.right)<=TABLE_RESIZE_HIT_PX){
        return {table,lineIndex:index+1,rtl};
      }
    }
    // line n: outer right
    const lastRect=cells[cells.length-1].getBoundingClientRect();
    if(Math.abs(event.clientX-lastRect.right)<=TABLE_RESIZE_HIT_PX){
      return {table,lineIndex:cells.length,rtl};
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
function updateWidths(view:EditorView,table:HTMLTableElement,widths:number[],indentMm?:number) {
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
 const newAttrs:Record<string,unknown>={...node.attrs,tableFormatWidthPx:total};
 if(indentMm!==undefined){
   newAttrs.tableIndentMm=Math.round(indentMm*100)/100;
 }
 tr.setNodeMarkup(pos,undefined,newAttrs);
 if(tr.docChanged){view.dispatch(closeHistory(tr.setMeta(TABLE_DIALOG_CHANGE,true)));view.dispatch(closeHistory(view.state.tr));}
}
export const QalamTableColumnResizing=Extension.create({
 name:"qalamTableColumnResizing",
 addProseMirrorPlugins(){
   return [new Plugin({
     view(view){
       let drag:{handle:Handle;startX:number;widths:number[];preview:number[];startIndentMm:number;startTotalWidth:number;previewIndentMm:number;moved:boolean}|null=null;
       let hover:HTMLTableElement|null=null;
       const setHover=(table:HTMLTableElement|null)=>{
         if(hover&&hover!==table){hover.style.cursor="";delete hover.dataset.tableResizeHover;}
         hover=table;
         if(table){
           table.dataset.tableResizeHover="true";table.style.cursor="col-resize";
           view.dom.dataset.tableResizeHover="true";view.dom.style.cursor="col-resize";
         }else{
           view.dom.style.cursor="";delete view.dom.dataset.tableResizeHover;
         }
       };
       const move=(event:PointerEvent)=>{
         if(!drag)return;
         const {handle,startX,widths,startIndentMm,startTotalWidth}=drag;
         const rawDelta=event.clientX-startX;
         if(!drag.moved&&Math.abs(rawDelta)<2)return;
         drag.moved=true;
         document.body.style.cursor="col-resize";
         let delta=0;
         let previewIndentMm=startIndentMm;

         if(handle.rtl){
           if(handle.lineIndex===0){
             // Dragging outer right line in RTL: moving left (rawDelta < 0) narrows col 0
             delta=rawDelta;
             drag.preview=tableResizeColumnLine(widths,0,delta);
             const diff=drag.preview[0]-widths[0];
             const newTotal=startTotalWidth+diff;
             previewIndentMm=Math.max(0,startIndentMm+(-diff)/TABLE_PX_PER_MM);
             drag.previewIndentMm=previewIndentMm;
             handle.table.style.width=Math.round(newTotal)+"px";
             handle.table.style.marginRight=(previewIndentMm*TABLE_PX_PER_MM)+"px";
           }else if(handle.lineIndex===widths.length){
             // Dragging outer left line in RTL: moving left (rawDelta < 0) widens col n-1
             delta=-rawDelta;
             drag.preview=tableResizeColumnLine(widths,handle.lineIndex,delta);
             const diff=drag.preview[widths.length-1]-widths[widths.length-1];
             const newTotal=startTotalWidth+diff;
             handle.table.style.width=Math.round(newTotal)+"px";
           }else{
             // Dragging inner line in RTL
             delta=-rawDelta;
             drag.preview=tableResizeColumnLine(widths,handle.lineIndex,delta);
           }
         }else{
           if(handle.lineIndex===0){
             // Dragging outer left line in LTR: moving right (rawDelta > 0) narrows col 0
             delta=-rawDelta;
             drag.preview=tableResizeColumnLine(widths,0,delta);
             const diff=drag.preview[0]-widths[0];
             const newTotal=startTotalWidth+diff;
             previewIndentMm=Math.max(0,startIndentMm+(-diff)/TABLE_PX_PER_MM);
             drag.previewIndentMm=previewIndentMm;
             handle.table.style.width=Math.round(newTotal)+"px";
             handle.table.style.marginLeft=(previewIndentMm*TABLE_PX_PER_MM)+"px";
           }else if(handle.lineIndex===widths.length){
             // Dragging outer right line in LTR: moving right (rawDelta > 0) widens col n-1
             delta=rawDelta;
             drag.preview=tableResizeColumnLine(widths,handle.lineIndex,delta);
             const diff=drag.preview[widths.length-1]-widths[widths.length-1];
             const newTotal=startTotalWidth+diff;
             handle.table.style.width=Math.round(newTotal)+"px";
           }else{
             // Dragging inner line in LTR
             delta=rawDelta;
             drag.preview=tableResizeColumnLine(widths,handle.lineIndex,delta);
           }
         }

         const cols=handle.table.querySelectorAll<HTMLTableColElement>("colgroup col");
         drag.preview.forEach((w,i)=>{if(cols[i])cols[i].style.width=Math.round(w)+"px";});
         event.preventDefault();
       };
       const finish=()=>{
         if(!drag)return;
         const {handle,preview,previewIndentMm,moved}=drag;
         drag=null;
         document.body.style.cursor="";
         document.removeEventListener("pointermove",move,true);
         document.removeEventListener("pointerup",finish,true);
         document.removeEventListener("pointercancel",finish,true);
         setHover(null);

         if(moved)updateWidths(view,handle.table,preview,previewIndentMm);
       };
       const onMove=(event:PointerEvent)=>{if(!drag)setHover(getHandle(event)?.table??null);};
       const onLeave=()=>{if(!drag)setHover(null);};
       const onDown=(event:PointerEvent)=>{
         if(event.button!==0)return;
         const handle=getHandle(event);if(!handle)return;
         const widths=geometry(handle.table);
         if(widths.length<1)return;
         const pos=tablePosition(view,handle.table);
         const node=pos===null?null:view.state.doc.nodeAt(pos);
         const startIndentMm=Number(node?.attrs?.tableIndentMm)||0;
         const startTotalWidth=widths.reduce((sum,w)=>sum+w,0);
         drag={handle,startX:event.clientX,widths,preview:widths,startIndentMm,startTotalWidth,previewIndentMm:startIndentMm,moved:false};

         setHover(handle.table);
         document.addEventListener("pointermove",move,true);
         document.addEventListener("pointerup",finish,true);
         document.addEventListener("pointercancel",finish,true);
         event.preventDefault();
       };
       view.dom.addEventListener("pointermove",onMove,true);
       view.dom.addEventListener("pointerleave",onLeave,true);
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
           else if(node?.attrs){
             const width=Number(node.attrs.tableFormatWidthPx)||0;
             if(width>0)table.style.width=`${width}px`;
             const indent=Number(node.attrs.tableIndentMm)||0;
             const dir=node.attrs.tableFlow==="ltr"?"ltr":node.attrs.dir==="ltr"?"ltr":"rtl";
             const alignment=node.attrs.tableAlignment;
             const side=(alignment==="left"||alignment==="center"||alignment==="right"?alignment:(dir==="rtl"?"right":"left")) as "left"|"center"|"right";
             const margins=tableFormatAlignedMargins(side,indent);
             table.style.marginLeft=margins.marginLeft;
             table.style.marginRight=margins.marginRight;
           }
         });
       },destroy(){
         view.dom.removeEventListener("pointermove",onMove,true);
         view.dom.removeEventListener("pointerleave",onLeave,true);
         view.dom.removeEventListener("pointerdown",onDown,true);
         document.removeEventListener("pointermove",move,true);
         document.removeEventListener("pointerup",finish,true);
         document.removeEventListener("pointercancel",finish,true);
         document.body.style.cursor="";
         setHover(null);
       }};
     }
   })];
 }
});
