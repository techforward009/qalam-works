import {Extension} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import {Plugin,PluginKey,TextSelection} from "@tiptap/pm/state";
import {CellSelection} from "@tiptap/pm/tables";
import type {Mark} from "@tiptap/pm/model";
import type {EditorView} from "@tiptap/pm/view";

/**
 * Two data-loss guards for table cell selections (InPage behaviour):
 *
 * 1. A plain primary-button click always clears an existing CellSelection and
 *    places the caret where the user clicked. The click must not depend on a
 *    later native selection sync: a stale CellSelection that survives a click
 *    turns the next keystroke into "replace every selected cell".
 * 2. Typing over a *deliberately* active CellSelection is one controlled
 *    transaction (first cell gets the text, the other selected cells are
 *    emptied, paragraph attributes and the first run's marks are kept) instead
 *    of a native multi-cell DOM deletion that ProseMirror reconstructs from a
 *    cross-cell diff. One Ctrl+Z restores every cell.
 */
export const tableCellSelectionGuardKey=new PluginKey("qalamTableCellSelectionGuard");

function plainPrimaryClick(event:MouseEvent):boolean {
  return event.button===0&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey;
}

function clickedTextPosition(view:EditorView,event:MouseEvent):number|null {
  const target=event.target instanceof Element?event.target:null;
  const cell=target?.closest("td,th")??null;
  if(cell&&!view.dom.contains(cell))return null;
  let coords:number|null=null;
  try{coords=view.posAtCoords({left:event.clientX,top:event.clientY})?.pos??null;}catch{coords=null;}
  if(cell){
    // Never let coordinates push the caret into a neighbouring cell.
    let cellStart:number;
    try{cellStart=view.posAtDOM(cell,0);}catch{return coords;}
    const $cell=view.state.doc.resolve(Math.min(cellStart,view.state.doc.content.size));
    const inside=coords!==null&&coords>=$cell.start()&&coords<=$cell.end();
    return inside?coords:cellStart;
  }
  return coords;
}

function collapseCellSelection(view:EditorView,pos:number|null):void {
  if(!(view.state.selection instanceof CellSelection)||pos===null)return;
  const {doc}=view.state;
  if(pos<0||pos>doc.content.size)return;
  const selection=TextSelection.near(doc.resolve(pos),1);
  if(!(selection instanceof TextSelection))return;
  view.dispatch(view.state.tr.setSelection(selection));
}

/** Replace a CellSelection with `text` in exactly one history event. */
export function overwriteCellSelection(view:EditorView,text:string):boolean {
  const {state}=view,selection=state.selection;
  if(!(selection instanceof CellSelection)||!text)return false;
  // CellSelection lists the head cell first; the text belongs in the first cell in document order.
  const ranges=[...selection.ranges].sort((a,b)=>a.$from.pos-b.$from.pos);
  if(!ranges.length)return false;
  const first=ranges[0];
  const marks:readonly Mark[]=state.storedMarks??state.doc.resolve(Math.min(first.$from.pos+1,state.doc.content.size)).marks();
  const tr=state.tr;
  // Back to front keeps the earlier cell positions valid.
  for(let i=ranges.length-1;i>=0;i--){
    const {$from,$to}=ranges[i];
    const cell=$from.parent,lead=cell.firstChild;
    const content=lead?.isTextblock
      ? lead.type.create(lead.attrs,i===0?state.schema.text(text,marks):undefined,lead.marks)
      : null;
    if(content)tr.replaceWith($from.pos,$to.pos,content);
    else tr.delete($from.pos,$to.pos);
  }
  tr.setSelection(TextSelection.create(tr.doc,first.$from.pos+1+text.length));
  tr.setMeta("uiEvent","input");
  // The overwrite is its own undo step, never merged into earlier typing.
  view.dispatch(closeHistory(state.tr));
  view.dispatch(tr);
  return true;
}

export const QalamTableCellSelectionGuard=Extension.create({
  name:"qalamTableCellSelectionGuard",
  addProseMirrorPlugins(){
    return [new Plugin({
      key:tableCellSelectionGuardKey,
      props:{
        handleDOMEvents:{
          mousedown(view,event){
            if(!plainPrimaryClick(event)||!(view.state.selection instanceof CellSelection))return false;
            collapseCellSelection(view,clickedTextPosition(view,event));
            return false;
          },
          beforeinput(view,event){
            const input=event as InputEvent;
            if(input.inputType!=="insertText"||!input.data||view.composing)return false;
            if(!overwriteCellSelection(view,input.data))return false;
            event.preventDefault();
            return true;
          },
        },
        handleClick(view,pos,event){
          // Backstop for a mousedown that never reached the editor.
          if(plainPrimaryClick(event)&&view.state.selection instanceof CellSelection)collapseCellSelection(view,pos);
          return false;
        },
        handleTextInput(view,_from,_to,text){
          return !view.composing&&overwriteCellSelection(view,text);
        },
      },
    })];
  },
});
