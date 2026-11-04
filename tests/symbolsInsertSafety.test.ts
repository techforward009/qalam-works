/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { installFormattingSafety } from '../app/tools/document-studio/utils/formattingSafety';
import { insertSymbolIntoEditor } from '../app/tools/document-studio/components/SymbolsDialog';
let dispose: (() => void) | undefined, editor: Editor;
afterEach(() => { dispose?.(); editor?.destroy(); document.body.replaceChildren(); });
function setup() {
  document.body.innerHTML = '<div data-studio-root><div data-studio-scroller><div id="editor"></div><textarea data-studio-text-frame>ابج</textarea></div></div>';
  editor = new Editor({ element: document.querySelector('#editor')!, extensions: [StarterKit], content: '<p>AB</p>', injectCSS: false });
  const reject = vi.fn(), guard = installFormattingSafety(editor, reject, vi.fn()); dispose = guard.dispose;
  return { guard, reject, box: document.querySelector('textarea')! };
}
const item = { id: 'x', label: 'Radiyallahu Anhu', kind: 'text' as const, text: 'رضی اللہ عنہ' };
describe('Symbols insert vs formatting guard', () => {
  it('inserts into the story even when the target was invalidated (no blocking message)', () => {
    const { guard, reject } = setup();
    editor.commands.setTextSelection(2);
    guard.invalidate();
    expect(insertSymbolIntoEditor(editor, item)).toBe(true);
    expect(editor.getText()).toBe('Aرضی اللہ عنہB');
    expect(reject).not.toHaveBeenCalled();
  });
  it('inserts into the active text box at its caret, story untouched', () => {
    const { box, reject } = setup();
    box.focus(); box.setSelectionRange(1, 1);
    const onInput = vi.fn(); box.addEventListener('input', onInput);
    expect(insertSymbolIntoEditor(editor, item)).toBe(true);
    expect(box.value).toBe('ارضی اللہ عنہبج');
    expect(onInput).toHaveBeenCalled();
    expect(editor.getText()).toBe('AB');
    expect(reject).not.toHaveBeenCalled();
  });
});
