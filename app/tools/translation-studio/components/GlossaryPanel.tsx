"use client";
import React, { useState } from "react";
import type { GlossaryEntry, TranslationLanguage } from "../utils/translationTypes";
import { GLOSSARY_TERM_MAX, GLOSSARY_NOTE_MAX } from "../utils/translationTypes";
import { isDuplicateTerm } from "../utils/terminology";

const INPUT = "w-full rounded border border-gray-200 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A3A2A]/30";

interface GlossaryPanelProps {
  entries: GlossaryEntry[];
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
  onAdd: (entry: Omit<GlossaryEntry, "id">) => void;
  onUpdate: (id: string, patch: Partial<Omit<GlossaryEntry, "id">>) => void;
  onDelete: (id: string) => void;
  isUr?: boolean;
}

export default function GlossaryPanel({ entries, sourceLanguage, targetLanguage, onAdd, onUpdate, onDelete, isUr }: GlossaryPanelProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ sourceTerm: "", targetTerm: "", note: "" });
  const [addError, setAddError] = useState("");

  const srcDir = ["ur", "ar", "fa"].includes(sourceLanguage) ? "rtl" : "ltr";
  const tgtDir = ["ur", "ar", "fa"].includes(targetLanguage) ? "rtl" : "ltr";

  const t = {
    heading: isUr ? "اصطلاحات" : "Terminology",
    term: isUr ? "اصطلاح" : "term",
    terms: isUr ? "اصطلاحات" : "terms",
    sourceTerm: isUr ? "ماخذ اصطلاح" : "Source term",
    approvedTarget: isUr ? "منظور ہدف" : "Approved target",
    noteOptional: isUr ? "نوٹ (اختیاری)" : "Note (optional)",
    save: isUr ? "محفوظ کریں" : "Save",
    cancel: isUr ? "منسوخ کریں" : "Cancel",
    edit: isUr ? "ترمیم" : "Edit",
    del: isUr ? "حذف" : "Del",
    addTerm: isUr ? "+ اصطلاح شامل کریں" : "+ Add Term",
    errSource: isUr ? "ماخذ اصطلاح ضروری ہے" : "Source term required",
    errTarget: isUr ? "منظور ہدف ضروری ہے" : "Approved target required",
    errDuplicate: isUr ? "یہ ماخذ اصطلاح پہلے سے موجود ہے" : "This source term already exists",
    errDupEdit: isUr ? "ماخذ اصطلاح دہری ہے" : "Duplicate source term",
    deleteConfirm: (term: string) => isUr ? `"${term}" حذف کریں؟` : `Delete "${term}"?`,
  };

  const resetForm = () => { setForm({ sourceTerm: "", targetTerm: "", note: "" }); setAddError(""); setEditingId(null); };

  const handleAdd = () => {
    if (!form.sourceTerm.trim()) { setAddError(t.errSource); return; }
    if (!form.targetTerm.trim()) { setAddError(t.errTarget); return; }
    if (isDuplicateTerm(entries, form.sourceTerm)) { setAddError(t.errDuplicate); return; }
    onAdd({ sourceTerm: form.sourceTerm.trim(), targetTerm: form.targetTerm.trim(), note: form.note.trim() || undefined });
    resetForm();
  };

  const handleUpdate = (id: string) => {
    if (!form.sourceTerm.trim() || !form.targetTerm.trim()) return;
    if (isDuplicateTerm(entries, form.sourceTerm, id)) { setAddError(t.errDupEdit); return; }
    onUpdate(id, { sourceTerm: form.sourceTerm.trim(), targetTerm: form.targetTerm.trim(), note: form.note.trim() || undefined });
    resetForm();
  };

  const startEdit = (e: GlossaryEntry) => { setEditingId(e.id); setForm({ sourceTerm: e.sourceTerm, targetTerm: e.targetTerm, note: e.note ?? "" }); setAddError(""); };

  return (
    <div className="border border-[#1A3A2A]/10 rounded-lg bg-[#F9FAF7] mb-4">
      <button type="button" onClick={() => setOpen(o => !o)} className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-[#1A3A2A] ${isUr ? "font-nastaliq font-normal" : ""}`}>
        <span>{t.heading} {entries.length > 0 && <span className="ml-1 text-xs font-normal text-gray-500">{entries.length} {entries.length === 1 ? t.term : t.terms}</span>}</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Entry list */}
          {entries.length > 0 && (
            <ul className="space-y-1.5">
              {entries.map(e => (
                <li key={e.id} className="flex items-start gap-2 text-sm">
                  {editingId === e.id ? (
                    <div className="flex-1 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input dir={srcDir} className={INPUT} maxLength={GLOSSARY_TERM_MAX} value={form.sourceTerm} onChange={ev => { setForm(f => ({ ...f, sourceTerm: ev.target.value })); setAddError(""); }} placeholder={t.sourceTerm} />
                        <input dir={tgtDir} className={INPUT} maxLength={GLOSSARY_TERM_MAX} value={form.targetTerm} onChange={ev => setForm(f => ({ ...f, targetTerm: ev.target.value }))} placeholder={t.approvedTarget} />
                      </div>
                      <input className={INPUT} maxLength={GLOSSARY_NOTE_MAX} value={form.note} onChange={ev => setForm(f => ({ ...f, note: ev.target.value }))} placeholder={t.noteOptional} />
                      {addError && <p className="text-xs text-red-600">{addError}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleUpdate(e.id)} className="h-7 px-3 rounded bg-[#1A3A2A] text-white text-xs font-medium">{t.save}</button>
                        <button type="button" onClick={resetForm} className="h-7 px-2 text-xs text-gray-500">{t.cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span dir={srcDir} className="font-medium">{e.sourceTerm}</span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span dir={tgtDir}>{e.targetTerm}</span>
                        {e.note && <span className="block text-xs text-gray-400 mt-0.5 truncate">{e.note}</span>}
                      </div>
                      <button type="button" onClick={() => startEdit(e)} className="text-xs text-[#1A3A2A] hover:underline shrink-0">{t.edit}</button>
                      <button type="button" onClick={() => { if (window.confirm(t.deleteConfirm(e.sourceTerm))) onDelete(e.id); }} className="text-xs text-red-500 hover:underline shrink-0">{t.del}</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add new (shown when not editing) */}
          {editingId === null && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <input dir={srcDir} className={INPUT} maxLength={GLOSSARY_TERM_MAX} value={form.sourceTerm} onChange={e => { setForm(f => ({ ...f, sourceTerm: e.target.value })); setAddError(""); }} placeholder={t.sourceTerm} />
                <input dir={tgtDir} className={INPUT} maxLength={GLOSSARY_TERM_MAX} value={form.targetTerm} onChange={e => setForm(f => ({ ...f, targetTerm: e.target.value }))} placeholder={t.approvedTarget} />
              </div>
              <input className={INPUT} maxLength={GLOSSARY_NOTE_MAX} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={t.noteOptional} />
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <button type="button" onClick={handleAdd} className="h-8 px-4 rounded bg-[#1A3A2A] text-white text-xs font-semibold hover:bg-[#12172A]">{t.addTerm}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
