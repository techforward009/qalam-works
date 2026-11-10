import { measureJsonUtf8Bytes } from "./pdfSourcePreflight";
import type { StudioFrame } from '../components/StudioObjectLayer';
import { defaultDocumentSettings, parseDocumentSettings } from './documentSettings';
import { getFontById } from './fontRegistry';
import { blockLeadingPt } from './autoLeading';
import type { DocNode } from './extractPlainText';
import { isParagraphAlignList, type ParagraphAlign } from './paragraphAlign';
import { isParagraphFormatList, type ParagraphFormat } from './paragraphFormats';
import { validateIndentMm, validateLineHeight, validateSpacingPt } from './documentSettings';
import { parseLeading } from './leading';
import { normalizeSafeHex } from './studioColors';
import { normalizeSingleLineText } from './singleLineFrame';
import { frameBorderCss, svgStrokeAttributes } from './frameBorder';
import { formatInsetMm, measureTextColumns, resolvedInsetMm, textColumnCss, validTextColumnFields } from './textColumns';

export const PRINT_FRAME_LIMITS = { count: 200, pages: 100, mm: 2000, text: 10000, totalText: 50000 } as const;
const kinds = new Set([
  'rect', 'ellipse', 'round-rect', 'line', 'text',
  'picture-rect', 'picture-ellipse', 'picture-round-rect',
]);

function withoutFrameImagePayloads(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map(item => {
    if (!item || typeof item !== 'object') return item;
    const { imageSrc: _, ...rest } = item as Record<string, unknown>;
    return rest;
  });
}

const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function validatePrintFrames(input: unknown): StudioFrame[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > PRINT_FRAME_LIMITS.count) throw new Error('Invalid drawing frames: count; export blocked');
  measureJsonUtf8Bytes(withoutFrameImagePayloads(input), 256 * 1024);
  let text = 0;
  return input.map(value => {
    if (!value || typeof value !== 'object') throw new Error('Invalid drawing frame; export blocked');
    const f = value as StudioFrame;
    if (typeof f.id !== 'string' || f.id.length > 160 || !kinds.has(f.kind) || !Number.isInteger(f.page) || f.page < 1 || f.page > PRINT_FRAME_LIMITS.pages || typeof f.flip !== 'boolean' || typeof f.text !== 'string' || f.text.length > PRINT_FRAME_LIMITS.text) throw new Error('Invalid drawing frame fields; export blocked');
    for (const key of ['xMm', 'yMm', 'wMm', 'hMm'] as const) if (typeof f[key] !== 'number' || !Number.isFinite(f[key]) || Math.abs(f[key]) > PRINT_FRAME_LIMITS.mm || ((key === 'wMm' || key === 'hMm') && f[key] <= 0)) throw new Error('Invalid drawing frame geometry; export blocked');
    if (f.borderColor !== undefined && !normalizeSafeHex(f.borderColor)) throw new Error('Invalid drawing frame border color; export blocked');
    if (f.backgroundColor !== undefined && !normalizeSafeHex(f.backgroundColor)) throw new Error('Invalid drawing frame background color; export blocked');
    if (f.textColor !== undefined && !normalizeSafeHex(f.textColor)) throw new Error('Invalid drawing frame text color; export blocked');
    if (f.textAlign !== undefined && !['left', 'center', 'right', 'justify', 'justify-all'].includes(f.textAlign)) throw new Error('Invalid drawing frame text alignment; export blocked');
    if (f.paragraphAligns !== undefined && !isParagraphAlignList(f.paragraphAligns)) throw new Error('Invalid drawing frame paragraph alignment; export blocked');
    if (f.paragraphFormats !== undefined && !isParagraphFormatList(f.paragraphFormats)) throw new Error('Invalid drawing frame paragraph formats; export blocked');
    if (f.singleLine !== undefined && typeof f.singleLine !== 'boolean') throw new Error('Invalid drawing frame single-line flag; export blocked');
    if (f.borderWidthMm !== undefined && (typeof f.borderWidthMm !== 'number' || !Number.isFinite(f.borderWidthMm) || f.borderWidthMm <= 0 || f.borderWidthMm > PRINT_FRAME_LIMITS.mm)) throw new Error('Invalid drawing frame border width; export blocked');
    if (!validTextColumnFields(f)) throw new Error('Invalid drawing frame text columns; export blocked');
    if (f.backgroundHatch !== undefined && f.backgroundHatch !== 'none') throw new Error('Invalid drawing frame background hatch; export blocked');
    if (f.imageSrc !== undefined) {
      if (typeof f.imageSrc !== 'string' || !/^data:image\/(?:png|jpeg|webp|gif|bmp);base64,/i.test(f.imageSrc)) {
        throw new Error('Invalid drawing frame image; export blocked');
      }
      if (f.imageSrc.length > 6 * 1024 * 1024) {
        throw new Error('Drawing image exceeds supported limit; export blocked');
      }
    }
    for (const key of ['imageXMm', 'imageYMm', 'imageWMm', 'imageHMm', 'imageNaturalW', 'imageNaturalH'] as const) {
      if (f[key] !== undefined && (typeof f[key] !== 'number' || !Number.isFinite(f[key]))) {
        throw new Error('Invalid drawing frame picture geometry; export blocked');
      }
    }
    if (f.locked !== undefined && typeof f.locked !== 'boolean' || f.dontPrint !== undefined && typeof f.dontPrint !== 'boolean' || f.template !== undefined && typeof f.template !== 'boolean') throw new Error('Invalid drawing frame flags; export blocked');
    if (f.roundnessMm !== undefined && (typeof f.roundnessMm !== 'number' || !Number.isFinite(f.roundnessMm) || f.roundnessMm < 0 || f.roundnessMm > PRINT_FRAME_LIMITS.mm)) throw new Error('Invalid drawing frame roundness; export blocked');
    if (f.angle1Deg !== undefined && (typeof f.angle1Deg !== 'number' || !Number.isFinite(f.angle1Deg) || Math.abs(f.angle1Deg) > 3600)) throw new Error('Invalid drawing frame angle; export blocked');
    if (f.angle2Deg !== undefined && (typeof f.angle2Deg !== 'number' || !Number.isFinite(f.angle2Deg) || Math.abs(f.angle2Deg) > 3600)) throw new Error('Invalid drawing frame angle; export blocked');
    if (f.borderPosition !== undefined && f.borderPosition !== 'inside' && f.borderPosition !== 'outside') throw new Error('Invalid drawing frame border position; export blocked');
    text += f.text.length;
    if (text > PRINT_FRAME_LIMITS.totalText) throw new Error('Drawing text exceeds supported limit; export blocked');
    if (f.typography !== undefined && (!f.typography || typeof f.typography !== 'object')) throw new Error('Invalid drawing typography; export blocked');
    return { id: f.id, kind: f.kind, page: f.page, xMm: f.xMm, yMm: f.yMm, wMm: f.wMm, hMm: f.hMm, flip: f.flip, text: f.text,
      ...(f.typography ? { typography: parseDocumentSettings({ typography: f.typography }).typography } : {}),
      ...(f.textColor !== undefined ? { textColor: normalizeSafeHex(f.textColor)! } : {}),
      ...(f.textAlign !== undefined ? { textAlign: f.textAlign } : {}),
      ...(f.paragraphAligns !== undefined ? { paragraphAligns: f.paragraphAligns } : {}),
      ...(f.paragraphFormats !== undefined ? { paragraphFormats: f.paragraphFormats } : {}),
      ...(f.singleLine !== undefined ? { singleLine: f.singleLine } : {}),
      ...(f.imageSrc !== undefined ? { imageSrc: f.imageSrc } : {}),
      ...(f.imageNaturalW !== undefined ? { imageNaturalW: f.imageNaturalW } : {}),
      ...(f.imageNaturalH !== undefined ? { imageNaturalH: f.imageNaturalH } : {}),
      ...(f.imageXMm !== undefined ? { imageXMm: f.imageXMm } : {}),
      ...(f.imageYMm !== undefined ? { imageYMm: f.imageYMm } : {}),
      ...(f.imageWMm !== undefined ? { imageWMm: f.imageWMm } : {}),
      ...(f.imageHMm !== undefined ? { imageHMm: f.imageHMm } : {}),
      ...(f.locked !== undefined ? { locked: f.locked } : {}),
      ...(f.dontPrint !== undefined ? { dontPrint: f.dontPrint } : {}),
      ...(f.template !== undefined ? { template: f.template } : {}),
      ...(f.roundnessMm !== undefined ? { roundnessMm: f.roundnessMm } : {}),
      ...(f.angle1Deg !== undefined ? { angle1Deg: f.angle1Deg } : {}),
      ...(f.angle2Deg !== undefined ? { angle2Deg: f.angle2Deg } : {}),
      ...(f.borderPosition !== undefined ? { borderPosition: f.borderPosition } : {}),
      ...(f.borderColor !== undefined ? { borderColor: normalizeSafeHex(f.borderColor)! } : {}),
      ...(f.borderWidthMm !== undefined ? { borderWidthMm: f.borderWidthMm } : {}),
      ...(f.borderPattern !== undefined ? { borderPattern: f.borderPattern } : {}),
      ...(f.backgroundColor !== undefined ? { backgroundColor: normalizeSafeHex(f.backgroundColor)! } : {}),
      ...(f.backgroundHatch !== undefined ? { backgroundHatch: f.backgroundHatch } : {}),
      ...(f.columnCount !== undefined ? { columnCount: f.columnCount } : {}),
      ...(f.columnGutterMm !== undefined ? { columnGutterMm: f.columnGutterMm } : {}),
      ...(f.columnDirection !== undefined ? { columnDirection: f.columnDirection } : {}),
      ...(f.columnRuleColor !== undefined ? { columnRuleColor: normalizeSafeHex(f.columnRuleColor)! } : {}),
      ...(f.columnRuleSizeMm !== undefined ? { columnRuleSizeMm: f.columnRuleSizeMm } : {}),
      ...(f.columnRulePattern !== undefined ? { columnRulePattern: f.columnRulePattern } : {}),
      ...(f.insetMm !== undefined ? { insetMm: f.insetMm } : {}),
      ...(f.textShape !== undefined ? { textShape: f.textShape } : {}),
    };
  });
}
export function frameTypography(frame: StudioFrame) {
  return frame.typography ?? { ...defaultDocumentSettings().typography, defaultRtlFontId: 'jameel-noori-nastaleeq' as const };
}
export function frameTextNode(frame: StudioFrame): DocNode {
  const t = frameTypography(frame);
  const text = frame.singleLine ? normalizeSingleLineText(frame.text) : frame.text;
  return { type: 'paragraph', attrs: { dir: 'rtl' }, content: [{ type: 'text', text, marks: [{ type: 'textStyle', attrs: { fontFamily: getFontById(t.defaultRtlFontId).editorFamily, fontSize: `${t.bodyFontSizePt}pt` } }] }] };
}
export function framePrintTopMm(frame: Pick<StudioFrame, "page" | "yMm">, height: number): number {
  return (frame.page - 1) * height + frame.yMm;
}
function alignDeclarations(align: ParagraphAlign | undefined): string {
  if (!align) return '';
  if (align === 'justify-all') return 'text-align:justify;text-align-last:justify;';
  return `text-align:${align};`;
}

function formatDeclarations(format: ParagraphFormat | undefined, fallbackLeadingPt: number): { style: string; attrs: string; leadingPt: number } {
  if (!format) return { style: '', attrs: '', leadingPt: fallbackLeadingPt };
  const styles: string[] = [];
  const attrs: string[] = [];

  const leading = parseLeading(format.leading);
  const lineHeight = !leading && typeof format.lineHeight === 'number' ? validateLineHeight(format.lineHeight) : null;
  let resolvedLeading = fallbackLeadingPt;
  if (leading) {
    attrs.push(`data-leading="${escape(JSON.stringify(leading))}"`);
    if (leading.mode === 'points') {
      resolvedLeading = leading.value;
      styles.push(`line-height:${leading.value}pt`);
    } else {
      styles.push(`line-height:${fallbackLeadingPt}pt`);
    }
  } else if (lineHeight !== null) {
    styles.push(`line-height:${lineHeight}`);
  }

  const firstLine = typeof format.firstLineIndentMm === 'number' ? validateIndentMm(format.firstLineIndentMm) : null;
  if (firstLine !== null && firstLine > 0) {
    attrs.push(`data-first-line-indent-mm="${firstLine}"`);
    styles.push(`text-indent:${firstLine}mm`);
  }

  const start = typeof format.indentStartMm === 'number' ? validateIndentMm(format.indentStartMm) : null;
  if (start !== null) {
    attrs.push(`data-indent-start-mm="${start}"`);
    styles.push(`margin-inline-start:${start}mm`);
  }

  const end = typeof format.indentEndMm === 'number' ? validateIndentMm(format.indentEndMm) : null;
  if (end !== null) {
    attrs.push(`data-indent-end-mm="${end}"`);
    styles.push(`margin-inline-end:${end}mm`);
  }

  const before = typeof format.spaceBeforePt === 'number' ? validateSpacingPt(format.spaceBeforePt) : null;
  if (before !== null) {
    attrs.push(`data-space-before-pt="${before}"`);
    styles.push(`margin-block-start:${before}pt;--qalam-space-before:${before}pt`);
  }

  const after = typeof format.spaceAfterPt === 'number' ? validateSpacingPt(format.spaceAfterPt) : null;
  if (after !== null) {
    attrs.push(`data-space-after-pt="${after}"`);
    styles.push(`margin-block-end:${after}pt;--qalam-space-after:${after}pt`);
  }

  // Schema renderHTML emits only data-line-gap-pt. Story print and the editor
  // decoration add that gap to the paragraph line-height, in points.
  const lineGap = typeof format.lineGapPt === 'number' ? validateSpacingPt(format.lineGapPt) : null;
  if (lineGap !== null) {
    attrs.push(`data-line-gap-pt="${lineGap}"`);
    if (lineGap > 0) {
      const lineIdx = styles.findIndex((entry) => entry.startsWith('line-height:') && entry.endsWith('pt'));
      const base = lineIdx >= 0 ? parseFloat(styles[lineIdx].slice('line-height:'.length)) : resolvedLeading;
      const withGap = base + lineGap;
      const declaration = `line-height:${withGap}pt`;
      if (lineIdx >= 0) styles[lineIdx] = declaration;
      else styles.push(declaration);
      resolvedLeading = withGap;
    }
  }

  return {
    style: styles.length ? styles.join(';') + ';' : '',
    attrs: attrs.length ? ' ' + attrs.join(' ') : '',
    leadingPt: resolvedLeading,
  };
}

/** One block per paragraph. Legacy frames with no paragraphAligns stay a single text run. */
export function frameParagraphMarkup(frame: StudioFrame, leadingPt: number, renderText: (text: string) => string = escape): string | null {
  if (frame.singleLine || (!frame.paragraphAligns?.length && !frame.paragraphFormats?.length) || frame.kind !== 'text') return null;
  return frame.text.split('\n').map((part, index) => {
    const stored = frame.paragraphAligns?.[index];
    const align = stored === undefined ? frame.textAlign ?? null : stored;
    const format = frame.paragraphFormats?.[index];
    const { style, attrs, leadingPt: paraLeading } = formatDeclarations(format, leadingPt);
    return `<p data-print-frame-paragraph="${index}"${attrs} style="margin:0;padding:0;${alignDeclarations(align)}${style}white-space:pre-wrap;overflow-wrap:break-word;unicode-bidi:plaintext;min-height:${paraLeading}pt;">${part.length ? renderText(part) : '<br>'}</p>`;
  }).join('');
}

/** Only trusted converter output may supply textHtml; raw request text always
 * goes through escaping. Shapes contain no author-provided markup or SVG. */
export function renderPrintFrame(frame: StudioFrame, textHtml?: string): string {
  const { wMm: w, hMm: h } = frame;
  const angle1 = frame.angle1Deg ?? 0;
  const rotated = Math.abs(angle1) > 1e-9;
  // Angle1 is in Bounds, so rotate the whole frame around its unrotated box center. This is derived from field placement; help documents click pivots only for the mouse tool.
  const geometry = `position:absolute;left:${frame.xMm}mm;top:${frame.yMm}mm;width:${w}mm;height:${h}mm;box-sizing:border-box;${rotated ? `transform:rotate(${-angle1}deg);transform-origin:50% 50%;` : ''}`;
  const attr = `data-print-frame="${frame.kind}" data-print-frame-id="${escape(frame.id)}" data-print-frame-page="${frame.page}"`;
  if (frame.kind === 'text') {
    const t = frameTypography(frame), family = getFontById(t.defaultRtlFontId).cssStack, leading = blockLeadingPt({ type: 'paragraph' }, family, t, 'rtl');
    const textBorder = frameBorderCss(frame);
    const textBackground = frame.backgroundColor ? `background:${escape(frame.backgroundColor)};` : "background:transparent;";
    const textAlign = frame.textAlign === 'justify-all' ? 'justify' : frame.textAlign ?? 'start';
    const textAlignLast = frame.textAlign === 'justify-all' ? 'text-align-last:justify;' : '';
    const paragraphs = frameParagraphMarkup(frame, leading);
    const plain = frame.singleLine ? normalizeSingleLineText(frame.text) : frame.text;
    const insetCss = frame.insetMm === undefined ? "padding:0.5291666667mm;" : `padding:${formatInsetMm(resolvedInsetMm(frame))}mm;`;
    const shapeCss = frame.textShape === "ellipse" ? "border-radius:50%;" : "";
    const shapeAttr = frame.textShape === "ellipse" ? ' data-print-text-shape="ellipse"' : "";
    const insetAttr = frame.insetMm === undefined ? "" : ` data-print-text-inset-mm="${formatInsetMm(frame.insetMm)}"`;
    const body = paragraphs ?? textHtml ?? escape(plain);
    const measured = measureTextColumns(frame);
    const columnCss = textColumnCss(frame);
    const flowed = columnCss
      ? `<div data-print-text-columns="${measured.count}" data-print-column-direction="${measured.direction}" data-print-column-gutter-mm="${formatInsetMm(measured.gutterMm)}" data-print-column-width-mm="${formatInsetMm(measured.columnWidthMm)}" style="height:100%;${columnCss}"><div style="direction:rtl">${body}</div></div>`
      : body;
    return `<div ${attr}${frame.singleLine ? ' data-print-frame-single-line="true"' : ''}${shapeAttr}${insetAttr} data-print-frame-font="${escape(getFontById(t.defaultRtlFontId).editorFamily)}" dir="rtl" style="${geometry}${textBorder}${insetCss}${shapeCss}overflow:hidden;${textBackground}color:${escape(frame.textColor ?? '#000')};font-family:${escape(family)}!important;font-size:${t.bodyFontSizePt}pt;line-height:${leading}pt;direction:rtl;unicode-bidi:plaintext;text-align:${textAlign};${textAlignLast}white-space:pre-wrap;overflow-wrap:break-word;text-indent:0;tab-size:8;font-kerning:auto;-webkit-text-size-adjust:none;text-size-adjust:none;font-variant-ligatures:normal;font-feature-settings:normal;">${flowed}</div>`;
  }
  const userStroke = svgStrokeAttributes(frame);
  const legacyStroke = 'fill="none" stroke="#000" stroke-width="0.2645833333"';
  const stroke = userStroke || (frame.kind === 'line' ? legacyStroke : 'fill="none" stroke="none"');
  const diagStroke = userStroke || legacyStroke;
  const borderWidth = frame.borderWidthMm ?? 0.2645833333;
  const inset = !userStroke ? 0 : frame.borderPosition === 'outside' ? -borderWidth / 2 : borderWidth / 2;
  const clipInset = userStroke && frame.borderPosition === 'inside' ? borderWidth : 0;
  if (frame.kind === 'picture-rect' || frame.kind === 'picture-ellipse' || frame.kind === 'picture-round-rect') {
    const clipId = `print-clip-${escape(frame.id)}-${frame.page}`;
    let clipShape = '';
    let outlineShape = '';
    if (frame.kind === 'picture-ellipse') {
      clipShape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(0, w / 2 - clipInset)}" ry="${Math.max(0, h / 2 - clipInset)}"/>`;
      outlineShape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(0, w / 2 - inset)}" ry="${Math.max(0, h / 2 - inset)}" ${stroke}/>`;
    } else if (frame.kind === 'picture-round-rect') {
      clipShape = `<rect x="${clipInset}" y="${clipInset}" width="${Math.max(0, w - 2 * clipInset)}" height="${Math.max(0, h - 2 * clipInset)}" rx="${Math.max(0, (frame.roundnessMm ?? 6.35) - clipInset)}"/>`;
      outlineShape = `<rect x="${inset}" y="${inset}" width="${Math.max(0, w - 2 * inset)}" height="${Math.max(0, h - 2 * inset)}" rx="${Math.max(0, (frame.roundnessMm ?? 6.35) - inset)}" ${stroke}/>`;
    } else {
      clipShape = `<rect x="${clipInset}" y="${clipInset}" width="${Math.max(0, w - 2 * clipInset)}" height="${Math.max(0, h - 2 * clipInset)}"/>`;
      outlineShape = `<rect x="${inset}" y="${inset}" width="${Math.max(0, w - 2 * inset)}" height="${Math.max(0, h - 2 * inset)}" ${stroke}/>`;
    }

    const defs = `<defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>`;
    let content = '';
    if (frame.imageSrc) {
      const ix = frame.imageXMm ?? 0;
      const iy = frame.imageYMm ?? 0;
      const iw = frame.imageWMm ?? w;
      const ih = frame.imageHMm ?? h;
      // Angle2 is image-only; its center comes from the Picture image rectangle (Origin/Scaling), per Picture Ribbon rotation help.
      const angle2 = frame.angle2Deg ?? 0;
      const imageRotation = Math.abs(angle2) > 1e-9 ? ` transform="rotate(${-angle2} ${ix + iw / 2} ${iy + ih / 2})"` : '';
      content = `<g clip-path="url(#${clipId})"><rect x="0" y="0" width="${w}" height="${h}" fill="${escape(frame.backgroundColor ?? "#ffffff")}"/><image href="${escape(frame.imageSrc)}" xlink:href="${escape(frame.imageSrc)}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="none"${imageRotation}/></g>`;
    } else {
      const diags = `<line x1="0" y1="0" x2="${w}" y2="${h}" ${diagStroke}/><line x1="${w}" y1="0" x2="0" y2="${h}" ${diagStroke}/>`;
      content = frame.kind === 'picture-ellipse' ? `<g clip-path="url(#${clipId})">${diags}</g>` : diags;
    }

    const background = frame.backgroundColor !== undefined && !frame.imageSrc ? `<g clip-path="url(#${clipId})"><rect x="0" y="0" width="${w}" height="${h}" fill="${escape(frame.backgroundColor)}"/></g>` : '';
    return `<svg ${attr} xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" style="${geometry}overflow:${rotated || frame.borderPosition === 'outside' ? 'visible' : 'hidden'};" aria-hidden="true">${defs}${background}${content}${outlineShape}</svg>`;
  }
  let shape = '';
  if (frame.kind === 'line') shape = `<line x1="${frame.flip ? w - inset : inset}" y1="${inset}" x2="${frame.flip ? inset : w - inset}" y2="${h - inset}" ${stroke}/>`;
  else if (frame.kind === 'ellipse') shape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${Math.max(0, w / 2 - inset)}" ry="${Math.max(0, h / 2 - inset)}" ${stroke}/>`;
  else shape = `<rect x="${inset}" y="${inset}" width="${Math.max(0, w - 2 * inset)}" height="${Math.max(0, h - 2 * inset)}" ${frame.kind === 'round-rect' ? `rx="${Math.max(0, (frame.roundnessMm ?? 6.35) - inset)}"` : ''} ${stroke}/>`;
  const bg = frame.backgroundColor ? `<rect x="0" y="0" width="${w}" height="${h}" fill="${escape(frame.backgroundColor)}"/>` : '';
  return `<svg ${attr} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="${geometry}overflow:${rotated || frame.borderPosition === 'outside' ? 'visible' : 'hidden'};" aria-hidden="true">${bg}${shape}</svg>`;
}
export function printFramePageMarkup(frames: StudioFrame[], width: number, height: number): string {
  const printable = frames.filter(frame => frame.dontPrint !== true);
  return Array.from(new Set(printable.map(f => f.page))).sort((a, b) => a - b).map(page => `<div data-print-object-page="${page}" style="position:absolute;left:0;top:${framePrintTopMm({ page, yMm: 0 }, height)}mm;width:${width}mm;height:${height}mm;overflow:hidden;pointer-events:none;z-index:10;">${printable.filter(f => f.page === page).map(f => renderPrintFrame(f)).join('')}</div>`).join('');
}
