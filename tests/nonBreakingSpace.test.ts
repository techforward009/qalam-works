/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createDocumentStudioExtensions } from '../app/tools/document-studio/utils/documentSchema';
let editor: Editor;
afterEach(() => { editor?.destroy(); document.body.replaceChildren(); });
describe('Shift+Space non-breaking space (InPage)', () => {
  it('inserts U+00A0 between two words', () => {
    document.body.innerHTML = '<div id="e"></div>';
    editor = new Editor({ element: document.querySelector('#e')!, extensions: createDocumentStudioExtensions(), content: '<p>قلم</p>', injectCSS: false });
    editor.commands.focus('end');
    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', shiftKey: true, bubbles: true, cancelable: true }));
    editor.commands.insertContent('پیج');
    expect(editor.getText()).toBe('قلم\u00A0پیج');
  });
  it('plain Space still types a normal space', () => {
    document.body.innerHTML = '<div id="e"></div>';
    editor = new Editor({ element: document.querySelector('#e')!, extensions: createDocumentStudioExtensions(), content: '<p>قلم</p>', injectCSS: false });
    editor.commands.focus('end');
    const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true });
    editor.view.dom.dispatchEvent(ev);
    expect(editor.getText()).toBe('قلم');
  });
});
