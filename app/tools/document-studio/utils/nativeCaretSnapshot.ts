import type {EditorView} from '@tiptap/pm/view';

/** The browser can lag the model after dialogs or pagination. A range from
 * another surface/position must never determine the story caret's geometry. */
export function nativeCaretSnapshot(view:EditorView,selection:Selection|null) {
 const owner=selection?.anchorNode;
 if(!selection?.rangeCount||!selection.isCollapsed||!owner||!view.dom.contains(owner))return null;
 try {
  if(view.posAtDOM(owner,selection.anchorOffset)!==view.state.selection.head)return null;
  const rects=[...selection.getRangeAt(0).getClientRects()].filter(rect=>rect.height>0);
  return rects.length?{owner,rect:rects[rects.length-1]}:null;
 }catch{return null;}
}
