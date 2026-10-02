"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Search, Trash2, Upload } from "lucide-react";
import {
  KHATEEB_NOTE_PREFIX,
  parseKhateebNoteKey,
  parseStoredKhateebNote,
  serializeKhateebNote,
  type StoredKhateebNote,
} from "./engine/khateebNotes";

type NoteRow = StoredKhateebNote & {
  storageKey: string;
  topicId: string;
  seriesLength: number;
  layer: "fresh" | "research";
  sessionNumber: number;
};

function readAllNotes(): NoteRow[] {
  if (typeof window === "undefined") return [];
  const rows: NoteRow[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(`${KHATEEB_NOTE_PREFIX}:`)) continue;
      const scope = parseKhateebNoteKey(key);
      if (!scope) continue;
      const stored = parseStoredKhateebNote(window.localStorage.getItem(key));
      if (!stored.text.trim()) continue;
      rows.push({
        ...stored,
        storageKey: key,
        topicId: scope.topicId,
        seriesLength: scope.seriesLength,
        layer: scope.layer,
        sessionNumber: scope.sessionNumber,
      });
    }
  } catch {
    return [];
  }
  return rows.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function dateLabel(value: string, ur: boolean): string {
  if (!value) return ur ? "تاریخ محفوظ نہیں" : "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return ur ? "تاریخ محفوظ نہیں" : "Date unavailable";
  return new Intl.DateTimeFormat(ur ? "ur-PK" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AllKhateebNotesPanel({
  ur,
  onClose,
}: {
  ur: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [query, setQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<"all" | "3" | "5" | "10">("all");
  const [layerFilter, setLayerFilter] = useState<"all" | "fresh" | "research">("all");
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => setNotes(readAllNotes());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("qalam-khateeb-notes-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("qalam-khateeb-notes-changed", handler);
    };
  }, []);

  const visibleNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (seriesFilter !== "all" && note.seriesLength !== Number(seriesFilter)) return false;
      if (layerFilter !== "all" && note.layer !== layerFilter) return false;
      if (!needle) return true;
      return [
        note.text,
        note.topicTitleUr,
        note.topicTitleEn,
        note.sessionTitleUr,
        note.sessionTitleEn,
        note.topicId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [notes, query, seriesFilter, layerFilter]);

  const removeNote = (row: NoteRow) => {
    if (
      !window.confirm(
        ur
          ? "کیا آپ واقعی یہ ذاتی نوٹ حذف کرنا چاہتے ہیں؟"
          : "Delete this personal note?",
      )
    ) return;
    try {
      window.localStorage.removeItem(row.storageKey);
      window.dispatchEvent(new Event("qalam-khateeb-notes-changed"));
      refresh();
    } catch {
      // localStorage may be unavailable.
    }
  };

  const copyNote = (row: NoteRow) => {
    const title = ur
      ? row.sessionTitleUr || `مجلس ${row.sessionNumber}`
      : row.sessionTitleEn || `Session ${row.sessionNumber}`;
    navigator.clipboard.writeText(`${title}\n\n${row.text}`).catch(() => {
      // Clipboard may be unavailable.
    });
  };

  const exportNotes = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes: notes.map(({ storageKey, ...note }) => ({
        storageKey,
        note,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qalam-khateeb-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const importNotes = (file: File | undefined) => {
    if (!file) return;
    file.text().then((raw) => {
      const parsed = JSON.parse(raw) as {
        version?: number;
        notes?: Array<{ storageKey?: string; note?: StoredKhateebNote }>;
      };
      const incoming = Array.isArray(parsed.notes) ? parsed.notes : [];
      if (!incoming.length) {
        window.alert(ur ? "اس فائل میں قابلِ درآمد نوٹس نہیں ملے۔" : "No importable notes were found in this file.");
        return;
      }
      const accepted = window.confirm(
        ur
          ? `${incoming.length} نوٹس ملے ہیں۔ موجود نوٹس برقرار رہیں گے؛ ایک ہی مجلس کا نوٹ آیا تو درآمد شدہ نوٹ اس کی جگہ لے گا۔ جاری رکھیں؟`
          : `${incoming.length} notes found. Existing notes remain, but an imported note for the same session will replace it. Continue?`,
      );
      if (!accepted) return;

      let imported = 0;
      for (const item of incoming) {
        if (!item.storageKey?.startsWith(`${KHATEEB_NOTE_PREFIX}:`) || !item.note?.text?.trim()) continue;
        const scope = parseKhateebNoteKey(item.storageKey);
        if (!scope) continue;
        window.localStorage.setItem(
          item.storageKey,
          serializeKhateebNote(item.note.text, item.note.updatedAt || new Date().toISOString(), {
            topicTitleUr: item.note.topicTitleUr,
            topicTitleEn: item.note.topicTitleEn,
            sessionTitleUr: item.note.sessionTitleUr,
            sessionTitleEn: item.note.sessionTitleEn,
          }),
        );
        imported += 1;
      }
      window.dispatchEvent(new Event("qalam-khateeb-notes-changed"));
      refresh();
      window.alert(
        ur
          ? `${imported} نوٹس درآمد ہو گئے۔`
          : `${imported} notes imported.`,
      );
    }).catch(() => {
      window.alert(
        ur
          ? "فائل پڑھی نہیں جا سکی۔ صرف قلم خطیب اسٹوڈیو سے برآمد کردہ نوٹس فائل استعمال کریں۔"
          : "The file could not be read. Use a notes file exported by Qalam Khateeb Studio.",
      );
    }).finally(() => {
      if (importRef.current) importRef.current.value = "";
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-[#B8935A]/30 bg-white p-5 shadow-sm dark:border-[#6f5b35] dark:bg-[#162a1e]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1A3A2A] dark:text-white">
            {ur ? "میرے تمام نوٹس" : "My notes library"}
          </h2>
          <p className="mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0]">
            {ur
              ? "پچھلی مجالس میں محفوظ کیے گئے ذاتی نوٹس یہاں تلاش، نقل، برآمد یا حذف کریں۔"
              : "Search, copy, export, or delete personal notes saved across earlier sessions."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#1A3A2A]/12 px-3 py-1.5 text-sm text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
        >
          {ur ? "بند کریں" : "Close"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748078]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ur ? "موضوع، مجلس یا اپنے نوٹس میں تلاش کریں…" : "Search topic, session, or note text…"}
            className="w-full rounded-xl border border-[#1A3A2A]/12 bg-transparent py-3 ps-10 pe-3 outline-none focus:border-[#B8935A] dark:border-[#35513d]"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {(["all", "3", "5", "10"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSeriesFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                seriesFilter === value
                  ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:bg-[#35513d]"
                  : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
              }`}
            >
              {value === "all"
                ? ur ? "سب سلسلے" : "All series"
                : value === "3"
                  ? ur ? "سہ روزہ" : "3 sessions"
                  : value === "5"
                    ? ur ? "خمسہ" : "5 sessions"
                    : ur ? "عشرہ" : "10 sessions"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "fresh", "research"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLayerFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                layerFilter === value
                  ? "border-[#B8935A] bg-[#fbf7ee] text-[#6f5730] dark:bg-[#241f14] dark:text-[#e2c895]"
                  : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
              }`}
            >
              {value === "all"
                ? ur ? "سب نوعیتیں" : "All types"
                : value === "fresh"
                  ? ur ? "نئی منبری تشکیل" : "Fresh composition"
                  : ur ? "تحقیقی نقشہ" : "Research map"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
          {ur
            ? `${visibleNotes.length} نوٹس دکھائے جا رہے ہیں۔ نوٹس فی الحال اسی براؤزر اور اسی آلے میں محفوظ ہیں۔`
            : `${visibleNotes.length} notes shown. Notes are currently stored only in this browser on this device.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportNotes}
            disabled={!notes.length}
            className="inline-flex items-center gap-1 rounded-lg border border-[#1A3A2A]/12 px-3 py-2 text-xs font-semibold text-[#425247] disabled:opacity-40 dark:border-[#35513d] dark:text-[#b7c8bb]"
          >
            <Download className="h-3.5 w-3.5" />
            {ur ? "تمام نوٹس محفوظ فائل میں نکالیں" : "Export all notes"}
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-[#1A3A2A]/12 px-3 py-2 text-xs font-semibold text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
          >
            <Upload className="h-3.5 w-3.5" />
            {ur ? "محفوظ نوٹس واپس لائیں" : "Import notes"}
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importNotes(event.target.files?.[0])}
          />
        </div>
      </div>

      {!visibleNotes.length ? (
        <div className="mt-5 rounded-xl bg-[#F7F5EF] p-5 text-center text-sm text-[#687469] dark:bg-[#0e1c15] dark:text-[#9fb0a2]">
          {notes.length
            ? ur ? "اس تلاش یا چھانٹی سے کوئی نوٹ نہیں ملا۔" : "No note matches these filters."
            : ur ? "ابھی کوئی ذاتی نوٹ محفوظ نہیں۔ کسی مجلس میں نوٹ لکھیں تو وہ یہاں نظر آئے گا۔" : "No personal notes are saved yet."}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visibleNotes.map((note) => (
            <article
              key={note.storageKey}
              className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                    {ur
                      ? note.topicTitleUr || note.topicId
                      : note.topicTitleEn || note.topicId}
                  </div>
                  <h3 className="mt-1 font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                    {ur
                      ? note.sessionTitleUr || `مجلس ${note.sessionNumber}`
                      : note.sessionTitleEn || `Session ${note.sessionNumber}`}
                  </h3>
                  <p className="mt-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                    {note.seriesLength === 3
                      ? ur ? "سہ روزہ مجالس" : "3-session series"
                      : note.seriesLength === 5
                        ? ur ? "خمسہ مجالس" : "5-session series"
                        : note.seriesLength === 10
                          ? ur ? "عشرۂ مجالس" : "10-session series"
                          : ur ? "مجلس" : "Sermon"}
                    {" · "}
                    {note.layer === "fresh"
                      ? ur ? "نئی منبری تشکیل" : "Fresh composition"
                      : ur ? "تحقیقی نقشہ" : "Research map"}
                    {" · "}
                    {dateLabel(note.updatedAt, ur)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyNote(note)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#1A3A2A]/12 px-2.5 py-1.5 text-xs text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {ur ? "نقل" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNote(note)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#8b4a42]/20 px-2.5 py-1.5 text-xs text-[#8b4a42] dark:text-[#d9a29c]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {ur ? "حذف" : "Delete"}
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-[#37443a] dark:text-[#c8d5cc]">
                {note.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
