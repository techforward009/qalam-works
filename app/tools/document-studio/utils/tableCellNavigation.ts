import type {EditorView} from "@tiptap/pm/view";
import {TextSelection} from "@tiptap/pm/state";

/** Navigate in stored cell order. CSS table direction places cell 0 on the
 * right in RTL documents and on the left in LTR documents. */
export function moveTableCell(view: EditorView, step: -1 | 1): boolean {
  const {state}=view, {$from}=state.selection;
  let tableDepth=-1,cellDepth=-1;
  for(let depth=$from.depth;depth>0;depth--){
    const name=$from.node(depth).type.name;
    if((name==="tableCell"||name==="tableHeader")&&cellDepth<0)cellDepth=depth;
    if(name==="table"){tableDepth=depth;break;}
  }
  if(tableDepth<0||cellDepth<0)return false;
  const tablePos=$from.before(tableDepth), currentPos=$from.before(cellDepth);
  const cells:number[]=[];
  $from.node(tableDepth).descendants((node,pos)=>{
    if(node.type.name==="tableCell"||node.type.name==="tableHeader"){
      cells.push(tablePos+1+pos);
      return false;
    }
    return true;
  });
  const selectedNode=view.dom.ownerDocument.getSelection()?.anchorNode;
  const selectedCell=(selectedNode instanceof Element ? selectedNode : selectedNode?.parentElement)?.closest("td,th");
  const selectedTable=selectedCell?.closest("table");
  const domCells=selectedTable ? Array.from(selectedTable.querySelectorAll("tr > td,tr > th")) : [];
  // Empty RTL cells can have a browser DOM caret in cell 0 while the PM
  // selection still points at cell 1. Follow the *visible* caret instead.
  const visualIndex=selectedTable && view.dom.contains(selectedTable) && domCells.length===cells.length ? domCells.indexOf(selectedCell!) : -1;
  const i=visualIndex>=0?visualIndex:cells.indexOf(currentPos),next=cells[i+step];
  if(i<0||next===undefined)return false;
  const selection=TextSelection.near(state.doc.resolve(next+2),1);
  view.dispatch(state.tr.setSelection(selection).scrollIntoView());
  view.focus();
  return true;
}

/** After a final Tab inserts a row, place the caret in its first (rightmost
 * in RTL) cell, rather than keeping the stale pre-insertion DOM selection. */
export function focusTableLastRowStart(view:EditorView):boolean{
 const {state}=view;let target=-1;
 state.doc.descendants((node,pos)=>{
  if(node.type.name!=="table")return true;
  let rowPos=pos+1;
  for(let i=0;i<node.childCount-1;i++)rowPos+=node.child(i).nodeSize;
  const row=node.lastChild;
  if(row?.type.name==="tableRow"&&row.childCount>0)target=rowPos+3;
  return false;
 });
 if(target<0)return false;
 view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(target),1)).scrollIntoView());view.focus();return true;
}
