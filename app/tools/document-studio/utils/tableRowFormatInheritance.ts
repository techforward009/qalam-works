import type {EditorView} from "@tiptap/pm/view";
import type {Mark} from "@tiptap/pm/model";

/** Preserve each column's cell styling and empty paragraph defaults when Tab appends a row. */
export function inheritPreviousTableRow(view:EditorView):boolean {
 const {state}=view;
 const $from=state.selection.$from;
 let depth=-1;
 for(let d=$from.depth;d>0;d--)if($from.node(d).type.name==="table"){depth=d;break;}
 if(depth<0)return false;
 const table=$from.node(depth);
 if(table.childCount<2)return false;
 const previous=table.child(table.childCount-2),next=table.lastChild!;
 const tablePos=$from.before(depth);
 let offset=0;
 for(let i=0;i<table.childCount-1;i++)offset+=table.child(i).nodeSize;
 const rowPos=tablePos+1+offset;
 const tr=state.tr;
 let cellOffset=0;
 for(let i=0;i<next.childCount;i++){
  const cell=next.child(i),source=previous.child(i);
  const pos=rowPos+1+cellOffset;
  tr.setNodeMarkup(pos,undefined,{...cell.attrs,...source.attrs});
  const sourcePara=source.firstChild,targetPara=cell.firstChild;
  if(sourcePara&&targetPara&&sourcePara.type===targetPara.type)
   tr.setNodeMarkup(pos+1,undefined,{...targetPara.attrs,...sourcePara.attrs});
  cellOffset+=cell.nodeSize;
 }
 if(tr.docChanged)view.dispatch(tr);
 return true;
}
/** ProseMirror stores bold, colour, family and size as text marks, not paragraph attrs. */
export function inheritPreviousCellStoredMarks(view:EditorView):void {
 const {state}=view,$from=state.selection.$from;
 let tableDepth=-1,rowDepth=-1,cellDepth=-1;
 for(let d=$from.depth;d>0;d--){
  const name=$from.node(d).type.name;
  if((name==="tableCell"||name==="tableHeader")&&cellDepth<0)cellDepth=d;
  else if(name==="tableRow"&&rowDepth<0)rowDepth=d;
  else if(name==="table"){tableDepth=d;break;}
 }
 if(tableDepth<0||rowDepth<0||cellDepth<0)return;
 const table=$from.node(tableDepth);
 const rowIndex=$from.index(tableDepth),cellIndex=$from.index(rowDepth);
 if(rowIndex<1||rowIndex!==table.childCount-1)return;
 const cell=table.child(rowIndex).child(cellIndex);
 if(cell.textContent.length!==0)return;
 const prevCell=table.child(rowIndex-1).child(cellIndex);
 const found:Mark[][]=[];
 prevCell.descendants(n=>{if(n.isText&&n.marks.length){found.push([...n.marks]);return false;}return true;});
 if(found[0]?.length)view.dispatch(state.tr.setStoredMarks(found[0]));
}
