import React, { useRef, useState } from "react";
import type { GlossaryEntry } from "../utils/glossary";

interface GlossaryPanelProps {
  entries: GlossaryEntry[];
  onAdd: (incorrectTerm: string, correctTerm: string, note: string) => string | null;
  onUpdate: (id: string, incorrectTerm: string, correctTerm: string, note: string) => string | null;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (jsonText: string) => string | null;
}

/**
 * User-defined Terminology Glossary MVP (2026-08-09) — purely
 * presentational, matching the visual language already established by
 * SuggestionsPanel.tsx/FindReplacePanel.tsx. All actual state changes
 * (add/update/delete/import) happen in DocumentStudioEditor.tsx via the
 * pure functions in glossary.ts — this component only reports user
 * intent upward through its callback props and displays any returned
 * error message.
 */
export const GlossaryPanel: React.FC<GlossaryPanelProps> = ({ entries, onAdd, onUpdate, onDelete, onExport, onImport }) => {
  const [incorrectTerm, setIncorrectTerm] = useState("");
  const [correctTerm, setCorrectTerm] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setIncorrectTerm("");
    setCorrectTerm("");
    setNote("");
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = () => {
    const error = editingId
      ? onUpdate(editingId, incorrectTerm, correctTerm, note)
      : onAdd(incorrectTerm, correctTerm, note);
    if (error) {
      setFormError(error);
      return;
    }
    resetForm();
  };

  const handleEditClick = (entry: GlossaryEntry) => {
    setEditingId(entry.id);
    setIncorrectTerm(entry.incorrectTerm);
    setCorrectTerm(entry.correctTerm);
    setNote(entry.note ?? "");
    setFormError(null);
  };

  const handleImportFile = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const error = onImport(text);
      if (error) setImportError(error);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm space-y-3 text-xs" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h4 className="text-slate-700 font-semibold">اصطلاحی فہرست (Terminology Glossary)</h4>
        <div className="flex gap-2" dir="ltr">
          <button
            type="button"
            onClick={onExport}
            className="px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {importError && <p className="text-red-600">{importError}</p>}

      {/* Add/Edit form */}
      <div className="space-y-2 bg-slate-50 p-2 rounded-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={incorrectTerm}
            onChange={(e) => setIncorrectTerm(e.target.value)}
            placeholder="غلط اصطلاح"
            className="flex-1 border border-slate-300 rounded-md px-2 py-1"
          />
          <input
            type="text"
            value={correctTerm}
            onChange={(e) => setCorrectTerm(e.target.value)}
            placeholder="درست اصطلاح"
            className="flex-1 border border-slate-300 rounded-md px-2 py-1"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="نوٹ (اختیاری)"
          className="w-full border border-slate-300 rounded-md px-2 py-1"
        />
        {formError && <p className="text-red-600">{formError}</p>}
        <div className="flex gap-2" dir="ltr">
          <button
            type="button"
            onClick={handleSubmit}
            className="px-3 py-1 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-700"
          >
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-3 py-1 rounded-md border border-slate-300 text-slate-600">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <p className="text-slate-400">کوئی اصطلاح شامل نہیں کی گئی۔</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-100">
              <div className="flex-1">
                <span className="line-through text-red-500">{entry.incorrectTerm}</span>
                <span className="mx-1">→</span>
                <span className="text-emerald-700 font-semibold">{entry.correctTerm}</span>
                {entry.note && <p className="text-slate-400 mt-0.5">{entry.note}</p>}
              </div>
              <div className="flex gap-1" dir="ltr">
                <button
                  type="button"
                  onClick={() => handleEditClick(entry)}
                  className="px-2 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="px-2 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
