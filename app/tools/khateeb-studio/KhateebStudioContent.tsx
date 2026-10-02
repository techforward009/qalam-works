"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, Copy, ExternalLink, Search } from "lucide-react";
import { useLanguage } from "../../lib/language-context";
import { KHATEEB_CORPUS, REGION_LABELS } from "./engine/khateebCorpus";
import { RABI_AL_THANI_1448_EVENTS, type ShiaCalendarRegion } from "./engine/shiaCalendar";

const REGIONS = ["all", "pk", "in", "ir"] as const;

const CALENDAR_REGION_LABELS: Record<ShiaCalendarRegion, string> = {
  all: "سبھی",
  pk: "پاکستان",
  in: "ہندوستان",
  ir: "ایران",
};

export default function KhateebStudioContent() {
  const { language, dir } = useLanguage();
  const ur = language === "ur";
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<ShiaCalendarRegion>("all");
  const [selectedEvent, setSelectedEvent] = useState(RABI_AL_THANI_1448_EVENTS[0]?.id ?? "");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return [...KHATEEB_CORPUS];
    return KHATEEB_CORPUS.filter((item) => `${item.name} ${item.corpusFocus.join(" ")}`.includes(q));
  }, [query]);

  const filteredEvents = useMemo(() => {
    return RABI_AL_THANI_1448_EVENTS.filter((item) => {
      if (selectedRegion === "all") return true;
      if (!item.regions?.length) return true;
      return item.regions.includes("all") || item.regions.includes(selectedRegion);
    });
  }, [selectedRegion]);

  const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.id === selectedEvent) ?? filteredEvents[0] ?? RABI_AL_THANI_1448_EVENTS[0];
  const speaker = KHATEEB_CORPUS.find((item) => item.id === selectedSpeaker);
  const brief = [
    event ? `مناسبت: ${event.dayLabel ?? event.day} ربیع الثانی — ${event.title}` : "",
    event?.regions?.includes("pk") ? "تقویمی حیثیت: پاکستان میں رائج تاریخ" : "",
    speaker ? `خطیبانہ مطالعہ: ${speaker.name}` : "",
    speaker ? `مرکزی میدان: ${speaker.corpusFocus.join("، ")}` : "",
    "درکار تحقیق: اصل علمی مصادر، متعلقہ روایات/آیات، اور منتخب خطابات میں اختیار کیے گئے زاویے اور ترتیب۔",
  ].filter(Boolean).join("\n");

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(brief);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F5EF] dark:bg-[#0e1c15] py-10 md:py-14" dir={dir}>
      <div className="site-container max-w-6xl">
        <header className="mb-8 text-start">
          <h1 className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-nastaliq font-normal" : ""}`}>
            {ur ? "خطیب اسٹوڈیو" : "Khateeb Studio"}
          </h1>
          <p className={`mt-3 max-w-3xl text-gray-700 dark:text-[#d9e2db] leading-relaxed ${ur ? "font-naskh" : ""}`}>
            {ur ? "مناسبت منتخب کریں، متعلقہ خطیبانہ ذخیرہ دیکھیں، اور خطبے کی تحقیق کے لیے working brief تیار کریں۔" : "Choose an occasion, browse the khateeb source index, and prepare a working brief."}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"><CalendarDays className="h-5 w-5" /></span>
              <div>
                <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "ربیع الثانی ۱۴۴۸ کی مناسبتیں" : "Rabi al-Thani 1448 occasions"}</h2>
                <p className={`text-sm text-[#5f6f61] dark:text-[#a8c8b0] ${ur ? "font-naskh" : ""}`}>{ur ? "ایک واقعے کی مختلف تاریخیں الگ ماخذی اندراج کے طور پر محفوظ ہیں۔" : "Different dates for one event remain separate source-backed records."}</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={ur ? "علاقائی تقویم" : "Calendar region"}>
              {REGIONS.map((region) => {
                const active = selectedRegion === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setSelectedRegion(region)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${active ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]" : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"}`}
                  >
                    {CALENDAR_REGION_LABELS[region]}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              {filteredEvents.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEvent(item.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-start transition-colors ${selectedEvent === item.id ? "border-[#B8935A]/70 bg-[#fbf7ee] dark:bg-[#241f14]" : "border-[#1A3A2A]/10 dark:border-[#35513d] hover:bg-[#f7f7f2] dark:hover:bg-[#1b3022]"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-lg bg-[#1A3A2A] px-2 py-1 text-xs font-semibold text-white">{item.dayLabel ?? item.day}</span>
                    <span className={ur ? "font-naskh" : ""}>
                      <span className="block font-semibold text-[#1A3A2A] dark:text-[#e7eee9]">{item.title}</span>
                      {item.note ? <span className="mt-0.5 block text-xs text-[#677266] dark:text-[#a8b8aa]">{item.note}</span> : null}
                      {item.regions?.length ? <span className="mt-1 inline-block text-[11px] font-semibold text-[#8a6838]">{item.regions.map((r) => CALENDAR_REGION_LABELS[r]).join("، ")}</span> : null}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {event ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#3a6a4a] dark:text-[#a8c8b0] hover:underline ${ur ? "font-naskh" : ""}`} href={event.sourceUrl} target="_blank" rel="noreferrer">
                  {ur ? event.sourceLabel : "Open calendar source"}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className={`text-xs text-[#687469] dark:text-[#9fb0a2] ${ur ? "font-naskh" : ""}`}>مقامی محفوظہ: {event.sourceCapturedAt}</span>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A3A2A]/8 text-[#1A3A2A] dark:bg-[#2a5a3a]/50 dark:text-[#8faa93]"><BookOpen className="h-5 w-5" /></span><div><h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "خطیبانہ ذخیرہ" : "Khateeb source index"}</h2><p className={`text-sm text-[#5f6f61] dark:text-[#a8c8b0] ${ur ? "font-naskh" : ""}`}>{ur ? "یہ فہرست کسی درجہ بندی کا اعلان نہیں ہے۔" : "This is a source map, not a ranking."}</p></div></div>
            <label className="relative block mb-4"><Search className="absolute start-3 top-3 h-4 w-4 text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ur ? "خطیب یا موضوع تلاش کریں" : "Search speaker or corpus focus"} className={`w-full rounded-xl border border-[#1A3A2A]/12 dark:border-[#35513d] bg-transparent py-2.5 ps-9 pe-3 outline-none focus:border-[#B8935A] ${ur ? "font-naskh" : ""}`} /></label>
            <div className="max-h-[560px] overflow-auto pe-1 space-y-5">
              {REGION_LABELS && ["pk", "in", "ir"].map((region) => {
                const rows = filtered.filter((item) => item.region === region as "pk" | "in" | "ir");
                if (!rows.length) return null;
                return <section key={region}><h3 className={`mb-2 text-sm font-bold text-[#6b776d] dark:text-[#98aa9b] ${ur ? "font-naskh" : ""}`}>{REGION_LABELS[region as "pk" | "in" | "ir"]}</h3><div className="space-y-2">{rows.map((item) => <button key={item.id} type="button" onClick={() => setSelectedSpeaker(item.id)} className={`w-full rounded-xl border px-3.5 py-3 text-start ${selectedSpeaker === item.id ? "border-[#B8935A]/70 bg-[#fbf7ee] dark:bg-[#241f14]" : "border-[#1A3A2A]/10 dark:border-[#35513d]"}`}><span className={`block font-semibold text-[#1A3A2A] dark:text-[#e7eee9] ${ur ? "font-naskh" : ""}`}>{item.name}</span><span className={`mt-1 block text-xs text-[#687469] dark:text-[#9fb0a2] ${ur ? "font-naskh" : ""}`}>{item.corpusFocus.join("، ")}</span></button>)}</div></section>;
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "تحقیق کی تیاری" : "Research brief"}</h2><p className={`mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0] ${ur ? "font-naskh" : ""}`}>{ur ? "منتخب مناسبت اور خطیبانہ ماخذ کو ایک مختصر working brief میں جمع کریں۔" : "Combine the selected occasion and speaker into a compact brief."}</p></div><button type="button" onClick={copyBrief} className={`inline-flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38] ${ur ? "font-naskh" : ""}`}><Copy className="h-4 w-4" />{ur ? "Brief نقل کریں" : "Copy brief"}</button></div>
          <pre dir="rtl" className="mt-4 whitespace-pre-wrap rounded-xl bg-[#F7F5EF] dark:bg-[#0e1c15] p-4 text-sm leading-7 text-[#303830] dark:text-[#d7e1d9] font-sans">{brief}</pre>
          {speaker?.sourceUrl ? <a className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3a6a4a] dark:text-[#a8c8b0] hover:underline ${ur ? "font-naskh" : ""}`} href={speaker.sourceUrl} target="_blank" rel="noreferrer">{speaker.sourceLabel ?? (ur ? "ماخذ کھولیں" : "Open source")}<ExternalLink className="h-3.5 w-3.5" /></a> : null}
        </section>
      </div>
    </main>
  );
}
