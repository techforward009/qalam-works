/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudioPdfRecoveryDialog from '../app/tools/document-studio/components/StudioPdfRecoveryDialog';
import { isRecoverablePdfStatus } from '../app/tools/document-studio/utils/pdfExportRecovery';
afterEach(cleanup);
describe('PDF recovery classification', () => {
  it.each([408, 429, 502, 503, 504])('offers recovery for temporary HTTP %s', status => expect(isRecoverablePdfStatus(status)).toBe(true));
  it.each([200, 400, 401, 403, 413, 415, 422, 500])('does not call HTTP %s server overload', status => expect(isRecoverablePdfStatus(status)).toBe(false));
});
describe('classic PDF recovery dialog', () => {
  it.each([false, true])('has readable localized content, initial focus, focus trapping and Escape (Urdu=%s)', isUr => {
    const close = vi.fn();
    render(<StudioPdfRecoveryDialog isUr={isUr} recoverable onClose={close} onPrint={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const print = screen.getByRole('button', { name: isUr ? 'براؤزر سے پی ڈی ایف محفوظ کریں' : 'Save PDF using browser' });
    const cancel = screen.getByRole('button', { name: isUr ? 'بند کریں' : 'Close' });
    expect(document.activeElement).toBe(print);
    expect(dialog.textContent).toContain(isUr ? 'پی ڈی ایف بنانے والا سرور اس وقت مصروف ہے۔' : 'The PDF service is busy or temporarily unavailable.');
    fireEvent.keyDown(print, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(cancel, { key: 'Tab' }); expect(document.activeElement).toBe(print);
    fireEvent.keyDown(print, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  });
  it('does not leak modal keystrokes into editor-level shortcut handlers', () => {
    const key = vi.fn(); window.addEventListener('keydown', key);
    render(<StudioPdfRecoveryDialog isUr={false} recoverable onClose={vi.fn()} onPrint={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Save PDF using browser' }), { key: 'l', ctrlKey: true, altKey: true });
    expect(key).not.toHaveBeenCalled(); window.removeEventListener('keydown', key);
  });
  it('preserves validation explanations without a busy message or print offer', () => {
    render(<StudioPdfRecoveryDialog isUr={false} recoverable={false} error='Document exceeds the supported size.' onClose={vi.fn()} onPrint={vi.fn()} />);
    expect(screen.getByRole('dialog').textContent).toContain('Document exceeds the supported size.');
    expect(screen.queryByRole('button', { name: 'Save PDF using browser' })).toBeNull();
    expect(screen.getByRole('dialog').textContent).not.toContain('temporarily unavailable');
  });
  it('invokes existing print only once and never treats its return as a successful save', async () => {
    let resolve!: () => void;
    const print = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    render(<StudioPdfRecoveryDialog isUr={false} recoverable onClose={vi.fn()} onPrint={print} />);
    const button = screen.getByRole('button', { name: 'Save PDF using browser' }) as HTMLButtonElement;
    fireEvent.click(button); fireEvent.click(button); expect(print).toHaveBeenCalledOnce();
    resolve(); await waitFor(() => expect(button.disabled).toBe(true));
    expect(screen.getByRole('dialog').textContent).not.toContain('successfully saved');
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
  it('restores focus and makes print failures actionable without losing the dialog', async () => {
    const before = document.createElement('button'); document.body.appendChild(before); before.focus();
    const { unmount } = render(<StudioPdfRecoveryDialog isUr={false} recoverable onClose={vi.fn()} onPrint={vi.fn().mockRejectedValue(new Error('blocked'))} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save PDF using browser' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('could not open'));
    unmount(); expect(document.activeElement).toBe(before); before.remove();
  });
});
