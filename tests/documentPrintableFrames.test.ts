import { describe, expect, it } from 'vitest';
import { validatePrintFrames, renderPrintFrame, framePrintTopMm, frameTypography, printFramePageMarkup } from '../app/tools/document-studio/utils/printableFrames';
import { blockLeadingPt } from '../app/tools/document-studio/utils/autoLeading';
import { defaultDocumentSettings } from '../app/tools/document-studio/utils/documentSettings';
import { getFontById } from '../app/tools/document-studio/utils/fontRegistry';
const base = { id: 'frame', page: 2, xMm: 20, yMm: 30, wMm: 40, hMm: 25, flip: false, text: '' };
describe('validated printable drawing objects', () => {
  it.each(['rect', 'ellipse', 'round-rect', 'line', 'text'])('renders %s at physical millimetre coordinates without editor controls', kind => {
    const [frame] = validatePrintFrames([{ ...base, kind }]); const html = renderPrintFrame(frame);
    expect(html).toContain('left:20mm'); expect(html).toContain('top:30mm'); expect(html).toContain('width:40mm'); expect(html).toContain('height:25mm');
    expect(html).not.toMatch(/textarea|handle|caret|selected/);
  });

  it('honors picture roundness overrides and excludes dont-print frames', () => {
    const rounded = renderPrintFrame({ ...base, kind: 'picture-round-rect', roundnessMm: 3 });
    expect(rounded).toContain('rx="3"');
    expect(renderPrintFrame({ ...base, kind: 'picture-round-rect' })).toContain('rx="6.35"');
    const markup = printFramePageMarkup([
      { ...base, kind: 'rect' as const },
      { ...base, id: 'hidden', kind: 'rect' as const, dontPrint: true },
    ], 200, 300);
    expect(markup).toContain('data-print-frame-id="frame"');
    expect(markup).not.toContain('data-print-frame-id="hidden"');
    expect(validatePrintFrames([{ ...base, kind: 'picture-round-rect', locked: true, dontPrint: true, roundnessMm: 3 }])[0]).toMatchObject({ locked: true, dontPrint: true, roundnessMm: 3 });
  });

  it('maps page numbers independently of zoom or spread layout', () => { expect(framePrintTopMm(base, 210)).toBeCloseTo(240); });
  it('keeps rounded radius, opposite line directions and escaped text', () => {
    expect(renderPrintFrame({ ...base, kind: 'round-rect' })).toContain('rx="6.21770833335"');
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


describe("picture appearance in printable frames", () => {
  it("keeps legacy stroke when styles are absent and validates explicit appearance", () => {
    const legacy = renderPrintFrame({ ...base, kind: "rect" });
    expect(legacy).toContain('stroke="#000"');
    expect(legacy).toContain('stroke-width="0.2645833333"');
    expect(legacy).not.toContain('fill="#FFFFFF"');
    const styled = { ...base, kind: "picture-rect" as const, borderColor: "#123456", borderWidthMm: 1, borderPattern: "none" as const, backgroundColor: "#FFFFFF", backgroundHatch: "none" as const };
    expect(renderPrintFrame(styled)).toContain('stroke="#123456" stroke-width="1"');
    expect(renderPrintFrame(styled)).toContain('fill="#FFFFFF"');
    expect(validatePrintFrames([styled])[0]).toMatchObject({ borderColor: "#123456", borderWidthMm: 1, backgroundColor: "#FFFFFF", borderPattern: "none", backgroundHatch: "none" });
    expect(renderPrintFrame({ ...base, kind: "picture-rect" as const, backgroundColor: "#FFFFFF", imageSrc: undefined })).toContain('fill="#FFFFFF"');
  });

  it("uses legacy print width when only border color is set, including text frame CSS", () => {
    const colorOnly = { ...base, kind: "picture-rect" as const, borderColor: "#123456" };
    expect(renderPrintFrame(colorOnly)).toContain('stroke="#123456" stroke-width="0.2645833333"');
    expect(renderPrintFrame({ ...colorOnly, kind: "text" })).toContain("border:0.2645833333mm solid #123456;");
  });
});

describe("rotation and border position in printable frames", () => {
  const picture = { ...base, kind: "picture-rect" as const, imageSrc: "data:image/png;base64,abc" };
  it("keeps absent angles unrotated and applies anticlockwise rotations around the specified centers", () => {
    expect(renderPrintFrame(picture)).not.toContain("rotate(");
    expect(renderPrintFrame({ ...picture, angle1Deg: 15 })).toContain("transform:rotate(-15deg);transform-origin:50% 50%;");
    expect(renderPrintFrame({ ...picture, angle2Deg: 15 })).toContain('transform="rotate(-15 20 12.5)"');
  });
  it("keeps legacy centered stroke, shrinks inside clip by full width and places outside outline beyond the box", () => {
    const legacy = renderPrintFrame({ ...picture, borderWidthMm: 2 });
    expect(legacy).toContain('<rect x="1" y="1" width="38" height="23"');
    const inside = renderPrintFrame({ ...picture, borderWidthMm: 2, borderPosition: "inside" });
    expect(inside).toContain('<rect x="2" y="2" width="36" height="21"');
    expect(inside).toContain('<rect x="1" y="1" width="38" height="23"');
    const outside = renderPrintFrame({ ...picture, borderWidthMm: 2, borderPosition: "outside" });
    expect(outside).toContain('<rect x="-1" y="-1" width="42" height="27"');
    expect(outside).toContain('overflow:visible;');
    expect(outside).not.toContain('<rect x="2" y="2" width="36"');
  });
  it("preserves absent border position and angles through print validation", () => {
    expect(validatePrintFrames([picture])[0]).not.toHaveProperty("borderPosition");
    expect(validatePrintFrames([{ ...picture, angle1Deg: 15, angle2Deg: 2, borderPosition: "inside" }])[0]).toMatchObject({ angle1Deg: 15, angle2Deg: 2, borderPosition: "inside" });
  });
});

it("keeps whole-box typography, text color and alignment through print validation and HTML", () => {
  const styled = { ...base, kind: "text" as const, text: "سطر اول\nسطر دوم", typography: { ...defaultDocumentSettings().typography, defaultRtlFontId: "amiri" as const, bodyFontSizePt: 24 }, textColor: "#B91C1C", textAlign: "justify-all" as const, unknownStyle: "discard" };
  const [frame] = validatePrintFrames([styled]);
  expect(frame).toMatchObject({ textColor: "#B91C1C", textAlign: "justify-all", typography: { bodyFontSizePt: 24 } });
  expect(frame).not.toHaveProperty("unknownStyle");
  expect(renderPrintFrame(frame)).toContain('data-print-frame-font="Amiri"');
  expect(renderPrintFrame(frame)).toContain("font-size:24pt");
  expect(renderPrintFrame(frame)).toContain("color:#B91C1C");
  expect(renderPrintFrame(frame)).toContain("text-align:justify;text-align-last:justify;");
  expect(renderPrintFrame(frame)).not.toContain("data-print-frame-paragraph");
});

it("prints each multiline paragraph with its own alignment and keeps a legacy frame intact", () => {
  const frame = { ...base, kind: "text" as const, text: "پہلا\n<دوسرا>\nتیسرا", textAlign: "justify" as const, paragraphAligns: ["justify" as const, "center" as const, null] };
  const [validated] = validatePrintFrames([frame]);
  expect(validated.paragraphAligns).toEqual(["justify", "center", null]);
  const html = renderPrintFrame(validated);
  expect(html).toContain('data-print-frame-paragraph="0" style="margin:0;padding:0;text-align:justify;');
  expect(html).toContain('data-print-frame-paragraph="1" style="margin:0;padding:0;text-align:center;');
  expect(html).toContain('data-print-frame-paragraph="2" style="margin:0;padding:0;white-space:pre-wrap;');
  expect(html).toContain("&lt;دوسرا&gt;");
  expect(html).not.toContain("<دوسرا>");
  const singleLinePrint = renderPrintFrame({ ...base, kind: "text", singleLine: true, text: "ایک\nلکیر", paragraphAligns: ["left", "right"] });
  expect(singleLinePrint).not.toContain("data-print-frame-paragraph");
  expect(singleLinePrint).toContain("ایک لکیر");
  expect(singleLinePrint).not.toContain("ایک\nلکیر");
  expect(() => validatePrintFrames([{ ...frame, paragraphAligns: ["sideways"] }])).toThrow(/paragraph alignment/);
});

it("persists and prints single-line text with soft wrap while retaining unknown-key stripping", () => {
  const [frame] = validatePrintFrames([{ ...base, kind: "text", singleLine: true, text: "ایک سطر", typo: "discard" }]);
  expect(frame).toMatchObject({ singleLine: true });
  expect(frame).not.toHaveProperty("typo");
  expect(renderPrintFrame(frame)).toContain('data-print-frame-single-line="true"');
  expect(renderPrintFrame(frame)).toContain("white-space:pre-wrap;overflow-wrap:break-word;");
  expect(renderPrintFrame(frame)).not.toContain("white-space:nowrap;");
  expect(renderPrintFrame({ ...frame, singleLine: false })).toContain("white-space:pre-wrap;");
});

it("prints each multiline paragraph with its own formats and keeps a legacy frame intact", () => {
  const frame = {
    ...base,
    kind: "text" as const,
    text: "پہلا\nدوسرا\nتیسرا",
    paragraphFormats: [
      { spaceBeforePt: 14, firstLineIndentMm: 6, lineGapPt: 6 },
      { leading: { mode: "points" as const, value: 28 }, indentStartMm: 8, indentEndMm: 4 },
      null,
    ],
  };
  const [validated] = validatePrintFrames([frame]);
  expect(validated.paragraphFormats).toEqual([
    { spaceBeforePt: 14, firstLineIndentMm: 6, lineGapPt: 6 },
    { leading: { mode: "points", value: 28 }, indentStartMm: 8, indentEndMm: 4 },
    null,
  ]);
  const html = renderPrintFrame(validated);
  const typography = frameTypography(validated);
  const fallbackLeading = blockLeadingPt({ type: "paragraph" }, getFontById(typography.defaultRtlFontId).cssStack, typography, "rtl");
  expect(html).toContain('data-print-frame-paragraph="0"');
  expect(html).toContain('data-space-before-pt="14"');
  expect(html).toContain('margin-block-start:14pt;--qalam-space-before:14pt;');
  expect(html).toContain('data-first-line-indent-mm="6"');
  expect(html).toContain('text-indent:6mm;');
  expect(html).toContain('data-line-gap-pt="6"');
  expect(html).toContain(`line-height:${fallbackLeading + 6}pt`);
  expect(html).not.toContain('data-line-gap-pt="0"');

  expect(html).toContain('data-print-frame-paragraph="1"');
  expect(html).toContain('line-height:28pt;');
  expect(html).toContain('min-height:28pt;');
  expect(html).toContain('margin-inline-start:8mm;');
  expect(html).toContain('margin-inline-end:4mm;');

  expect(html).toContain('data-print-frame-paragraph="2"');
  expect(html).not.toContain('data-space-before-pt="0"');

  // Legacy frame without paragraphFormats prints as today
  const legacyFrame = { ...base, kind: "text" as const, text: "سادہ متن" };
  const legacyHtml = renderPrintFrame(legacyFrame);
  expect(legacyHtml).not.toContain("data-print-frame-paragraph");
  expect(legacyHtml).not.toContain("data-line-gap-pt");
  expect(legacyHtml).not.toContain("lineGapPt");

  expect(() => validatePrintFrames([{ ...frame, paragraphFormats: [{ invalidKey: true }] }])).toThrow(/paragraph formats/);
  expect(() => validatePrintFrames([{ ...frame, paragraphFormats: [{ lineGapPt: -1 }] }])).toThrow(/paragraph formats/);
});
