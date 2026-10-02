"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, Clock3, Copy, ExternalLink, PenLine, Search, Sparkles } from "lucide-react";
import { useLanguage } from "../../lib/language-context";
import {
  CALENDAR_MONTHS_1448,
  SHIA_CALENDAR_1448_EVENTS,
  type IslamicMonthId,
  type ShiaCalendarRegion,
} from "./engine/shiaCalendar";
import { groupCalendarEvents } from "./engine/groupCalendarEvents";
import { KHATEEB_CORPUS, REGION_LABELS } from "./engine/khateebCorpus";
import {
  eventDayLabel,
  eventNote,
  eventTitle,
  sourceLabel as localizedSourceLabel,
  speakerFocus,
  speakerName,
  speakerSearchText,
} from "./engine/khateebLocale";
import {
  buildPreparationText,
  getSermonPrep,
  outlineMinutes,
  type SermonDuration,
} from "./engine/sermonPrep";
import { evidenceForSpeaker } from "./engine/speakerEvidence";
import {
  evidenceForTopic,
  topicsForSpeaker,
} from "./engine/speakerTopicIndex";
import {
  searchTopicPreps,
  topicTitle,
} from "./engine/topicPrep";
import {
  buildDossierText,
  getTopicDossier,
} from "./engine/topicDossier";

const CALENDAR_REGIONS = ["all", "pk", "in", "ir"] as const;

const CALENDAR_REGION_LABELS: Record<ShiaCalendarRegion, string> = {
  all: "سبھی",
  pk: "پاکستان",
  in: "ہندوستان",
  ir: "ایران",
};

const CALENDAR_REGION_LABELS_EN: Record<ShiaCalendarRegion, string> = {
  all: "All",
  pk: "Pakistan",
  in: "India",
  ir: "Iran",
};

const CALENDAR_MONTH_LABELS_EN: Record<IslamicMonthId, string> = {
  muharram: "Muharram",
  safar: "Safar",
  "rabi-al-awwal": "Rabi al-Awwal",
  "rabi-al-thani": "Rabi al-Thani",
  "jumada-al-awwal": "Jumada al-Awwal",
  "jumada-al-thani": "Jumada al-Thani",
  rajab: "Rajab",
  shaban: "Sha'ban",
  ramadan: "Ramadan",
  shawwal: "Shawwal",
  "dhu-al-qadah": "Dhu al-Qi'dah",
  "dhu-al-hijjah": "Dhu al-Hijjah",
};

const SPEAKER_REGION_LABELS_EN = {
  pk: "Pakistan",
  in: "India",
  ir: "Iran",
} as const;

export default function KhateebStudioContent() {
  const { language, dir } = useLanguage();
  const ur = language === "ur";
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(1);
  const [preparationMode, setPreparationMode] = useState<"topic" | "occasion">("topic");
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] =
    useState<ShiaCalendarRegion>("all");
  const [selectedMonth, setSelectedMonth] =
    useState<IslamicMonthId>("rabi-al-thani");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [duration, setDuration] = useState<SermonDuration>(30);
  const [topicQuery, setTopicQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("sabr");

  const filteredSpeakers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...KHATEEB_CORPUS];
    return KHATEEB_CORPUS.filter((item) => speakerSearchText(item).includes(q));
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

  const visibleGroups = useMemo(
    () => groupCalendarEvents(filteredEvents),
    [filteredEvents],
  );

  const monthEvents = useMemo(
    () => SHIA_CALENDAR_1448_EVENTS.filter((item) => item.month === selectedMonth),
    [selectedMonth],
  );

  const generalRecordCount = monthEvents.filter(
    (item) => !item.regions?.length || item.regions.includes("all"),
  ).length;

  const regionalRecordCount =
    selectedRegion === "all"
      ? monthEvents.filter((item) =>
          item.regions?.some((region) => region !== "all"),
        ).length
      : monthEvents.filter((item) =>
          item.regions?.includes(selectedRegion),
        ).length;

  const selectedGroup =
    visibleGroups.find((group) => group.key === selectedEvent) ??
    visibleGroups[0];

  const event = selectedGroup?.representative;

  const speaker = KHATEEB_CORPUS.find((item) => item.id === selectedSpeaker);
  const speakerEvidence = selectedSpeaker
    ? evidenceForSpeaker(selectedSpeaker)
    : [];
  const speakerIndexedTopics = speaker
    ? topicsForSpeaker(speaker.id)
    : [];
  const topicResults = useMemo(
    () => searchTopicPreps(topicQuery, ur ? "ur" : "en"),
    [topicQuery, ur],
  );
  const topic = topicResults.find((item) => item.id === selectedTopicId)
    ?? topicResults[0];
  const topicDossier = topic ? getTopicDossier(topic.id) : null;
  const topicDossierText = topicDossier
    ? buildDossierText(topicDossier, ur ? "ur" : "en")
    : "";
  const topicSpeakerEvidence = topic ? evidenceForTopic(topic.id) : [];
  const topicPreparationText = topic
    ? buildPreparationText(
        topic,
        ur ? "ur" : "en",
        duration,
        speaker
          ? {
              name: speakerName(speaker, !ur),
              focus: speakerFocus(speaker, !ur),
            }
          : undefined,
      )
    : "";
  const preparation = getSermonPrep(event);
  const preparationMinutes = outlineMinutes(duration);
  const preparationText = preparation
    ? buildPreparationText(
        preparation,
        ur ? "ur" : "en",
        duration,
        speaker
          ? {
              name: speakerName(speaker, !ur),
              focus: speakerFocus(speaker, !ur),
            }
          : undefined,
      )
    : "";

  const brief = ur
    ? [
        event
          ? `مناسبت: ${eventDayLabel(event, false)} ${event.monthLabel} ۱۴۴۸ھ — ${eventTitle(event, false)}`
          : "",
        event?.regions?.includes("pk") ? "تقویمی حیثیت: پاکستان میں رائج تاریخ" : "",
        speaker ? `خطیبانہ مطالعہ: ${speakerName(speaker, false)}` : "",
        speaker ? `مرکزی میدان: ${speakerFocus(speaker, false).join("، ")}` : "",
        "درکار تحقیق: اصل علمی مصادر، متعلقہ روایات/آیات، اور منتخب خطابات میں اختیار کیے گئے زاویے اور ترتیب۔",
      ]
        .filter(Boolean)
        .join("\n")
    : [
        event
          ? `Occasion: ${eventDayLabel(event, true)} ${CALENDAR_MONTH_LABELS_EN[event.month]} 1448 AH — ${eventTitle(event, true)}`
          : "",
        event?.regions?.includes("pk") ? "Calendar usage: date used in Pakistan" : "",
        speaker ? `Speaker study: ${speakerName(speaker, true)}` : "",
        speaker ? `Corpus focus: ${speakerFocus(speaker, true).join(", ")}` : "",
        "Research needed: primary scholarly sources, relevant verses and narrations, and the angles and structure used in selected speeches.",
      ]
        .filter(Boolean)
        .join("\n");

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(brief);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const copyPreparation = async () => {
    if (!preparationText) return;
    try {
      await navigator.clipboard.writeText(preparationText);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const copyTopicPreparation = async () => {
    const text = topicDossierText || topicPreparationText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const selectMonth = (month: IslamicMonthId) => {
    const groups = groupCalendarEvents(eventsFor(month, selectedRegion));
    setSelectedMonth(month);
    setSelectedEvent(groups[0]?.key ?? "");
  };

  const selectRegion = (region: ShiaCalendarRegion) => {
    const groups = groupCalendarEvents(eventsFor(selectedMonth, region));
    setSelectedRegion(region);
    setSelectedEvent(groups[0]?.key ?? "");
  };

  const selectGroup = (key: string) => {
    setSelectedEvent(key);
    setWorkflowStep(2);
  };

  const chooseTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setWorkflowStep(2);
  };

  const chooseSpeaker = (speakerId: string) => {
    setSelectedSpeaker(speakerId);
    setWorkflowStep(3);
  };

  const skipSpeaker = () => {
    setSelectedSpeaker("");
    setWorkflowStep(3);
  };

  const changeMode = (mode: "topic" | "occasion") => {
    setPreparationMode(mode);
    setWorkflowStep(1);
    setSelectedSpeaker("");
  };

  return (
    <main
      className={`khateeb-studio min-h-screen bg-[#F7F5EF] dark:bg-[#0e1c15] py-10 md:py-14${ur ? " khateeb-studio-ur" : ""}`}
      dir={dir}
    >
      <style>{`
        @font-face {
          font-family: "Jameel Noori Nastaleeq";
          src: url("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/jameel-noori-nastaleeq-400.woff2") format("woff2");
          font-style: normal;
          font-weight: 400;
          font-display: swap;
        }

        .khateeb-studio-ur {
          font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          font-size: 1.09rem;
          line-height: 2.08;
        }

        .khateeb-studio-ur h1,
        .khateeb-studio-ur h2,
        .khateeb-studio-ur h3,
        .khateeb-studio-ur h4,
        .khateeb-studio-ur h5,
        .khateeb-studio-ur h6 {
          font-family: var(--font-nastaliq), var(--font-nastaliq-latin), "Noto Nastaliq Urdu", serif !important;
          line-height: 1.62;
        }

        .khateeb-studio-ur h1 {
          font-size: clamp(2.3rem, 4vw, 2.8rem);
        }

        .khateeb-studio-ur h2 {
          font-size: 1.58rem;
        }

        .khateeb-studio-ur h3 {
          font-size: 1.08rem;
        }

        .khateeb-studio-ur p {
          line-height: 2.02;
        }

        .khateeb-studio-ur .text-sm {
          font-size: 1.02rem;
          line-height: 1.9;
        }

        .khateeb-studio-ur .text-xs {
          font-size: 0.88rem;
          line-height: 1.78;
        }

        .khateeb-studio-ur button,
        .khateeb-studio-ur input,
        .khateeb-studio-ur a,
        .khateeb-studio-ur label,
        .khateeb-studio-ur pre {
          font-family: inherit;
        }

        .khateeb-studio-ur button {
          line-height: 1.9;
        }

        .khateeb-studio-ur input {
          font-size: 1.02rem;
        }

        .khateeb-studio-ur pre {
          font-size: 1.02rem;
          line-height: 2.05;
        }
      `}</style>
      <div className="site-container max-w-6xl">
        <header className="mb-12 text-center">
          <h1
            className={`mx-auto text-4xl md:text-5xl font-bold text-[#1A3A2A] dark:text-white`}
          >
            {ur ? "خطیب اسٹوڈیو" : "Khateeb Studio"}
          </h1>
          <p
            className={`mx-auto mt-5 max-w-2xl text-base md:text-lg text-gray-700 dark:text-[#d9e2db] leading-8`}
          >
            {ur
              ? "موضوع سے یا مناسبت سے تیاری کریں، معتبر علمی سمتیں دیکھیں، اور خطبے کا قابلِ استعمال خاکہ بنائیں۔"
              : "Prepare by topic or occasion, review source-led directions, and build a usable sermon outline."}
          </p>
        </header>

        <nav className="mb-6 rounded-2xl border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]" aria-label={ur ? "تیاری کے مراحل" : "Preparation steps"}>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              [1, ur ? "1 — موضوع یا مناسبت" : "1 — Topic or occasion"],
              [2, ur ? "2 — خطیب (اختیاری)" : "2 — Speaker (optional)"],
              [3, ur ? "3 — تیار مواد" : "3 — Preparation"],
            ] as const).map(([step, label]) => (
              <button
                key={step}
                type="button"
                onClick={() => setWorkflowStep(step)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  workflowStep === step
                    ? "bg-[#1A3A2A] text-white dark:bg-[#35513d]"
                    : "bg-[#F7F5EF] text-[#5b685e] hover:bg-[#eef0ea] dark:bg-[#0e1c15] dark:text-[#a8b8aa]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        {workflowStep === 1 ? (
          <section className="mb-6 rounded-2xl border border-[#B8935A]/30 bg-white p-5 sm:p-6 shadow-sm dark:border-[#6f5b35] dark:bg-[#162a1e]">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#1A3A2A] dark:text-white">
                {ur ? "پہلا مرحلہ: تیاری کہاں سے شروع کرنی ہے؟" : "Step 1: Where do you want to begin?"}
              </h2>
              <p className="mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0]">
                {ur
                  ? "سال بھر کے کسی موضوع سے شروع کریں، یا کسی موجودہ دینی مناسبت سے۔ دونوں راستے الگ رکھے گئے ہیں۔"
                  : "Start from a year-round topic or from a religious occasion. The two paths are kept separate."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => changeMode("topic")}
                className={`rounded-xl border p-4 text-start ${
                  preparationMode === "topic"
                    ? "border-[#B8935A] bg-[#fbf7ee] dark:bg-[#241f14]"
                    : "border-[#1A3A2A]/10 dark:border-[#35513d]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-[#8a6838]" />
                  <span className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                    {ur ? "موضوع سے تیاری" : "Prepare by topic"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#687469] dark:text-[#9fb0a2]">
                  {ur ? "صبر، امامت، دعا، خاندان، نوجوان، اخلاق وغیرہ" : "Patience, Imamate, dua, family, youth, ethics, and more"}
                </p>
              </button>
              <button
                type="button"
                onClick={() => changeMode("occasion")}
                className={`rounded-xl border p-4 text-start ${
                  preparationMode === "occasion"
                    ? "border-[#B8935A] bg-[#fbf7ee] dark:bg-[#241f14]"
                    : "border-[#1A3A2A]/10 dark:border-[#35513d]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#8a6838]" />
                  <span className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                    {ur ? "مناسبت سے تیاری" : "Prepare by occasion"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#687469] dark:text-[#9fb0a2]">
                  {ur ? "قمری مہینہ، علاقائی تاریخ اور دینی مناسبت منتخب کریں" : "Choose the lunar month, regional usage, and occasion"}
                </p>
              </button>
            </div>
          </section>
        ) : null}

        <section className={`${workflowStep === 1 && preparationMode === "topic" ? "block" : workflowStep === 3 && preparationMode === "topic" ? "block" : "hidden"} mb-6 rounded-2xl border border-[#B8935A]/30 bg-white p-5 sm:p-6 shadow-sm dark:border-[#6f5b35] dark:bg-[#162a1e]`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A3A2A]/8 text-[#1A3A2A] dark:bg-[#2a5a3a]/50 dark:text-[#8faa93]">
                <PenLine className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-[#1A3A2A] dark:text-white">
                  {ur ? "موضوع سے خطبہ تیار کریں" : "Prepare a sermon by topic"}
                </h2>
                <p className="mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0]">
                  {ur
                    ? "سال بھر کے لیے موضوع تلاش کریں؛ قرآن، بنیادی ماخذ، زاویۂ بیان اور وقت کے مطابق خاکہ حاصل کریں۔"
                    : "Search year-round topics and get Qur'anic anchors, source leads, speaking angles, and a timed outline."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {([20, 30, 45] as SermonDuration[]).map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    duration === minutes
                      ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                      : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                  }`}
                >
                  {minutes} {ur ? "منٹ" : "min"}
                </button>
              ))}
            </div>
          </div>

          <label className={`${workflowStep === 1 ? "relative mt-5 block" : "hidden"}`}>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748078]" />
            <input
              value={topicQuery}
              onChange={(event) => setTopicQuery(event.target.value)}
              placeholder={ur ? "مثلاً: صبر، امامت، دعا، نوجوان، خاندان، موت..." : "e.g. patience, Imamate, dua, youth, family, death..."}
              className="w-full rounded-xl border border-[#1A3A2A]/12 bg-transparent py-3 ps-10 pe-3 outline-none focus:border-[#B8935A] dark:border-[#35513d]"
            />
          </label>

          <div className={`${workflowStep === 1 ? "mt-3 flex flex-wrap gap-2" : "hidden"}`}>
            {topicResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseTopic(item.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  topic?.id === item.id
                    ? "border-[#B8935A] bg-[#fbf7ee] text-[#6f5730] dark:bg-[#241f14] dark:text-[#e2c895]"
                    : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                }`}
              >
                {topicTitle(item, ur ? "ur" : "en")}
              </button>
            ))}
          </div>

          {!topic ? (
            <p className="mt-4 rounded-xl bg-[#F7F5EF] p-4 text-sm text-[#5f6f61] dark:bg-[#0e1c15] dark:text-[#a8c8b0]">
              {ur ? "اس تلاش سے ابھی کوئی محفوظ موضوع نہیں ملا۔" : "No stored topic matches this search yet."}
            </p>
          ) : workflowStep === 3 ? (
            <div className="mt-5 rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <h3 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                    {topicTitle(topic, ur ? "ur" : "en")}
                  </h3>
                  <p className="mt-1 text-sm text-[#4f5f53] dark:text-[#b8c8bb]">
                    {ur ? topic.themeUr : topic.themeEn}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#7a5c31] dark:text-[#d3b274]">
                    {ur ? "سوالِ آغاز: " : "Opening question: "}
                    {ur ? topic.openingUr : topic.openingEn}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyTopicPreparation}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38]"
                >
                  <Copy className="h-4 w-4" />
                  {topicDossier
                    ? (ur ? "تحقیقی dossier نقل کریں" : "Copy research dossier")
                    : (ur ? "مکمل تیاری نقل کریں" : "Copy full preparation")}
                </button>
              </div>

              {topicDossier ? (
                <div className="mt-5 space-y-5">
                  <section className="rounded-xl border border-[#B8935A]/30 bg-white p-4 dark:border-[#6f5b35] dark:bg-[#162a1e]">
                    <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                      {ur ? "مرکزی thesis" : "Central thesis"}
                    </div>
                    <p className="mt-2 text-sm leading-8 text-[#303830] dark:text-[#d7e1d9]">
                      {ur ? topicDossier.thesisUr : topicDossier.thesisEn}
                    </p>
                    <div className="mt-3 rounded-lg bg-[#F7F5EF] p-3 text-sm font-semibold text-[#5a4830] dark:bg-[#0e1c15] dark:text-[#d7bc8a]">
                      {ur ? "مرکزی سوال: " : "Governing question: "}
                      {ur ? topicDossier.governingQuestionUr : topicDossier.governingQuestionEn}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? "مختلف اہلِ علم نے اسے کیسے کھولا؟" : "How different scholars develop the topic"}
                    </h4>
                    <div className="mt-3 space-y-4">
                      {topicDossier.perspectives.map((perspective) => (
                        <article
                          key={perspective.id}
                          className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                {ur ? perspective.nameUr : perspective.nameEn}
                              </h5>
                              <p className="text-xs text-[#8a6838] dark:text-[#d7bc8a]">
                                {ur ? perspective.sourceTitleUr : perspective.sourceTitleEn}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#F7F5EF] px-2 py-1 text-[11px] font-semibold text-[#677266] dark:bg-[#0e1c15] dark:text-[#9fb0a2]">
                              source-backed
                            </span>
                          </div>

                          <p className="mt-3 text-sm font-semibold leading-7 text-[#37443a] dark:text-[#c8d5cc]">
                            {ur ? perspective.coreUr : perspective.coreEn}
                          </p>

                          <div className="mt-3 space-y-2">
                            {(ur ? perspective.explanationUr : perspective.explanationEn).map((point) => (
                              <p key={point} className="text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                                {point}
                              </p>
                            ))}
                          </div>

                          {perspective.originalSnippet ? (
                            <blockquote
                              dir="rtl"
                              className="mt-3 rounded-lg border-s-4 border-[#B8935A] bg-[#F7F5EF] px-4 py-2 font-naskh text-sm text-[#303830] dark:bg-[#0e1c15] dark:text-[#d7e1d9]"
                            >
                              {perspective.originalSnippet}
                            </blockquote>
                          ) : null}

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
                              <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                                {ur ? "ان کے بیان کا انداز" : "How this speaker frames it"}
                              </div>
                              <p className="mt-1 text-sm text-[#445247] dark:text-[#b8c8bb]">
                                {ur ? perspective.styleUr : perspective.styleEn}
                              </p>
                            </div>
                            <div className="rounded-lg bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
                              <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                                {ur ? "منبر میں آپ کیا لے سکتے ہیں؟" : "What to take to the pulpit"}
                              </div>
                              <p className="mt-1 text-sm text-[#445247] dark:text-[#b8c8bb]">
                                {ur ? perspective.useUr : perspective.useEn}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 text-[11px] text-[#7c877e] dark:text-[#8fa294]">
                            {ur ? "اصل ماخذ verification کے لیے محفوظ ہے؛ بنیادی مواد اوپر دے دیا گیا ہے۔" : "The original source is retained for verification; the usable material is provided above."}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]">
                    <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? "اب ان سب کو ایک منبر میں کیسے جوڑیں؟" : "How to synthesize these into one sermon"}
                    </h4>
                    <div className="mt-3 space-y-2">
                      {(ur ? topicDossier.synthesisUr : topicDossier.synthesisEn).map((point) => (
                        <p key={point} className="text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                          • {point}
                        </p>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? "قابلِ بیان منبری flow" : "Ready speaking flow"}
                    </h4>
                    <div className="mt-3 space-y-3">
                      {(ur ? topicDossier.pulpitFlowUr : topicDossier.pulpitFlowEn).map((block) => (
                        <article key={block.heading} className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                          <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">{block.heading}</h5>
                          <p className="mt-2 text-sm leading-8 text-[#37443a] dark:text-[#c8d5cc]">{block.body}</p>
                        </article>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-[#B8935A]/30 bg-[#fbf7ee] p-4 text-sm leading-8 text-[#5a4830] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#e2c895]">
                      <strong>{ur ? "اختتام: " : "Closing: "}</strong>
                      {ur ? topicDossier.closingUr : topicDossier.closingEn}
                    </div>
                  </section>
                </div>
              ) : (
              <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-white p-3 dark:bg-[#162a1e]">
                  <span className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">{ur ? "قرآنی بنیاد" : "Qur'anic anchors"}</span>
                  <div className="mt-2 space-y-2">
                    {topic.quran.map((anchor) => (
                      <div key={anchor.ref}>
                        <div className="text-xs font-semibold text-[#8a6838]">{anchor.ref}</div>
                        <div dir="rtl" className="mt-0.5 font-naskh text-sm text-[#1A3A2A] dark:text-[#e7eee9]">{anchor.arabic}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-[#162a1e]">
                  <span className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">{ur ? "اصل ماخذ" : "Source leads"}</span>
                  <ul className="mt-2 space-y-1 text-sm text-[#303830] dark:text-[#d7e1d9]">
                    {topic.sources.map((source) => (
                      <li key={source.labelEn}>{ur ? source.labelUr : source.labelEn}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-white p-3 dark:bg-[#162a1e]">
                  <span className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">{ur ? "زاویۂ بیان" : "Speaking angles"}</span>
                  <ul className="mt-2 space-y-1 text-sm text-[#303830] dark:text-[#d7e1d9]">
                    {(ur ? topic.anglesUr : topic.anglesEn).map((angle) => (
                      <li key={angle}>• {angle}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? "اس موضوع پر خطباء کا حقیقی مواد" : "Verified speaker material on this topic"}
                    </h4>
                    <p className="mt-0.5 text-xs text-[#687469] dark:text-[#9fb0a2]">
                      {ur
                        ? "صرف وہی خطابات یا محفوظ مجموعے دکھائے جاتے ہیں جنہیں اس موضوع سے واضح طور پر index کیا گیا ہے۔"
                        : "Only speeches or archived collections explicitly indexed to this topic are shown."}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F7F5EF] px-2.5 py-1 text-xs font-semibold text-[#6b776d] dark:bg-[#0e1c15] dark:text-[#98aa9b]">
                    {topicSpeakerEvidence.length} {ur ? "ریکارڈ" : "records"}
                  </span>
                </div>

                {topicSpeakerEvidence.length ? (
                  <div className="mt-3 space-y-3">
                    {topicSpeakerEvidence.map((record) => {
                      const indexedSpeaker = KHATEEB_CORPUS.find(
                        (item) => item.id === record.speakerId,
                      );
                      return (
                        <article
                          key={record.id}
                          className="rounded-lg border border-[#1A3A2A]/10 bg-[#F7F5EF] p-3 dark:border-[#35513d] dark:bg-[#0e1c15]"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {indexedSpeaker ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSpeaker(indexedSpeaker.id)}
                                className="font-bold text-[#1A3A2A] hover:underline dark:text-[#e7eee9]"
                              >
                                {speakerName(indexedSpeaker, !ur)}
                              </button>
                            ) : null}
                            <span className="text-[#8a6838]">
                              {record.kind === "transcript"
                                ? (ur ? "مکمل مکتوب خطاب" : "Full transcript")
                                : (ur ? "محفوظ مجموعۂ مجالس" : "Archived collection")}
                            </span>
                          </div>
                          <h5 className="mt-1 font-semibold text-[#1A3A2A] dark:text-[#e7eee9]">
                            {ur ? record.titleUr : record.titleEn}
                          </h5>
                          <p className="mt-1 text-sm text-[#4f5f53] dark:text-[#b8c8bb]">
                            {ur ? record.summaryUr : record.summaryEn}
                          </p>
                          {record.materialUr?.length ? (
                            <div className="mt-3 space-y-2 rounded-lg bg-white p-3 dark:bg-[#162a1e]">
                              <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                                {ur ? "خطابت کے لیے تیار مواد" : "Ready-to-use study material"}
                              </div>
                              {(ur ? record.materialUr : record.materialEn ?? []).map((paragraph) => (
                                <p key={paragraph} className="text-sm text-[#303830] dark:text-[#d7e1d9]">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-2 text-[11px] text-[#7c877e] dark:text-[#8fa294]">
                            {ur ? `حوالہ: ${record.sourceLabelUr}` : `Reference: ${record.sourceLabelEn}`}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-[#1A3A2A]/15 bg-[#F7F5EF] p-3 text-sm text-[#5f6f61] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#a8c8b0]">
                    {ur
                      ? "اس موضوع کے لیے خطباء کا verified مواد ابھی index نہیں ہوا؛ Qalam یہاں کوئی مصنوعی نسبت نہیں بنا رہا۔"
                      : "No verified speaker material is indexed to this topic yet; Qalam does not manufacture an attribution."}
                  </p>
                )}
              </div>

              <details className="mt-4 rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]">
                <summary className="cursor-pointer text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {ur ? `${duration} منٹ کی مکمل تیاری دیکھیں` : `View full ${duration}-minute preparation`}
                </summary>
                <pre
                  dir={ur ? "rtl" : "ltr"}
                  className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#303830] dark:text-[#d7e1d9] font-sans"
                >
                  {topicPreparationText}
                </pre>
              </details>
              </>
              )}
            </div>
          ) : null}
        </section>

        <section className={`${workflowStep === 1 && preparationMode === "occasion" ? "block" : workflowStep === 2 ? "block" : "hidden"} space-y-6`}>
          <div className={`${workflowStep === 1 && preparationMode === "occasion" ? "block" : "hidden"} rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6`}>
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2
                  className={`text-xl font-bold text-[#1A3A2A] dark:text-white`}
                >
                  {ur ? "۱۴۴۸ھ کی تقویمی مناسبتیں" : "1448 AH occasions"}
                </h2>
                <p
                  className={`text-sm text-[#5f6f61] dark:text-[#a8c8b0]`}
                >
                  {ur
                    ? "ماخذی ڈیٹا مقامی طور پر محفوظ ہے؛ بیرونی سائٹ بند ہو تو بھی فہرست برقرار رہے گی۔"
                    : "Calendar records are stored locally; the list remains available during source outages."}
                </p>
              </div>
            </div>

            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label={ur ? "اسلامی مہینہ" : "Islamic month"}
            >
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
                    {ur ? month.label : CALENDAR_MONTH_LABELS_EN[month.id]}
                  </button>
                );
              })}
            </div>

            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label={ur ? "علاقائی تقویم" : "Calendar region"}
            >
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
                    {ur ? CALENDAR_REGION_LABELS[region] : CALENDAR_REGION_LABELS_EN[region]}
                  </button>
                );
              })}
            </div>

            <div
              className={`mb-4 rounded-xl border border-[#1A3A2A]/8 bg-[#F7F5EF] px-4 py-3 text-sm dark:border-[#35513d] dark:bg-[#0e1c15]`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#1A3A2A] dark:text-[#dfe9e1]">
                  {ur ? "منتخب علاقہ" : "Selected region"}: {ur ? CALENDAR_REGION_LABELS[selectedRegion] : CALENDAR_REGION_LABELS_EN[selectedRegion]}
                </span>
                <span className="text-[#687469] dark:text-[#a8b8aa]">
                  {ur ? "نمایاں مناسبتیں" : "Visible occasions"}: {visibleGroups.length}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                <span>{ur ? "محفوظ ماخذی ریکارڈ" : "Preserved source records"}: {filteredEvents.length}</span>
                <span>{ur ? "عمومی ریکارڈ" : "General records"}: {generalRecordCount}</span>
                <span>
                  {selectedRegion === "all"
                    ? `${ur ? "علاقائی مخصوص ریکارڈ" : "Regional-only records"}: ${regionalRecordCount}`
                    : `${ur ? CALENDAR_REGION_LABELS[selectedRegion] + " کے مخصوص ریکارڈ" : SPEAKER_REGION_LABELS_EN[selectedRegion] + " regional records"}: ${regionalRecordCount}`}
                </span>
              </div>
            </div>

            {selectedRegion !== "all" && regionalRecordCount === 0 ? (
              <div
                className={`mb-4 rounded-xl border border-[#B8935A]/30 bg-[#fbf7ee] px-4 py-3 text-sm text-[#6f5730] dark:border-[#8a6c38]/40 dark:bg-[#241f14] dark:text-[#d7bc8a]`}
              >
                {ur ? "اس علاقے کے لیے ابھی الگ تاریخی اندراج محفوظ نہیں۔ عمومی مناسبتیں بدستور دکھائی جا رہی ہیں؛ نئی علاقائی تاریخ معتبر ماخذ کے ساتھ شامل کی جائے گی۔" : "No separate historical record is currently stored for this region. General occasions remain visible; a new regional date will be added with a reliable source."}
              </div>
            ) : selectedRegion !== "all" ? (
              <div
                className={`mb-4 rounded-xl border border-[#1A3A2A]/10 bg-white px-4 py-3 text-sm text-[#4b5a4f] dark:border-[#35513d] dark:bg-[#162a1e] dark:text-[#b8c8bb]`}
              >
                {ur ? `${CALENDAR_REGION_LABELS[selectedRegion]} کے مخصوص اندراجات عمومی مناسبتوں کے ساتھ شامل ہیں؛ ایک ہی واقعے کی مختلف علاقائی تاریخوں کے ماخذی ریکارڈ ایک مناسبت کے تحت جمع دکھائے جاتے ہیں۔` : `${CALENDAR_REGION_LABELS_EN[selectedRegion]} regional records are shown together with general occasions; source records for the same event and date are grouped under one occasion.`}
              </div>
            ) : null}

            <div className="space-y-2">
              {visibleGroups.map((group) => {
                const item = group.representative;
                const groupRegions = [
                  ...new Set(
                    group.items.flatMap((source) => source.regions ?? []),
                  ),
                ];

                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => selectGroup(group.key)}
                    className={`w-full rounded-xl border px-4 py-3 text-start transition-colors ${
                      selectedGroup?.key === group.key
                        ? "border-[#B8935A]/70 bg-[#fbf7ee] dark:bg-[#241f14]"
                        : "border-[#1A3A2A]/10 dark:border-[#35513d] hover:bg-[#f7f7f2] dark:hover:bg-[#1b3022]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 rounded-lg bg-[#1A3A2A] px-2 py-1 text-xs font-semibold text-white">
                        {eventDayLabel(item, !ur)}
                      </span>
                      <span>
                        <span className="block font-semibold text-[#1A3A2A] dark:text-[#e7eee9]">
                          {eventTitle(item, !ur)}
                        </span>
                        {eventNote(item, !ur) ? (
                          <span className="mt-0.5 block text-xs text-[#677266] dark:text-[#a8b8aa]">
                            {eventNote(item, !ur)}
                          </span>
                        ) : null}
                        {group.items.length > 1 ? (
                          <span className="mt-1 block text-[11px] font-semibold text-[#8a6838]">
                            {ur ? `${group.items.length} ماخذی ریکارڈ` : `${group.items.length} source records`}
                          </span>
                        ) : null}
                        {groupRegions.length ? (
                          <span className="mt-1 inline-block text-[11px] font-semibold text-[#8a6838]">
                            {groupRegions
                              .map((region) => (ur ? CALENDAR_REGION_LABELS[region] : CALENDAR_REGION_LABELS_EN[region]))
                              .join(ur ? "، " : ", ")}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedGroup ? (
              <div
                className={`mt-4 rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]`}
              >
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-[#1A3A2A] dark:text-[#dfe9e1]">
                    {ur ? "ماخذی تفصیل" : "Source details"}
                  </h3>
                  <p className="mt-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                    {ur ? "یہ تمام ریکارڈ ایک ہی تاریخ اور ایک ہی مناسبت کے تحت محفوظ ہیں؛ اصل ماخذی شناختیں برقرار رکھی گئی ہیں۔" : "These records are preserved under the same date and occasion; the original source identities remain intact."}
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedGroup.items.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                        {source.regions?.length ? (
                          <span>
                            {ur ? "علاقہ:" : "Region:"}{" "}
                            {source.regions
                              .map((region) => (ur ? CALENDAR_REGION_LABELS[region] : CALENDAR_REGION_LABELS_EN[region]))
                              .join(ur ? "، " : ", ")}
                          </span>
                        ) : (
                          <span>{ur ? "علاقہ: عمومی" : "Region: General"}</span>
                        )}
                        <span>{ur ? "محفوظہ" : "Captured"}: {source.sourceCapturedAt}</span>
                      </div>
                      <div className="mt-1 font-semibold text-[#1A3A2A] dark:text-[#e7eee9]">
                        {localizedSourceLabel(source, !ur)}
                      </div>
                      <a
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#3a6a4a] dark:text-[#a8c8b0] hover:underline"
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {ur ? "اصل ماخذ" : "Open source"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className={`${workflowStep === 2 ? "block" : "hidden"} rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6`}>
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A3A2A]/8 text-[#1A3A2A] dark:bg-[#2a5a3a]/50 dark:text-[#8faa93]">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <h2
                  className={`text-xl font-bold text-[#1A3A2A] dark:text-white`}
                >
                  {ur ? "خطیبانہ ذخیرہ" : "Khateeb source index"}
                </h2>
                <p
                  className={`text-sm text-[#5f6f61] dark:text-[#a8c8b0]`}
                >
                  {ur
                    ? "اختیاری مرحلہ: اگر کسی خاص خطیب کے مواد اور زاویے سے استفادہ کرنا ہو تو منتخب کریں، ورنہ آگے بڑھیں۔"
                    : "Optional: choose a speaker if you want that speaker's sourced material and approach, or continue without one."}
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
              <div className="text-sm text-[#5f6f61] dark:text-[#a8c8b0]">
                {preparationMode === "topic"
                  ? `${ur ? "منتخب موضوع:" : "Selected topic:"} ${topic ? topicTitle(topic, ur ? "ur" : "en") : "—"}`
                  : `${ur ? "منتخب مناسبت:" : "Selected occasion:"} ${event ? eventTitle(event, !ur) : "—"}`}
              </div>
              <button
                type="button"
                onClick={skipSpeaker}
                className="rounded-lg border border-[#1A3A2A]/15 px-3 py-2 text-xs font-semibold text-[#425247] hover:border-[#B8935A] dark:border-[#35513d] dark:text-[#b7c8bb]"
              >
                {ur ? "خطیب منتخب کیے بغیر آگے بڑھیں" : "Continue without a speaker"}
              </button>
            </div>

            <label className="relative block mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={ur ? "خطیب یا موضوع تلاش کریں" : "Search speaker or corpus focus"}
                className={`w-full rounded-xl border border-[#1A3A2A]/12 dark:border-[#35513d] bg-transparent py-2.5 px-3 outline-none focus:border-[#B8935A]`}
              />
            </label>

            <div className="space-y-5">
              {(["pk", "in", "ir"] as const).map((region) => {
                const rows = filteredSpeakers.filter(
                  (item) => item.region === region,
                );
                if (!rows.length) return null;
                return (
                  <section key={region}>
                    <h3
                      className={`mb-2 text-sm font-bold text-[#6b776d] dark:text-[#98aa9b]`}
                    >
                      {ur ? REGION_LABELS[region] : SPEAKER_REGION_LABELS_EN[region]}
                    </h3>
                    <div className="space-y-2">
                      {rows.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => chooseSpeaker(item.id)}
                          className={`w-full rounded-xl border px-3.5 py-3 text-start ${
                            selectedSpeaker === item.id
                              ? "border-[#B8935A]/70 bg-[#fbf7ee] dark:bg-[#241f14]"
                              : "border-[#1A3A2A]/10 dark:border-[#35513d]"
                          }`}
                        >
                          <span
                            className={`block font-semibold text-[#1A3A2A] dark:text-[#e7eee9]`}
                          >
                            {speakerName(item, !ur)}
                          </span>
                          <span
                            className={`mt-1 block text-xs text-[#687469] dark:text-[#9fb0a2]`}
                          >
                            {speakerFocus(item, !ur).join(ur ? "، " : ", ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {speaker ? (
              <div className="mt-6 border-t border-[#1A3A2A]/10 pt-5 dark:border-[#35513d]">
                <div className="mb-3">
                  <h3 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                    {ur
                      ? `${speakerName(speaker, false)} — حقیقی مواد`
                      : `${speakerName(speaker, true)} — verified material`}
                  </h3>
                  <p className="mt-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                    {ur
                      ? "یہاں صرف وہی مواد دکھایا جاتا ہے جس کا اصل ماخذ محفوظ ہے۔ عمومی tags کو قول یا خلاصہ بنا کر پیش نہیں کیا جاتا۔"
                      : "Only source-backed material appears here. Generic profile tags are never presented as quotations or speech summaries."}
                  </p>
                </div>

                {speakerIndexedTopics.length ? (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                      {ur ? "اس خطیب کے index شدہ موضوعات" : "Indexed topics for this speaker"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {speakerIndexedTopics.map(({ topic: indexedTopic, records }) => (
                        <button
                          key={indexedTopic.id}
                          type="button"
                          onClick={() => {
                            setTopicQuery("");
                            setSelectedTopicId(indexedTopic.id);
                            setPreparationMode("topic");
                            setWorkflowStep(3);
                          }}
                          className="rounded-full border border-[#1A3A2A]/12 bg-[#F7F5EF] px-3 py-1 text-xs font-semibold text-[#425247] hover:border-[#B8935A] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#b7c8bb]"
                        >
                          {topicTitle(indexedTopic, ur ? "ur" : "en")} · {records.length}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {speakerEvidence.length ? (
                  <div className="space-y-3">
                    {speakerEvidence.map((record) => (
                      <article
                        key={record.id}
                        className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            record.kind === "transcript"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                              : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                          }`}>
                            {record.kind === "transcript"
                              ? (ur ? "مکمل مکتوب خطاب" : "Full transcript")
                              : (ur ? "محفوظ مجموعۂ مجالس" : "Archived collection")}
                          </span>
                          {record.dateLabel ? (
                            <span className="text-[11px] text-[#687469] dark:text-[#9fb0a2]">
                              {record.dateLabel}
                            </span>
                          ) : null}
                        </div>

                        <h4 className="mt-2 font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                          {ur ? record.titleUr : record.titleEn}
                        </h4>
                        <p className="mt-2 text-sm text-[#37443a] dark:text-[#c8d5cc]">
                          {ur ? record.summaryUr : record.summaryEn}
                        </p>

                        {record.materialUr?.length ? (
                          <div className="mt-3 rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]">
                            <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                              {ur ? "خطابت کے لیے تیار مواد" : "Ready-to-use study material"}
                            </div>
                            <div className="mt-2 space-y-2">
                              {(ur ? record.materialUr : record.materialEn ?? []).map((paragraph) => (
                                <p key={paragraph} className="text-sm text-[#303830] dark:text-[#d7e1d9]">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(ur ? record.topicsUr : record.topicsEn).map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-[#1A3A2A]/10 bg-white px-2 py-0.5 text-[11px] text-[#5f6f61] dark:border-[#35513d] dark:bg-[#162a1e] dark:text-[#a8c8b0]"
                            >
                              {label}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3">
                          <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                            {ur ? "اس خطاب/ماخذ سے قابلِ استفادہ نکات" : "Usable points from this source"}
                          </div>
                          <ul className="mt-1 space-y-1 text-sm text-[#303830] dark:text-[#d7e1d9]">
                            {(ur ? record.takeawaysUr : record.takeawaysEn).map((point) => (
                              <li key={point}>• {point}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-3 border-t border-[#1A3A2A]/8 pt-2 text-[11px] text-[#7c877e] dark:border-[#35513d] dark:text-[#8fa294]">
                          {ur ? `حوالہ: ${record.sourceLabelUr}` : `Reference: ${record.sourceLabelEn}`}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#1A3A2A]/15 bg-[#F7F5EF] p-4 text-sm text-[#5f6f61] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#a8c8b0]">
                    {ur
                      ? "اس شخصیت کا verified خطاب/متن ابھی corpus میں ingest نہیں ہوا۔ اس لیے Qalam یہاں کوئی فرضی خلاصہ نہیں دکھا رہا۔"
                      : "No verified transcript or text for this speaker has been ingested yet, so Qalam does not invent a summary."}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {workflowStep === 3 && preparationMode === "occasion" && preparation ? (
          <section className="mt-6 rounded-2xl border border-[#B8935A]/25 bg-white p-5 sm:p-6 shadow-sm dark:border-[#6f5b35] dark:bg-[#162a1e]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B8935A]/10 text-[#8a6838] dark:bg-[#B8935A]/15 dark:text-[#d7bc8a]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-[#1A3A2A] dark:text-white">
                    {ur ? "خطبے کی تیاری" : "Sermon preparation"}
                  </h2>
                  <p className="mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0]">
                    {ur
                      ? "منتخب مناسبت کے لیے فوری علمی و خطیبانہ مواد۔"
                      : "Immediate source-led material for the selected occasion."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#687469] dark:text-[#a8b8aa]">
                  <Clock3 className="h-3.5 w-3.5" />
                  {ur ? "مدت" : "Duration"}
                </span>
                {([20, 30, 45] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDuration(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      duration === value
                        ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                        : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                    }`}
                  >
                    {value} {ur ? "منٹ" : "min"}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={copyPreparation}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#244E38]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {ur ? "مکمل تیاری نقل کریں" : "Copy preparation"}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[#F7F5EF] p-4 dark:bg-[#0e1c15]">
              <h3 className="text-lg font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                {ur ? preparation.titleUr : preparation.titleEn}
              </h3>
              <p className="mt-2 text-sm text-[#445247] dark:text-[#b8c8bb]">
                <strong>{ur ? "مرکزی موضوع:" : "Central theme:"}</strong>{" "}
                {ur ? preparation.themeUr : preparation.themeEn}
              </p>
              <p className="mt-2 text-sm text-[#445247] dark:text-[#b8c8bb]">
                <strong>{ur ? "سوالِ آغاز:" : "Opening question:"}</strong>{" "}
                {ur ? preparation.openingUr : preparation.openingEn}
              </p>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {ur ? "قرآنی بنیاد" : "Qur'anic anchors"}
                </h3>
                {preparation.quran.length ? (
                  <div className="space-y-3">
                    {preparation.quran.map((anchor) => (
                      <article key={anchor.ref} className="rounded-xl border border-[#1A3A2A]/10 p-4 dark:border-[#35513d]">
                        <div className="text-xs font-bold text-[#8a6838]">{anchor.ref}</div>
                        <div dir="rtl" className="mt-2 font-naskh text-lg leading-9 text-[#17251c] dark:text-[#edf4ef]">
                          {anchor.arabic}
                        </div>
                        <p className="mt-2 text-sm text-[#59665b] dark:text-[#a8b8aa]">
                          {ur ? anchor.ur : anchor.en}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-[#1A3A2A]/15 p-4 text-sm text-[#687469] dark:border-[#35513d] dark:text-[#9fb0a2]">
                    {ur
                      ? "اس مناسبت کے لیے مخصوص قرآنی آیات ابھی curated pack میں شامل نہیں؛ نیچے تحقیق کے زاویے سے آغاز کریں۔"
                      : "No event-specific Qur'anic anchors are curated yet; start from the research angles below."}
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {ur ? "علمی بنیاد اور حوالہ" : "Scholarly basis and references"}
                </h3>
                <div className="space-y-3">
                  {preparation.sources.map((source, index) => (
                    <article key={`${preparation.id}-source-${index}`} className="rounded-xl border border-[#1A3A2A]/10 p-4 dark:border-[#35513d]">
                      <div className="font-semibold text-[#1A3A2A] dark:text-[#e7eee9]">
                        {ur ? source.labelUr : source.labelEn}
                      </div>
                      <p className="mt-1 text-sm text-[#59665b] dark:text-[#a8b8aa]">
                        {ur ? source.detailUr : source.detailEn}
                      </p>
                      <div className="mt-2 text-[11px] text-[#7c877e] dark:text-[#8fa294]">
                        {ur
                          ? "یہ حوالہ verification کے لیے محفوظ ہے؛ خطیب کو بنیادی مواد اسی صفحے پر ملنا چاہیے۔"
                          : "This reference is retained for verification; the preacher should receive the core material on this page."}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-[#1A3A2A]/10 p-4 dark:border-[#35513d]">
                <h3 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {ur ? "قابلِ بیان زاویے" : "Speaking angles"}
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[#445247] dark:text-[#b8c8bb]">
                  {(ur ? preparation.anglesUr : preparation.anglesEn).map((angle) => (
                    <li key={angle} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8935A]" />
                      <span>{angle}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#1A3A2A]/10 p-4 dark:border-[#35513d]">
                <h3 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {ur ? `${duration} منٹ کا خاکہ` : `${duration}-minute outline`}
                </h3>
                <div className="mt-3 space-y-2 text-sm text-[#445247] dark:text-[#b8c8bb]">
                  {(
                    ur
                      ? ["تمہید اور سوال", "قرآنی بنیاد", "اصل علمی/تاریخی مواد", "آج کی تطبیق", "نتیجہ اور دعوتِ عمل"]
                      : ["Opening and question", "Qur'anic frame", "Core scholarly/historical material", "Present-day application", "Conclusion and call to action"]
                  ).map((label, index) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-[#F7F5EF] px-3 py-2 dark:bg-[#0e1c15]">
                      <span>{label}</span>
                      <span className="shrink-0 font-semibold text-[#8a6838] dark:text-[#d7bc8a]">
                        {preparationMinutes[index]} {ur ? "منٹ" : "min"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {speaker ? (
              <div className="mt-5 rounded-xl border border-[#1A3A2A]/10 bg-[#f9faf7] p-4 dark:border-[#35513d] dark:bg-[#102019]">
                <h3 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {ur ? "منتخب خطیب سے استفادہ" : "Study the selected speaker"}
                </h3>
                <p className="mt-2 text-sm text-[#445247] dark:text-[#b8c8bb]">
                  <strong>{speakerName(speaker, !ur)}</strong>{" — "}
                  {ur
                    ? "ان کے دستیاب مواد میں موضوع کھولنے کا انداز، دلیل کی ترتیب، روایت سے عملی نتیجہ اور اختتام کی ساخت دیکھیں۔"
                    : "In the available material, study how the topic is opened, evidence is sequenced, narrations are turned into application, and the conclusion is built."}
                </p>
                <p className="mt-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                  {ur ? "متعلقہ میدان:" : "Corpus focus:"}{" "}
                  {speakerFocus(speaker, !ur).join(ur ? "، " : ", ")}
                </p>
                {speakerEvidence.length ? (
                  <p className="mt-2 text-xs font-semibold text-[#3a6a4a] dark:text-[#a8c8b0]">
                    {ur
                      ? `${speakerEvidence.length} تیار source-backed مواد اوپر خطیب کے حصے میں موجود ہے۔`
                      : `${speakerEvidence.length} source-backed ready material record(s) are available in the speaker section above.`}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#8a6838] dark:text-[#d7bc8a]">
                    {ur
                      ? "اس خطیب کا اصل متن ابھی ingest نہیں ہوا، اس لیے یہاں محض خارجی لنک نہیں دیا جا رہا۔"
                      : "This speaker's actual text has not been ingested yet, so no bare external link is presented as material."}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-[#1A3A2A]/15 p-4 text-sm text-[#687469] dark:border-[#35513d] dark:text-[#9fb0a2]">
                {ur
                  ? "کسی خطیب کو منتخب کریں تو یہاں اس کے خطیبانہ ذخیرے سے استفادے کا الگ زاویہ بھی شامل ہو جائے گا۔"
                  : "Select a speaker to add a separate study lens for that speaker's available corpus."}
              </p>
            )}

            {(ur ? preparation.cautionUr : preparation.cautionEn) ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                <strong>{ur ? "تحقیقی احتیاط:" : "Research caution:"}</strong>{" "}
                {ur ? preparation.cautionUr : preparation.cautionEn}
              </div>
            ) : null}
          </section>
        ) : null}

        {workflowStep === 3 && preparationMode === "occasion" ? (
        <section className="mt-6 rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className={`text-xl font-bold text-[#1A3A2A] dark:text-white`}
              >
                {ur ? "تحقیق کی تیاری" : "Research brief"}
              </h2>
              <p
                className={`mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0]`}
              >
                {ur
                  ? "منتخب مناسبت اور خطیبانہ ماخذ کو ایک مختصر تحقیقی خاکے میں جمع کریں۔"
                  : "Combine the selected occasion and speaker into a compact research brief."}
              </p>
            </div>
            <button
              type="button"
              onClick={copyBrief}
              className={`inline-flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38]`}
            >
              <Copy className="h-4 w-4" />
              {ur ? "خاکہ نقل کریں" : "Copy brief"}
            </button>
          </div>
          <pre
            dir={ur ? "rtl" : "ltr"}
            className="mt-4 whitespace-pre-wrap rounded-xl bg-[#F7F5EF] dark:bg-[#0e1c15] p-4 text-sm leading-7 text-[#303830] dark:text-[#d7e1d9] font-sans"
          >
            {brief}
          </pre>
        </section>
        ) : null}
      </div>
    </main>
  );
}
