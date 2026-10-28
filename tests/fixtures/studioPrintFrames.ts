import type { StudioFrame } from '../../app/tools/document-studio/components/StudioObjectLayer';
import { defaultDocumentSettings } from '../../app/tools/document-studio/utils/documentSettings';
const base = { xMm: 20, yMm: 80, wMm: 30, hMm: 20, flip: false, text: '' };
const typography = defaultDocumentSettings().typography;
export const studioPrintFrames: StudioFrame[] = [
  { ...base, id: 'review-object', kind: 'rect', page: 1 },
  { ...base, id: 'ellipse-two', kind: 'ellipse', page: 2 },
  { ...base, id: 'rounded-one', kind: 'round-rect', page: 1, xMm: 65, wMm: 40 },
  { ...base, id: 'line-one', kind: 'line', page: 1, yMm: 120 },
  { ...base, id: 'line-two', kind: 'line', page: 2, yMm: 120, flip: true },
  { ...base, id: 'urdu-one', kind: 'text', page: 1, yMm: 160, wMm: 55, hMm: 25, text: 'محفوظ اردو متن باکس', typography },
  { ...base, id: 'english-two', kind: 'text', page: 2, xMm: 80, yMm: 160, wMm: 45, hMm: 25, text: 'English frame content wraps into two lines.', typography: { ...typography, defaultRtlFontId: 'inter' } },
  { ...base, id: 'arabic-two', kind: 'text', page: 2, xMm: 65, yMm: 120, wMm: 60, hMm: 25, text: 'رَبِّ الۡعٰلَمِیۡنَ', typography: { ...typography, defaultRtlFontId: 'digital-khatt-indo-pak' } },
  { ...base, id: 'boundary-two', kind: 'rect', page: 2, xMm: 130, yMm: 195, wMm: 15, hMm: 12 },
];
