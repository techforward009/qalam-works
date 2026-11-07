import type {EditorView} from "@tiptap/pm/view";
import {TextSelection} from "@tiptap/pm/state";
import {CellSelection} from "@tiptap/pm/tables";

export type HorizontalArrow = "ArrowLeft" | "ArrowRight";

/** Return the adjacent cell in the requested visual direction, within this row. */
export function visualNeighbour(cell: Element, key: HorizontalArrow, direction: "ltr" | "rtl"): Element | null {
  const row = cell.closest("tr");
  if (!row) return null;
  const cells = Array.from(row.querySelectorAll("td,th"));
  const index = cells.indexOf(cell);
  if (index < 0) return null;
  const visuallyRight = (key === "ArrowRight") !== (direction === "rtl");
  const next = index + (visuallyRight ? 1 : -1);
  return cells[next] ?? null;
}

function cellPositionAt(doc: import("@tiptap/pm/model").Node, pos: number): number | null {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  for (let depth = $pos.depth; depth > 0; depth--) {
    const name = $pos.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") return $pos.before(depth);
  }
  return null;
}

/** Handle visual horizontal cell navigation before TableKit's logical-order keymap. */
export function handleHorizontalTableArrow(view: EditorView, event: KeyboardEvent): boolean {
  if (event.isComposing || view.composing || (event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.altKey || event.ctrlKey || event.metaKey) return false;
  const { state } = view;
  const { selection, doc } = state;
  if (selection instanceof CellSelection) {
    const headPos = selection.$headCell.pos;
    const headDom = view.nodeDOM(headPos);
    if (!(headDom instanceof Element)) return true;
    const table = headDom.closest("table");
    if (!table) return true;
    if (!event.shiftKey) {
      const cell = doc.nodeAt(headPos);
      let firstText = headPos + 1;
      cell?.forEach((block, offset) => {
        if (block.isTextblock && firstText === headPos + 1) firstText = headPos + 1 + offset + 1;
      });
      view.dispatch(state.tr.setSelection(TextSelection.near(doc.resolve(firstText), 1)));
      event.preventDefault();
      return true;
    }
    const direction = view.dom.ownerDocument.defaultView?.getComputedStyle(table).direction === "rtl" ? "rtl" : "ltr";
    const neighbour = visualNeighbour(headDom, event.key, direction);
    if (!neighbour) { event.preventDefault(); return true; }
    const neighbourDomPos = view.posAtDOM(neighbour, 0);
    const targetPos = cellPositionAt(doc, neighbourDomPos);
    if (targetPos === null) { event.preventDefault(); return true; }
    view.dispatch(state.tr.setSelection(CellSelection.create(doc, selection.$anchorCell.pos, targetPos)));
    event.preventDefault();
    return true;
  }

  const currentPos = cellPositionAt(doc, selection.head);
  const anchorCellPos = cellPositionAt(doc, selection.anchor);
  if (currentPos === null || anchorCellPos !== currentPos) return false;
  const cell = doc.nodeAt(currentPos);
  const cellDom = view.nodeDOM(currentPos);
  const table = cellDom instanceof Element ? cellDom.closest("table") : null;
  if (!cell || !cellDom || !(cellDom instanceof Element) || !table) return false;
  if (!event.shiftKey && !selection.empty) return false;
  const direction = view.dom.ownerDocument.defaultView?.getComputedStyle(table).direction === "rtl" ? "rtl" : "ltr";
  const visualEdge = view.endOfTextblock(event.key === "ArrowLeft" ? "left" : "right");
  if (!cell.textContent && selection.empty || visualEdge) {
    if (event.shiftKey) {
      view.dispatch(state.tr.setSelection(CellSelection.create(doc, currentPos)));
      event.preventDefault();
      return true;
    }
    const neighbour = visualNeighbour(cellDom, event.key, direction);
    if (neighbour) {
      const targetPos = cellPositionAt(doc, view.posAtDOM(neighbour, 0));
      const target = targetPos === null ? null : doc.nodeAt(targetPos);
      let firstText = targetPos === null ? null : targetPos + 1;
      target?.forEach((block, offset) => {
        if (block.isTextblock && firstText === targetPos! + 1) firstText = targetPos! + 1 + offset + 1;
      });
      if (firstText !== null) view.dispatch(state.tr.setSelection(TextSelection.near(doc.resolve(firstText), 1)));
    }
    event.preventDefault();
    return true;
  }
  if (event.shiftKey && !selection.empty && cell.textContent) return false;
  return false;
}

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
  // ProseMirror's selection is authoritative. Native DOM selection can lag
  // behind the newly inserted Urdu glyph or a Tab, especially around IME
  // composition and decorated line spans, and must not override cell order.
  // ProseMirror may still report the old cell immediately after a pointer
  // click. Use the browser's *current* caret only when it is inside the
  // same table and maps one-to-one to the model's cell order.
  const nativeNode=view.dom.ownerDocument.getSelection()?.anchorNode;
  const nativeCell=(nativeNode instanceof Element ? nativeNode : nativeNode?.parentElement)?.closest("td,th");
  const nativeTable=nativeCell?.closest("table.qalam-document-table");
  const renderedTables=Array.from(view.dom.querySelectorAll("table.qalam-document-table"));
  const modelTables:number[]=[];
  state.doc.descendants((node,pos)=>{
    if(node.type.name==="table"){modelTables.push(pos);return false;}
    return true;
  });
  const tableIndex=modelTables.indexOf(tablePos);
  const domCells=tableIndex>=0 && renderedTables[tableIndex]===nativeTable
    ? Array.from(nativeTable.querySelectorAll("tr > td, tr > th")) : [];
  const nativeIndex=domCells.length===cells.length ? domCells.indexOf(nativeCell!) : -1;
  const i=nativeIndex>=0 ? nativeIndex : cells.indexOf(currentPos),next=cells[i+step];
  if(i<0||next===undefined)return false;
  const cell=state.doc.nodeAt(next);
  if(!cell)return false;
  let from:number|null=null,to:number|null=null;
  cell.forEach((block,offset)=>{
    if(!block.isTextblock)return;
    const start=next+1+offset+1,end=next+1+offset+block.nodeSize-1;
    if(from===null)from=start;
    to=end;
  });
  if(from===null||to===null)return false;
  const selection=from<to?TextSelection.create(state.doc,from,to):TextSelection.near(state.doc.resolve(from),1);
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
