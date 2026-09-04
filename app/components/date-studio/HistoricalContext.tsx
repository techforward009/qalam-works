"use client";

import { useLanguage } from "@/app/lib/language-context";
import type { DateEvent, DateEventLocaleText } from "@/app/tools/date-converter/utils/dateEvents";

const COPY = {
  en: { title: "Historical Context", empty: "Historical references for this date are being expanded.", source: "Source" },
  ur: { title: "تاریخی تناظر", empty: "اس تاریخ کے تاریخی حوالوں میں توسیع کی جا رہی ہے۔", source: "ماخذ" },
};

export function HistoricalContext({ events }: { events: DateEvent[] }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";
  const localized = (value: DateEventLocaleText) => lang === "ur" ? value.ur ?? value.en : value.en;

  return (
    <section className="rounded-2xl border border-[#1A3A2A]/10 bg-white p-5 shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]" dir={dir}>
      <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.title}</h2>

      {events.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[#1A3A2A]/15 bg-[#F7F5EF]/60 px-4 py-5 dark:border-[#35513d] dark:bg-[#0e1c15]">
          <p className={`text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>{t.empty}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-xl border border-[#1A3A2A]/10 p-4 dark:border-[#35513d]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className={`text-base font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{localized(event.title)}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {event.category && <span className={`rounded-full bg-[#E7EFE8] px-2.5 py-1 text-[10px] font-bold text-[#31533d] dark:bg-[#1e3527] dark:text-[#b8d4bc] ${naskh}`}>{event.category}</span>}
                  {event.importance && <span className={`rounded-full bg-[#F1ECE0] px-2.5 py-1 text-[10px] font-bold text-[#7A5528] dark:bg-[#2b2419] dark:text-[#D3B274] ${naskh}`}>{event.importance}</span>}
                </div>
              </div>

              {event.description && <p className={`mt-2 text-sm leading-relaxed text-[#4a6a4a] dark:text-[#b8d4bc] ${naskh}`}>{localized(event.description)}</p>}

              {event.source && (
                <p className={`mt-3 text-xs text-[#68806f] dark:text-[#a8c8b0] ${naskh}`}>
                  <span className="font-bold">{t.source}:</span> {event.source.label ?? event.source.type}
                </p>
              )}

              {event.tags && event.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => <span key={tag} className={`rounded-md border border-[#1A3A2A]/10 px-2 py-1 text-[10px] text-[#68806f] dark:border-[#35513d] ${naskh}`}>{tag}</span>)}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
