"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import {
  khateebNoteKey,
  parseStoredKhateebNote,
  serializeKhateebNote,
} from "./engine/khateebNotes";

export default function SessionNotesEditor({
  topicId,
  seriesLength,
  layer,
  sessionNumber,
  topicTitleUr,
  topicTitleEn,
  sessionTitleUr,
  sessionTitleEn,
  ur,
}: {
  topicId: string;
  seriesLength: number;
  layer: "fresh" | "research";
  sessionNumber: number;
  topicTitleUr: string;
  topicTitleEn: string;
  sessionTitleUr: string;
  sessionTitleEn: string;
  ur: boolean;
}) {
  const storageKey = useMemo(
    () =>
      khateebNoteKey({
        topicId,
        seriesLength,
        layer,
        sessionNumber,
      }),
    [topicId, seriesLength, layer, sessionNumber],
  );

  const [text, setText] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    try {
      const stored = parseStoredKhateebNote(window.localStorage.getItem(storageKey));
      setText(stored.text);
      setSavedAt(stored.updatedAt);
    } catch {
      setText("");
      setSavedAt("");
    } finally {
      setLoadedKey(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      if (!text.trim()) {
        window.localStorage.removeItem(storageKey);
        setSavedAt("");
        window.dispatchEvent(new Event("qalam-khateeb-notes-changed"));
        return;
      }
      const now = new Date().toISOString();
      window.localStorage.setItem(
        storageKey,
        serializeKhateebNote(text, now, {
          topicTitleUr,
          topicTitleEn,
          sessionTitleUr,
          sessionTitleEn,
        }),
      );
      setSavedAt(now);
      window.dispatchEvent(new Event("qalam-khateeb-notes-changed"));
    } catch {
      // localStorage can be unavailable in private/restricted browsing.
    }
  }, [
    text,
    loadedKey,
    storageKey,
    topicTitleUr,
    topicTitleEn,
    sessionTitleUr,
    sessionTitleEn,
  ]);

  const copyNote = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(
        `${ur ? sessionTitleUr : sessionTitleEn}\n\n${ur ? "میرے نوٹس" : "My notes"}\n${text}`,
      );
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const clearNote = () => {
    if (!text) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        ur
          ? "کیا آپ واقعی اس مجلس کے اپنے نوٹس صاف کرنا چاہتے ہیں؟"
          : "Clear your notes for this session?",
      )
    ) {
      return;
    }
    setText("");
    window.dispatchEvent(new Event("qalam-khateeb-notes-changed"));
  };

  const savedLabel = savedAt
    ? ur
      ? "خودکار طور پر محفوظ"
      : "Saved automatically"
    : ur
      ? "ابھی کوئی محفوظ نوٹ نہیں"
      : "No saved note yet";

  return (
    <section className="mt-4 rounded-xl border border-[#B8935A]/25 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h5 className="font-bold text-[#5a4830] dark:text-[#e2c895]">
            {ur ? "میرے ذاتی نوٹس" : "My personal notes"}
          </h5>
          <p className="mt-1 text-xs leading-6 text-[#7b6b55] dark:text-[#c7b183]">
            {ur
              ? "جو نکتہ، مثال، حوالہ یا اپنی یاد دہانی چاہیں یہاں لکھیں۔ یہ نوٹس اسی مجلس کے ساتھ محفوظ رہیں گے۔"
              : "Add your own point, example, source reminder, or speaking note. It stays attached to this session."}
          </p>
        </div>
        <span className="rounded-full bg-[#F7F5EF] px-2 py-1 text-xs text-[#687469] dark:bg-[#0e1c15] dark:text-[#9fb0a2]">
          {savedLabel}
        </span>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        placeholder={
          ur
            ? "مثلاً: یہاں کراچی کے نوجوانوں کی مثال دینی ہے… / اس روایت کا اصل حوالہ دوبارہ دیکھنا ہے… / مصائب سے پہلے یہ ربط بنانا ہے…"
            : "e.g. Add a local youth example here… / Recheck the original source for this narration… / Use this bridge before masaib…"
        }
        className="mt-3 w-full resize-y rounded-lg border border-[#1A3A2A]/12 bg-white px-3 py-3 text-sm leading-7 text-[#303830] outline-none focus:border-[#B8935A] dark:border-[#4b594f] dark:bg-[#162a1e] dark:text-[#d7e1d9]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-6 text-[#7b6b55] dark:text-[#c7b183]">
          {ur
            ? "فی الحال یہ نوٹس اسی براؤزر اور اسی آلے میں محفوظ ہوتے ہیں؛ براؤزر کا مقامی ذخیرہ صاف کرنے سے مٹ سکتے ہیں۔"
            : "For now these notes are stored in this browser on this device; clearing local browser storage can remove them."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyNote}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1 rounded-lg border border-[#1A3A2A]/12 px-3 py-1.5 text-xs font-semibold text-[#425247] disabled:opacity-40 dark:border-[#4b594f] dark:text-[#b7c8bb]"
          >
            <Copy className="h-3.5 w-3.5" />
            {ur ? "نوٹس نقل کریں" : "Copy notes"}
          </button>
          <button
            type="button"
            onClick={clearNote}
            disabled={!text}
            className="inline-flex items-center gap-1 rounded-lg border border-[#8b4a42]/20 px-3 py-1.5 text-xs font-semibold text-[#8b4a42] disabled:opacity-40 dark:text-[#d9a29c]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {ur ? "صاف کریں" : "Clear"}
          </button>
        </div>
      </div>
    </section>
  );
}
