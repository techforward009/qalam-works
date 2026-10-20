"use client";

import { useEffect, useState } from "react";
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
      facingPages: parsed.doubleSided === true && parsed.facingPages === true,
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

const fieldCls = "box-border h-[18px] w-[62px] shrink-0 border-0 bg-white px-0.5 text-[11px] leading-[16px] text-black";
const fieldStyle = { boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff", fontFamily: "inherit" } as const;
const labelCls = "whitespace-nowrap text-[11px] leading-none text-black";
const groupCls = "min-w-0 border border-[#808080] px-0.5 pb-0.5 pt-0";
const groupStyle = { boxShadow: "inset 1px 1px 0 #fff", margin: 0 } as const;
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
const btnStyle = {
  width: 59,
  height: 20,
  border: "1px solid #003c74",
  background: "#f0f0f0",
  boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #696969",
  fontSize: 11,
  lineHeight: "18px",
  color: "#000",
  padding: 0,
} as const;
const checkStyle = { width: 13, height: 13, margin: 0, accentColor: "#000" } as const;
const radioStyle = { width: 12, height: 12, margin: 0, accentColor: "#000" } as const;

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
  const [draft, setDraft] = useState<NewDocumentDraft>(defaultNewDocumentDraft);
  const [helpNote, setHelpNote] = useState<string | null>(null);
  const dims = resolvePageDimensions(draft.size, draft.orientation);
  const set = (patch: Partial<NewDocumentDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    setDraft(readSavedDraft());
  }, []);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center" style={{ background: "#ababab" }} data-studio-new-document="true">
      <form
        className="text-black"
        dir="ltr"
        style={{
          width: 420,
          height: 218,
          boxSizing: "border-box",
          background: "#f0f0f0",
          border: "1px solid #003c74",
          boxShadow: "1px 1px 0 #003c74",
          fontFamily: '"Liberation Sans", "Segoe UI", Tahoma, sans-serif',
          display: "flex",
          flexDirection: "column",
        }}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(draft);
        }}
      >
        <div
          className="flex items-center px-2"
          style={{ height: 28, flex: "0 0 28px", background: "linear-gradient(#f3f7fc, #c5d6ee)", fontSize: 12, fontWeight: 400, color: "#000" }}
          data-studio-new-document-title="true"
        >
          New Document
        </div>
        <div
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: "112px 118px minmax(0, 1fr) 59px",
            columnGap: 2,
            padding: "2px 3px 3px",
            alignItems: "start",
          }}
        >
          <fieldset className={groupCls} style={{ ...groupStyle, gridColumn: 1, gridRow: "1 / span 2" }}>
            <legend className={labelCls}>Page</legend>
            <select
              className="mb-0.5 box-border h-[18px] w-full text-[11px]"
              style={selectStyle}
              aria-label="Page size"
              value={draft.size}
              onChange={(event) => set({ size: event.target.value as PageSizeId })}
            >
              {SIZE_OPTIONS.map((size) => (
                <option key={size.id} value={size.id}>{size.label}</option>
              ))}
            </select>
            <label className="mb-0.5 flex items-center justify-between gap-1">
              <span className={labelCls}>Width:</span>
              <input className={fieldCls} style={fieldStyle} value={`${dims.widthMm}mm`} readOnly aria-label="Width in millimetres" />
            </label>
            <label className="mb-0.5 flex items-center justify-between gap-1">
              <span className={labelCls}>Height:</span>
              <input className={fieldCls} style={fieldStyle} value={`${dims.heightMm}mm`} readOnly aria-label="Height in millimetres" />
            </label>
            <fieldset className="mb-0.5 min-w-0 border border-[#b0b0b0] px-1 py-0.5" style={{ margin: 0 }}>
              <legend className={labelCls}>Orientation</legend>
              <label className={`flex items-center gap-1 ${labelCls}`}>
                <input style={radioStyle} type="radio" name="orientation" checked={draft.orientation === "portrait"} onChange={() => set({ orientation: "portrait" })} />
                Portrait
              </label>
              <label className={`mt-0.5 flex items-center gap-1 ${labelCls}`}>
                <input style={radioStyle} type="radio" name="orientation" checked={draft.orientation === "landscape"} onChange={() => set({ orientation: "landscape" })} />
                Landscape
              </label>
            </fieldset>
            <label className="flex items-center justify-between gap-1">
              <span className={labelCls}>Pages:</span>
              <span className="inline-flex">
                <input className={fieldCls} style={{ ...fieldStyle, width: 40 }} type="number" min={1} max={40} aria-label="Pages" value={draft.pages} onChange={(event) => set({ pages: Number(event.target.value) })} />
              </span>
            </label>
          </fieldset>
          <fieldset className={groupCls} style={{ ...groupStyle, gridColumn: 2, gridRow: 1 }}>
            <legend className={labelCls}>Margins</legend>
            {([
              ["left", "Left:"],
              ["right", "Right:"],
              ["top", "Top:"],
              ["bottom", "Bottom:"],
            ] as const).map(([key, caption]) => (
              <label key={key} className="mb-0.5 flex items-center justify-between gap-1">
                <span className={labelCls}>{caption}</span>
                <input
                  className={fieldCls}
                  style={fieldStyle}
                  aria-label={`${key} margin`}
                  value={`${draft[key]}mm`}
                  onChange={(event) => {
                    const next = Number(String(event.target.value).replace(/mm/gi, "").trim());
                    if (Number.isFinite(next)) set({ [key]: next });
                  }}
                />
              </label>
            ))}
          </fieldset>
          <fieldset className={groupCls} style={{ ...groupStyle, gridColumn: 2, gridRow: 2 }} data-studio-direction="true">
            <legend className={labelCls}>Direction</legend>
            <label className={`flex items-center gap-1 ${labelCls}`}>
              <input style={radioStyle} type="radio" name="direction" checked={draft.direction === "ltr"} onChange={() => set({ direction: "ltr" })} />
              Left To Right
            </label>
            <label className={`mt-0.5 flex items-center gap-1 ${labelCls}`}>
              <input style={radioStyle} type="radio" name="direction" checked={draft.direction === "rtl"} onChange={() => set({ direction: "rtl" })} />
              Right To Left
            </label>
          </fieldset>
          <div className="min-w-0" style={{ gridColumn: 3, gridRow: "1 / span 2" }}>
            <fieldset className={groupCls} style={groupStyle}>
              <legend className={labelCls}>Columns</legend>
              <input
                className="mb-0.5 box-border h-[18px] w-full bg-white px-1 text-[11px]"
                style={fieldStyle}
                type="number"
                min={1}
                max={4}
                aria-label="Columns"
                value={draft.columns}
                onChange={(event) => set({ columns: Number(event.target.value) })}
              />
              <label className="flex items-center justify-between gap-1">
                <span className={labelCls}>Gutter:</span>
                <span className="inline-flex items-stretch">
                  <input
                    className={fieldCls}
                    style={{ ...fieldStyle, width: 58 }}
                    aria-label="Gutter"
                    value={`${draft.gutter}mm`}
                    onChange={(event) => {
                      const next = Number(String(event.target.value).replace(/mm/gi, "").trim());
                      if (Number.isFinite(next)) set({ gutter: next });
                    }}
                  />
                  <span className="flex w-[11px] shrink-0 flex-col">
                    <button type="button" className="h-[9px] border border-[#808080] bg-[#f0f0f0] p-0 text-[7px] leading-none" aria-label="Increase gutter" onClick={() => set({ gutter: Number(nudge(String(draft.gutter), 0.01, 0, 50)) })}>▴</button>
                    <button type="button" className="h-[9px] border border-[#808080] bg-[#f0f0f0] p-0 text-[7px] leading-none" aria-label="Decrease gutter" onClick={() => set({ gutter: Number(nudge(String(draft.gutter), -0.01, 0, 50)) })}>▾</button>
                  </span>
                </span>
              </label>
            </fieldset>
            <label className={`mt-1 flex items-center gap-1 ${labelCls}`}>
              <input style={checkStyle} type="checkbox" checked={draft.automaticTextBox} onChange={(event) => set({ automaticTextBox: event.target.checked })} />
              Automatic Text Box
            </label>
            <label className={`mt-0.5 flex items-center gap-1 ${labelCls}`}>
              <input style={checkStyle} type="checkbox" checked={draft.doubleSided} onChange={(event) => set({ doubleSided: event.target.checked, facingPages: event.target.checked ? draft.facingPages : false })} />
              Double Sided
            </label>
            <label className={`mt-0.5 flex items-center gap-1 ${labelCls} ${draft.doubleSided ? "" : "text-[#808080]"}`}>
              <input style={checkStyle} type="checkbox" checked={draft.facingPages} disabled={!draft.doubleSided} onChange={(event) => set({ facingPages: event.target.checked })} />
              Facing Pages
            </label>
            <button
              type="button"
              className="mt-1"
              style={{ ...btnStyle, width: "auto", padding: "0 6px", whiteSpace: "nowrap" }}
              onClick={() => saveDefaultDraft(draft)}
            >
              Save as Default
            </button>
          </div>
          <div className="flex flex-col gap-1 pt-2" style={{ gridColumn: 4, gridRow: 1 }}>
            <button type="submit" style={{ ...btnStyle, outline: "1px dotted #000", outlineOffset: -3 }} data-studio-default-button="true">OK</button>
            <button type="button" style={btnStyle} onClick={onCancel}>Cancel</button>
            <button type="button" style={btnStyle} onClick={() => setHelpNote("A4, 12.7 mm margins, one column, gutter 4.23 mm, right to left. Saved only in this browser.")}>Help</button>
          </div>
        </div>
      </form>
      {helpNote ? (
        <p className="absolute bottom-4 left-1/2 max-w-md -translate-x-1/2 bg-[#ffffe1] px-2 py-1 text-[11px] text-black shadow" data-studio-new-document-help="true">{helpNote}</p>
      ) : null}
    </div>
  );
}
