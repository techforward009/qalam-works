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

const fieldCls = "h-[18px] w-[62px] shrink-0 border border-[#7a7a7a] bg-white px-0.5 text-[11px] leading-none text-black";
const labelCls = "text-[11px] leading-none text-black";
const btnCls = "h-[20px] min-w-[52px] border border-[#6a6a6a] bg-[#efefef] px-1 text-[11px] leading-none text-black shadow-[inset_1px_1px_0_#fff,inset_-1px_-1px_0_#8a8a8a] hover:bg-[#e4e4e4]";

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 p-3" data-studio-new-document="true">
      <form
        className="text-black"
        dir="ltr"
        style={{
          width: "max-content",
          background: "#f0f0f0",
          border: "1px solid #6d6d6d",
          boxShadow: "3px 3px 0 rgba(0,0,0,0.35)",
          fontFamily: "Tahoma, 'Segoe UI', sans-serif",
        }}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(draft);
        }}
      >
        <div
          className="flex h-[22px] items-center px-2 text-[11px] font-bold text-black"
          style={{ background: "linear-gradient(180deg, #e7eef6 0%, #b7c9db 42%, #8ea6bd 100%)" }}
          data-studio-new-document-title="true"
        >
          New Document
        </div>
        <div className="flex items-start gap-1 p-1.5">
          <fieldset className="w-[150px] border border-[#b5b5b5] px-1.5 pb-1.5 pt-1" style={{ boxShadow: "inset 1px 1px 0 #fff" }}>
            <legend className={labelCls}>Page</legend>
            <select
              className="mb-1 h-[18px] w-full border border-[#7a7a7a] bg-white text-[11px]"
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
              <input className={fieldCls} value={`${dims.widthMm}mm`} readOnly aria-label="Width in millimetres" />
            </label>
            <label className="mb-1 flex items-center justify-between gap-1">
              <span className={labelCls}>Height:</span>
              <input className={fieldCls} value={`${dims.heightMm}mm`} readOnly aria-label="Height in millimetres" />
            </label>
            <fieldset className="mb-1 border border-[#c8c8c8] px-1.5 py-1">
              <legend className={labelCls}>Orientation</legend>
              <label className={`flex items-center gap-1 ${labelCls}`}>
                <input type="radio" name="orientation" checked={draft.orientation === "portrait"} onChange={() => set({ orientation: "portrait" })} />
                Portrait
              </label>
              <label className={`flex items-center gap-1 ${labelCls}`}>
                <input type="radio" name="orientation" checked={draft.orientation === "landscape"} onChange={() => set({ orientation: "landscape" })} />
                Landscape
              </label>
            </fieldset>
            <label className="flex items-center justify-between gap-1">
              <span className={labelCls}>Pages:</span>
              <input
                className={fieldCls}
                type="number"
                min={1}
                max={40}
                aria-label="Pages"
                value={draft.pages}
                onChange={(event) => set({ pages: Number(event.target.value) })}
              />
            </label>
          </fieldset>

          <div className="flex w-[132px] flex-col gap-1">
            <fieldset className="border border-[#b5b5b5] px-1.5 pb-1.5 pt-1" style={{ boxShadow: "inset 1px 1px 0 #fff" }}>
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
            <fieldset className="border border-[#b5b5b5] px-1.5 pb-1 pt-1" style={{ boxShadow: "inset 1px 1px 0 #fff" }} data-studio-direction="true">
              <legend className={labelCls}>Direction</legend>
              <label className={`flex items-center gap-1 ${labelCls}`}>
                <input type="radio" name="direction" checked={draft.direction === "ltr"} onChange={() => set({ direction: "ltr" })} />
                Left To Right
              </label>
              <label className={`flex items-center gap-1 ${labelCls}`}>
                <input type="radio" name="direction" checked={draft.direction === "rtl"} onChange={() => set({ direction: "rtl" })} />
                Right To Left
              </label>
            </fieldset>
          </div>

          <div className="flex w-[168px] flex-col">
            <div className="flex gap-1">
              <fieldset className="w-[96px] shrink-0 border border-[#b5b5b5] px-1.5 pb-1.5 pt-1" style={{ boxShadow: "inset 1px 1px 0 #fff" }}>
                <legend className={labelCls}>Columns</legend>
                <input
                  className="mb-0.5 h-[18px] w-full border border-[#7a7a7a] bg-white px-1 text-[11px]"
                  type="number"
                  min={1}
                  max={4}
                  aria-label="Columns"
                  value={draft.columns}
                  onChange={(event) => set({ columns: Number(event.target.value) })}
                />
                <label className="flex items-center justify-between gap-1">
                  <span className={labelCls}>Gutter:</span>
                  <input
                    className="h-[18px] w-[58px] shrink-0 border border-[#7a7a7a] bg-white px-0.5 text-[11px]"
                    aria-label="Gutter"
                    value={`${draft.gutter}mm`}
                    onChange={(event) => {
                      const next = Number(String(event.target.value).replace(/mm/gi, "").trim());
                      if (Number.isFinite(next)) set({ gutter: next });
                    }}
                  />
                </label>
              </fieldset>
              <div className="flex flex-col gap-1 pt-2">
                <button type="submit" className={btnCls}>OK</button>
                <button type="button" className={btnCls} onClick={onCancel}>Cancel</button>
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => setHelpNote("A4, 12.7 mm margins, one column, gutter 4.23 mm, right to left. Saved only in this browser.")}
                >
                  Help
                </button>
              </div>
            </div>
            <label className={`mt-1 flex items-center gap-1 ${labelCls}`}>
              <input type="checkbox" checked={draft.automaticTextBox} onChange={(event) => set({ automaticTextBox: event.target.checked })} />
              Automatic Text Box
            </label>
            <label className={`flex items-center gap-1 ${labelCls}`}>
              <input
                type="checkbox"
                checked={draft.doubleSided}
                onChange={(event) => set({ doubleSided: event.target.checked, facingPages: event.target.checked ? draft.facingPages : false })}
              />
              Double Sided
            </label>
            <label className={`flex items-center gap-1 ${labelCls} ${draft.doubleSided ? "" : "text-[#8a8a8a]"}`}>
              <input
                type="checkbox"
                checked={draft.facingPages}
                disabled={!draft.doubleSided}
                onChange={(event) => set({ facingPages: event.target.checked })}
              />
              Facing Pages
            </label>
            <button type="button" className={`${btnCls} mt-1 self-end`} onClick={() => saveDefaultDraft(draft)}>
              Save as Default
            </button>
          </div>
        </div>
        {helpNote ? <p className="px-2 pb-2 text-[11px] leading-snug text-[#333]" data-studio-new-document-help="true">{helpNote}</p> : null}
      </form>
    </div>
  );
}
