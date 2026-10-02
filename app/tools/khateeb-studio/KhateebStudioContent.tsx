"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, Copy, ExternalLink } from "lucide-react";
import { useLanguage } from "../../lib/language-context";
import {
  CALENDAR_MONTHS_1448,
  RABI_AL_THANI_1448_EVENTS,
  SHIA_CALENDAR_1448_EVENTS,
  type IslamicMonthId,
  type ShiaCalendarRegion,
} from "./engine/shiaCalendar";
import { KHATEEB_CORPUS, REGION_LABELS } from "./engine/khateebCorpus";

const CALENDAR_REGIONS = ["all", "pk", "in", "ir"] as const;

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
  const [selectedMonth, setSelectedMonth] = useState<IslamicMonthId>("rabi-al-thani");
  const [selectedEvent, setSelectedEvent] = useState(RABI_AL_THANI_1448_EVENTS[0]?.id ?? "");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  const filteredSpeakers = useMemo(() => {
    const q = query.trim();
    if (!q) return [...KHATEEB_CORPUS];
    return KHATEEB_CORPUS.filter((item) => `${item.name} ${item.corpusFocus.join(" ")}`.includes(q));
  }, [query]);

  const eventsFor = (month: IslamicMonthId, region: ShiaCalendarRegion) =>
    SHIA_CALENDAR_1448_EVENTS.filter((item) => {
      if (item.month !== month) return false;
      if (region === "all") return true;
      if (!item.regions?.length) return true;
      return item.regions.includes("all") || item.regions.includes(region);
    });

  const filteredEvents = useMemo(
    () => eventsFor(selectedMonth, selectedRegion),
    [selectedMonth, selectedRegion],
  );

  const monthEvents = useMemo(
    () => SHIA_CALENDAR_1448_EVENTS.filter((item) => item.month === selectedMonth),
    [selectedMonth],
  );

  const generalEventCount = monthEvents.filter(
    (item) => !item.regions?.length || item.regions.includes("all"),
  ).length;

  const regionalEventCount =
    selectedRegion === "all"
      ? monthEvents.filter((item) => item.regions?.some((region) => region !== "all")).length
      : monthEvents.filter((item) => item.regions?.includes(selectedRegion)).length;

  const event =
    filteredEvents.find((item) => item.id === selectedEvent) ??
    filteredEvents[0];

  const speaker = KHATEEB_CORPUS.find((item) => item.id === selectedSpeaker);

  const brief = [
    event ? `مناسبت: ${event.dayLabel ?? event.day} ${event.monthLabel} ۱۴۴۸ھ — ${event.title}` : "",
    event?.regions?.includes("pk") ? "تقویمی حیثیت: پاکستان میں رائج تاریخ" : "",
    speaker ? `خطیبانہ مطالعہ: ${speaker.name}` : "",
    speaker ? `مرکزی میدان: ${speaker.corpusFocus.join("، ")}` : "",
    "درکار تحقیق: اصل علمی مصادر، متعلقہ روایات/آیات، اور منتخب خطابات میں اختیار کیے گئے زاویے اور ترتیب۔",
  ].filter(Boolean).join("\n");

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(brief);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const selectMonth = (month: IslamicMonthId) => {
    setSelectedMonth(month);
    setSelectedEvent(eventsFor(month, selectedRegion)[0]?.id ?? "");
  };

  const selectRegion = (region: ShiaCalendarRegion) => {
    setSelectedRegion(region);
    setSelectedEvent(eventsFor(selectedMonth, region)[0]?.id ?? "");
  };

  return (
    <main className="min-h-screen bg-[#F7F5EF] dark:bg-[#0e1c15] py-10 md:py-14" dir={dir}>
      <div className="site-container max-w-6xl">
        <header className="mb-8 text-start">
          <h1 className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-nastaliq font-normal" : ""}`}>
            {ur ? "خطیب اسٹوڈیو" : "Khateeb Studio"}
          </h1>
          <p className={`mt-3 max-w-3xl text-gray-700 dark:text-[#d9e2db] leading-relaxed ${ur ? "font-naskh" : ""}`}>
            {ur
              ? "تقویمی مناسبت منتخب کریں، علاقائی روایت دیکھیں، اور خطبے کی تحقیق کے لیے مختصر خاکہ تیار کریں۔"
              : "Choose a lunar occasion, account for regional usage, and prepare a research brief."}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>
                  {ur ? "۱۴۴۸ھ کی تقویمی مناسبتیں" : "1448 AH occasions"}
                </h2>
                <p className={`text-sm text-[#5f6f61] dark:text-[#a8c8b0] ${ur ? "font-naskh" : ""}`}>
                  {ur ? "ماخذی ڈیٹا مقامی طور پر محفوظ ہے؛ بیرونی سائٹ بند ہو تو بھی فہرست برقرار رہے گی۔" : "Calendar records are stored locally; the list remains available during source outages."}
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={ur ? "اسلامی مہینہ" : "Islamic month"}>
              {CALENDAR_MONTHS_1448.map((month) => {
                const active = selectedMonth === month.id;
                return (
                  <button
                    key={month.id}
                    type="button"
                    onClick={() => selectMonth(month.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                        : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                    }`}
                  >
                    {month.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={ur ? "علاقائی تقویم" : "Calendar region"}>
              {CALENDAR_REGIONS.map((region) => {
                const active = selectedRegion === region;
                return (
                  <button
                    key={region}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectRegion(region)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      active
                        ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                        : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                    }`}
                  >
                    {CALENDAR_REGION_LABELS[region]}
                  </button>
                );
              })}
            </div>

            <div className={`mb-4 rounded-xl border border-[#1A3A2A]/8 bg-[#F7F5EF] px-4 py-3 text-sm dark:border-[#35513d] dark:bg-[#0e1c15] ${ur ? "font-naskh" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#1A3A2A] dark:text-[#dfe9e1]">
                  منتخب علاقہ: {CALENDAR_REGION_LABELS[selectedRegion]}
                </span>
                <span className="text-[#687469] dark:text-[#a8b8aa]">
                  دکھائی جانے والی مناسبتیں: {filteredEvents.length}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                <span>عمومی مناسبتیں: {generalEventCount}</span>
                <span>
                  {selectedRegion === "all"
                    ? `علاقائی مخصوص اندراجات: ${regionalEventCount}`
                    : `${CALENDAR_REGION_LABELS[selectedRegion]} کے مخصوص اندراجات: ${regionalEventCount}`}
                </span>
              </div>
            </div>

            {selectedRegion !== "all" && regionalEventCount === 0 ? (
              <div className={`mb-4 rounded-xl border border-[#B8935A]/30 bg-[#fbf7ee] px-4 py-3 text-sm text-[#6f5730] dark:border-[#8a6c38]/40 dark:bg-[#241f14] dark:text-[#d7bc8a] ${ur ? "font-naskh" : ""}`}>
                اس علاقے کے لیے ابھی الگ تاریخی اندراج محفوظ نہیں۔ عمومی مناسبتیں بدستور دکھائی جا رہی ہیں؛ نئی علاقائی تاریخ معتبر ماخذ کے ساتھ شامل کی جائے گی۔
              </div>
            ) : selectedRegion !== "all" ? (
              <div className={`mb-4 rounded-xl border border-[#1A3A2A]/10 bg-white px-4 py-3 text-sm text-[#4b5a4f] dark:border-[#35513d] dark:bg-[#162a1e] dark:text-[#b8c8bb] ${ur ? "font-naskh" : ""}`}>
                {CALENDAR_REGION_LABELS[selectedRegion]} کے مخصوص اندراجات عمومی مناسبتوں کے ساتھ شامل ہیں؛ اس لیے ایک ہی واقعے کی علاقائی تاریخ الگ نظر آ سکتی ہے۔
              </div>
            ) : null}

            <div className="space-y-2">
              {filteredEvents.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEvent(item.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-start transition-colors ${
                    selectedEvent === item.id
                      ? "border-[#B8935A]/70 bg-[#fbf7ee] dark:bg-[#241f14]"
                      : "border-[#1A3A2A]/10 dark:border-[#35513d] hover:bg-[#f7f7f2] dark:hover:bg-[#1b3022]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-lg bg-[#1A3A2A] px-2 py-1 text-xs font-semibold text-white">
                      {item.dayLabel ?? item.day}
                    </span>
                    <span className={ur ? "font-naskh" : ""}>
                      <span className="block font-semibold text-[#1A3A2A] dark:text-[#e7eee9]">{item.title}</span>
                      {item.note ? <span className="mt-0.5 block text-xs text-[#677266] dark:text-[#a8b8aa]">{item.note}</span> : null}
                      {item.regions?.length ? (
                        <span className="mt-1 inline-block text-[11px] font-semibold text-[#8a6838]">
                          {item.regions.map((r) => CALENDAR_REGION_LABELS[r]).join("، ")}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {event ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#3a6a4a] dark:text-[#a8c8b0] hover:underline ${ur ? "font-naskh" : ""}`}
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {ur ? event.sourceLabel : "Open calendar source"}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className={`text-xs text-[#687469] dark:text-[#9fb0a2] ${ur ? "font-naskh" : ""}`}>
                  مقامی محفوظہ: {event.sourceCapturedAt}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A3A2A]/8 text-[#1A3A2A] dark:bg-[#2a5a3a]/50 dark:text-[#8faa93]">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>
                  {ur ? "خطیبانہ ذخیرہ" : "Khateeb source index"}
                </h2>
                <p className={`text-sm text-[#5f6f61] dark:text-[#a8c8b0] ${ur ? "font-naskh" : ""}`}>
                  {ur ? "یہ فہرست کسی درجہ بندی کا اعلان نہیں ہے۔" : "This is a source map, not a ranking."}
                </p>
              </div>
            </div>

            <label className="relative block mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ur ? "خطیب یا موضوع تلاش کریں" : "Search speaker or corpus focus"}
                className={`w-full rounded-xl border border-[#1A3A2A]/12 dark:border-[#35513d] bg-transparent py-2.5 px-3 outline-none focus:border-[#B8935A] ${ur ? "font-naskh" : ""}`}
              />
            </label>

            <div className="max-h-[560px] overflow-auto pe-1 space-y-5">
              {(["pk", "in", "ir"] as const).map((region) => {
                const rows = filteredSpeakers.filter((item) => item.region === region);
                if (!rows.length) return null;
                return (
                  <section key={region}>
                    <h3 className={`mb-2 text-sm font-bold text-[#6b776d] dark:text-[#98aa9b] ${ur ? "font-naskh" : ""}`}>
                      {REGION_LABELS[region]}
                    </h3>
                    <div className="space-y-2">
                      {rows.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedSpeaker(item.id)}
                          className={`w-full rounded-xl border px-3.5 py-3 text-start ${
                            selectedSpeaker === item.id
                              ? "border-[#B8935A]/70 bg-[#fbf7ee] dark:bg-[#241f14]"
                              : "border-[#1A3A2A]/10 dark:border-[#35513d]"
                          }`}
                        >
                          <span className={`block font-semibold text-[#1A3A2A] dark:text-[#e7eee9] ${ur ? "font-naskh" : ""}`}>
                            {item.name}
                          </span>
                          <span className={`mt-1 block text-xs text-[#687469] dark:text-[#9fb0a2] ${ur ? "font-naskh" : ""}`}>
                            {item.corpusFocus.join("، ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>
                {ur ? "تحقیق کی تیاری" : "Research brief"}
              </h2>
              <p className={`mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0] ${ur ? "font-naskh" : ""}`}>
                {ur ? "منتخب مناسبت اور خطیبانہ ماخذ کو ایک مختصر تحقیقی خاکے میں جمع کریں۔" : "Combine the selected occasion and speaker into a compact research brief."}
              </p>
            </div>
            <button
              type="button"
              onClick={copyBrief}
              className={`inline-flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38] ${ur ? "font-naskh" : ""}`}
            >
              <Copy className="h-4 w-4" />
              {ur ? "خاکہ نقل کریں" : "Copy brief"}
            </button>
          </div>
          <pre dir="rtl" className="mt-4 whitespace-pre-wrap rounded-xl bg-[#F7F5EF] dark:bg-[#0e1c15] p-4 text-sm leading-7 text-[#303830] dark:text-[#d7e1d9] font-sans">
            {brief}
          </pre>
          {speaker?.sourceUrl ? (
            <a
              className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#3a6a4a] dark:text-[#a8c8b0] hover:underline ${ur ? "font-naskh" : ""}`}
              href={speaker.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {speaker.sourceLabel ?? (ur ? "ماخذ کھولیں" : "Open source")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </section>
      </div>
    </main>
  );
}
