/** @vitest-environment happy-dom */
import { afterEach, expect, test } from 'vitest';
import { mountDocumentPrintPortal, unmountDocumentPrintPortal, waitForPrintFonts } from '../app/tools/document-studio/utils/documentView';
import { studioPrintFrames } from './fixtures/studioPrintFrames';
afterEach(() => { unmountDocumentPrintPortal(); document.body.innerHTML = ''; });
function surface() {
  document.body.innerHTML = '<div data-studio-print-root data-print-page-width-mm="148" data-print-page-height-mm="210" data-print-margin-top-mm="12.7" data-print-margin-bottom-mm="12.7" data-print-margin-left-mm="12.7" data-print-margin-right-mm="12.7"><div data-studio-print-surface><div class="qalam-editor-content"><div class="ProseMirror"><p>Unchanged story</p></div></div></div></div>';
}
test('no-frame browser printing retains the existing page margins and markup', () => {
  surface(); const portal = mountDocumentPrintPortal()!;
  expect(portal.querySelector('[data-print-frame]')).toBeNull(); expect(portal.hasAttribute('data-print-frames')).toBe(false);
  expect(portal.querySelector('style')!.textContent).toContain('margin: 12.7mm 0 12.7mm 0');
});
test('browser printing uses explicit current frames, ordered and in physical page groups', () => {
  surface(); localStorage.setItem('qalam-studio-frames-v1', 'stale unrelated snapshot');
  const portal = mountDocumentPrintPortal(studioPrintFrames)!;
  expect(portal.querySelectorAll('[data-print-frame]')).toHaveLength(studioPrintFrames.length);
  for (const page of [1, 2]) expect([...portal.querySelectorAll(`[data-print-object-page="${page}"] [data-print-frame]`)].map(node => node.getAttribute('data-print-frame-id'))).toEqual(studioPrintFrames.filter(frame => frame.page === page).map(frame => frame.id));
  expect((portal.querySelector('[data-print-object-page="2"]') as HTMLElement).style.top).toBe('210mm');
  expect(portal.querySelector('p')?.textContent).toBe('Unchanged story');
  expect(portal.querySelector('[data-studio-frame-handle],textarea')).toBeNull();
  expect(portal.querySelector('style')!.textContent).toContain('box-decoration-break:clone');
});

test('an unavailable frame face records its fallback without aborting the existing print workflow', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(document, 'fonts');
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve(), load: async () => { throw new Error('unavailable'); }, check: () => false } });
  try {
    const portal = document.createElement('div'); portal.innerHTML = '<div data-print-frame-font="Jameel Noori Nastaleeq">Jameel Noori Nastaleeq</div>';
    expect(await waitForPrintFonts(portal)).toBe(false);
    expect(portal.getAttribute('data-print-unavailable-frame-fonts')).toContain('Jameel Noori Nastaleeq');
  } finally { if (descriptor) Object.defineProperty(document, 'fonts', descriptor); else Reflect.deleteProperty(document, 'fonts'); }
});
