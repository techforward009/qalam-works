"use client";

import { useEffect, useState } from "react";
import { useMovableStudioDialog } from "./useMovableStudioDialog";
import { defaultDocumentSettings, type DocumentStudioSettings } from "../utils/documentSettings";
import { clampMarginMm, resolvePageDimensions, type PageOrientation, type PageSizeId } from "../utils/pageLayout";
import type { DocNode } from "../utils/extractPlainText";

export type NewDocumentDraft = {
  size: PageSizeId;
  orientation: PageOrientation;
  pages: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  columns: number;
  gutter: number;
  direction: "rtl" | "ltr";
  automaticTextBox: boolean;
  doubleSided: boolean;
  facingPages: boolean;
};

const DEFAULT_KEY = "qalam-studio-new-document-default-v1";
export const STUDIO_DEFAULT_GUTTER_MM = 4.23;
const MIN_PAGES_KEY = "qalam-studio-minimum-pages-v1";

export function defaultNewDocumentDraft(): NewDocumentDraft {
  return {
    size: "a4",
    orientation: "portrait",
    pages: 1,
    top: 12.7,
    bottom: 12.7,
    left: 12.7,
    right: 12.7,
    columns: 1,
    gutter: STUDIO_DEFAULT_GUTTER_MM,
    direction: "rtl",
    automaticTextBox: true,
    doubleSided: false,
    facingPages: false,
  };
}

export function settingsFromNewDocument(draft: NewDocumentDraft): DocumentStudioSettings {
  const base = defaultDocumentSettings();
  const rtl = draft.direction === "rtl";
  return {
    ...base,
    typography: { ...base.typography, defaultRtlFontId: "jameel-noori-nastaleeq" },
    page: {
      size: draft.size,
      orientation: draft.orientation,
      margins: {
        preset: "custom",
        topMm: clampMarginMm(draft.top),
        bottomMm: clampMarginMm(draft.bottom),
        startMm: clampMarginMm(rtl ? draft.right : draft.left),
        endMm: clampMarginMm(rtl ? draft.left : draft.right),
      },
    },
  };
}

export function pageCountFromNewDocument(draft: Pick<NewDocumentDraft, "pages">): number {
  const pages = Math.floor(Number(draft.pages));
  if (!Number.isFinite(pages)) return 1;
  return Math.max(1, Math.min(40, pages));
}

export function readStoredMinimumPages(id: string): number {
  if (typeof window === "undefined" || !id) return 1;
  try {
    const map = JSON.parse(window.localStorage.getItem(MIN_PAGES_KEY) || "{}") as Record<string, unknown>;
    return pageCountFromNewDocument({ pages: Number(map[id]) });
  } catch {
    return 1;
  }
}

export function writeStoredMinimumPages(id: string, pages: number): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const raw = window.localStorage.getItem(MIN_PAGES_KEY);
    const map = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    map[id] = pageCountFromNewDocument({ pages });
    window.localStorage.setItem(MIN_PAGES_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** One empty paragraph. Extra sheets are a pagination floor, not page-break nodes. */
export function contentFromNewDocument(draft: NewDocumentDraft): DocNode {
  return {
    type: "doc",
    content: [{ type: "paragraph", attrs: { dir: draft.direction, directionMode: draft.direction } }],
  };
}

const SIZE_OPTIONS: { id: PageSizeId; label: string }[] = [
  { id: "a4", label: "A4 210x297mm" },
  { id: "a5", label: "A5 148x210mm" },
  { id: "letter", label: "Letter 216x279mm" },
];

function readSavedDraft(): NewDocumentDraft {
  if (typeof window === "undefined") return defaultNewDocumentDraft();
  try {
    const raw = window.localStorage.getItem(DEFAULT_KEY);
    if (!raw) return defaultNewDocumentDraft();
    const parsed = JSON.parse(raw) as Partial<NewDocumentDraft>;
    const base = defaultNewDocumentDraft();
    const size = parsed.size === "a5" || parsed.size === "letter" || parsed.size === "a4" ? parsed.size : base.size;
    const orientation = parsed.orientation === "landscape" ? "landscape" : "portrait";
    const direction = parsed.direction === "ltr" ? "ltr" : "rtl";
    const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
    return {
      ...base,
      size,
      orientation,
      pages: pageCountFromNewDocument({ pages: num(parsed.pages, base.pages) }),
      top: num(parsed.top, base.top),
      bottom: num(parsed.bottom, base.bottom),
      left: num(parsed.left, base.left),
      right: num(parsed.right, base.right),
      columns: Math.max(1, Math.min(4, Math.floor(num(parsed.columns, base.columns)))),
      gutter: Math.max(0, num(parsed.gutter, base.gutter)),
      direction,
      automaticTextBox: parsed.automaticTextBox !== false,
      doubleSided: parsed.doubleSided === true,
      facingPages: false,
    };
  } catch {
    return defaultNewDocumentDraft();
  }
}

function saveDefaultDraft(draft: NewDocumentDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEFAULT_KEY, JSON.stringify(draft));
  } catch {
    /* private mode */
  }
}

const fieldCls = "box-border h-[18px] shrink-0 border-0 bg-white px-0.5 text-black";
const fieldStyle = { boxShadow: "inset 1px 1px 0 #696969, inset 2px 2px 0 #a0a0a0, inset -1px -1px 0 #fff", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "16px", minWidth: 0 } as const;
const labelCls = "whitespace-nowrap text-[11px] leading-none text-black";
const groupCls = "min-w-0 bg-[#f0f0f0]";
const groupStyle = { position: "absolute", boxSizing: "border-box", border: "1px solid #a0a0a0", boxShadow: "inset 1px 1px 0 #fff", padding: "2px 3px", margin: 0 } as const;
const selectStyle = {
  ...fieldStyle,
  appearance: "none" as const,
  backgroundColor: "#fff",
  backgroundImage: "linear-gradient(45deg, transparent 50%, #000 50%), linear-gradient(135deg, #000 50%, transparent 50%)",
  backgroundPosition: "calc(100% - 8px) 7px, calc(100% - 4px) 7px",
  backgroundSize: "4px 4px, 4px 4px",
  backgroundRepeat: "no-repeat",
  padding: "0 12px 0 2px",
};
const raised = "inset 1px 1px 0 #fff, inset -1px -1px 0 #696969, inset -2px -2px 0 #a0a0a0";
const btnStyle = { width: 59, height: 20, border: "none", background: "#f0f0f0", boxShadow: raised, fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "18px", color: "#000", padding: 0 } as const;
const checkStyle = { width: 13, height: 13, minWidth: 13, margin: 0, appearance: "none", backgroundColor: "#fff", boxShadow: "inset 1px 1px 0 #696969, inset 2px 2px 0 #a0a0a0, inset -1px -1px 0 #fff" } as const;
const radioStyle = { width: 12, height: 12, minWidth: 12, margin: 0, appearance: "none", borderRadius: "50%", border: "1px solid #808080", backgroundColor: "#fff", boxShadow: "inset 1px 1px 0 #a0a0a0, 1px 1px 0 #fff" } as const;

function ClassicSpin({ label, value, min, max, step = 1, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void;
}) {
  const move = (delta: number) => onChange(Number(nudge(String(value), delta, min, max)));
  return <span className="relative inline-flex shrink-0" data-studio-dialog-spin={label} style={{ width: 65, height: 18 }}>
    <input className={fieldCls} style={{ ...fieldStyle, width: 65, paddingRight: 12 }} type={unit ? "text" : "number"}
      role="spinbutton" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}
      min={min} max={max} step={step} value={unit ? `${value}${unit}` : value}
      onChange={(event) => { const next = Number(event.target.value.replace(/mm/gi, "").trim()); if (Number.isFinite(next)) onChange(next); }}
      onKeyDown={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); move(event.key === "ArrowUp" ? step : -step); } }} />
    <span className="absolute right-px top-px flex flex-col" style={{ width: 10, height: 16 }}>
      {[1, -1].map((sign) => <button key={sign} type="button" aria-label={`${sign > 0 ? "Increase" : "Decrease"} ${label.toLowerCase()}`}
        onMouseDown={(event) => event.preventDefault()} onClick={() => move(sign * step)}
        style={{ width: 10, height: 8, padding: 0, border: "none", background: "#f0f0f0", boxShadow: raised, display: "grid", placeItems: "center" }}>
        <svg width="5" height="3" viewBox="0 0 5 3" aria-hidden="true"><path d={sign > 0 ? "M0 3L2.5 0L5 3Z" : "M0 0L2.5 3L5 0Z"} fill="#000" /></svg>
      </button>)}
    </span>
  </span>;
}

function nudge(value: string, delta: number, min: number, max: number): string {
  const current = Number(String(value).replace(/mm/gi, "").trim());
  const base = Number.isFinite(current) ? current : min;
  const next = Math.min(max, Math.max(min, Math.round((base + delta) * 100) / 100));
  return String(next);
}

export default function NewDocumentDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (draft: NewDocumentDraft) => void;
}) {
  const drag = useMovableStudioDialog<HTMLFormElement>();
  const [scale, setScale] = useState(1);
  useEffect(() => { const update = () => setScale(Math.min(1, (window.innerWidth - 16) / 402, (window.innerHeight - 16) / 218)); update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }, []);
  const [draft, setDraft] = useState<NewDocumentDraft>(defaultNewDocumentDraft);
  const [helpNote, setHelpNote] = useState<string | null>(null);
  const dims = resolvePageDimensions(draft.size, draft.orientation);
  const set = (patch: Partial<NewDocumentDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    setDraft(readSavedDraft());
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center" style={{ background: "#ababab" }} data-studio-new-document="true">
      <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="New Document" className="text-black" dir="ltr"
        style={{ position: "relative", transform: `${drag.style.transform} scale(${scale})`, width: 402, height: 218, boxSizing: "border-box", background: "#f0f0f0", border: "7px solid rgb(164, 181, 199)", outline: "1px solid #191e23", boxShadow: "0 3px 14px rgba(0,0,0,0.5)", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11 }}
        onSubmit={(event) => { event.preventDefault(); onConfirm(draft); }}>
        <div {...drag.handleProps} className="flex items-center" style={{ ...drag.handleProps.style, height: 20, paddingLeft: 1, background: "#a4b5c7", fontSize: 11, fontWeight: 400 }} data-studio-new-document-title="true">New Document</div>
        <fieldset className={groupCls} style={{ ...groupStyle, left: 7, top: 31, width: 120, height: 165 }} data-studio-dialog-group="page">
          <legend className={labelCls}>Page</legend>
          <select className="box-border h-[18px] border-0" style={{ ...selectStyle, width: 112 }} aria-label="Page size" value={draft.size} onChange={(event) => set({ size: event.target.value as PageSizeId })}>
            {SIZE_OPTIONS.map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}
          </select>
          <label className="mt-[5px] flex items-center justify-between"><span className={labelCls}>Width:</span><input className={fieldCls} style={{ ...fieldStyle, width: 68 }} value={`${dims.widthMm}mm`} readOnly aria-label="Width in millimetres" /></label>
          <label className="mt-[5px] flex items-center justify-between"><span className={labelCls}>Height:</span><input className={fieldCls} style={{ ...fieldStyle, width: 68 }} value={`${dims.heightMm}mm`} readOnly aria-label="Height in millimetres" /></label>
          <fieldset className="mt-[5px]" style={{ border: "1px solid #a0a0a0", boxShadow: "inset 1px 1px 0 #fff", padding: "2px 3px", height: 45 }}>
            <legend className={labelCls}>Orientation</legend>
            <label className={`flex h-[15px] items-center gap-1 ${labelCls}`}><input style={radioStyle} type="radio" name="orientation" checked={draft.orientation === "portrait"} onChange={() => set({ orientation: "portrait" })} />Portrait</label>
            <label className={`flex h-[15px] items-center gap-1 ${labelCls}`}><input style={radioStyle} type="radio" name="orientation" checked={draft.orientation === "landscape"} onChange={() => set({ orientation: "landscape" })} />Landscape</label>
          </fieldset>
          <label className="absolute bottom-[4px] left-[3px] right-[3px] flex items-center justify-between"><span className={labelCls}>Pages:</span><ClassicSpin label="Pages" value={draft.pages} min={1} max={40} onChange={(pages) => set({ pages })} /></label>
        </fieldset>
        <fieldset className={groupCls} style={{ ...groupStyle, left: 133, top: 31, width: 106, height: 105 }} data-studio-dialog-group="margins">
          <legend className={labelCls}>Margins</legend>
          {([["left", "Left:"], ["right", "Right:"], ["top", "Top:"], ["bottom", "Bottom:"]] as const).map(([key, caption]) => <label key={key} className="mb-[5px] flex items-center justify-between">
            <span className={labelCls}>{caption}</span><input className={fieldCls} style={{ ...fieldStyle, width: 58 }} aria-label={`${key} margin`} value={`${draft[key]}mm`} onChange={(event) => { const next = Number(event.target.value.replace(/mm/gi, "").trim()); if (Number.isFinite(next)) set({ [key]: next }); }} />
          </label>)}
        </fieldset>
        <fieldset className={groupCls} style={{ ...groupStyle, left: 133, top: 143, width: 106, height: 53 }} data-studio-direction="true" data-studio-dialog-group="direction">
          <legend className={labelCls}>Direction</legend>
          <label className={`flex h-[16px] items-center gap-1 ${labelCls}`}><input style={radioStyle} type="radio" name="direction" checked={draft.direction === "ltr"} onChange={() => set({ direction: "ltr" })} />Left To Right</label>
          <label className={`flex h-[16px] items-center gap-1 ${labelCls}`}><input style={radioStyle} type="radio" name="direction" checked={draft.direction === "rtl"} onChange={() => set({ direction: "rtl" })} />Right To Left</label>
        </fieldset>
        <fieldset className={groupCls} style={{ ...groupStyle, left: 244, top: 31, width: 72, height: 83 }} data-studio-dialog-group="columns">
          <legend className={labelCls}>Columns</legend>
          <ClassicSpin label="Columns" value={draft.columns} min={1} max={4} onChange={(columns) => set({ columns })} />
          <label className={`mb-[3px] mt-[5px] block ${labelCls}`}>Gutter:</label>
          <ClassicSpin label="Gutter" value={draft.gutter} unit="mm" step={0.01} min={0} max={50} onChange={(gutter) => set({ gutter })} />
        </fieldset>
        <label className={`absolute flex h-[13px] items-center gap-1 ${labelCls}`} style={{ left: 244, top: 119 }}><input style={checkStyle} type="checkbox" checked={draft.automaticTextBox} onChange={(event) => set({ automaticTextBox: event.target.checked })} />Automatic Text Box</label>
        <label className={`absolute flex h-[13px] items-center gap-1 ${labelCls}`} style={{ left: 244, top: 136 }}><input style={checkStyle} type="checkbox" checked={draft.doubleSided} onChange={(event) => set({ doubleSided: event.target.checked, facingPages: event.target.checked ? draft.facingPages : false })} />Double Sided</label>
        <label className={`absolute flex h-[13px] items-center gap-1 ${labelCls}`} style={{ left: 244, top: 153 }}><input style={checkStyle} type="checkbox" checked={draft.facingPages} onChange={event=>set({facingPages:event.target.checked})} />Facing Pages</label>
        <button type="button" style={{ ...btnStyle, position: "absolute", left: 244, top: 176, width: 136 }} onClick={() => saveDefaultDraft(draft)}>Save as Default</button>
        <div className="absolute flex flex-col gap-[6px]" style={{ left: 320, top: 35 }}>
          <button type="submit" style={{ ...btnStyle, outline: "1px dotted #000", outlineOffset: -3 }} data-studio-default-button="true">OK</button>
          <button type="button" style={btnStyle} onClick={onCancel}>Cancel</button>
          <button type="button" style={btnStyle} onClick={() => setHelpNote("A4, 12.7 mm margins, one column, gutter 4.23 mm, right to left. Saved only in this browser.")}>Help</button>
        </div>
      </form>
      <style>{`
        [data-studio-new-document] legend { padding: 0 2px; background: #f0f0f0; }
        [data-studio-new-document] input[type="number"] { appearance: textfield; }
        [data-studio-new-document] input::-webkit-inner-spin-button,
        [data-studio-new-document] input::-webkit-outer-spin-button { appearance: none; margin: 0; }
        [data-studio-new-document] input[type="checkbox"]:checked {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 13 13'%3E%3Cpath d='M3 6.5L5.5 9L10 3.5' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3C/svg%3E");
        }
        [data-studio-new-document] input[type="radio"]:checked { background-image: radial-gradient(circle, #000 0 2px, transparent 2.5px); }
      `}</style>
      {helpNote ? <p className="absolute bottom-4 left-1/2 max-w-md -translate-x-1/2 bg-[#ffffe1] px-2 py-1 text-[11px] text-black shadow" data-studio-new-document-help="true">{helpNote}</p> : null}
    </div>
  );
}
