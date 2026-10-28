import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/** Internal document replacement, never a formatting-command escape hatch. */
export const CONTENT_REPLACEMENT = 'studio-content-replacement';
export const formattingSafetyMessage = (urdu: boolean) => urdu
  ? 'ٹیکسٹ باکس میں منتخب عبارت کی فارمیٹنگ ابھی دستیاب نہیں۔'
  : 'Formatting selected text inside a text box is not yet available.';

/** Focus is not ownership: ribbon/dialog focus and commands.focus() must not
 * promote a textarea target to the story. No selection or storage data is kept. */
export function installFormattingSafety(editor: Editor, reject: () => void, clearNotice: () => void) {
  const dom = editor.view.dom;
  const root = dom.closest<HTMLElement>('[data-studio-root]') ?? dom.parentElement!;
  let owner: 'story' | 'frame' | 'none' = 'story';
  let input: HTMLTextAreaElement | null = null;
  const invalidate = () => { owner = 'none'; input = null; };
  // A document replacement or switch invalidates *every* previous target,
  // including story selections. Programmatic focus in the new document must
  // not authorize formatting until the user explicitly selects/edits there.
  const documentChanged = () => invalidate();
  const canFormat = () => {
    if (owner === 'frame' && (!input?.isConnected || input.readOnly)) invalidate();
    if (owner === 'story') return true;
    reject(); return false;
  };
  const keyId = new PluginKey('studio-formatting-safety');
  const plugin = new Plugin({
    key: keyId,
    filterTransaction(tr) {
      if (tr.getMeta(CONTENT_REPLACEMENT)) { documentChanged(); return true; }
      // Includes collapsed-selection stored marks and direct dialog/shortcut
      // transactions. Layout-only and selection-only transactions still work.
      return !(tr.docChanged || tr.storedMarksSet) || canFormat();
    },
  });
  editor.registerPlugin(plugin);
  const element = (event: Event) => event.target instanceof Element ? event.target : null;
  const claimFrame = (target: Element | null) => {
    const box = target?.closest<HTMLTextAreaElement>('textarea[data-studio-text-frame]');
    if (!box || !root.contains(box)) return false;
    if (box.readOnly) invalidate(); else { owner = 'frame'; input = box; }
    return true;
  };
  const pointer = (event: Event) => {
    const target = element(event);
    if (claimFrame(target)) return;
    if (target && dom.contains(target)) { owner = 'story'; input = null; clearNotice(); }
    else if (target?.closest('[data-studio-scroller], [data-studio-tool-button]') && root.contains(target)) invalidate();
  };
  const focus = (event: Event) => { claimFrame(element(event)); };
  const cancel = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const control = (event: Event) => {
    const target = element(event);
    if (!target || !root.contains(target)) return;
    // Toolbar widgets are formatting controls; language choice is processing
    // configuration, not text formatting. Menus/dialogs have their own checks.
    if (!target.closest('[data-studio-toolbar]') || target.closest('[data-studio-document-language]')) return;
    if (event.type === 'click' && !target.closest('button')) return;
    if (!canFormat()) cancel(event);
  };
  const key = (event: KeyboardEvent) => {
    const target = element(event);
    if (!target || !root.contains(target)) return;
    if (event.key === 'Escape' && !target.closest('[role="dialog"]')) { invalidate(); return; }
    if (dom.contains(target) && ((['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key) && !event.ctrlKey && !event.metaKey) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a')) && !event.altKey) {
      owner = 'story'; input = null; clearNotice();
    }
    const shortcut = (event.ctrlKey || event.metaKey) &&
      (['b','i','u','h','g'].includes(event.key.toLowerCase()) || (event.altKey && ['l','r','c','j','f'].includes(event.key.toLowerCase())));
    const fieldCommit = event.key === 'Enter' && target.closest('[data-studio-toolbar]');
    if ((shortcut || fieldCommit) && !canFormat()) cancel(event);
  };
  const typing = (event: Event) => {
    control(event);
    if (event.defaultPrevented) return;
    const e = event as InputEvent;
    // A deliberate new story edit may establish a target after dismissal or
    // document load; toolbar focus alone never does. Box ownership stays closed.
    if (owner === 'none' && event.target === dom && /^(insert|delete)/.test(e.inputType)) { owner = 'story'; clearNotice(); }
  };
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('focusin', focus, true);
  document.addEventListener('click', control, true);
  document.addEventListener('change', control, true);
  document.addEventListener('input', control, true);
  document.addEventListener('keydown', key, true);
  document.addEventListener('beforeinput', typing, true);
  return { canFormat, invalidate, documentChanged, dispose() {
    editor.unregisterPlugin(keyId);
    document.removeEventListener('pointerdown', pointer, true);
    document.removeEventListener('focusin', focus, true);
    document.removeEventListener('click', control, true);
    document.removeEventListener('change', control, true);
    document.removeEventListener('input', control, true);
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('beforeinput', typing, true);
  } };
}
