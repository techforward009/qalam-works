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


/** Explicitly select the first cell of the freshly appended last row. */
export function moveToLastTableRow(view:EditorView):boolean {
 const {state}=view,$from=state.selection.$from;
 let tableDepth=-1;
 for(let d=$from.depth;d>0;d--)if($from.node(d).type.name==="table"){tableDepth=d;break;}
 if(tableDepth<0)return false;
 const table=$from.node(tableDepth);
 if(!table.childCount)return false;
 let rowOffset=0;
 for(let i=0;i<table.childCount-1;i++)rowOffset+=table.child(i).nodeSize;
 const pos=$from.before(tableDepth)+rowOffset+3;
 const selection=TextSelection.near(state.doc.resolve(pos),1);
 view.dispatch(state.tr.setSelection(selection).scrollIntoView());
 view.focus();
 return true;
}
