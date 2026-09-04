"use client";

import { useLanguage } from "@/app/lib/language-context";
import type { DateEvent, DateEventLocaleText } from "@/app/tools/date-converter/utils/dateEvents";

const COPY = {
  en: { title: "Historical Context", empty: "Historical references for this date are being expanded.", category: "Category", importance: "Importance", source: "Source", tags: "Tags" },
  ur: { title: "تاریخی تناظر", empty: "اس تاریخ کے تاریخی حوالوں میں توسیع کی جا رہی ہے۔", category: "زمرہ", importance: "اہمیت", source: "ماخذ", tags: "ٹیگز" },
};

export function HistoricalContext({ events }: { events: DateEvent[] }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";
  const localized = (value: DateEventLocaleText) => lang === "ur" ? value.ur ?? value.en : value.en;

  return (
    <section className="mt-6 rounded-xl border p-5" dir={dir}>
      <h2 className={`text-xl font-semibold ${naskh}`}>{t.title}</h2>
      {events.length === 0 ? (
        <p className={`mt-2 text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>{t.empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-[#1A3A2A]/10 dark:border-[#2a3d30] p-4">
              <h3 className={`font-semibold ${naskh}`}>{localized(event.title)}</h3>
              {event.description && <p className={`mt-1 text-sm ${naskh}`}>{localized(event.description)}</p>}
              <div className={`mt-2 space-y-1 text-xs text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>
                {event.category && <p>{t.category}: {event.category}</p>}
                {event.importance && <p>{t.importance}: {event.importance}</p>}
                {event.source && <p>{t.source}: {event.source.label ?? event.source.type}</p>}
                {event.tags && event.tags.length > 0 && <p>{t.tags}: {event.tags.join(", ")}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
