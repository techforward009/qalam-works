"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import { applyObjectGeometry, formatGeometryLength, parseGeometryLength, parseBorderWidth, formatBorderWidth, parseDegrees, formatDegrees, type ObjectGeometryPatch } from "../utils/objectAttributes";
import { normalizeSafeHex, STUDIO_TEXT_COLORS } from "../utils/studioColors";
import type { StudioFrame } from "./StudioObjectLayer";
import { useMovableStudioDialog } from "./useMovableStudioDialog";
import { contextMenuPosition } from "../utils/textContextMenu";

const kinds = [
  ["picture-rect", "Rectangular Picture Box", "Rectangular", "▱"],
  ["picture-ellipse", "Elliptical Picture Box", "Elliptical", "◯"],
  ["picture-round-rect", "Rounded Rectangular Picture Box", "Rounded", "▢"],
] as const;
const fields = [["xMm", "X", "x"], ["yMm", "Y", "y"], ["wMm", "Width", "w"], ["hMm", "Height", "h"]] as const;
type GeometryKey = typeof fields[number][0];
const PX_PER_MM = 96 / 25.4;
const parsePercent = (raw: string) => { const match = raw.trim().match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))\s*%?$/); return match ? Number(match[1]) : Number.NaN; };
const formatPercent = (value: number) => `${Number.isFinite(value) ? Number(value.toFixed(6)) : 100}%`;
type Props = { frame: StudioFrame; onChange: (frameId: string, patch: ObjectGeometryPatch) => void };

export function StudioObjectRibbon({ frame, onChange }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuReturnFocus = useRef<HTMLElement | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; frame: StudioFrame } | null>(null);
  const [dialogFrame, setDialogFrame] = useState<StudioFrame | null>(null);
  useEffect(() => {
    const open = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const box = target?.closest<HTMLElement>('[data-studio-frame^="picture-"][data-studio-frame-id]');
      if (!box) return;
      event.preventDefault();
      const current = box.dataset.studioFrameId === frame.id ? frame : null;
      if (current) { menuReturnFocus.current = document.activeElement as HTMLElement; setMenu({ x: event.clientX, y: event.clientY, frame: current }); }
    };
    const selected = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; x: number; y: number }>).detail;
      if (detail.id === frame.id) { menuReturnFocus.current = document.activeElement as HTMLElement; setMenu({ x: detail.x, y: detail.y, frame }); delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest; }
    };
    document.addEventListener("contextmenu", open);
    window.addEventListener("studio-picture-context", selected);
    const pending = (window as Window & { __studioPictureContextRequest?: { id: string; x: number; y: number } }).__studioPictureContextRequest;
    if (pending?.id === frame.id) { menuReturnFocus.current = document.activeElement as HTMLElement; setMenu({ ...pending, frame }); delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest; }
    return () => { document.removeEventListener("contextmenu", open); window.removeEventListener("studio-picture-context", selected); };
  }, [frame]);

  useEffect(() => {
    if (menu) {
      const closeOutside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
      const close = () => setMenu(null);
      const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenu(null); menuReturnFocus.current?.focus({ preventScroll: true }); } };
      document.addEventListener("pointerdown", closeOutside, true);
      document.addEventListener("keydown", key, true);
      window.addEventListener("scroll", close, true);
      window.addEventListener("resize", close);
      window.addEventListener("blur", close);
      return () => { document.removeEventListener("pointerdown", closeOutside, true); document.removeEventListener("keydown", key, true); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); window.removeEventListener("blur", close); };
    }
  }, [menu]);
  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pos = contextMenuPosition(menu.x, menu.y, rect.width, rect.height, window.innerWidth, window.innerHeight);
    menuRef.current.style.left = `${pos.left}px`;
    menuRef.current.style.top = `${pos.top}px`;
    menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [menu]);
  useEffect(() => {
    if (dialogFrame && dialogFrame.id !== frame.id) setDialogFrame(null);
  }, [dialogFrame, frame.id]);

  const ribbonFields = <GeometryFields key={frame.id} frame={frame} onApply={patch => onChange(frame.id, patch)} />;
  return <>
    <div data-studio-object-ribbon="true" className="flex min-h-[34px] flex-wrap items-center gap-2 border-b border-[#b8b8b8] bg-[#f0f0f0] px-2 py-1 text-[11px] text-black" dir="ltr">
      {ribbonFields}
      <span className="mx-1 h-5 border-l border-[#c0c0c0]" />
      {kinds.map(([kind, label, , glyph]) => <button key={kind} type="button" aria-label={label} aria-pressed={frame.kind === kind} title={label} onClick={() => onChange(frame.id, { kind })} className="h-6 min-w-7 border border-[#aaa] bg-gradient-to-b from-white to-[#e5e5e5] px-1 aria-pressed:border-[#567b9e] aria-pressed:bg-[#d7e8f8]">{glyph}</button>)}
    </div>
    {menu ? createPortal(<div ref={menuRef} role="menu" aria-label="Object context menu" data-object-menu-root="true" className="fixed z-[120] border border-[#808080] bg-[#f0f0f0] p-1 shadow-md" style={{ left: menu.x, top: menu.y }} onPointerDown={e => e.stopPropagation()}><button type="button" role="menuitem" data-object-menu="format" className="px-4 py-1 text-left text-[11px] hover:bg-[#d6dff2]" onClick={() => { dialogReturnFocus.current = menuReturnFocus.current; setDialogFrame(menu.frame); setMenu(null); }}>Format Object...</button></div>, studioOverlayRoot()) : null}
    {dialogFrame ? <FormatDialog frame={dialogFrame} returnFocus={dialogReturnFocus} onCancel={() => setDialogFrame(null)} onApply={patch => { onChange(dialogFrame.id, patch); setDialogFrame(null); }} /> : null}
  </>;
}

function GeometryFields({ frame, onApply, firstFieldRef }: { frame: StudioFrame; onApply: (patch: ObjectGeometryPatch) => void; firstFieldRef?: React.RefObject<HTMLInputElement | null> }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(([key]) => [key, formatGeometryLength(frame[key])])));
  const skipBlur = useRef<string | null>(null);
  useEffect(() => setValues(Object.fromEntries(fields.map(([key]) => [key, formatGeometryLength(frame[key])]))), [frame.xMm, frame.yMm, frame.wMm, frame.hMm]);
  const revert = (key: GeometryKey) => setValues(prev => ({ ...prev, [key]: formatGeometryLength(frame[key]) }));
  const commit = (key: GeometryKey) => {
    const value = parseGeometryLength(values[key]);
    const patch = { [key]: value } as ObjectGeometryPatch;
    const updated = applyObjectGeometry(frame, patch);
    if (updated) onApply(patch); else revert(key);
  };
  return <>{fields.map(([key, label, data], index) => <label key={key} className="flex items-center gap-1">{label}<input ref={index === 0 ? firstFieldRef : undefined} aria-label={label} data-object-field={data} value={values[key]} onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") { if (e.currentTarget.form?.getAttribute("role") !== "dialog") { commit(key); e.currentTarget.blur(); } } if (e.key === "Escape") { skipBlur.current = key; revert(key); e.currentTarget.blur(); } }} onBlur={() => { if (skipBlur.current === key) { skipBlur.current = null; return; } commit(key); }} className="h-6 w-[62px] border border-[#999] bg-white px-1 text-[11px]" /></label>)}</>;
}

const unsupported = { title: "Not supported yet in Qalam Page", "aria-description": "Not supported yet in Qalam Page", disabled: true } as const;
const control: React.CSSProperties = { boxSizing: "border-box", height: 20, border: "1px solid #7f9db9", background: "#fff", padding: "1px 3px", color: "#000", font: '11px Tahoma, "Segoe UI", "MS Sans Serif", sans-serif' };
const unsupportedField = (left: number, top: number, width: number) => <input aria-label="Not supported" {...unsupported} value="" readOnly style={{ ...control, position: "absolute", left, top, width }} />;
const caption = (left: number, top: number, text: string, height = 20) => <span style={{ position: "absolute", left, top, height, display: "flex", alignItems: "center", lineHeight: "normal", whiteSpace: "nowrap" }}>{text}</span>;
const group = (left: number, top: number, width: number, height: number, title: string, children: React.ReactNode) => <div style={{ position: "absolute", left, top, width, height, boxSizing: "border-box", border: "1px solid #a0a0a0", boxShadow: "inset 0 1px #fff" }}><span style={{ position: "absolute", left: 7, top: -8, padding: "0 3px", lineHeight: "14px", background: "#f0f0f0", whiteSpace: "nowrap" }}>{title}</span>{children}</div>;
const spinner = (left: number, top: number, label = "Not supported") => <button type="button" aria-label={label} {...unsupported} style={{ position: "absolute", left, top, width: 16, height: 20, padding: 0, border: "1px solid #7f9db9", background: "#f0f0f0", color: "#111", font: "8px Arial", lineHeight: "8px" }}><span style={{ display: "block", height: 9, borderBottom: "1px solid #aaa" }}>▲</span><span style={{ display: "block", height: 8 }}>▼</span></button>;
const combo = (left: number, top: number, width: number) => <div title={unsupported.title} style={{ position: "absolute", left, top, width, height: 20, display: "flex", boxSizing: "border-box", border: "1px solid #7f9db9", background: "#fff" }}><input aria-label="Not supported" {...unsupported} value="" readOnly style={{ ...control, minWidth: 0, height: 18, flex: 1, border: 0, background: "transparent" }} /><button type="button" aria-label="Not supported" {...unsupported} style={{ width: 16, height: 18, padding: 0, border: "1px solid #aaa", background: "#eee", fontSize: 9 }}>▼</button></div>;
const radio = (checked = false) => <span aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-2px", width: 10, height: 10, marginRight: 4, border: "1px solid #777", borderRadius: "50%", background: checked ? "radial-gradient(circle,#111 0 2px,#eee 2.5px)" : "#f0f0f0", boxShadow: "inset 0 1px #fff" }} />;
const checkbox = (checked = false) => <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "-2px", width: 13, height: 13, marginRight: 4, border: "1px solid #777", background: "#f8f8f8", boxShadow: "inset 0 1px #fff", font: "bold 11px Arial" }}>{checked ? "✓" : ""}</span>;

function FormatDialog({ frame, onCancel, onApply, returnFocus }: { frame: StudioFrame; onCancel: () => void; onApply: (patch: ObjectGeometryPatch) => void; returnFocus: React.MutableRefObject<HTMLElement | null> }) {
  const drag = useMovableStudioDialog<HTMLFormElement>();
  const formRef = useRef<HTMLFormElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const [patch, setPatch] = useState<ObjectGeometryPatch>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [borderWidth, setBorderWidth] = useState(() => formatBorderWidth(frame.borderWidthMm ?? 25.4 / 96));
  const [borderColor, setBorderColor] = useState(frame.borderColor ?? "#000000");
  const [backgroundColor, setBackgroundColor] = useState(frame.backgroundColor ?? "");
  const [origin, setOrigin] = useState({ x: formatGeometryLength(frame.imageXMm ?? 0), y: formatGeometryLength(frame.imageYMm ?? 0) });
  const [scale, setScale] = useState({ x: formatPercent(frame.imageNaturalW ? ((frame.imageWMm ?? frame.wMm) / (frame.imageNaturalW / PX_PER_MM)) * 100 : 100), y: formatPercent(frame.imageNaturalH ? ((frame.imageHMm ?? frame.hMm) / (frame.imageNaturalH / PX_PER_MM)) * 100 : 100) });
  const [roundness, setRoundness] = useState(formatGeometryLength(frame.roundnessMm ?? 6.35));
  const [angle1, setAngle1] = useState(formatDegrees(frame.angle1Deg ?? 0));
  const [angle2, setAngle2] = useState(formatDegrees(frame.angle2Deg ?? 0));
  const [borderPosition, setBorderPosition] = useState<"inside" | "outside" | undefined>(frame.borderPosition);
  const [draft, setDraft] = useState<Record<GeometryKey, string>>(() => Object.fromEntries(fields.map(([key]) => [key, formatGeometryLength(frame[key])])) as Record<GeometryKey, string>);
  const preview = { ...frame, ...patch };
  useEffect(() => { firstField.current?.focus({ preventScroll: true }); return () => returnFocus.current?.focus({ preventScroll: true }); }, [returnFocus]);
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); }; document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape); }, [onCancel]);
  return createPortal(<div style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)", padding: 12 }}><form ref={node => { drag.dialogRef.current = node; formRef.current = node; }} role="dialog" aria-modal="true" aria-label="Modify Object" data-studio-format-object-dialog="true" data-inpage2009-dialog="true" data-modify-object-window="true" dir="ltr" onSubmit={e => { e.preventDefault(); const current = Object.fromEntries(fields.map(([key]) => [key, parseGeometryLength(draft[key])] )) as ObjectGeometryPatch; const style: ObjectGeometryPatch = {};
      const originX = parseGeometryLength(origin.x), originY = parseGeometryLength(origin.y);
      if (Number.isFinite(originX) && Math.abs(originX - (frame.imageXMm ?? 0)) > 1e-6) current.imageXMm = originX;
      if (Number.isFinite(originY) && Math.abs(originY - (frame.imageYMm ?? 0)) > 1e-6) current.imageYMm = originY;
      const scaleX = parsePercent(scale.x), scaleY = parsePercent(scale.y);
      const shownScaleX = frame.imageNaturalW ? ((frame.imageWMm ?? frame.wMm) / (frame.imageNaturalW / PX_PER_MM)) * 100 : 100;
      const shownScaleY = frame.imageNaturalH ? ((frame.imageHMm ?? frame.hMm) / (frame.imageNaturalH / PX_PER_MM)) * 100 : 100;
      if (Number.isFinite(scaleX) && Math.abs(scaleX - parsePercent(formatPercent(shownScaleX))) > 1e-6) current.imageWMm = (scaleX / 100) * (frame.imageNaturalW ? frame.imageNaturalW / PX_PER_MM : (frame.imageWMm ?? frame.wMm));
      if (Number.isFinite(scaleY) && Math.abs(scaleY - parsePercent(formatPercent(shownScaleY))) > 1e-6) current.imageHMm = (scaleY / 100) * (frame.imageNaturalH ? frame.imageNaturalH / PX_PER_MM : (frame.imageHMm ?? frame.hMm));
      const roundMm = parseGeometryLength(roundness);
      if (Number.isFinite(roundMm) && Math.abs(roundMm - (frame.roundnessMm ?? 6.35)) > 1e-6) current.roundnessMm = roundMm;
      const parsedAngle1 = parseDegrees(angle1), parsedAngle2 = parseDegrees(angle2);
      if (Number.isFinite(parsedAngle1) && Math.abs(parsedAngle1 - (frame.angle1Deg ?? 0)) > 1e-6) current.angle1Deg = parsedAngle1;
      if (Number.isFinite(parsedAngle2) && Math.abs(parsedAngle2 - (frame.angle2Deg ?? 0)) > 1e-6) current.angle2Deg = parsedAngle2;
      if (borderPosition !== undefined && borderPosition !== frame.borderPosition) current.borderPosition = borderPosition;
      if (patch.locked !== undefined && patch.locked !== (frame.locked ?? false)) current.locked = patch.locked;
      if (patch.dontPrint !== undefined && patch.dontPrint !== (frame.dontPrint ?? false)) current.dontPrint = patch.dontPrint;
      if (patch.template !== undefined && patch.template !== (frame.template ?? false)) current.template = patch.template;
      const parsedWidth = parseBorderWidth(borderWidth); if (Number.isFinite(parsedWidth) && Math.abs(parsedWidth - (frame.borderWidthMm ?? 25.4 / 96)) > 1e-6) style.borderWidthMm = parsedWidth; if ((normalizeSafeHex(borderColor) ?? borderColor).toLowerCase() !== (normalizeSafeHex(frame.borderColor ?? "#000000") ?? "#000000").toLowerCase()) style.borderColor = borderColor; if (backgroundColor !== (frame.backgroundColor ?? "")) style.backgroundColor = backgroundColor; if (frame.borderPattern !== undefined) style.borderPattern = frame.borderPattern; if (frame.backgroundHatch !== undefined) style.backgroundHatch = frame.backgroundHatch; const selection = { ...patch }; delete selection.locked; delete selection.dontPrint; delete selection.template; onApply({ ...current, ...selection, ...style }); }} style={{ ...drag.style, position: "relative", boxSizing: "border-box", width: 352, height: 322, flex: "none", padding: 0, overflow: "hidden", border: "1px solid #252c33", background: "#b8dbfd", color: "#000", font: '11px Tahoma, "Segoe UI", Arial, sans-serif', boxShadow: "0 2px 8px #555" }}>
    <div {...drag.handleProps} style={{ ...drag.handleProps.style, position: "absolute", left: 0, top: 0, right: 0, height: 29, boxSizing: "border-box", paddingLeft: 7, display: "flex", alignItems: "center", fontWeight: "normal", fontSize: 11, borderBottom: "1px solid #5d6c7a", background: "linear-gradient(#e9f5ff,#c6e2fc 70%,#b8dbfd)" }}>Modify Object</div>
    <button type="button" aria-label="Close" onClick={onCancel} style={{ position: "absolute", right: 3, top: 2, width: 43, height: 18, padding: 0, border: "1px solid #9e382d", borderRadius: "0 0 4px 4px", color: "white", font: 'bold 13px Arial, sans-serif', lineHeight: "15px", textShadow: "0 1px #6b1915", background: "linear-gradient(#f7a08f,#ce392c 55%,#a51d18)", zIndex: 2 }}>×</button>
    <div style={{ position: "absolute", left: 7, top: 29, width: 336, height: 284, boxSizing: "border-box", border: "1px solid #5d6c7a", background: "#f0f0f0" }}>
      {group(3, 6, 116, 126, "Bounds", <>
        {caption(6, 14, "Across[x]:")}{caption(6, 37, "Down[y]:")}{caption(6, 60, "Width:")}{caption(6, 83, "Height:")}{caption(6, 102, "Angle1:")}
        {fields.map(([key, label, data], i) => <label key={key} style={{ position: "absolute", left: 50, top: [14, 37, 60, 83][i], height: 20 }}><span className="sr-only">{label}</span><input ref={i === 0 ? firstField : undefined} aria-label={label} data-object-field={data} value={draft[key]} onChange={e => { const raw = e.target.value; setDraft(prev => ({ ...prev, [key]: raw })); setPatch(prev => ({ ...prev, [key]: parseGeometryLength(raw) })); }} style={{ ...control, width: 64 }} /></label>)}
        <input aria-label="Angle1" value={angle1} onChange={e => setAngle1(e.target.value)} style={{ ...control, position: "absolute", left: 50, top: 102, width: 64 }} /><span style={{ position: "absolute", left: 98, top: 102, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Angle1" onClick={() => setAngle1(formatDegrees((parseDegrees(angle1) || 0) + 1))} style={{ height: 10, padding: 0, lineHeight: "8px" }}>▲</button><button type="button" aria-label="Decrease Angle1" onClick={() => setAngle1(formatDegrees((parseDegrees(angle1) || 0) - 1))} style={{ height: 10, padding: 0, lineHeight: "8px" }}>▼</button></span>
      </>)}
      {group(123, 6, 122, 126, "Border", <>
        {caption(5, 14, "Color:")}{caption(5, 37, "Width:")}{caption(5, 60, "Pattern:")}
        <select aria-label="Border Color" value={borderColor} onChange={e => setBorderColor(e.target.value)} style={{ ...control, position: "absolute", left: 44, top: 14, width: 70, height: 20 }}>{STUDIO_TEXT_COLORS.filter(c => c.hex).map(c => <option key={c.id} value={c.hex}>{c.label}</option>)}</select>
        <input aria-label="Border Width" value={borderWidth} onChange={e => setBorderWidth(e.target.value)} style={{ ...control, position: "absolute", left: 44, top: 37, width: 52 }} />
        <span style={{ position: "absolute", left: 98, top: 37, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Border Width" onClick={() => setBorderWidth(formatBorderWidth(parseBorderWidth(borderWidth) + 25.4 / 288))} style={{height:10,padding:0,lineHeight:"8px"}}>▲</button><button type="button" aria-label="Decrease Border Width" onClick={() => setBorderWidth(formatBorderWidth(Math.max(0.01, parseBorderWidth(borderWidth) - 25.4 / 288)))} style={{height:10,padding:0,lineHeight:"8px"}}>▼</button></span>
        <select aria-label="Border Pattern" defaultValue="none" style={{ ...control, position: "absolute", left: 44, top: 60, width: 70, height: 20 }}><option value="none">None</option></select>
        <label style={{ position: "absolute", left: 5, top: 83 }}>{radio(borderPosition === "inside")}Inside<input type="radio" name="border-position" aria-label="Inside" checked={borderPosition === "inside"} onChange={() => setBorderPosition("inside")} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label><label style={{ position: "absolute", left: 58, top: 83 }}>{radio(borderPosition === "outside")}Outside<input type="radio" name="border-position" aria-label="Outside" checked={borderPosition === "outside"} onChange={() => setBorderPosition("outside")} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label>
        {caption(5, 102, "Roundness:")}<input aria-label="Roundness" value={roundness} onChange={e => setRoundness(e.target.value)} style={{ ...control, position: "absolute", left: 62, top: 102, width: 52 }} />
      </>)}
      {group(3, 139, 242, 99, "Picture", <>
        {group(3, 12, 113, 58, "Origin", <>{caption(4, 14, "Across:")}{caption(4, 34, "Down:")}<input aria-label="Origin Across" value={origin.x} onChange={e => setOrigin(v => ({ ...v, x: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 14, width: 62 }} /><input aria-label="Origin Down" value={origin.y} onChange={e => setOrigin(v => ({ ...v, y: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 34, width: 62 }} /></>)}
        {group(120, 12, 119, 58, "Scaling", <>{caption(4, 14, "Across:")}{caption(4, 34, "Down:")}<input aria-label="Scaling Across" value={scale.x} onChange={e => setScale(v => ({ ...v, x: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 14, width: 58 }} /><input aria-label="Scaling Down" value={scale.y} onChange={e => setScale(v => ({ ...v, y: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 34, width: 58 }} /><span style={{ position: "absolute", left: 103, top: 14, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Scaling Across" onClick={() => setScale(v => ({ ...v, x: formatPercent(parsePercent(v.x) + 1) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▲</button><button type="button" aria-label="Decrease Scaling Across" onClick={() => setScale(v => ({ ...v, x: formatPercent(Math.max(0.01, parsePercent(v.x) - 1)) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▼</button></span><span style={{ position: "absolute", left: 103, top: 34, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Scaling Down" onClick={() => setScale(v => ({ ...v, y: formatPercent(parsePercent(v.y) + 1) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▲</button><button type="button" aria-label="Decrease Scaling Down" onClick={() => setScale(v => ({ ...v, y: formatPercent(Math.max(0.01, parsePercent(v.y) - 1)) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▼</button></span></>)}
        {caption(4, 76, "Angle2:")}<input aria-label="Angle2" value={angle2} onChange={e => setAngle2(e.target.value)} style={{ ...control, position: "absolute", left: 45, top: 76, width: 62 }} /><label style={{ position: "absolute", left: 121, top: 76, whiteSpace: "nowrap" }}>{checkbox()}White Transparent(q)<input type="checkbox" aria-label="Not supported" {...unsupported} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label>
      </>)}
      {group(3, 245, 242, 35, "Background", <>{caption(5, 13, "Color(z):")}<select aria-label="Background Color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} style={{ ...control, position: "absolute", left: 47, top: 13, width: 74, height: 20 }}><option value="">None</option><option value="#FFFFFF">White</option>{STUDIO_TEXT_COLORS.filter(c => c.hex).map(c => <option key={c.id} value={c.hex}>{c.label}</option>)}</select>{caption(126, 13, "Hatch:")}<select aria-label="Background Hatch" defaultValue="none" style={{ ...control, position: "absolute", left: 164, top: 13, width: 72, height: 20 }}><option value="none">None</option></select></>)}
      <div data-object-shape-group="true" style={{ position: "absolute", left: 250, top: 140, width: 83, height: 65, boxSizing: "border-box", border: "1px solid #a0a0a0", boxShadow: "inset 0 1px #fff" }}><span style={{ position: "absolute", left: 7, top: -6, padding: "0 3px", lineHeight: "12px", background: "#f0f0f0", whiteSpace: "nowrap" }}>Shape</span>{kinds.map(([kind, label, short], i) => <label key={kind} style={{ position: "absolute", left: 4, top: 17 + i * 16, width: 77, maxWidth: 77, height: 10, display: "flex", alignItems: "center", whiteSpace: "nowrap", cursor: "default" }}>{radio(preview.kind === kind)}{short}<input type="radio" name="object-shape" aria-label={label} checked={preview.kind === kind} onChange={() => setPatch(prev => ({ ...prev, kind }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label>)}</div>
      {caption(250, 115, "Number:", 19)}<input data-object-number-field="true" aria-label="Not supported" {...unsupported} value="" readOnly style={{ ...control, position: "absolute", left: 295, top: 115, width: 38, height: 19, textAlign: "left", lineHeight: "17px" }} />
      <button type="submit" style={{ ...classicButton, position: "absolute", left: 257, top: 7, width: 75, height: 22, outline: "1px solid #59636b", outlineOffset: 1 }}>OK</button>
      <button type="button" onClick={onCancel} style={{ ...classicButton, position: "absolute", left: 257, top: 34, width: 75, height: 22 }}>Cancel</button>
      <button type="button" onClick={() => setHelpOpen(true)} style={{ ...classicButton, position: "absolute", left: 257, top: 60, width: 75, height: 22 }}>Help</button>
      {/* Run Around wrap is not wired: both-side flow around a free-XY box needs a line-splitting engine (CSS float/shape-outside is one-sided). Verified user Offset dialog for the shown box — not a proven universal fresh default: checked, L/R 0.71mm, T/B 0.35mm. */}
      <label title={unsupported.title} aria-description={unsupported["aria-description"]} style={{ position: "absolute", left: 250, top: 213, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input type="checkbox" {...unsupported} checked={false} readOnly style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(false)}Run Around</label>
      <label style={{ position: "absolute", left: 250, top: 230, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input aria-label="Template" type="checkbox" checked={patch.template ?? frame.template ?? false} onChange={e => setPatch(v => ({ ...v, template: e.target.checked }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(patch.template ?? frame.template ?? false)}Template</label>
      <label style={{ position: "absolute", left: 250, top: 246, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input aria-label="Lock" type="checkbox" checked={patch.locked ?? frame.locked ?? false} onChange={e => setPatch(v => ({ ...v, locked: e.target.checked }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(patch.locked ?? frame.locked ?? false)}Lock</label>
      <label style={{ position: "absolute", left: 250, top: 262, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input aria-label="Don't Print" type="checkbox" checked={patch.dontPrint ?? frame.dontPrint ?? false} onChange={e => setPatch(v => ({ ...v, dontPrint: e.target.checked }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(patch.dontPrint ?? frame.dontPrint ?? false)}Don't Print</label>
    </div>
    {helpOpen ? <div role="dialog" aria-label="Format Object help" style={{ position: "absolute", left: 7, top: 29, zIndex: 5, boxSizing: "border-box", width: 336, height: 284, overflow: "auto", padding: 10, border: "1px solid #5d6c7a", background: "#fff", color: "#111", font: '12px Tahoma, "Segoe UI", Arial, sans-serif' }}><button type="button" aria-label="Close help" onClick={() => setHelpOpen(false)} style={{ ...classicButton, position: "sticky", float: "right", top: 0, width: 55, height: 22 }}>Close</button><h2 style={{ margin: "0 0 8px", fontSize: 14 }}>Format Object</h2><p><strong>Bounds:</strong> Across/Down contain the object Origin; change them to move the object. Width and Height resize it.</p><p><strong>Picture Origin and Scaling:</strong> Origin sets the picture’s left/top position. Scaling changes picture width and height by percentage.</p><p><strong>Border:</strong> Set color, width and pattern. Inside borders reduce the available text/picture bounds; Outside keeps those bounds constant.</p><p><strong>Template:</strong> “You can mark an object as a template object, in which case, when you drag the object then a copy of the template object is peeled off.”</p><p><strong>Lock:</strong> A locked object cannot be deleted or modified with the mouse; unlock it first.</p><p><strong>Don’t Print:</strong> Check this to disable printing for the selected objects.</p><p><strong>Runaround:</strong> The help describes enabling runaround for selected objects and setting distances along the four sides in the Runaround dialog.</p><p style={{ fontSize: 10, color: "#555" }}>Source: Official InPage Help, Menu Format:Object.</p></div> : null}
  </form></div>, studioOverlayRoot());
}

const classicButton: React.CSSProperties = { boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: "normal", border: "1px solid #70777d", borderTopColor: "#fff", borderLeftColor: "#fff", borderRadius: 0, background: "#efefef", color: "#111", font: '11px Tahoma, "Segoe UI", "MS Sans Serif", sans-serif', boxShadow: "inset -1px -1px #b5b5b5", textAlign: "center" };
