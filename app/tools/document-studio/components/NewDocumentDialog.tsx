"use client";

import { useState } from "react";
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
};

const SIZES: { id: PageSizeId; label: string }[] = [
  { id: "a4", label: "A4" },
  { id: "a5", label: "A5" },
  { id: "letter", label: "Letter" },
];

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
    gutter: 0,
    direction: "rtl",
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

export function contentFromNewDocument(draft: NewDocumentDraft): DocNode {
  const pages = Math.max(1, Math.min(40, Math.floor(draft.pages) || 1));
  const content: DocNode[] = [];
  for (let i = 0; i < pages; i += 1) {
    if (i > 0) content.push({ type: "pageBreak" });
    content.push({ type: "paragraph", attrs: { dir: draft.direction, directionMode: draft.direction } });
  }
  return { type: "doc", content };
}

export default function NewDocumentDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (draft: NewDocumentDraft) => void;
}) {
  const [draft, setDraft] = useState<NewDocumentDraft>(defaultNewDocumentDraft);
  const dims = resolvePageDimensions(draft.size, draft.orientation);
  const set = (patch: Partial<NewDocumentDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const field = "flex h-8 w-full rounded border border-[#c5c5c5] bg-white px-2 text-sm text-[#1c1c1c]";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4" data-studio-new-document="true">
      <form
        className="w-full max-w-md border border-[#8a8a8a] bg-[#f7f7f7] p-4 text-[#1c1c1c] shadow-[3px_3px_0_0_#bdbdbd]"
        dir="ltr"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(draft);
        }}
      >
        <h2 className="mb-3 text-base font-semibold">New Document</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2">
            <span className="mb-1 block text-xs">Page size</span>
            <select className={field} value={draft.size} onChange={(event) => set({ size: event.target.value as PageSizeId })}>
              {SIZES.map((size) => (
                <option key={size.id} value={size.id}>{size.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs">Width (mm)</span>
            <input className={field} value={String(dims.widthMm)} readOnly aria-label="Width in millimetres" />
          </label>
          <label>
            <span className="mb-1 block text-xs">Height (mm)</span>
            <input className={field} value={String(dims.heightMm)} readOnly aria-label="Height in millimetres" />
          </label>
          <label>
            <span className="mb-1 block text-xs">Orientation</span>
            <select className={field} value={draft.orientation} onChange={(event) => set({ orientation: event.target.value as PageOrientation })}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs">Number of pages</span>
            <input className={field} type="number" min={1} max={40} value={draft.pages} onChange={(event) => set({ pages: Number(event.target.value) })} />
          </label>
          {(["top", "bottom", "left", "right"] as const).map((edge) => (
            <label key={edge}>
              <span className="mb-1 block text-xs capitalize">{edge} margin (mm)</span>
              <input className={field} type="number" min={5} max={50} step={0.1} value={draft[edge]} onChange={(event) => set({ [edge]: Number(event.target.value) })} />
            </label>
          ))}
          <label>
            <span className="mb-1 block text-xs">Columns</span>
            <input className={field} type="number" min={1} max={4} value={draft.columns} onChange={(event) => set({ columns: Number(event.target.value) })} />
          </label>
          <label>
            <span className="mb-1 block text-xs">Gutter (mm)</span>
            <input className={field} type="number" min={0} max={40} step={0.1} value={draft.gutter} onChange={(event) => set({ gutter: Number(event.target.value) })} />
          </label>
          <label className="col-span-2">
            <span className="mb-1 block text-xs">Direction</span>
            <select className={field} value={draft.direction} onChange={(event) => set({ direction: event.target.value as "rtl" | "ltr" })}>
              <option value="rtl">Right To Left</option>
              <option value="ltr">Left To Right</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="h-8 border border-[#8a8a8a] bg-white px-4 text-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" className="h-8 border border-[#3c3c3c] bg-[#efefef] px-4 text-sm font-semibold">OK</button>
        </div>
      </form>
    </div>
  );
}
