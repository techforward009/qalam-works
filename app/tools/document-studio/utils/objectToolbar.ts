import type { StudioFrame } from '../components/StudioObjectLayer';
import type { ResolvedPageLayout } from './pageLayout';
export type FrameAppearance = {
    border: boolean;
    borderWidthPt: number;
    borderStyle: 'solid' | 'dashed' | 'dotted';
    borderColor: string;
    fill: string | null;
};
export const DEFAULT_FRAME_APPEARANCE: FrameAppearance = { border: true, borderWidthPt: 0.75, borderStyle: 'solid', borderColor: '#000000', fill: null };
export const frameAppearance = (frame: StudioFrame): FrameAppearance => ({ ...DEFAULT_FRAME_APPEARANCE, ...frame.appearance });
export function validFrameAppearance(value: unknown): value is FrameAppearance {
    if (!value || typeof value !== 'object')
        return false;
    const a = value as FrameAppearance;
    return typeof a.border === 'boolean' && Number.isFinite(a.borderWidthPt) && a.borderWidthPt >= 0.1 && a.borderWidthPt <= 12 && ['solid', 'dashed', 'dotted'].includes(a.borderStyle) && /^#[0-9a-f]{6}$/i.test(a.borderColor) && (a.fill === null || /^#[0-9a-f]{6}$/i.test(a.fill));
}
export type FrameGeometryKey = 'xMm' | 'yMm' | 'wMm' | 'hMm';
export type FramePropertyPatch = Partial<Pick<StudioFrame, FrameGeometryKey>> & {
    appearance?: Partial<FrameAppearance>;
};
export function parseFrameMillimetres(raw: string): number | null {
    const match = raw.trim().match(/^(\d+(?:\.\d+)?|\.\d+)\s*(?:mm)?$/i);
    if (!match)
        return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
}
/** All-or-nothing by stable IDs. Do not clamp or round authored coordinates. */
export function patchSelectedFrames(frames: StudioFrame[], ids: string[], patch: Partial<Pick<StudioFrame, FrameGeometryKey | 'appearance'>>, page: Pick<ResolvedPageLayout, 'widthMm' | 'heightMm'>): StudioFrame[] | null {
    if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !frames.some(f => f.id === id)))
        return null;
    const next = frames.map(f => ids.includes(f.id) ? { ...f, ...patch } : f);
    for (const f of next.filter(f => ids.includes(f.id))) {
        if (![f.xMm, f.yMm, f.wMm, f.hMm].every(Number.isFinite) || f.xMm < 0 || f.yMm < 0 || f.wMm <= 0 || f.hMm <= 0 || f.xMm + f.wMm > page.widthMm + 1e-8 || f.yMm + f.hMm > page.heightMm + 1e-8 || (f.appearance !== undefined && !validFrameAppearance(f.appearance)))
            return null;
    }
    return next;
}
export function mixedFrameValue<T>(frames: StudioFrame[], read: (frame: StudioFrame) => T): T | undefined {
    if (!frames.length)
        return undefined;
    const value = read(frames[0]);
    return frames.every(f => read(f) === value) ? value : undefined;
}
export const frameMmLabel = (n: number) => `${Number(n.toFixed(2))}mm`;
