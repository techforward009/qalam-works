import type {Editor} from '@tiptap/core';

/** Wait for a dialog to unmount/settings to commit. Focus the existing model
 * selection, never a new position or formatting owner. Ignore a closed canvas. */
export function restoreEditorFocus(editor:Editor|null) {
 if(!editor||editor.isDestroyed)return;
 const dom=editor.view.dom;
 requestAnimationFrame(()=>{
  if(!editor.isDestroyed&&dom.isConnected&&editor.view.dom===dom&&editor.isEditable)editor.view.focus();
 });
}
