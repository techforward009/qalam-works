import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { isPictureBox } from '../components/StudioObjectLayer';
import type { DocumentStudioSettings } from './documentSettings';
import type { StudioTextAlign } from './documentCommands';

/** Read-only visual subscribers must follow the same ownership as the guard. */
export const FORMATTING_TARGET_CHANGE = 'studio-formatting-target-change';
/** Textarea and single-line input, or the flagged multi-line ProseMirror root. */
const FRAME_FIELD_SELECTOR = 'textarea[data-studio-text-frame], input[data-studio-text-frame], [data-studio-frame-editor]';
type FormattingInput = HTMLElement;
type FormattingTarget = Readonly<{ owner: 'story' | 'frame' | 'none'; input: FormattingInput | null }>;
function frameFieldReadOnly(input: HTMLElement | null | undefined): boolean {
  if (!input) return true;
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) return input.readOnly;
  return false;
}
const targets = new WeakMap<HTMLElement, FormattingTarget>();
type FrameStylePatch = { typography?: DocumentStudioSettings['typography']; textColor?: string | undefined; textAlign?: StudioTextAlign };
const frameStyleUpdaters = new WeakMap<FormattingInput, (patch: FrameStylePatch) => void>();
export function registerFrameStyleUpdater(input: FormattingInput, updater: (patch: FrameStylePatch) => void): () => void {
  frameStyleUpdaters.set(input, updater);
  return () => { if (frameStyleUpdaters.get(input) === updater) frameStyleUpdaters.delete(input); };
}
export function updateFormattingFrame(input: FormattingInput, patch: FrameStylePatch): boolean {
  const updater = frameStyleUpdaters.get(input);
  if (!updater || !input.isConnected || frameFieldReadOnly(input)) return false;
  updater(patch);
  return true;
}
type FrameHistoryHandler = { undo: () => boolean; redo: () => boolean };
const frameHistories = new WeakMap<FormattingInput, FrameHistoryHandler>();
export function registerFrameHistory(input: FormattingInput, handler: FrameHistoryHandler): () => void {
  frameHistories.set(input, handler);
  return () => { if (frameHistories.get(input) === handler) frameHistories.delete(input); };
}
export function runFrameHistory(input: FormattingInput, action: "undo" | "redo"): boolean {
  return frameHistories.get(input)?.[action]() ?? false;
}
export function isFormattingSurface(target: Element | null): boolean {
  return Boolean(target?.closest('[data-studio-toolbar], [role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-menu-root], [data-menu-dropdown], [data-studio-formatting-notice]'));
}
export function readFormattingTarget(element: HTMLElement): FormattingTarget | undefined {
  const root = element.closest<HTMLElement>('[data-studio-root]');
  return root ? targets.get(root) : undefined;
}
export function hasEditableFormattingFrame(element: HTMLElement): boolean {
  const target = readFormattingTarget(element);
  return target?.owner === 'frame' && Boolean(target.input?.isConnected && !frameFieldReadOnly(target.input));
}

/** Internal document replacement, never a formatting-command escape hatch. */
export const CONTENT_REPLACEMENT = 'studio-content-replacement';
/** Explicit table-dialog transactions are valid in a document with no active formatting target. */
export const TABLE_DIALOG_CHANGE = 'studio-table-dialog-change';
export const formattingSafetyMessage = (urdu: boolean) => urdu
  ? 'ٹیکسٹ باکس میں منتخب عبارت کی فارمیٹنگ ابھی دستیاب نہیں۔'
  : 'Formatting selected text inside a text box is not yet available.';

/** Focus is not ownership: ribbon/dialog focus and commands.focus() must not
 * promote a textarea target to the story. No selection or storage data is kept. */
export function installFormattingSafety(editor: Editor, reject: () => void, clearNotice: () => void) {
  const dom = editor.view.dom;
  const root = dom.closest<HTMLElement>('[data-studio-root]') ?? dom.parentElement!;
  let owner: 'story' | 'frame' | 'none' = 'story';
  let input: FormattingInput | null = null;
  // Only clipboard actions may use this focus breadcrumb; never formatting.
  let storyClipboardFocus = dom.contains(document.activeElement);
  const publish = () => { targets.set(root, { owner, input }); root.dispatchEvent(new Event(FORMATTING_TARGET_CHANGE)); };
  const invalidate = () => { owner = 'none'; input = null; storyClipboardFocus = false; publish(); };
  // A document replacement or switch invalidates *every* previous target,
  // including story selections. Programmatic focus in the new document must
  // not authorize formatting until the user explicitly selects/edits there.
  const documentChanged = () => invalidate();
  const pictureFrame = (target: Element | null) => {
    const frame = target?.closest<HTMLElement>('[data-studio-frame]');
    return Boolean(frame && root.contains(frame) && isPictureBox(frame.getAttribute('data-studio-frame') ?? ''));
  };
  // A selected picture box is not a text box. Handles mark the selection
  // after a draw, before the next pointer event lands on the frame itself.
  // A real text box in the same selection still blocks formatting.
  const selectedPictureBox = () => {
    const frames = new Set<HTMLElement>();
    for (const handle of root.querySelectorAll<HTMLElement>('[data-studio-frame-handle]')) {
      const frame = handle.closest<HTMLElement>('[data-studio-frame]');
      if (frame) frames.add(frame);
    }
    let picture = false;
    for (const frame of frames) {
      const kind = frame.getAttribute('data-studio-frame') ?? '';
      if (kind === 'text' || frame.querySelector(FRAME_FIELD_SELECTOR)) return false;
      if (isPictureBox(kind)) picture = true;
    }
    return picture;
  };
  const canFormat = () => {
    if (owner === 'frame' && (!input?.isConnected || frameFieldReadOnly(input))) invalidate();
    if (owner === 'story') return true;
    if (owner === 'frame') { reject(); return false; }
    if (selectedPictureBox()) return true;
    reject(); return false;
  };
  const keyId = new PluginKey('studio-formatting-safety');
  const plugin = new Plugin({
    key: keyId,
    filterTransaction(tr) {
      if (tr.getMeta(CONTENT_REPLACEMENT)) { documentChanged(); return true; }
      if (tr.docChanged && tr.getMeta(TABLE_DIALOG_CHANGE) === true && owner === 'none') return true;
      // Includes collapsed-selection stored marks and direct dialog/shortcut
      // transactions. Layout-only and selection-only transactions still work.
      return !(tr.docChanged || tr.storedMarksSet) || canFormat();
    },
  });
  editor.registerPlugin(plugin);
  const element = (event: Event) => event.target instanceof Element ? event.target : null;
  const claimFrame = (target: Element | null) => {
    const box = target?.closest<FormattingInput>(FRAME_FIELD_SELECTOR);
    if (!box || !root.contains(box)) return false;
    storyClipboardFocus = false;
    if (frameFieldReadOnly(box)) invalidate(); else { owner = 'frame'; input = box; publish(); }
    return true;
  };
  const releaseClaimedTextBox = () => {
    if (owner !== 'frame') return;
    owner = 'none'; input = null; publish(); clearNotice();
  };
  const pointer = (event: Event) => {
    const target = element(event);
    // Picture boxes live in the scroller. They must not be claimed as text
    // frames and must not invalidate into the text-box formatting toast.
    if (pictureFrame(target)) { releaseClaimedTextBox(); return; }
    if (claimFrame(target)) return;
    if (isFormattingSurface(target) && dom.contains(document.activeElement)) storyClipboardFocus = true;
    if (target && dom.contains(target)) { owner = 'story'; input = null; publish(); clearNotice(); }
    else if (target?.closest('[data-studio-scroller], [data-studio-tool-button]') && root.contains(target)) invalidate();
  };
  const focus = (event: Event) => {
    const target = element(event);
    if (pictureFrame(target)) return;
    if (claimFrame(target)) return;
    if (target && dom.contains(target)) storyClipboardFocus = true;
    else if (!isFormattingSurface(target)) storyClipboardFocus = false;
  };
  const claimStoryEdit = () => {
    if (owner !== 'none') return;
    owner = 'story'; input = null; publish(); clearNotice();
  };
  const clipboard = (event: Event) => {
    const target = element(event);
    if (target && dom.contains(target) && !target.closest(FRAME_FIELD_SELECTOR)) claimStoryEdit();
  };
  const clipboardMenu = (event: Event) => {
    const target = element(event), button = target?.closest<HTMLButtonElement>('button');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const action = button.getAttribute('data-menu-action');
    const contextAction = button.closest('[data-studio-text-menu]') && /^(Paste|Cut)$/.test(button.textContent?.trim() ?? '');
    if ((action === 'edit.paste' || action === 'edit.cut' || contextAction) &&
        (storyClipboardFocus || dom.contains(document.activeElement))) claimStoryEdit();
  };
  const cancel = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const control = (event: Event) => {
    const target = element(event);
    if (!target || !root.contains(target)) return;
    // Toolbar widgets are formatting controls; language choice is processing
    // configuration, not text formatting. Menus/dialogs have their own checks.
    if (!target.closest('[data-studio-toolbar]') || target.closest('[data-studio-document-language]')) return;
    const supportedFrameControl = target.closest('[data-studio-font-family], [data-studio-font-size], [data-studio-size-list], [data-studio-colour], [data-studio-colour-list], [data-studio-colour-option], [data-studio-color-swatch], [data-studio-text-color], [data-studio-text-color-button], [data-studio-text-color-palette], [data-studio-geom="align-left"], [data-studio-geom="align-right"], [data-studio-geom="align-center"], [data-studio-geom="align-justify"], [data-studio-geom="align-full"]');
    if (owner === 'frame' && supportedFrameControl && input?.isConnected && !frameFieldReadOnly(input)) return;
    if (event.type === 'click' && !target.closest('button')) return;
    if (!canFormat()) cancel(event);
  };
  const key = (event: KeyboardEvent) => {
    const target = element(event);
    if (!target || !root.contains(target)) return;
    if (event.key === 'Escape' && !target.closest('[role="dialog"]')) {
      if (event.isComposing && target.closest('[data-studio-frame-editor]')) return;
      invalidate();
      return;
    }
    if (dom.contains(target) && ((['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key) && !event.ctrlKey && !event.metaKey) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a')) && !event.altKey) {
      owner = 'story'; input = null; publish(); clearNotice();
    }
    const shortcut = (event.ctrlKey || event.metaKey) &&
      (['b','i','u','h','g'].includes(event.key.toLowerCase()) || (event.altKey && ['l','r','c','j','f'].includes(event.key.toLowerCase())));
    const frameAlignShortcut = event.altKey && (event.ctrlKey || event.metaKey) && ['l','r','c','j'].includes(event.key.toLowerCase());
    const supportedCommit = target.closest('[data-studio-font-size]');
    const fieldCommit = event.key === 'Enter' && target.closest('[data-studio-toolbar]') && !(owner === 'frame' && supportedCommit);
    if ((shortcut && !(owner === 'frame' && frameAlignShortcut)) || fieldCommit) { if (!canFormat()) cancel(event); }
  };
  const typing = (event: Event) => {
    control(event);
    if (event.defaultPrevented) return;
    const e = event as InputEvent;
    // A deliberate new story edit may establish a target after dismissal or
    // document load; toolbar focus alone never does. Box ownership stays closed.
    if (owner === 'none' && event.target === dom && /^(insert|delete)/.test(e.inputType)) { owner = 'story'; publish(); clearNotice(); }
  };
  publish();
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('focusin', focus, true);
  document.addEventListener('click', clipboardMenu, true);
  document.addEventListener('click', control, true);
  for (const name of ['paste', 'cut', 'drop']) document.addEventListener(name, clipboard, true);
  document.addEventListener('change', control, true);
  document.addEventListener('input', control, true);
  document.addEventListener('keydown', key, true);
  document.addEventListener('beforeinput', typing, true);
  return { canFormat, invalidate, documentChanged, dispose() {
    targets.delete(root); root.dispatchEvent(new Event(FORMATTING_TARGET_CHANGE));
    editor.unregisterPlugin(keyId);
    document.removeEventListener('pointerdown', pointer, true);
    document.removeEventListener('focusin', focus, true);
    document.removeEventListener('click', clipboardMenu, true);
    document.removeEventListener('click', control, true);
    for (const name of ['paste', 'cut', 'drop']) document.removeEventListener(name, clipboard, true);
    document.removeEventListener('change', control, true);
    document.removeEventListener('input', control, true);
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('beforeinput', typing, true);
  } };
}
