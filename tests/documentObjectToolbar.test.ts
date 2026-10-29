import { expect, test } from 'vitest';
import { frameAppearance, mixedFrameValue, parseFrameMillimetres, patchSelectedFrames, validFrameAppearance } from '../app/tools/document-studio/utils/objectToolbar';
import type { StudioFrame } from '../app/tools/document-studio/components/StudioObjectLayer';
import { renderPrintFrame, validatePrintFrames } from '../app/tools/document-studio/utils/printableFrames';
const frames: StudioFrame[] = [{ id: 'a', kind: 'text', page: 2, xMm: 30, yMm: 40, wMm: 70, hMm: 30, flip: false, text: 'محفوظ', inPageSource: { version: 3, storyNumber: 2, descriptorOffset: 100, runAround: 'explicit-on' } }, { id: 'b', kind: 'rect', page: 1, xMm: 110, yMm: 90, wMm: 70, hMm: 30, flip: false, text: '' }];
const page = { widthMm: 210, heightMm: 297 };
test('geometry targets exact IDs, preserves precision, Unicode, source metadata and pages', () => {
    const next = patchSelectedFrames(frames, ['a'], { xMm: 35.123456789 }, page)!;
    expect(next[0]).toEqual({ ...frames[0], xMm: 35.123456789 });
    expect(next[1]).toBe(frames[1]);
    expect(frames[0].xMm).toBe(30);
});
test('mixed values and batch validation are atomic', () => {
    expect(mixedFrameValue(frames, f => f.xMm)).toBeUndefined();
    expect(mixedFrameValue(frames, f => f.wMm)).toBe(70);
    expect(patchSelectedFrames(frames, ['a', 'b'], { wMm: 120 }, page)).toBeNull();
    expect(patchSelectedFrames(frames, ['a', 'b'], { wMm: 60 }, page)!.map(f => f.wMm)).toEqual([60, 60]);
    expect(patchSelectedFrames(frames, ['missing'], { wMm: 10 }, page)).toBeNull();
});
test.each(['NaN', 'Infinity', '20cm', '1e2', '12oops', '', '-1'])('rejects malformed mm %s', s => expect(parseFrameMillimetres(s)).toBeNull());
test.each([0, -1, Infinity, NaN, 300])('rejects invalid dimension %s', wMm => expect(patchSelectedFrames(frames, ['a'], { wMm }, page)).toBeNull());
test('supported appearance validates and survives export validation and both shared renderers', () => {
    const appearance = { border: true, borderWidthPt: 2, borderStyle: 'dashed' as const, borderColor: '#FF0000', fill: '#FFFF00' };
    expect(validFrameAppearance(appearance)).toBe(true);
    expect(validFrameAppearance({ ...appearance, fill: 'url(evil)' })).toBe(false);
    const next = patchSelectedFrames(frames, ['a'], { appearance }, page)!;
    expect(validatePrintFrames(next)[0].appearance).toEqual(appearance);
    expect(renderPrintFrame(next[0])).toContain('border:2pt dashed #FF0000');
    expect(renderPrintFrame(next[0])).toContain('background:#FFFF00');
    expect(frameAppearance(frames[0]).borderWidthPt).toBe(0.75);
});
