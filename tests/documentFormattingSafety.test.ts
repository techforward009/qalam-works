/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { CONTENT_REPLACEMENT, TABLE_DIALOG_CHANGE, formattingSafetyMessage, installFormattingSafety, registerFrameStyleUpdater } from '../app/tools/document-studio/utils/formattingSafety';
import { applyFontFamily, applyFontSize, applyTextColor, setAlign } from '../app/tools/document-studio/utils/documentCommands';
let dispose: (() => void) | undefined, editor: Editor;
afterEach(() => { dispose?.(); editor?.destroy(); document.body.replaceChildren(); });
function setup() {
  document.body.innerHTML = '<div data-studio-root><div data-studio-scroller><div id="editor"></div><textarea data-studio-text-frame>محفوظ عبارت</textarea></div><div data-studio-toolbar><button>Bold</button><select><option>One</option><option>Two</option></select></div></div>';
  editor = new Editor({ element: document.querySelector('#editor')!, extensions: [StarterKit, TextStyle, FontFamily], content: '<p>باہر کا متن</p>', injectCSS: false });
  editor.commands.selectAll();
  const reject = vi.fn(), clearNotice = vi.fn(), guard = installFormattingSafety(editor, reject, clearNotice); dispose = guard.dispose;
  const box = document.querySelector('textarea')!;
  const claim = () => { box.focus(); box.setSelectionRange(0, 4); };
  const before = editor.getJSON();
  return { guard, box, reject, clearNotice, claim, before };
}
describe('formatting target safety', () => {
  it('allows only explicit table-dialog document changes when the target is none, never a focused text box', () => {
    const {guard,claim,before,reject}=setup();
    guard.invalidate();
    const tableInsert=()=>editor.chain().command(({tr})=>{tr.setMeta(TABLE_DIALOG_CHANGE,true);return true;}).insertContent('<p>Table dialog text</p>').run();
    editor.commands.insertContent('<p>Unsafe normal change</p>');
    expect(editor.getJSON()).toEqual(before);
    expect(tableInsert()).toBe(true);
    expect(editor.getText()).toContain('Table dialog text');
    claim();
    const framed=editor.getJSON();
    tableInsert();
    expect(editor.getJSON()).toEqual(framed);
    expect(reject).toHaveBeenCalled();
  });

  it('rejects direct font/mark transactions for a frame without changing either text', () => {
    const { claim, before, box, reject } = setup(); claim();
    editor.chain().setFontFamily('Digital Khatt Indo-Pak').toggleBold().run();
    expect(editor.getJSON()).toEqual(before); expect(box.value).toBe('محفوظ عبارت'); expect(reject).toHaveBeenCalled();
  });
  it('routes supported styles to the whole frame without changing or focusing the story', () => {
    const { claim, before, box } = setup(); claim();
    box.dataset.studioFrameTypography = JSON.stringify({ bodyFontSizePt: 12, defaultRtlFontId: 'mehr-nastaliq-web', paragraphBeforePt: 0, paragraphAfterPt: 0, firstLineIndentMm: 0 });
    let frame: Record<string, unknown> = {};
    const unregister = registerFrameStyleUpdater(box, patch => { frame = { ...frame, ...patch, typography: { ...((frame.typography as object) ?? {}), ...(patch.typography ?? {}) } }; });
    applyFontFamily(editor, 'Amiri'); applyFontSize(editor, '24'); applyTextColor(editor, '#B91C1C'); setAlign(editor, 'center');
    unregister();
    expect(frame).toMatchObject({ textColor: '#B91C1C', textAlign: 'center', typography: { bodyFontSizePt: 24, defaultRtlFontId: expect.any(String) } });
    expect(editor.getJSON()).toEqual(before);
  });
  it('routes the same whole-box styles to an input frame and keeps the story protected', () => {
    const { guard, before, reject } = setup();
    const textarea = document.querySelector('textarea[data-studio-text-frame]')!;
    const input = document.createElement('input'); input.type = 'text'; input.dataset.studioTextFrame = 'true';
    input.dataset.studioFrameTypography = JSON.stringify({ bodyFontSizePt: 12, defaultRtlFontId: 'mehr-nastaliq-web', paragraphBeforePt: 0, paragraphAfterPt: 0, firstLineIndentMm: 0 });
    textarea.replaceWith(input);
    input.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(guard.canFormat()).toBe(false); // ownership claim rejects range formatting
    let frame: Record<string, unknown> = {};
    const unregister = registerFrameStyleUpdater(input, patch => { frame = { ...frame, ...patch, typography: { ...((frame.typography as object) ?? {}), ...(patch.typography ?? {}) } }; });
    applyFontFamily(editor, 'Amiri'); applyFontSize(editor, '24'); applyTextColor(editor, '#FF0000'); setAlign(editor, 'center');
    unregister();
    expect(frame).toMatchObject({ textColor: '#FF0000', textAlign: 'center', typography: { bodyFontSizePt: 24, defaultRtlFontId: expect.any(String) } });
    editor.commands.toggleBold();
    expect(editor.getJSON()).toEqual(before);
    expect(reject).toHaveBeenCalled();
  });
  it('guards a collapsed story selection and stored marks too', () => {
    const { claim, reject } = setup(); editor.commands.setTextSelection(1); claim();
    editor.commands.setFontFamily('Inter'); expect(editor.state.storedMarks).toBeNull(); expect(reject).toHaveBeenCalled();
  });
  it('toolbar focus and programmatic story focus never reclaim frame ownership', () => {
    const { claim, before } = setup(); claim();
    document.querySelector('select')!.focus(); editor.commands.focus(); editor.commands.toggleBold();
    expect(editor.getJSON()).toEqual(before);
  });
  it('stops toolbar changes before their handlers can run', () => {
    const { claim, reject } = setup(); claim();
    const select = document.querySelector('select')!, handler = vi.fn(); select.addEventListener('change', handler);
    select.dispatchEvent(new Event('change', { bubbles: true })); expect(handler).not.toHaveBeenCalled(); expect(reject).toHaveBeenCalled();
  });
  it('blocks formatting keyboard shortcuts but leaves native textarea undo alone', () => {
    const { claim, box, reject } = setup(); claim();
    const bold = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }); box.dispatchEvent(bold); expect(bold.defaultPrevented).toBe(true);
    const align = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, altKey: true, bubbles: true, cancelable: true }); box.dispatchEvent(align); expect(align.defaultPrevented).toBe(false);
    const undo = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }); box.dispatchEvent(undo); expect(undo.defaultPrevented).toBe(false); expect(reject).toHaveBeenCalledTimes(1);
  });
  it('removed boxes become ambiguous, never a stale story target', () => {
    const { claim, box, guard, before } = setup(); claim(); box.remove(); expect(guard.canFormat()).toBe(false);
    editor.commands.toggleBold(); expect(editor.getJSON()).toEqual(before);
  });
  it('Escape invalidates ownership without promoting it to the story', () => {
    const { claim, box, guard } = setup(); claim(); box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); expect(guard.canFormat()).toBe(false);
  });
  it('explicit story pointer interaction restores normal formatting', () => {
    const { claim, before } = setup(); claim(); editor.view.dom.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    editor.commands.toggleBold(); expect(editor.getJSON()).not.toEqual(before);
  });
  it('document replacement is allowed but does not revive an old target', () => {
    const { claim, guard } = setup(); claim(); guard.invalidate();
    editor.chain().command(({ tr }) => { tr.setMeta(CONTENT_REPLACEMENT, true); return true; }).setContent('<p>New document</p>').run();
    expect(editor.getText()).toBe('New document'); const before = editor.getJSON(); editor.commands.selectAll(); editor.commands.toggleBold(); expect(editor.getJSON()).toEqual(before);
  });
  it('another frame remains protected and cannot inherit a story target', () => {
    const { claim, before } = setup(); claim(); const second = document.createElement('textarea'); second.dataset.studioTextFrame = ''; document.querySelector('[data-studio-scroller]')!.append(second); second.focus();
    editor.commands.toggleBold(); expect(editor.getJSON()).toEqual(before);
  });
  it('invalidates a previously selected story after replacement until new user interaction', () => {
    const { reject } = setup();
    editor.chain().command(({ tr }) => { tr.setMeta(CONTENT_REPLACEMENT, true); return true; }).setContent('<p>New story</p>').run();
    const fresh = editor.getJSON();
    editor.commands.selectAll(); editor.commands.toggleBold();
    expect(editor.getJSON()).toEqual(fresh);
    expect(reject).toHaveBeenCalled();
    editor.view.dom.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    editor.commands.selectAll(); editor.commands.toggleBold();
    expect(editor.getJSON()).not.toEqual(fresh);
  });
  it('invalidates a story target when switching records without replacing editor content', () => {
    const { guard, before, reject } = setup();
    guard.documentChanged();
    editor.commands.focus(); // programmatic focus is not a new user selection
    editor.commands.toggleBold();
    expect(editor.getJSON()).toEqual(before);
    expect(reject).toHaveBeenCalled();
    editor.view.dom.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    editor.commands.toggleBold();
    expect(editor.getJSON()).not.toEqual(before);
  });
  it('blocks input before a toolbar field can retain a deferred blur commit', () => {
    const { claim } = setup(); claim();
    const field = document.createElement('input'); document.querySelector('[data-studio-toolbar]')!.append(field);
    const handler = vi.fn(); field.addEventListener('input', handler);
    field.dispatchEvent(new Event('input', { bubbles: true })); expect(handler).not.toHaveBeenCalled();
  });
  it('provides the exact English and Urdu explanations', () => {
    expect(formattingSafetyMessage(false)).toBe('Formatting selected text inside a text box is not yet available.');
    expect(formattingSafetyMessage(true)).toBe('ٹیکسٹ باکس میں منتخب عبارت کی فارمیٹنگ ابھی دستیاب نہیں۔');
  });

  function selectFrame(kind: string) {
    const frame = document.createElement('div');
    frame.setAttribute('data-studio-frame', kind);
    const handle = document.createElement('div');
    handle.setAttribute('data-studio-frame-handle', 'se');
    frame.append(handle);
    document.querySelector('[data-studio-scroller]')!.append(frame);
    return frame;
  }

  it('does not treat a selected picture box as a text box after the picture tool', () => {
    const { guard, reject, before } = setup();
    const tool = document.createElement('button');
    tool.setAttribute('data-studio-tool-button', 'cross-square');
    document.querySelector('[data-studio-root]')!.append(tool);
    tool.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(reject).not.toHaveBeenCalled();
    for (const kind of ['picture-rect', 'picture-ellipse', 'picture-round-rect']) {
      document.querySelectorAll('[data-studio-frame]').forEach((node) => node.remove());
      selectFrame(kind);
      reject.mockClear();
      const snapshot = editor.getJSON();
      expect(guard.canFormat()).toBe(true);
      expect(reject).not.toHaveBeenCalled();
      editor.commands.toggleBold();
      expect(reject).not.toHaveBeenCalled();
      expect(editor.getJSON()).not.toEqual(snapshot);
      editor.commands.toggleBold();
    }
    expect(editor.getJSON()).toEqual(before);
  });

  it('keeps story formatting when the pointer target is a picture box', () => {
    const { guard, reject, before } = setup();
    const frame = selectFrame('picture-round-rect');
    frame.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(guard.canFormat()).toBe(true);
    editor.commands.toggleBold();
    expect(reject).not.toHaveBeenCalled();
    expect(editor.getJSON()).not.toEqual(before);
  });

  it('still rejects formatting for a selected shape that is not a picture box', () => {
    const { guard, reject, before } = setup();
    const tool = document.createElement('button');
    tool.setAttribute('data-studio-tool-button', 'rect');
    document.querySelector('[data-studio-root]')!.append(tool);
    tool.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    selectFrame('rect');
    expect(guard.canFormat()).toBe(false);
    expect(reject).toHaveBeenCalled();
    editor.commands.toggleBold();
    expect(editor.getJSON()).toEqual(before);
  });

  it('still rejects a claimed text box when a picture box is also on the page', () => {
    const { claim, guard, reject, before, box } = setup();
    selectFrame('picture-rect');
    claim();
    expect(guard.canFormat()).toBe(false);
    expect(reject).toHaveBeenCalled();
    editor.commands.toggleBold();
    expect(editor.getJSON()).toEqual(before);
    expect(box.value).toBe('محفوظ عبارت');
  });
});

describe('deliberate story clipboard edits', () => {
 for(const eventName of ['paste','cut','drop'])for(const dismissal of ['load','margin','escape'])it(`${eventName} reclaims the story after ${dismissal} before its transaction`,()=>{
  const {guard,reject,clearNotice}=setup();
  if(dismissal==='load')guard.documentChanged();
  if(dismissal==='margin')document.querySelector('[data-studio-scroller]')!.dispatchEvent(new Event('pointerdown',{bubbles:true}));
  if(dismissal==='escape')editor.view.dom.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  const child=editor.view.dom.querySelector('p')!;
  child.addEventListener(eventName,event=>{event.preventDefault();if(eventName==='cut')editor.commands.deleteSelection();else editor.commands.insertContent('first clipboard edit');},{once:true});
  child.dispatchEvent(new Event(eventName,{bubbles:true,cancelable:true}));
  expect(editor.getText()).toBe(eventName==='cut'?'':'first clipboard edit');expect(reject).not.toHaveBeenCalled();expect(clearNotice).toHaveBeenCalled();
 });
 for(const eventName of ['paste','cut','drop'])it(`${eventName} never promotes frame ownership, even on the story`,()=>{
  const {claim,box,before,reject}=setup();claim();
  for(const target of [box,editor.view.dom])target.dispatchEvent(new Event(eventName,{bubbles:true,cancelable:true}));
  editor.commands.toggleBold();expect(editor.getJSON()).toEqual(before);expect(box.value).toBe('محفوظ عبارت');expect(reject).toHaveBeenCalled();
 });
 for(const action of ['edit.paste','edit.cut','context-paste'])it(`${action} explicitly edits a focused story after load`,()=>{
  const {guard,reject}=setup();guard.documentChanged();editor.view.dom.focus();
  const menu=document.createElement('div'),button=document.createElement('button');
  if(action==='context-paste'){menu.dataset.studioTextMenu='';button.setAttribute('role','menuitem');button.textContent='Paste';}else button.dataset.menuAction=action;
  menu.setAttribute('role','menu');menu.append(button);document.querySelector('[data-studio-root]')!.append(menu);
  button.dispatchEvent(new Event('pointerdown',{bubbles:true}));button.focus();
  button.addEventListener('click',()=>editor.commands.insertContent('menu edit'));
  button.click();expect(editor.getText()).toBe('menu edit');expect(reject).not.toHaveBeenCalled();
 });
 it('toolbar Bold remains unauthorized after load or programmatic focus',()=>{
  const {guard,before,reject}=setup();guard.documentChanged();editor.view.dom.focus();
  const button=document.querySelector('[data-studio-toolbar] button')!;const handler=vi.fn(()=>editor.commands.toggleBold());button.addEventListener('click',handler);button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  expect(handler).not.toHaveBeenCalled();expect(editor.getJSON()).toEqual(before);expect(reject).toHaveBeenCalled();
 });
 it('removes clipboard capture listeners on dispose',()=>{
  const {guard,clearNotice}=setup();guard.documentChanged();guard.dispose();dispose=undefined;
  for(const name of ['paste','cut','drop'])editor.view.dom.dispatchEvent(new Event(name,{bubbles:true}));expect(clearNotice).not.toHaveBeenCalled();
 });
});

it('menu clipboard actions cannot promote a frame or an unfocused, invalidated target',()=>{
 const {guard,claim,before,reject}=setup();const button=document.createElement('button');button.dataset.menuAction='edit.paste';document.querySelector('[data-studio-root]')!.append(button);button.addEventListener('click',()=>editor.commands.insertContent('must not insert'));
 claim();button.click();expect(editor.getJSON()).toEqual(before);
 guard.documentChanged();button.focus();button.click();expect(editor.getJSON()).toEqual(before);expect(reject).toHaveBeenCalledTimes(2);
});
it('switching documents clears a menu clipboard focus breadcrumb',()=>{
 const {guard,before}=setup();guard.documentChanged();editor.view.dom.focus();const button=document.createElement('button');button.dataset.menuAction='edit.paste';button.setAttribute('role','menuitem');document.querySelector('[data-studio-root]')!.append(button);button.dispatchEvent(new Event('pointerdown',{bubbles:true}));button.focus();guard.documentChanged();button.addEventListener('click',()=>editor.commands.insertContent('stale paste'));button.click();expect(editor.getJSON()).toEqual(before);
});
