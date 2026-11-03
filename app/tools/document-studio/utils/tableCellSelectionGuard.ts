import {Extension} from "@tiptap/core";
import {closeHistory} from "@tiptap/pm/history";
import {Plugin,PluginKey,TextSelection} from "@tiptap/pm/state";
import {CellSelection,tableNodeTypes} from "@tiptap/pm/tables";
import {Slice} from "@tiptap/pm/model";
import type {Mark} from "@tiptap/pm/model";
import type {EditorView} from "@tiptap/pm/view";

/**
 * Data-loss guards for table cell selections (InPage 2009 behaviour):
 *
 * (a) A plain primary-button click always clears an existing CellSelection
 *     completely (in editor state, plugin state, and any cached toolbar state)
 *     and places the caret where the user clicked.
 * (b) Typing over an active CellSelection (Space, Backspace, or letter) replaces
 *     ONLY the first selected cell (the cell where the drag started, i.e.
 *     selection.$anchorCell, not document order). Backspace empties it. The OTHER
 *     selected cells KEEP their text. Selection clears with caret in that first
 *     cell. One Ctrl+Z restores it.
 * (c) Pressing Delete empties ALL selected cells at once; one Ctrl+Z restores all
 *     of them and re-selects the block.
 * (d) Shift+click extends and right-click keeps the cell selection.
 */
export const tableCellSelectionGuardKey=new PluginKey("qalamTableCellSelectionGuard");

function plainPrimaryClick(event:MouseEvent|PointerEvent):boolean {
  return event.button===0&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey;
}

function clickedTextPosition(view:EditorView,event:MouseEvent|PointerEvent):number|null {
  const target=event.target instanceof Element?event.target:null;
  const cell=target?.closest("td,th")??null;
  if(cell&&!view.dom.contains(cell))return null;
  let coords:number|null=null;
  try{coords=view.posAtCoords({left:event.clientX,top:event.clientY})?.pos??null;}catch{coords=null;}
  if(cell){
    let cellStart:number;
    try{cellStart=view.posAtDOM(cell,0);}catch{return coords;}
    const $cell=view.state.doc.resolve(Math.min(cellStart,view.state.doc.content.size));
    const inside=coords!==null&&coords>=$cell.start()&&coords<=$cell.end();
    return inside?coords:cellStart;
  }
  return coords;
}

export function collapseCellSelection(view:EditorView,pos:number|null):boolean {
  if(!(view.state.selection instanceof CellSelection))return false;
  const {doc}=view.state;
  let targetPos=pos;
  if(targetPos===null||targetPos<0||targetPos>doc.content.size){
    targetPos=view.state.selection.$headCell.pos+1;
  }
  const selection=TextSelection.near(doc.resolve(Math.min(targetPos,doc.content.size)),1);
  if(!(selection instanceof TextSelection))return false;
  view.dispatch(view.state.tr.setSelection(selection));
  return true;
}

/**
 * Replace ONLY the drag-start (anchor) cell's content with `text` (or empty if `text === ""`).
 * The other selected cells KEEP their text. The selection collapses to a caret in the anchor cell.
 * Exactly one history step (one Ctrl+Z restores the anchor cell and re-selects the block).
 */
export function overwriteCellSelection(view:EditorView,text:string):boolean {
  const {state}=view,selection=state.selection;
  if(!(selection instanceof CellSelection))return false;

  const anchorPos=selection.$anchorCell.pos;
  const anchorNode=selection.$anchorCell.nodeAfter;
  const anchorSize=anchorNode?.nodeSize??0;

  // Find the selection range for the anchor cell where the drag started
  const anchorRange=selection.ranges.find(
    (r)=>r.$from.pos>anchorPos&&r.$from.pos<anchorPos+anchorSize
  )??selection.ranges[0];

  if(!anchorRange)return false;

  const cell=anchorRange.$from.parent;
  const lead=cell.firstChild;
  const marks:readonly Mark[]=
    state.storedMarks??
    state.doc.resolve(Math.min(anchorRange.$from.pos+1,state.doc.content.size)).marks();

  const tr=state.tr;
  const content=lead?.isTextblock
    ? lead.type.create(lead.attrs,text?state.schema.text(text,marks):undefined,lead.marks)
    : null;

  if(content){
    tr.replaceWith(anchorRange.$from.pos,anchorRange.$to.pos,content);
  }else if(text){
    tr.insertText(text,anchorRange.$from.pos,anchorRange.$to.pos);
  }else{
    tr.delete(anchorRange.$from.pos,anchorRange.$to.pos);
  }

  const newCaretPos=text?anchorRange.$from.pos+1+text.length:anchorRange.$from.pos+1;
  tr.setSelection(TextSelection.create(tr.doc,Math.min(newCaretPos,tr.doc.content.size)));
  tr.setMeta("uiEvent","input");

  view.dispatch(closeHistory(state.tr));
  view.dispatch(tr);
  return true;
}

/**
 * Empty ALL selected cells at once and re-select the block.
 * Exactly one history step (one Ctrl+Z restores all of them and re-selects the block).
 */
export function emptyAllSelectedCells(view:EditorView):boolean {
  const {state}=view,selection=state.selection;
  if(!(selection instanceof CellSelection))return false;

  const tr=state.tr;
  let cellType;
  try{
    cellType=tableNodeTypes(state.schema).cell;
  }catch{
    cellType=null;
  }
  const baseContent=cellType?.createAndFill()?.content;

  // Back to front keeps positions valid
  const ranges=[...selection.ranges].sort((a,b)=>b.$from.pos-a.$from.pos);
  for(const {$from,$to} of ranges){
    const cell=$from.parent,lead=cell.firstChild;
    const content=lead?.isTextblock
      ? lead.type.create(lead.attrs,undefined,lead.marks)
      : (baseContent?new Slice(baseContent,0,0):null);
    if(content instanceof Slice){
      tr.replace($from.pos,$to.pos,content);
    }else if(content){
      tr.replaceWith($from.pos,$to.pos,content);
    }else{
      tr.delete($from.pos,$to.pos);
    }
  }

  if(tr.docChanged){
    const mappedAnchor=tr.mapping.map(selection.$anchorCell.pos);
    const mappedHead=tr.mapping.map(selection.$headCell.pos);
    tr.setSelection(CellSelection.create(tr.doc,mappedAnchor,mappedHead));
    tr.setMeta("uiEvent","delete");
    view.dispatch(closeHistory(state.tr));
    view.dispatch(tr);
    return true;
  }
  return false;
}

export const QalamTableCellSelectionGuard=Extension.create({
  name:"qalamTableCellSelectionGuard",
  priority: 200,
  addKeyboardShortcuts(){
    return {
      Backspace: () => {
        if(this.editor.state.selection instanceof CellSelection){
          return overwriteCellSelection(this.editor.view,"");
        }
        return false;
      },
      Delete: () => {
        if(this.editor.state.selection instanceof CellSelection){
          return emptyAllSelectedCells(this.editor.view);
        }
        return false;
      },
      Space: () => {
        if(this.editor.state.selection instanceof CellSelection){
          return overwriteCellSelection(this.editor.view," ");
        }
        return false;
      },
    };
  },
  addProseMirrorPlugins(){
    return [
      new Plugin({
        key:tableCellSelectionGuardKey,
        props:{
          handleDOMEvents:{
            pointerdown(view,event){
              if(!plainPrimaryClick(event)||!(view.state.selection instanceof CellSelection))return false;
              collapseCellSelection(view,clickedTextPosition(view,event));
              return false;
            },
            mousedown(view,event){
              if(!plainPrimaryClick(event)||!(view.state.selection instanceof CellSelection))return false;
              collapseCellSelection(view,clickedTextPosition(view,event));
              return false;
            },
            beforeinput(view,event){
              const input=event as InputEvent;
              if(view.composing)return false;
              if(input.inputType==="insertText"||input.inputType==="insertCompositionText"){
                if(!input.data)return false;
                if(!overwriteCellSelection(view,input.data))return false;
                event.preventDefault();
                return true;
              }
              if(input.inputType==="deleteContentBackward"){
                if(view.state.selection instanceof CellSelection){
                  if(overwriteCellSelection(view,"")){
                    event.preventDefault();
                    return true;
                  }
                }
              }
              if(input.inputType==="deleteContentForward"){
                if(view.state.selection instanceof CellSelection){
                  if(emptyAllSelectedCells(view)){
                    event.preventDefault();
                    return true;
                  }
                }
              }
              return false;
            },
          },
          handleClick(view,pos,event){
            if(plainPrimaryClick(event)&&view.state.selection instanceof CellSelection){
              collapseCellSelection(view,pos);
            }
            return false;
          },
          handleTextInput(view,_from,_to,text){
            return !view.composing&&overwriteCellSelection(view,text);
          },
          handleKeyDown(view,event){
            if(!(view.state.selection instanceof CellSelection))return false;
            if(event.ctrlKey||event.metaKey||event.altKey)return false;
            if(event.key==="Backspace"){
              event.preventDefault();
              const res=overwriteCellSelection(view,"");
              return res;
            }
            if(event.key==="Delete"){
              event.preventDefault();
              return emptyAllSelectedCells(view);
            }
            if(event.key===" "||(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey)){
              event.preventDefault();
              return overwriteCellSelection(view,event.key);
            }
            return false;
          },
        },
      }),
    ];
  },
});
