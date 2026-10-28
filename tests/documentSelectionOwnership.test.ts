/** @vitest-environment happy-dom */
import { afterEach, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { FORMATTING_TARGET_CHANGE, installFormattingSafety, isFormattingSurface, readFormattingTarget } from '../app/tools/document-studio/utils/formattingSafety';
let editor: Editor, dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); editor?.destroy(); document.body.replaceChildren(); });
function setup() {
  document.body.innerHTML = '<div data-studio-root><div id="host"></div><textarea data-studio-text-frame>متن</textarea><div data-studio-toolbar><input></div></div>';
  editor = new Editor({ element: document.querySelector('#host')!, extensions: [StarterKit], content: '<p>Story</p>', injectCSS: false });
  const guard = installFormattingSafety(editor, vi.fn(), vi.fn()); dispose = guard.dispose;
  return { guard, root: document.querySelector<HTMLElement>('[data-studio-root]')!, input: document.querySelector('textarea')! };
}
it('publishes the live owner without authorizing a frame to mutate the story', () => {
  const { root, input } = setup(), changed = vi.fn(); root.addEventListener(FORMATTING_TARGET_CHANGE, changed);
  editor.commands.selectAll(); const before = editor.getJSON(); input.focus();
  expect(readFormattingTarget(input)).toEqual({ owner: 'frame', input });
  expect(changed).toHaveBeenCalled(); editor.commands.toggleBold(); expect(editor.getJSON()).toEqual(before);
  document.querySelector('input')!.focus(); expect(readFormattingTarget(input)?.owner).toBe('frame');
});
it('document changes invalidate visual ownership and formatting together', () => {
  const { guard } = setup(); editor.commands.selectAll(); const before = editor.getJSON(); guard.documentChanged();
  expect(readFormattingTarget(editor.view.dom)?.owner).toBe('none'); editor.commands.toggleBold(); expect(editor.getJSON()).toEqual(before);
  editor.view.dom.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  expect(readFormattingTarget(editor.view.dom)?.owner).toBe('story'); editor.commands.toggleBold(); expect(editor.getJSON()).not.toEqual(before);
});
it('removes visual ownership on disposal', () => {
  const { guard, root } = setup(); guard.dispose(); dispose = undefined;
  expect(readFormattingTarget(root)).toBeUndefined();
});
it('does not publish another studio root as the active frame', () => {
  setup(); const other = document.createElement('div'); other.dataset.studioRoot = ''; other.innerHTML = '<textarea data-studio-text-frame></textarea>'; document.body.append(other); other.querySelector('textarea')!.focus();
  expect(readFormattingTarget(other)).toBeUndefined(); expect(readFormattingTarget(editor.view.dom)?.owner).toBe('story');
});
it('distinguishes formatting surfaces from a text frame or the pasteboard', () => {
  const { input } = setup(); expect(isFormattingSurface(input)).toBe(false); expect(isFormattingSurface(document.querySelector('input'))).toBe(true); expect(isFormattingSurface(document.body)).toBe(false);
});
