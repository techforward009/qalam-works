"use client";

import { useState } from "react";
import type { QpgDocument } from "../utils/qpgFile";
import { makeQpgFile, downloadQpgFile, shareOrDownloadQpg, qpgFilename } from "../utils/qpgFile";

export default function StudioQpgSaveAsDialog({ title, snapshot, onClose }: {
  title: string;
  snapshot: (title: string) => QpgDocument;
  onClose: () => void;
}) {
  const [name, setName] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const run = async (downloadOnly: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const file = makeQpgFile(snapshot(name));
      if (downloadOnly) downloadQpgFile(file);
      else await shareOrDownloadQpg(file, navigator);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فائل محفوظ نہیں ہو سکی۔");
    } finally { setSaving(false); }
  };
  return <div role="dialog" aria-modal="true" aria-label="Save As Qalam Page" data-studio-qpg-save-as="true"
    className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4">
    <form onSubmit={event => { event.preventDefault(); void run(false); }}
      className="w-full max-w-md rounded border-2 border-slate-400 bg-[#f0f0f0] p-4 text-sm text-black shadow-lg"
      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}>
      <h2 className="mb-3 text-base font-bold">Save As — Qalam Page</h2>
      <label className="block mb-3">File name
        <input autoFocus className="mt-1 w-full border border-slate-500 bg-white p-2" value={name}
          onChange={event => setName(event.target.value)} aria-label="QPG file name"/>
      </label>
      <p className="mb-3 text-xs text-slate-700">{qpgFilename(name)} — portable .qpg document</p>
      {error && <p role="alert" className="mb-3 text-red-800" dir="rtl">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="border border-slate-500 px-3 py-2" onClick={onClose}>Cancel</button>
        <button type="button" className="border border-slate-500 bg-white px-3 py-2" disabled={saving} onClick={() => void run(true)}>Download</button>
        <button type="submit" className="border border-slate-600 bg-slate-200 px-3 py-2" disabled={saving}>Save / Share…</button>
      </div>
    </form>
  </div>;
}
