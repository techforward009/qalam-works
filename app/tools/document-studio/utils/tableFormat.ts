import type {Editor} from "@tiptap/core";
import type {Node as ProseMirrorNode} from "@tiptap/pm/model";
import {AllSelection,type EditorState} from "@tiptap/pm/state";
import {CellSelection} from "@tiptap/pm/tables";
import {closeHistory} from "@tiptap/pm/history";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {mmToTablePx} from "./tableFormatUnits";

export type TableBorderStyle="none"|"solid"|"dotted"|"dashed"|"double";
export type TableAlignment="left"|"center"|"right";
export interface TableFormatValues {
 fill:string|null;
 borderColor:string|null;
 borderStyle:TableBorderStyle|null;
 borderWidthPt:number|null;
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
function findTableInState(state:EditorState):{table:ProseMirrorNode;tablePos:number}|null {
 const {$from,$to}=state.selection;
 for(let d=$from.depth;d>0;d--)if($from.node(d).type.name==="table")return {table:$from.node(d),tablePos:$from.before(d)};
 for(let d=$to.depth;d>0;d--)if($to.node(d).type.name==="table")return {table:$to.node(d),tablePos:$to.before(d)};
 if(!state.selection.empty){
  let found:{table:ProseMirrorNode;tablePos:number}|null=null;
  state.doc.nodesBetween(state.selection.from,state.selection.to,(node,pos)=>{
   if(found)return false;
   if(node.type.name==="table"){found={table:node,tablePos:pos};return false;}
   return !node.isTextblock;
  });
  if(found)return found;
 }
 return null;
}
export function hasTableForFormat(editor:Editor|null|undefined):boolean {
 if(!editor||editor.isDestroyed)return false;
 return findTableInState(editor.state)!==null;
}
function context(editor:Editor){
 const {state}=editor;const $from=state.selection.$from;
 const found=findTableInState(state);
 if(!found)throw Error("Place the caret inside a table.");
 const {table,tablePos}=found;
 const cells:{pos:number;end:number;row:number;column:number;colspan:number;attrs:Record<string,unknown>}[]=[];
 table.forEach((row,rowOffset,rowIndex)=>{
  let col=0;
  row.forEach((cell,cellOffset)=>{
   const span=Math.max(1,Number(cell.attrs.colspan)||1);
   const pos=tablePos+2+rowOffset+cellOffset;
   if(cell.type.name==="tableCell"||cell.type.name==="tableHeader")
    cells.push({pos,end:pos+cell.nodeSize,row:rowIndex,column:col,colspan:span,attrs:cell.attrs});
   col+=span;
  });
 });
 const selected=state.selection instanceof CellSelection
  ?cells.filter(c=>state.selection.ranges.some(r=>r.$from.pos>=c.pos&&r.$from.pos<c.end))
  :state.selection instanceof AllSelection
   ?cells
   :!state.selection.empty
    ?cells.filter(c=>state.selection.from<c.end&&state.selection.to>c.pos)
    :cells.filter(c=>$from.pos>=c.pos&&$from.pos<c.end);
 const active=selected[0]??cells[0];
 if(!active)throw Error("Table has no cells.");
 const chosen=selected.length?selected:[active];
 const cols=new Set<number>();
 for(const c of chosen)for(let k=0;k<c.colspan;k++)cols.add(c.column+k);
 return {table,tablePos,cells,selected:chosen,active,cols};
}
export function getTableFormat(editor:Editor):TableFormatValues {
 const {table,active,cells,selected}=context(editor);
 const attr=active.attrs,tableAttrs=table.attrs;
 const dir=tableAttrs.tableFlow==="ltr"||tableAttrs.dir==="ltr"?"ltr":"rtl";
 const dom=editor.view.nodeDOM(cells[0].pos) as HTMLElement|null;
 const currentTable=dom?.closest("table");
 const widths=Array.from(currentTable?.rows[0]?.cells??[]).map(cell=>cell.getBoundingClientRect().width);
 const columnWidth=Number((attr.colwidth as number[]|null)?.[0])||widths[active.column]||120;
 const consistent=(key:string,defaultValue:unknown)=>{
  const first=active.attrs[key]??defaultValue;
  return selected.every(cell=>(cell.attrs[key]??defaultValue)===first)?first:null;
 };
 return {
  fill:typeof attr.tableFill==="string"?attr.tableFill:null,
  borderColor:consistent("tableBorderColor","#000000") as string|null,
  borderStyle:consistent("tableBorderStyle","none") as TableBorderStyle|null,
  borderWidthPt:consistent("tableBorderWidthPt",.5) as number|null,
  columnWidthPx:Math.round(columnWidth*100)/100,
  columnGapMm:attr.tableGapMm===null?1.41:Number(attr.tableGapMm??1.41),
  indentMm:Number(tableAttrs.tableIndentMm)||0,
  alignment:(tableAttrs.tableAlignment as TableAlignment)||(dir==="rtl"?"right":"left"),
  flow:dir,
 };
}
export function applyTableFormat(editor:Editor,values:TableFormatValues):boolean {
 const ctx=context(editor);
 const fill=safeHex(values.fill),borderColor=safeHex(values.borderColor);
 if(values.borderStyle!==null&&!["none","solid","dashed","dotted","double"].includes(values.borderStyle))throw Error("Invalid border style.");
 const widthPt=values.borderWidthPt===null?null:clamp(Number(values.borderWidthPt),.25,8);
 const columnWidth=clamp(Number(values.columnWidthPx),mmToTablePx(10),mmToTablePx(500));
 const gap=clamp(Number(values.columnGapMm),0,20);
 const indent=clamp(Number(values.indentMm),0,120);
 if(!["left","center","right"].includes(values.alignment))throw Error("Invalid table alignment.");
 if(values.flow!=="ltr"&&values.flow!=="rtl")throw Error("Invalid table direction.");
 const tr=editor.state.tr;
 const columns=ctx.cols;
 const selectedPositions=new Set(ctx.selected.map(c=>c.pos));
 const tableNode=editor.view.nodeDOM(ctx.cells[0].pos) as HTMLElement|null;
 const tableDom=tableNode?.closest("table");
 const renderedWidths=Array.from(tableDom?.rows[0]?.cells??[]).map(cell=>cell.getBoundingClientRect().width);
 const previousWidth=ctx.active.attrs.colwidth as number[]|null;
 const widthChanged=Math.abs(columnWidth-(Number(previousWidth?.[0])||getTableFormat(editor).columnWidthPx))>.05;
 const gapChanged=ctx.selected.some(cell=>Math.abs(Number(cell.attrs.tableGapMm??1.41)-gap)>.001);
 ctx.cells.forEach(cell=>{
  const attrs={...cell.attrs};
  let changed=false;
  if(selectedPositions.has(cell.pos)){
   attrs.tableFill=fill;
   if(borderColor!==null)attrs.tableBorderColor=borderColor;
   if(values.borderStyle!==null)attrs.tableBorderStyle=values.borderStyle;
   if(widthPt!==null)attrs.tableBorderWidthPt=widthPt;
   changed=true;
  }
  if(columns.has(cell.column)){
   if(widthChanged){attrs.colwidth=[Math.round(columnWidth*1000)/1000];changed=true;}
   if(gapChanged){attrs.tableGapMm=gap;changed=true;}
  }else if(widthChanged && !(Number((attrs.colwidth as number[]|null)?.[0])>0) && renderedWidths[cell.column]>0){
   // Freeze existing Auto columns at their on-screen sizes when a different
   // column is explicitly resized. RTL indexes stay in logical cell order.
   attrs.colwidth=[Math.round(renderedWidths[cell.column]*1000)/1000];
   changed=true;
  }
  if(changed)tr.setNodeMarkup(cell.pos,undefined,attrs);
 });
 const attrs:Record<string,unknown>={...ctx.table.attrs,tableAlignment:values.alignment,tableIndentMm:indent,tableFlow:values.flow,dir:values.flow};
 if(widthChanged){
  const before=tableDom?.getBoundingClientRect().width||0;
  if(before>0){
   const row=ctx.cells.filter(c=>c.row===0);
   const total=row.reduce((sum,cell)=>sum+(columns.has(cell.column)?columnWidth:Number((cell.attrs.colwidth as number[]|null)?.[0])||renderedWidths[cell.column]||before/Math.max(1,row.length)),0);
   attrs.tableFormatWidthPx=Math.round(Math.max(64,total)*1000)/1000;
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
