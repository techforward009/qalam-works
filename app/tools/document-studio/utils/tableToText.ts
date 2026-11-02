import type {Editor} from "@tiptap/core";
import type {Node as PMNode,Schema} from "@tiptap/pm/model";
import {TextSelection} from "@tiptap/pm/state";
import {closeHistory} from "@tiptap/pm/history";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import type {TextTableMode} from "./tableConversions";

export type TableToTextTarget={pos:number;node:PMNode};
export function getTableToTextTarget(editor:Editor,at=editor.state.selection.$from.pos):TableToTextTarget|null {
 const $pos=editor.state.doc.resolve(Math.min(editor.state.doc.content.size,Math.max(0,at)));
 for(let d=$pos.depth;d>0;d--)if($pos.node(d).type.name==="table")
  return {pos:$pos.before(d),node:$pos.node(d)};
 if($pos.nodeAfter?.type.name==="table")return {pos:$pos.pos,node:$pos.nodeAfter};
 return null;
}
/** PM table rows and cells already follow logical reading order, including RTL. */
export function convertTableToParagraphs(table:PMNode,mode:TextTableMode,schema:Schema):PMNode[]{
 if(table.type.name!=="table")throw Error("Select a table first.");
 const paragraph=schema.nodes.paragraph,hardBreak=schema.nodes.hardBreak;
 if(!paragraph)throw Error("Paragraphs are unavailable.");
 const dir=table.attrs.tableFlow==="ltr"||table.attrs.dir==="ltr"?"ltr":"rtl";
 const output:PMNode[]=[];
 const cellInline=(cell:PMNode)=>{
  const inline:PMNode[]=[];
  let attrs:Record<string,unknown>={dir,directionMode:"manual"};
  cell.forEach(block=>{
   if(!block.isTextblock)return;
   if(inline.length&&hardBreak)inline.push(hardBreak.create());
   if(!inline.length)attrs={...attrs,...block.attrs,dir};
   block.content.forEach(child=>{if(child.isInline)inline.push(child);});
  });
  return {inline,attrs};
 };
 table.forEach(row=>{
  if(row.type.name!=="tableRow")return;
  const cells:{inline:PMNode[];attrs:Record<string,unknown>}[]=[];
  row.forEach(cell=>{if(cell.type.name==="tableCell"||cell.type.name==="tableHeader")cells.push(cellInline(cell));});
  if(mode==="paragraph")for(const cell of cells)output.push(paragraph.create(cell.attrs,cell.inline));
  else {
   const parts:PMNode[]=[];
   cells.forEach((cell,i)=>{
    if(i)parts.push(schema.text("\t"));
    parts.push(...cell.inline);
   });
   output.push(paragraph.create({dir,directionMode:"manual"},parts));
  }
 });
 if(!output.length)throw Error("Table has no rows.");
 return output;
}
export function applyTableToText(editor:Editor,tablePos:number,mode:TextTableMode):boolean {
 const table=editor.state.doc.nodeAt(tablePos);
 if(!table||table.type.name!=="table")throw Error("The table has changed. Select it again.");
 const nodes=convertTableToParagraphs(table,mode,editor.schema);
 editor.view.dispatch(closeHistory(editor.state.tr));
 const tr=editor.state.tr.replaceWith(tablePos,tablePos+table.nodeSize,nodes);
 tr.setSelection(TextSelection.create(tr.doc,tablePos+1));
 tr.setMeta(TABLE_DIALOG_CHANGE,true);
 editor.view.dispatch(tr);
 editor.view.dispatch(closeHistory(editor.state.tr));
 return true;
}
