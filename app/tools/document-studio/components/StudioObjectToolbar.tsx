"use client";
import { useState, type CSSProperties } from 'react';
import type { StudioFrame } from './StudioObjectLayer';
import { frameAppearance, frameMmLabel, mixedFrameValue, parseFrameMillimetres, type FrameGeometryKey, type FramePropertyPatch, type FrameAppearance } from '../utils/objectToolbar';
import { INPAGE_TEXT_COLOURS } from '../utils/inpageToolbar';
const sunken: CSSProperties = { height: 20, boxSizing: 'border-box', border: '2px solid', borderColor: '#696969 #fff #fff #696969', background: '#fff', color: '#000', font: '11px Tahoma,Arial,sans-serif', padding: '0 3px', minWidth: 0, borderRadius: 0 };
const icon: CSSProperties = { width: 18, height: 20, padding: 0, display: 'inline-grid', placeItems: 'center', background: '#f0f0f0', boxShadow: 'inset 1px 1px #fff,inset -1px -1px #696969,inset -2px -2px #a0a0a0', border: '1px solid #000', boxSizing: 'border-box', fontSize: 13, flexShrink: 0 };
type Patch = FramePropertyPatch;
function GeometryField({ name, label, value, onCommit }: {
    name: FrameGeometryKey;
    label: string;
    value: number | undefined;
    onCommit: (patch: Patch) => boolean;
}) {
    const current = value === undefined ? '' : frameMmLabel(value);
    const [draft, setDraft] = useState(current), [dirty, setDirty] = useState(false), [error, setError] = useState(false);
    const displayed = dirty ? draft : current;
    const commit = () => { if (!dirty)
        return; const n = parseFrameMillimetres(draft); if (n === null || !onCommit({ [name]: n })) {
        setError(true);
        return;
    } setDirty(false); setError(false); };
    return <span style={{ display: 'flex', alignItems: 'start', gap: 2 }}><span style={icon} title={label} aria-hidden>{name === 'xMm' ? '↔' : name === 'yMm' ? '↕' : name === 'wMm' ? '▭' : '↧'}</span><input aria-label={label} data-studio-object-field={name} value={displayed} placeholder={value === undefined ? 'Mixed' : undefined} aria-invalid={error} onChange={e => { setDraft(e.target.value); setDirty(true); setError(false); }} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') {
        e.preventDefault();
        commit();
    } if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDirty(false);
        setError(false);
    } }} style={{ ...sunken, width: 78 }}/>{error ? <span role="alert" data-studio-object-error style={{ position: 'absolute', top: 44, zIndex: 10, background: '#fff', border: '1px solid #000', padding: 4 }}>Enter a positive size or page-local position within the page (mm).</span> : null}</span>;
}
export default function StudioObjectToolbar({ frames, onCommit }: {
    frames: StudioFrame[];
    onCommit: (patch: Patch) => boolean;
}) {
    const mixed = <option value="mixed" disabled>Mixed</option>;
    const value = <T,>(read: (f: StudioFrame) => T) => mixedFrameValue(frames, read);
    const geometry = (key: FrameGeometryKey, label: string) => <GeometryField key={`${frames.map(f => f.id).join(',')}:${key}`} name={key} label={label} value={value(f => f[key])} onCommit={onCommit}/>;
    const appearance = (patch: Partial<FrameAppearance>) => {
        // Preserve each object's other appearance values during a mixed batch edit.
        onCommit({ appearance: patch });
    };
    const select = (label: string, key: keyof FrameAppearance, options: React.ReactNode) => <select aria-label={label} data-studio-object-field={key} value={String(value(f => frameAppearance(f)[key]) ?? 'mixed')} onChange={e => appearance({ [key]: key === 'border' ? e.target.value === 'true' : key === 'fill' && e.target.value === 'none' ? null : e.target.value })} style={{ ...sunken, width: key === 'borderColor' || key === 'fill' ? 104 : 85 }}>{mixed}{options}</select>;
    const row: CSSProperties = { display: 'flex', height: 21, gap: 4, alignItems: 'start', whiteSpace: 'nowrap' };
    return <div data-studio-object-toolbar role="toolbar" aria-label="Object properties" dir="ltr" style={{ height: 47, minWidth: 810, background: '#f0f0f0', color: '#000', font: '11px Tahoma,Arial,sans-serif', position: 'relative' }} onKeyDown={e => { if (e.key === 'Enter')
        e.stopPropagation(); }}>
    <style>{`@media(max-width:719px){[data-studio-shell] [data-studio-chrome="toolbar"]{min-width:0!important;max-width:100%!important;overflow-x:auto!important;touch-action:pan-x!important;}[data-studio-object-toolbar]{height:67px!important;min-width:810px}[data-studio-object-toolbar] [data-object-row]{height:31px!important;align-items:center!important}[data-studio-object-toolbar] input,[data-studio-object-toolbar] select{height:26px!important}}`}</style>
    <div style={{ height: 3, background: 'linear-gradient(#f0f0f0 0 1px,#a0a0a0 1px 2px,#fff 2px 3px)' }}/>
    <div data-object-row style={row}>
      {geometry('xMm', 'Object X (mm)')}{geometry('wMm', 'Object width (mm)')}
      {select('Object border', 'border', <><option value="true">Border</option><option value="false">No border</option></>)}
      {select('Border colour', 'borderColor', INPAGE_TEXT_COLOURS.map(c => <option key={c.hex} value={c.hex}>{c.label}</option>))}
      {select('Border style', 'borderStyle', <><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></>)}
      <input aria-label="Border thickness (pt)" data-studio-object-field="borderWidthPt" key={`width:${frames.map(f => f.id)}:${value(f => frameAppearance(f).borderWidthPt)}`} defaultValue={value(f => frameAppearance(f).borderWidthPt) ?? ''} placeholder="Mixed" style={{ ...sunken, width: 60 }} onKeyDown={e => { if (e.key === 'Enter') {
        e.preventDefault();
        const raw = e.currentTarget.value.trim();
        if (/^\d+(?:\.\d+)?$/.test(raw) && Number(raw) >= 0.1 && Number(raw) <= 12) {
            appearance({ borderWidthPt: Number(raw) });
            e.currentTarget.setCustomValidity('');
        }
        else {
            e.currentTarget.setCustomValidity('Use 0.1–12 pt.');
            e.currentTarget.reportValidity();
        }
    } if (e.key === 'Escape') {
        e.currentTarget.value = String(value(f => frameAppearance(f).borderWidthPt) ?? '');
        e.currentTarget.setCustomValidity('');
        e.stopPropagation();
    } }}/>
      <select disabled aria-label="Rotation" title="Coming soon — rotation is not supported by both export paths" style={{ ...sunken, width: 70, color: '#808080' }}><option>0°</option></select>
    </div>
    <div data-object-row style={row}>
      {geometry('yMm', 'Object Y (mm)')}{geometry('hMm', 'Object height (mm)')}
      <select disabled={frames.some(frame => frame.kind === "line")} title={frames.some(frame => frame.kind === "line") ? "Fill is not applicable to line objects." : "Object fill"} aria-label="Object fill" data-studio-object-field="fill" value={value(f => frameAppearance(f).fill) === null ? 'none' : value(f => frameAppearance(f).fill) ?? 'mixed'} onChange={e => appearance({ fill: e.target.value === 'none' ? null : e.target.value })} style={{ ...sunken, width: 104 }}>{mixed}<option value="none">No fill</option>{INPAGE_TEXT_COLOURS.map(c => <option key={c.hex} value={c.hex}>{c.label}</option>)}</select>
      <select disabled aria-label="Text box columns" title="Coming soon — text columns and gutter are not supported" style={{ ...sunken, width: 85, color: '#808080' }}><option>1 column</option></select>
      <input disabled aria-label="Column gutter" title="Coming soon" value="4.23mm" style={{ ...sunken, width: 70, color: '#808080' }}/>
      <span data-studio-object-source title="Imported source metadata only. Run Around reflow is not implemented." style={{ color: '#808080', lineHeight: '20px' }}>Run Around: {value(f => f.inPageSource?.runAround ?? 'none') ?? 'Mixed'} (not applied)</span>
      <span style={{ lineHeight: '20px' }}> · {frames.length} selected</span>
    </div>
    <div style={{ height: 2, background: 'linear-gradient(#a0a0a0,#696969)' }}/>
  </div>;
}
