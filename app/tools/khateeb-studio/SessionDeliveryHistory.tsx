"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, History } from "lucide-react";
import type { MajlisSeriesSession } from "./engine/seriesPlanner";
import {
  buildDeliveryRecord,
  deliveryRecordKey,
  KHATEEB_DELIVERY_PREFIX,
  matchingPastDeliveries,
  parseDeliveryRecord,
  repetitionFingerprint,
  serializeDeliveryRecord,
  type KhateebDeliveryRecord,
} from "./engine/deliveryHistory";
import { khateebNoteKey, parseStoredKhateebNote } from "./engine/khateebNotes";

function allDeliveryRecords(): KhateebDeliveryRecord[] {
  if (typeof window === "undefined") return [];
  const rows: KhateebDeliveryRecord[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(`${KHATEEB_DELIVERY_PREFIX}:`)) continue;
      const row = parseDeliveryRecord(window.localStorage.getItem(key));
      if (row) rows.push(row);
    }
  } catch {
    return [];
  }
  return rows.sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
}

function dateLabel(value: string, ur: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(ur ? "ur-PK" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function SessionDeliveryHistory({
  topicId,
  topicTitleUr,
  topicTitleEn,
  seriesLength,
  layer,
  session,
  ur,
  occasion,
}: {
  topicId: string;
  topicTitleUr: string;
  topicTitleEn: string;
  seriesLength: number;
  layer: "fresh" | "research";
  session: MajlisSeriesSession;
  ur: boolean;
  occasion?: { id: string; titleUr: string; month?: string; day?: number };
}) {
  const [records, setRecords] = useState<KhateebDeliveryRecord[]>([]);
  const [message, setMessage] = useState("");
  const refresh = () => setRecords(allDeliveryRecords());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("qalam-khateeb-delivery-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("qalam-khateeb-delivery-changed", handler);
    };
  }, []);

  const matches = useMemo(
    () => matchingPastDeliveries(records, {
      topicId,
      sessionNumber: session.number,
      occasionId: occasion?.id,
    }),
    [records, topicId, session.number, occasion?.id],
  );

  const markDelivered = () => {
    try {
      const noteKey = khateebNoteKey({ topicId, seriesLength, layer, sessionNumber: session.number });
      const note = parseStoredKhateebNote(window.localStorage.getItem(noteKey));
      const record = buildDeliveryRecord({
        topicId,
        topicTitleUr,
        topicTitleEn,
        seriesLength,
        layer,
        session,
        personalNote: note.text,
        occasion,
      });
      window.localStorage.setItem(deliveryRecordKey(record), serializeDeliveryRecord(record));
      window.dispatchEvent(new Event("qalam-khateeb-delivery-changed"));
      refresh();
      setMessage(ur ? "یہ مجلس بیان کردہ مجالس کی تاریخ میں محفوظ ہو گئی۔" : "This session has been saved to your delivery history.");
    } catch {
      setMessage(ur ? "اس براؤزر میں تاریخ محفوظ نہیں ہو سکی۔" : "The delivery history could not be saved.");
    }
  };

  const latest = matches[0];

  return (
    <section className="mt-4 rounded-xl border border-[#6f8a72]/25 bg-[#f5faf6] p-4 dark:border-[#45604b] dark:bg-[#122319]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#47654d]" />
            <h5 className="font-bold text-[#31513a] dark:text-[#b9d4bf]">
              {ur ? "گزشتہ بیان کی یاد دہانی" : "Previous-delivery reminder"}
            </h5>
          </div>
          <p className="mt-1 text-xs leading-6 text-[#5f7463] dark:text-[#9fb0a2]">
            {ur
              ? "جب یہ مجلس پڑھ لیں تو اسے محفوظ کر دیں۔ آئندہ یہی موضوع یا مناسبت آئے تو قلم پچھلا مواد یاد دلائے گا۔"
              : "After delivering this session, save it here. When the topic or occasion returns, Qalam can remind you what you used before."}
          </p>
        </div>
        <button type="button" onClick={markDelivered} className="inline-flex items-center gap-2 rounded-lg bg-[#31513a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3d6447]">
          <CheckCircle2 className="h-4 w-4" />
          {ur ? "یہ مجلس پڑھ لی" : "Mark as delivered"}
        </button>
      </div>

      {message ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-[#47654d] dark:bg-[#162a1e] dark:text-[#b9d4bf]">{message}</p> : null}

      {latest ? (
        <div className="mt-4 rounded-lg border border-[#6f8a72]/20 bg-white p-3 dark:border-[#45604b] dark:bg-[#162a1e]">
          <div className="text-xs font-bold text-[#7c5f33] dark:text-[#d7bc8a]">
            {ur ? `یہ مجلس پہلے ${dateLabel(latest.deliveredAt, true)} کو پڑھی جا چکی ہے` : `Previously delivered on ${dateLabel(latest.deliveredAt, false)}`}
            {latest.occasionTitleUr ? ` — ${latest.occasionTitleUr}` : ""}
          </div>
          <p className="mt-2 text-sm font-semibold leading-7 text-[#37443a] dark:text-[#d7e1d9]">
            {ur ? "پچھلی بار مرکزی رخ:" : "Previous central direction:"} {latest.purposeUr}
          </p>
          <div className="mt-2 space-y-1">
            {repetitionFingerprint(latest).slice(0, 5).map((item) => (
              <p key={item} className="text-sm leading-7 text-[#526057] dark:text-[#b8c8bb]">• {item}</p>
            ))}
          </div>
          {latest.personalNote ? (
            <div className="mt-3 rounded-lg bg-[#F7F5EF] p-3 text-sm leading-7 text-[#5a4830] dark:bg-[#0e1c15] dark:text-[#d7bc8a]">
              <strong>{ur ? "اس وقت کا ذاتی نوٹ: " : "Personal note from that delivery: "}</strong>{latest.personalNote}
            </div>
          ) : null}
          <p className="mt-3 text-xs font-semibold leading-6 text-[#8a5d35] dark:text-[#d7bc8a]">
            {ur ? "اس مرتبہ انہی نکات کو جوں کا توں دہرانے کے بجائے نیا سوال، نئی مثال یا مختلف علمی زاویہ اختیار کریں۔" : "This time, avoid replaying the same points unchanged; use a new question, example, or scholarly angle."}
          </p>
          {matches.length > 1 ? (
            <p className="mt-2 text-xs text-[#687469] dark:text-[#9fb0a2]">
              {ur ? `اس موضوع/مجلس کے ${matches.length} سابقہ بیانات محفوظ ہیں۔` : `${matches.length} earlier deliveries are stored for this topic/session.`}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
          {ur ? "اس مجلس کا کوئی سابقہ بیان ابھی محفوظ نہیں۔" : "No previous delivery of this session is stored yet."}
        </p>
      )}
    </section>
  );
}
