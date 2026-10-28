import { describe, expect, it } from 'vitest';
import { validatePrintFrames, renderPrintFrame, framePrintTopMm } from '../app/tools/document-studio/utils/printableFrames';
const base = { id: 'frame', page: 2, xMm: 20, yMm: 30, wMm: 40, hMm: 25, flip: false, text: '' };
describe('validated printable drawing objects', () => {
  it.each(['rect', 'ellipse', 'round-rect', 'line', 'text'])('renders %s at physical millimetre coordinates without editor controls', kind => {
    const [frame] = validatePrintFrames([{ ...base, kind }]); const html = renderPrintFrame(frame);
    expect(html).toContain('left:20mm'); expect(html).toContain('top:30mm'); expect(html).toContain('width:40mm'); expect(html).toContain('height:25mm');
    expect(html).not.toMatch(/textarea|handle|caret|selected/);
  });
  it('maps page numbers independently of zoom or spread layout', () => { expect(framePrintTopMm(base, 210)).toBeCloseTo(240); });
  it('keeps rounded radius, opposite line directions and escaped text', () => {
    expect(renderPrintFrame({ ...base, kind: 'round-rect' })).toContain('rx="6.35"');
    expect(renderPrintFrame({ ...base, kind: 'line', flip: true })).not.toEqual(renderPrintFrame({ ...base, kind: 'line', flip: false }));
    const html = renderPrintFrame({ ...base, kind: 'text', text: '<img src=x onerror=alert(1)> & سلام' });
    expect(html).toContain('&lt;img'); expect(html).not.toContain('<img'); expect(html).toContain('&amp;');
    expect(html).toContain('unicode-bidi:plaintext');
  });
  it.each([NaN, Infinity, '20', null])('rejects invalid geometry %s', xMm => expect(() => validatePrintFrames([{ ...base, kind: 'rect', xMm }])).toThrow());
  it.each([{ page: 0 }, { page: 1.5 }, { wMm: -1 }, { kind: 'script' }, { text: 'x'.repeat(10001) }])('rejects malformed or excessive frames %j', change => expect(() => validatePrintFrames([{ ...base, kind: 'rect', ...change }])).toThrow());
  it('accepts missing/empty payloads without changing old requests and caps work', () => {
    expect(validatePrintFrames(undefined)).toEqual([]); expect(validatePrintFrames([])).toEqual([]);
    expect(() => validatePrintFrames(Array.from({ length: 201 }, () => ({ ...base, kind: 'rect' })))).toThrow();
  });
});

it('bounds the complete payload, including unknown fields, before producing markup', () => {
  expect(() => validatePrintFrames([{ ...base, kind: 'rect', ignored: 'x'.repeat(256 * 1024) }])).toThrow(/byte limit/);
});
