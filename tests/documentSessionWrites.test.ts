import { describe, expect, it } from 'vitest';
import { createDocumentSessionWrites } from '../app/tools/document-studio/utils/documentSessionWrites';
describe('document session writes', () => {
  it('drains queued metadata before a final content save', async () => {
    const queue = createDocumentSessionWrites(); const order: string[] = [];
    let release!: () => void;
    const metadata = queue.write(async () => { await new Promise<void>(r => { release = r; }); order.push('settings'); });
    await Promise.resolve(); const final = queue.write(async () => { order.push('content'); });
    expect(order).toEqual([]); release(); await Promise.all([metadata, final]); await queue.drain();
    expect(order).toEqual(['settings', 'content']);
  });
  it('exposes failures to the caller and permits a safe retry', async () => {
    const queue = createDocumentSessionWrites();
    await expect(queue.write(async () => { throw new Error('quota'); })).rejects.toThrow('quota');
    await expect(queue.write(async () => 'saved')).resolves.toBe('saved');
  });
});
