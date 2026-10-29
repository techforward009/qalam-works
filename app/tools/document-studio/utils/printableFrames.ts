import { frameAppearance, validFrameAppearance } from "./objectToolbar";
import { measureJsonUtf8Bytes } from "./pdfSourcePreflight";
import type { StudioFrame } from '../components/StudioObjectLayer';
import { defaultDocumentSettings, parseDocumentSettings } from './documentSettings';
import { getFontById } from './fontRegistry';
import { blockLeadingPt } from './autoLeading';
import type { DocNode } from './extractPlainText';

export const PRINT_FRAME_LIMITS = { count: 200, pages: 100, mm: 2000, text: 10000, totalText: 50000 } as const;
const kinds = new Set(['rect', 'ellipse', 'round-rect', 'line', 'text']);
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function validatePrintFrames(input: unknown): StudioFrame[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > PRINT_FRAME_LIMITS.count) throw new Error('Invalid drawing frames: count; export blocked');
  measureJsonUtf8Bytes(input, 256 * 1024);
  let text = 0;
  return input.map(value => {
    if (!value || typeof value !== 'object') throw new Error('Invalid drawing frame; export blocked');
    const f = value as StudioFrame;
    if (typeof f.id !== 'string' || f.id.length > 160 || !kinds.has(f.kind) || !Number.isInteger(f.page) || f.page < 1 || f.page > PRINT_FRAME_LIMITS.pages || typeof f.flip !== 'boolean' || typeof f.text !== 'string' || f.text.length > PRINT_FRAME_LIMITS.text) throw new Error('Invalid drawing frame fields; export blocked');
    for (const key of ['xMm', 'yMm', 'wMm', 'hMm'] as const) if (typeof f[key] !== 'number' || !Number.isFinite(f[key]) || Math.abs(f[key]) > PRINT_FRAME_LIMITS.mm || ((key === 'wMm' || key === 'hMm') && f[key] <= 0)) throw new Error('Invalid drawing frame geometry; export blocked');
    if (f.appearance !== undefined && !validFrameAppearance(f.appearance)) throw new Error('Invalid drawing appearance; export blocked');
    text += f.text.length;
    if (text > PRINT_FRAME_LIMITS.totalText) throw new Error('Drawing text exceeds supported limit; export blocked');
    if (f.typography !== undefined && (!f.typography || typeof f.typography !== 'object')) throw new Error('Invalid drawing typography; export blocked');
    return { id: f.id, kind: f.kind, page: f.page, xMm: f.xMm, yMm: f.yMm, wMm: f.wMm, hMm: f.hMm, flip: f.flip, text: f.text,
      ...(f.appearance ? { appearance: { ...f.appearance } } : {}),
      ...(f.typography ? { typography: parseDocumentSettings({ typography: f.typography }).typography } : {}) };
  });
}
export function frameTypography(frame: StudioFrame) {
  return frame.typography ?? { ...defaultDocumentSettings().typography, defaultRtlFontId: 'jameel-noori-nastaleeq' as const };
}
export function frameTextNode(frame: StudioFrame): DocNode {
  const t = frameTypography(frame);
  return { type: 'paragraph', attrs: { dir: 'rtl' }, content: [{ type: 'text', text: frame.text, marks: [{ type: 'textStyle', attrs: { fontFamily: getFontById(t.defaultRtlFontId).editorFamily, fontSize: `${t.bodyFontSizePt}pt` } }] }] };
}
export function framePrintTopMm(frame: Pick<StudioFrame, "page" | "yMm">, height: number): number {
  return (frame.page - 1) * height + frame.yMm;
}
/** Only trusted converter output may supply textHtml; raw request text always
 * goes through escaping. Shapes contain no author-provided markup or SVG. */
export function renderPrintFrame(frame: StudioFrame, textHtml?: string): string {
  const { wMm: w, hMm: h } = frame;
  const a=frameAppearance(frame);
  const geometry = `position:absolute;left:${frame.xMm}mm;top:${frame.yMm}mm;width:${w}mm;height:${h}mm;box-sizing:border-box;`;
  const attr = `data-print-frame="${frame.kind}" data-print-frame-id="${escape(frame.id)}" data-print-frame-page="${frame.page}"`;
  if (frame.kind === 'text') {
    const t = frameTypography(frame), family = getFontById(t.defaultRtlFontId).cssStack, leading = blockLeadingPt({ type: 'paragraph' }, family, t, 'rtl');
    return `<div ${attr} data-print-frame-font="${escape(getFontById(t.defaultRtlFontId).editorFamily)}" dir="rtl" style="${geometry}border:${a.border ? `${a.borderWidthPt}pt ${a.borderStyle} ${a.borderColor}` : "0px solid transparent"};padding:0.5291666667mm;overflow:hidden;background:${a.fill ?? "transparent"};color:#000;font-family:${escape(family)}!important;font-size:${t.bodyFontSizePt}pt;line-height:${leading}pt;direction:rtl;unicode-bidi:plaintext;text-align:start;white-space:pre-wrap;overflow-wrap:break-word;text-indent:0;tab-size:8;font-kerning:auto;-webkit-text-size-adjust:none;text-size-adjust:none;font-variant-ligatures:normal;font-feature-settings:normal;">${textHtml ?? escape(frame.text)}</div>`;
  }
  const strokeWidth=a.border?a.borderWidthPt*25.4/72:0, inset=strokeWidth/2;
  const stroke = `fill="${a.fill??'none'}" stroke="${a.borderColor}" stroke-width="${strokeWidth}"${a.borderStyle==='solid'?'':` stroke-dasharray="${strokeWidth*(a.borderStyle==='dashed'?4:1)} ${strokeWidth*2}"`}`;
  let shape = '';
  if (frame.kind === 'line') shape = `<line x1="${frame.flip ? w - inset : inset}" y1="${inset}" x2="${frame.flip ? inset : w - inset}" y2="${h - inset}" ${stroke}/>`;
  else if (frame.kind === 'ellipse') shape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(0, w / 2 - inset)}" ry="${Math.max(0, h / 2 - inset)}" ${stroke}/>`;
  else shape = `<rect x="${inset}" y="${inset}" width="${Math.max(0, w - 2 * inset)}" height="${Math.max(0, h - 2 * inset)}" ${frame.kind === 'round-rect' ? 'rx="6.35"' : ''} ${stroke}/>`;
  return `<svg ${attr} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="${geometry}overflow:hidden;" aria-hidden="true">${shape}</svg>`;
}
export function printFramePageMarkup(frames: StudioFrame[], width: number, height: number): string {
  return Array.from(new Set(frames.map(f => f.page))).sort((a, b) => a - b).map(page => `<div data-print-object-page="${page}" style="position:absolute;left:0;top:${framePrintTopMm({ page, yMm: 0 }, height)}mm;width:${width}mm;height:${height}mm;overflow:hidden;pointer-events:none;z-index:10;">${frames.filter(f => f.page === page).map(f => renderPrintFrame(f)).join('')}</div>`).join('');
}
