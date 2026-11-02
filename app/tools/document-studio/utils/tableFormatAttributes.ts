import {Extension} from "@tiptap/core";
import {Plugin,TextSelection} from "@tiptap/pm/state";
import {tableFormatAlignedMargins} from "./tableFormatUnits";

const safeColor=(value:unknown):string|null=>
 typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;
const borderTypes=["none","solid","dotted","dashed","double"] as const;
const safeBorder=(value:unknown)=>borderTypes.includes(value as typeof borderTypes[number])?value:"none";
const numeric=(value:unknown,fallback:number,min:number,max:number)=>{
 const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:fallback;
};
const tableStyles=(attrs:Record<string,unknown>)=>{
 const alignment=attrs.tableAlignment;
 const indent=numeric(attrs.tableIndentMm,0,0,120);
 const width=numeric(attrs.tableFormatWidthPx,0,0,2000);
 const dir=attrs.tableFlow==="ltr"||attrs.dir==="ltr"?"ltr":"rtl";
 const side=(alignment==="left"||alignment==="center"||alignment==="right"?alignment:(dir==="rtl"?"right":"left")) as "left"|"center"|"right";
 const margins=tableFormatAlignedMargins(side,indent);
 const styles=[`margin-left:${margins.marginLeft}`,`margin-right:${margins.marginRight}`];
 if(width>0)styles.push(`width:${width}px`,"max-width:100%");
 else if(indent>0)styles.push(`width:calc(100% - ${indent}mm)`);
 return {style:styles.join(";"),"data-table-alignment":alignment||"","data-table-indent":String(indent),"data-table-flow":dir};
};
export const QalamTableFormatAttributes=Extension.create({
 name:"qalamTableFormatAttributes",
 addProseMirrorPlugins(){
  return [new Plugin({
   view(view){
    const sync=()=>{
     const tables:Record<string,unknown>[]=[];
     view.state.doc.descendants(node=>{
      if(node.type.name==="table")tables.push(node.attrs);
     });
     view.dom.querySelectorAll<HTMLTableElement>("table.qalam-document-table").forEach((table,index)=>{
      const attrs=tables[index];
      if(!attrs)return;
      const alignment=attrs.tableAlignment;
      const dir=attrs.tableFlow==="ltr"?"ltr":attrs.dir==="ltr"?"ltr":"rtl";
      table.dir=dir;
      table.dataset.tableAlignment=typeof alignment==="string"?alignment:"";
      table.dataset.tableFlow=dir;
      const indent=Number(attrs.tableIndentMm)||0;
      table.dataset.tableIndent=String(indent);
      const side=(alignment==="left"||alignment==="center"||alignment==="right"?alignment:(dir==="rtl"?"right":"left")) as "left"|"center"|"right";
      const margins=tableFormatAlignedMargins(side,indent);
      table.style.marginInlineStart="";
      table.style.marginLeft=margins.marginLeft;
      table.style.marginRight=margins.marginRight;
      const width=Number(attrs.tableFormatWidthPx)||0;
      table.style.width=width>0?`${width}px`:indent>0?`calc(100% - ${indent}mm)`:"";
      table.style.maxWidth="100%";
      table.style.borderCollapse="separate";
      table.style.borderSpacing="0";

     });
    };
    // A border-grip pointerdown can suppress the native text-caret move even
    // for a stationary click. Repair the click (never a drag) after the grip
    // finishes, using the actual clicked cell's model position.
    let down:{x:number;y:number;cellFrom:number;cellTo:number;nearGrip:boolean}|null=null;
    const onDown=(event:PointerEvent)=>{
     if(event.button!==0)return;
     const cell=(event.target instanceof Element?event.target:null)?.closest<HTMLTableCellElement>("td,th");
     const table=cell?.closest("table.qalam-document-table");
     if(!cell||!table)return;
     const rtl=getComputedStyle(table).direction==="rtl";
     const nearGrip=Array.from(cell.parentElement?.querySelectorAll<HTMLTableCellElement>("td,th")??[]).some(sibling=>{
      const rect=sibling.getBoundingClientRect();
      return Math.abs(event.clientX-(rtl?rect.left:rect.right))<=8;
     });
     const pos=view.posAtDOM(cell,0);
     const $cell=view.state.doc.resolve(Math.min(pos,view.state.doc.content.size));
     const depth=Array.from({length:$cell.depth+1},(_,i)=>$cell.depth-i).find(d=>["tableCell","tableHeader"].includes($cell.node(d).type.name));
     if(depth===undefined)return;
     down={x:event.clientX,y:event.clientY,cellFrom:$cell.start(depth),cellTo:$cell.end(depth),nearGrip};
    };
    const onUp=(event:PointerEvent)=>{
     const start=down;down=null;
     if(!start||event.button!==0||Math.hypot(event.clientX-start.x,event.clientY-start.y)>3)return;
     // A plain click can leave ProseMirror in the previous RTL column even
     // though the DOM received the click. Never interfere with a real drag.
     if(!start.nearGrip && view.state.selection.from>=start.cellFrom && view.state.selection.from<=start.cellTo)return;
     // The column-resize plugin may replace TD nodes during pointerup. Use
     // the original ProseMirror cell range, not the now-detached DOM node.
     const hit=view.posAtCoords({left:event.clientX,top:event.clientY});
     const target=hit&&hit.pos>=start.cellFrom&&hit.pos<=start.cellTo?hit.pos:start.cellFrom+1;
     const safe=Math.max(0,Math.min(view.state.doc.content.size,target));
     view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(safe))));
     view.focus();
    };
    view.dom.addEventListener("pointerdown",onDown,true);
    view.dom.addEventListener("pointerup",onUp,true);
    sync();return {update:sync,destroy(){
     view.dom.removeEventListener("pointerdown",onDown,true);
     view.dom.removeEventListener("pointerup",onUp,true);
    }};
   }
  })];
 },
 addGlobalAttributes(){return [
  {types:["table"],attributes:{
   tableAlignment:{default:null,parseHTML:el=>el.getAttribute("data-table-alignment")||null,renderHTML:a=>tableStyles(a)},
   tableIndentMm:{default:0,parseHTML:el=>numeric(el.getAttribute("data-table-indent"),0,0,120)},
   tableFormatWidthPx:{default:null,parseHTML:el=>numeric(el.getAttribute("data-table-width"),0,0,2000),renderHTML:a=>a.tableFormatWidthPx?{"data-table-width":a.tableFormatWidthPx}:{}},
   tableFlow:{default:null,parseHTML:el=>el.getAttribute("data-table-flow")||null,renderHTML:a=>a.tableFlow?{"data-table-flow":a.tableFlow}:{}},
  }},
  {types:["tableCell","tableHeader"],attributes:{
   tableFill:{default:null,parseHTML:el=>safeColor(el.getAttribute("data-table-fill")),renderHTML:a=>a.tableFill?{"data-table-fill":a.tableFill,style:`background-color:${safeColor(a.tableFill)??"transparent"}`}:{}},
   tableBorderColor:{default:"#000000",parseHTML:el=>safeColor(el.getAttribute("data-table-border-color"))??"#000000",renderHTML:a=>({"data-table-border-color":safeColor(a.tableBorderColor)??"#000000"})},
   tableBorderStyle:{default:"none",parseHTML:el=>safeBorder(el.getAttribute("data-table-border-style")),renderHTML:a=>{
    const borderStyle=safeBorder(a.tableBorderStyle);
    const borderColor=safeColor(a.tableBorderColor)??"#000000";
    const borderWidth=numeric(a.tableBorderWidthPt,.5,.25,8);
    // none means no authored print style; the visible grid still resolves solid.
    // Keep its colour and width tied to saved cell attrs, so colour-only
    // Table Format changes repaint default-width cells immediately.
    const resolvedStyle=borderStyle==="none"?"solid":borderStyle;
    return {"data-table-border-style":borderStyle,style:"border:"+borderWidth+"pt "+resolvedStyle+" "+borderColor};
   }},
   tableBorderWidthPt:{default:.5,parseHTML:el=>numeric(el.getAttribute("data-table-border-width"),.5,.25,8),renderHTML:a=>({"data-table-border-width":numeric(a.tableBorderWidthPt,.5,.25,8)})},
   tableGapMm:{default:1.41,parseHTML:el=>numeric(el.getAttribute("data-table-gap"),1.41,0,20),renderHTML:a=>({"data-table-gap":numeric(a.tableGapMm,1.41,0,20),style:`padding-inline-end:${numeric(a.tableGapMm,1.41,0,20)}mm`})},
  }},
 ];},
});
