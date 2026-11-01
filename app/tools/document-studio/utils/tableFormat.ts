import type {Editor} from "@tiptap/core";
import {CellSelection} from "@tiptap/pm/tables";
import {closeHistory} from "@tiptap/pm/history";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {mmToTablePx} from "./tableFormatUnits";

export type TableBorderStyle="none"|"solid"|"dotted"|"dashed"|"double";
export type TableAlignment="left"|"center"|"right";
export interface TableFormatValues {
 fill:string|null;
 borderColor:string;
 borderStyle:TableBorderStyle;
 borderWidthPt:number;
 columnWidthPx:number;
 columnGapMm:number;
 indentMm:number;
 alignment:TableAlignment;
 flow:"rtl"|"ltr";
}
const clamp=(value:number,min:number,max:number)=>{
 if(!Number.isFinite(value)||value<min||value>max)throw Error(`Value must be between ${min} and ${max}.`);
 return value;
};
const safeHex=(value:string|null)=>{
 if(value===null)return null;
 if(!/^#[0-9a-f]{6}$/i.test(value))throw Error("Choose a valid hex colour.");
 return value.toLowerCase();
};
function context(editor:Editor){
 const {state}=editor;const $from=state.selection.$from;
 let depth=-1;
 for(let d=$from.depth;d>0;d--)if($from.node(d).type.name==="table"){depth=d;break;}
 if(depth<0)throw Error("Place the caret inside a table.");
 const table=$from.node(depth),tablePos=$from.before(depth);
 const cells:{pos:number;row:number;column:number;attrs:Record<string,unknown>}[]=[];
 table.forEach((row,rowOffset,rowIndex)=>{
  let col=0;
  row.forEach((cell,cellOffset)=>{
   const span=Math.max(1,Number(cell.attrs.colspan)||1);
   if(cell.type.name==="tableCell"||cell.type.name==="tableHeader")
    cells.push({pos:tablePos+2+rowOffset+cellOffset,row:rowIndex,column:col,attrs:cell.attrs});
   col+=span;
  });
 });
 const selected=state.selection instanceof CellSelection
  ?cells.filter(c=>state.selection.ranges.some(r=>r.$from.pos>=c.pos&&r.$from.pos<c.pos+state.doc.nodeAt(c.pos)!.nodeSize))
  :cells.filter(c=>$from.pos>=c.pos&&$from.pos<c.pos+state.doc.nodeAt(c.pos)!.nodeSize);
 const active=selected[0]??cells[0];
 if(!active)throw Error("Table has no cells.");
 const cols=new Set(selected.length?selected.map(c=>c.column):[active.column]);
 return {table,tablePos,cells,selected:selected.length?selected:[active],active,cols};
}
export function getTableFormat(editor:Editor):TableFormatValues {
 const {table,active,cells}=context(editor);
 const attr=active.attrs,tableAttrs=table.attrs;
 const dir=tableAttrs.tableFlow==="ltr"||tableAttrs.dir==="ltr"?"ltr":"rtl";
 const dom=editor.view.nodeDOM(cells[0].pos) as HTMLElement|null;
 const currentTable=dom?.closest("table");
 const widths=Array.from(currentTable?.rows[0]?.cells??[]).map(cell=>cell.getBoundingClientRect().width);
 const columnWidth=Number((attr.colwidth as number[]|null)?.[0])||widths[active.column]||120;
 return {
  fill:typeof attr.tableFill==="string"?attr.tableFill:null,
  borderColor:typeof attr.tableBorderColor==="string"?attr.tableBorderColor:"#000000",
  borderStyle:(attr.tableBorderStyle as TableBorderStyle)||"none",
  borderWidthPt:Number(attr.tableBorderWidthPt)||1,
  columnWidthPx:Math.round(columnWidth*100)/100,
  columnGapMm:attr.tableGapMm===null?1.41:Number(attr.tableGapMm??1.41),
  indentMm:Number(tableAttrs.tableIndentMm)||0,
  alignment:(tableAttrs.tableAlignment as TableAlignment)||(dir==="rtl"?"right":"left"),
  flow:dir,
 };
}
export function applyTableFormat(editor:Editor,values:TableFormatValues):boolean {
 const ctx=context(editor);
 const fill=safeHex(values.fill),borderColor=safeHex(values.borderColor)??"#000000";
 if(!["none","solid","dashed","dotted","double"].includes(values.borderStyle))throw Error("Invalid border style.");
 const widthPt=clamp(Number(values.borderWidthPt),.25,8);
 const columnWidth=clamp(Number(values.columnWidthPx),mmToTablePx(10),mmToTablePx(500));
 const gap=clamp(Number(values.columnGapMm),0,20);
 const indent=clamp(Number(values.indentMm),0,120);
 if(!["left","center","right"].includes(values.alignment))throw Error("Invalid table alignment.");
 if(values.flow!=="ltr"&&values.flow!=="rtl")throw Error("Invalid table direction.");
 const tr=editor.state.tr;
 const columns=ctx.cols;
 const selectedPositions=new Set(ctx.selected.map(c=>c.pos));
 const previousWidth=ctx.active.attrs.colwidth as number[]|null;
 const widthChanged=Math.abs(columnWidth-(Number(previousWidth?.[0])||getTableFormat(editor).columnWidthPx))>.05;
 const gapChanged=ctx.selected.some(cell=>Math.abs(Number(cell.attrs.tableGapMm??1.41)-gap)>.001);
 ctx.cells.forEach(cell=>{
  const attrs={...cell.attrs};
  let changed=false;
  if(selectedPositions.has(cell.pos)){
   Object.assign(attrs,{tableFill:fill,tableBorderColor:borderColor,tableBorderStyle:values.borderStyle,tableBorderWidthPt:widthPt});
   changed=true;
  }
  if(columns.has(cell.column)){
   if(widthChanged){attrs.colwidth=[Math.round(columnWidth*1000)/1000];changed=true;}
   if(gapChanged){attrs.tableGapMm=gap;changed=true;}
  }
  if(changed)tr.setNodeMarkup(cell.pos,undefined,attrs);
 });
 const attrs:Record<string,unknown>={...ctx.table.attrs,tableAlignment:values.alignment,tableIndentMm:indent,tableFlow:values.flow,dir:values.flow};
 if(widthChanged){
  const dom=editor.view.nodeDOM(ctx.cells[0].pos) as HTMLElement|null;
  const tableDom=dom?.closest("table");
  const before=tableDom?.getBoundingClientRect().width||0;
  if(before>0){
   const row=ctx.cells.filter(c=>c.row===0);
   const total=row.reduce((sum,cell)=>sum+(columns.has(cell.column)?columnWidth:Number((cell.attrs.colwidth as number[]|null)?.[0])||before/Math.max(1,row.length)),0);
   attrs.tableFormatWidthPx=Math.round(Math.min(before,Math.max(64,total)));
  }
 }
 tr.setNodeMarkup(ctx.tablePos,undefined,attrs);
 if(!tr.docChanged)return true;
 editor.view.dispatch(closeHistory(editor.state.tr));
 editor.view.dispatch(tr.setMeta(TABLE_DIALOG_CHANGE,true));
 editor.view.dispatch(closeHistory(editor.state.tr));
 return true;
}
export function splitTableRow(editor:Editor):boolean {
 return editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).focus().addRowAfter().run();
}
