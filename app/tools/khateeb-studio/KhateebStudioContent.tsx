"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarDays, Clock3, Copy, ExternalLink, PenLine, Printer, Search, Sparkles } from "lucide-react";
import { useLanguage } from "../../lib/language-context";
import {
  CALENDAR_MONTHS_1448,
  SHIA_CALENDAR_1448_EVENTS,
  type IslamicMonthId,
  type ShiaCalendarRegion,
} from "./engine/shiaCalendar";
import { groupCalendarEvents } from "./engine/groupCalendarEvents";
import { KHATEEB_CORPUS, PUBLIC_KHATEEB_CORPUS, REGION_LABELS } from "./engine/khateebCorpus";
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
  durationBrief,
  getSermonPrep,
  outlineMinutes,
  pointsForDuration,
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
import { dossierForDuration } from "./engine/dossierDuration";
import {
  buildMajlisSeries,
  buildMajlisSeriesText,
  type MajlisSeriesLength,
} from "./engine/seriesPlanner";
import { buildFreshMajlisSeries } from "./engine/freshPulpitSeries";
import { checkSeriesOriginality } from "./engine/originalityGuard";
import SessionNotesEditor from "./SessionNotesEditor";
import AllKhateebNotesPanel from "./AllKhateebNotesPanel";
import SessionDeliveryHistory from "./SessionDeliveryHistory";
import CustomSermonWorkspace from "./CustomSermonWorkspace";
import KhateebScriptText from "./KhateebScriptText";
import KhateebPrimaryArabic from "./KhateebPrimaryArabic";
import {
  buildSessionWorkbench,
  buildSessionWorkbenchText,
} from "./engine/sessionWorkbench";
import {
  applyKhateebStudioQuery,
  DEFAULT_KHATEEB_STUDIO_VIEW,
  type KhateebStudioView,
} from "./engine/studioView";
import type { KhateebResearchResult } from "./engine/researchTypes";
import { buildLiveResearchPack } from "./engine/liveResearchPack";
import {
  buildGroundedFullSermon,
  buildGroundedFullSermonText,
} from "./engine/groundedFullSermon";
import { auditGroundedFullSermon } from "./engine/groundedSermonAudit";
import { buildGroundedSermonBlueprintText } from "./engine/groundedSermonBlueprint";
import {
  buildLiveHadithCandidateQueue,
  candidateQueueSummaryEn,
  candidateQueueSummaryUr,
} from "./engine/hadithCandidateQueue";
import {
  hadithRecordForDossierText,
  verifiedHadithForDossierText,
} from "./engine/verifiedHadithCorpus";

const ORIGINALITY_LABEL_UR = {
  titles: "عنوانات کی آزادی",
  structure: "ترتیب کی آزادی",
  wording: "عبارت کی آزادی",
  "source-balance": "ماخذی توازن",
} as const;

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

export default function KhateebStudioContent({
  initialView = DEFAULT_KHATEEB_STUDIO_VIEW,
}: {
  initialView?: KhateebStudioView;
}) {
  const { language, dir } = useLanguage();
  const ur = language === "ur";
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(
    initialView.step === 2 && PUBLIC_KHATEEB_CORPUS.length === 0
      ? 1
      : initialView.step,
  );
  const [preparationMode, setPreparationMode] = useState<"topic" | "occasion">(initialView.mode);
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] =
    useState<ShiaCalendarRegion>(initialView.region);
  const [selectedMonth, setSelectedMonth] =
    useState<IslamicMonthId>(initialView.month);
  const [selectedEvent, setSelectedEvent] = useState(initialView.event);
  const [selectedSpeaker, setSelectedSpeaker] = useState(
    PUBLIC_KHATEEB_CORPUS.some((item) => item.id === initialView.speaker)
      ? initialView.speaker
      : "",
  );
  const [duration, setDuration] = useState<SermonDuration>(initialView.duration);
  const [seriesLength, setSeriesLength] = useState<MajlisSeriesLength>(initialView.series);
  const [seriesLayer, setSeriesLayer] = useState<"fresh" | "research">("fresh");
  const [topicQuery, setTopicQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState(initialView.topic);
  const [liveTopicResearch, setLiveTopicResearch] = useState<KhateebResearchResult | null>(null);
  const [liveTopicLoading, setLiveTopicLoading] = useState(false);
  const [liveTopicError, setLiveTopicError] = useState("");
  const [notesLibraryOpen, setNotesLibraryOpen] = useState(false);
  const [customWorkspaceOpen, setCustomWorkspaceOpen] = useState(false);
  const topicResultRef = useRef<HTMLElement | null>(null);

  const filteredSpeakers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...PUBLIC_KHATEEB_CORPUS];
    return PUBLIC_KHATEEB_CORPUS.filter((item) =>
      speakerSearchText(item).includes(q),
    );
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

  const speaker = PUBLIC_KHATEEB_CORPUS.find(
    (item) => item.id === selectedSpeaker,
  );
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

  useEffect(() => {
    const query = topicQuery.trim();
    if (query.length < 3 || topicResults.length > 0) {
      setLiveTopicResearch(null);
      setLiveTopicLoading(false);
      setLiveTopicError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLiveTopicLoading(true);
      setLiveTopicError("");
      try {
        const response = await fetch("/api/khateeb/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            locale: ur ? "ur" : "en",
            maxEvidence: 24,
          }),
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`research-http-${response.status}`);
        const result = (await response.json()) as KhateebResearchResult;
        if (!controller.signal.aborted) setLiveTopicResearch(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLiveTopicResearch(null);
        setLiveTopicError(
          ur
            ? "براہِ راست تحقیق اس وقت مکمل نہیں ہو سکی؛ دوبارہ کوشش کریں۔"
            : "Live research could not be completed right now. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setLiveTopicLoading(false);
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [topicQuery, topicResults.length, ur]);
  const liveEShiaVerifiedCount = liveTopicResearch?.evidence.filter(
    (item) => item.status === "verified" && item.providerId === "eshia-library",
  ).length ?? 0;
  const liveEShiaLeadCount = liveTopicResearch?.evidence.filter(
    (item) => item.status === "source-lead" && item.providerId === "eshia-library",
  ).length ?? 0;
  const localVerifiedCount = Math.max(
    0,
    (liveTopicResearch?.verifiedCount ?? 0) - liveEShiaVerifiedCount,
  );
  const liveEShiaSourceLeads = liveTopicResearch?.evidence.filter(
    (item) => item.status === "source-lead" && item.providerId === "eshia-library",
  ) ?? [];
  const liveHadithCandidateQueue =
    liveTopicResearch?.hadithCandidates ??
    buildLiveHadithCandidateQueue(liveEShiaSourceLeads);
  const liveThemeMap = Array.from(
    liveEShiaSourceLeads.reduce((map, item) => {
      for (const theme of item.themesUr ?? []) {
        const current = map.get(theme) ?? [];
        current.push(item.titleUr);
        map.set(theme, current);
      }
      return map;
    }, new Map<string, string[]>()),
  ).map(([theme, titles]) => ({
    theme,
    titles: Array.from(new Set(titles)),
  }));
  const liveResearchPack = liveTopicResearch
    ? buildLiveResearchPack(liveTopicResearch, duration)
    : null;
  const groundedLiveBlueprintText =
    liveResearchPack?.ready
      ? buildGroundedSermonBlueprintText(
          liveResearchPack,
          ur ? "ur" : "en",
        )
      : "";

  const topic = topicResults.find((item) => item.id === selectedTopicId)
    ?? topicResults[0];
  const rawTopicDossier = topic ? getTopicDossier(topic.id) : null;
  const topicDossier = rawTopicDossier
    ? dossierForDuration(rawTopicDossier, duration)
    : null;
  const topicDossierText = topicDossier
    ? buildDossierText(topicDossier, ur ? "ur" : "en")
    : "";
  const groundedFullSermon = topic
    ? buildGroundedFullSermon(topic.id, duration, ur ? "ur" : "en")
    : null;
  const groundedFullSermonText = groundedFullSermon
    ? buildGroundedFullSermonText(groundedFullSermon, ur ? "ur" : "en")
    : "";
  const groundedFullSermonAudit = groundedFullSermon
    ? auditGroundedFullSermon(groundedFullSermon)
    : null;
  const researchSeries = rawTopicDossier
    ? buildMajlisSeries(rawTopicDossier, seriesLength)
    : null;
  const freshSeries = rawTopicDossier
    ? buildFreshMajlisSeries(rawTopicDossier, seriesLength)
    : null;
  const topicSeries =
    seriesLength > 1 && seriesLayer === "fresh" && freshSeries
      ? freshSeries
      : researchSeries;
  const displaySeries = topicSeries
    ? {
        ...topicSeries,
        sessions: topicSeries.sessions.map((session) => ({
          ...session,
          materialUr: pointsForDuration(session.materialUr, duration),
          materialEn: pointsForDuration(session.materialEn, duration),
          quranUr: session.quranUr ? pointsForDuration(session.quranUr, duration) : undefined,
          quranEn: session.quranEn ? pointsForDuration(session.quranEn, duration) : undefined,
        })),
      }
    : null;
  const topicSeriesText = displaySeries
    ? `${durationBrief(duration, ur ? "ur" : "en")}\n\n${buildMajlisSeriesText(displaySeries, ur ? "ur" : "en")}`
    : "";
  const originalityReport =
    seriesLength > 1 && freshSeries && researchSeries
      ? checkSeriesOriginality(freshSeries, researchSeries)
      : null;
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
    const text =
      seriesLength > 1 && topicSeriesText
        ? topicSeriesText
        : topicDossierText || topicPreparationText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable.
    }
  };

  const printPreparation = () => {
    window.print();
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
    setSelectedSpeaker("");
    setWorkflowStep(PUBLIC_KHATEEB_CORPUS.length > 0 ? 2 : 3);
  };

  const chooseTopic = (topicId: string) => {
    setSelectedTopicId(topicId);
    setPreparationMode("topic");
    setSelectedSpeaker("");
    setWorkflowStep(3);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        topicResultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
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

  useEffect(() => {
    const next = applyKhateebStudioQuery(window.location.search, {
      step: workflowStep,
      mode: preparationMode,
      topic: selectedTopicId,
      speaker: selectedSpeaker,
      month: selectedMonth,
      region: selectedRegion,
      event: selectedEvent,
      duration,
      series: seriesLength,
    });
    const current = window.location.search.replace(/^\?/, "");
    if (next === current) return;
    const url = next ? `${window.location.pathname}?${next}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [
    workflowStep,
    preparationMode,
    selectedTopicId,
    selectedSpeaker,
    selectedMonth,
    selectedRegion,
    selectedEvent,
    duration,
    seriesLength,
  ]);

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

        .khateeb-muhammadi-quranic {
          font-family: "Muhammadi Quranic", "Al Qalam Quran Majeed", "Noto Naskh Arabic", serif !important;
          font-size: 1.08em;
          line-height: 1.85;
          unicode-bidi: isolate;
        }

        .khateeb-studio-ur {
          font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          font-size: 1.22rem;
          line-height: 2.18;
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
          line-height: 2.12;
        }

        .khateeb-studio-ur .text-sm {
          font-size: 1.12rem;
          line-height: 2.02;
        }

        .khateeb-studio-ur .text-xs {
          font-size: 1rem;
          line-height: 1.9;
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
          font-size: 1.12rem;
        }

        .khateeb-studio-ur pre {
          font-size: 1.12rem;
          line-height: 2.15;
        }

        @media print {
          @page {
            size: A4;
            margin: 16mm 14mm;
          }

          body * {
            visibility: hidden !important;
          }

          #khateeb-print-area,
          #khateeb-print-area * {
            visibility: visible !important;
          }

          #khateeb-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }

          #khateeb-print-area .khateeb-no-print {
            display: none !important;
          }

          /*
           * Print flow must stay continuous. Avoiding every card/container
           * forces large blocks onto the next page and creates half-empty or
           * nearly blank sheets. Only protect small semantic units that should
           * remain together; larger sections are allowed to split naturally.
           */
          #khateeb-print-area article,
          #khateeb-print-area section,
          #khateeb-print-area .rounded-xl,
          #khateeb-print-area .rounded-lg {
            break-inside: auto;
            page-break-inside: auto;
            box-shadow: none !important;
          }

          #khateeb-print-area h1,
          #khateeb-print-area h2,
          #khateeb-print-area h3,
          #khateeb-print-area h4,
          #khateeb-print-area h5,
          #khateeb-print-area h6,
          #khateeb-print-area summary {
            break-after: avoid-page;
            page-break-after: avoid;
          }

          #khateeb-print-area h1 + *,
          #khateeb-print-area h2 + *,
          #khateeb-print-area h3 + *,
          #khateeb-print-area h4 + *,
          #khateeb-print-area h5 + *,
          #khateeb-print-area h6 + *,
          #khateeb-print-area summary + * {
            break-before: avoid-page;
            page-break-before: avoid;
          }

          #khateeb-print-area .khateeb-print-keep,
          #khateeb-print-area blockquote {
            break-inside: avoid-page;
            page-break-inside: avoid;
          }

          #khateeb-print-area p,
          #khateeb-print-area li {
            orphans: 3;
            widows: 3;
          }

          #khateeb-print-area a {
            color: black !important;
            text-decoration: none !important;
          }

          .khateeb-muhammadi-quranic {
            color: black !important;
          }
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

          <div className="mx-auto mt-6 max-w-3xl text-start">
            <div className="mb-2 text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
              {ur ? "مجلس کا موضوع تلاش کریں" : "Search your sermon topic"}
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#748078]" />
              <input
                value={topicQuery}
                onFocus={() => {
                  setPreparationMode("topic");
                  setWorkflowStep(1);
                }}
                onChange={(event) => {
                  setTopicQuery(event.target.value);
                  setPreparationMode("topic");
                  setWorkflowStep(1);
                }}
                placeholder={
                  ur
                    ? "مثلاً: والدین، برسی، امامت، دعا، صبر، نوجوان، موت..."
                    : "e.g. parents, anniversary, Imamate, dua, patience, youth, death..."
                }
                className="w-full rounded-2xl border border-[#B8935A]/45 bg-white py-4 ps-12 pe-4 text-base shadow-sm outline-none transition focus:border-[#B8935A] focus:ring-2 focus:ring-[#B8935A]/15 dark:border-[#6f5b35] dark:bg-[#162a1e] dark:text-white"
              />
            </label>
            {topicQuery.trim() ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topicResults.length ? (
                  topicResults.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseTopic(item.id)}
                      className="group flex items-center gap-2 rounded-xl border border-[#B8935A]/35 bg-[#fbf7ee] px-4 py-2 text-sm text-[#6f5730] shadow-sm transition hover:border-[#B8935A] hover:bg-[#f7efdf] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#e2c895]"
                    >
                      <span>{topicTitle(item, ur ? "ur" : "en")}</span>
                      <span className="text-xs font-bold opacity-70 group-hover:opacity-100">
                        {ur ? "مواد کھولیں ←" : "Open material →"}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="w-full space-y-3">
                    <div className="rounded-xl border border-[#B8935A]/25 bg-[#fbf7ee] px-4 py-3 text-sm text-[#5f6f61] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#d7bc8a]">
                      {liveTopicLoading
                        ? (ur ? "ای شیعہ اور علمی ذخیرے میں براہِ راست تحقیق جاری ہے..." : "Searching eShia and the research corpus...")
                        : (ur ? "یہ موضوع تیار فہرست میں نہیں؛ خطیب اسٹوڈیو اس پر براہِ راست تحقیق کر رہا ہے۔" : "This topic is not prebuilt; Khateeb Studio is researching it live.")}
                    </div>

                    {liveTopicError ? (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                        {liveTopicError}
                      </p>
                    ) : null}

                    {(liveTopicResearch?.verifiedCount ?? 0) > 0 || (liveTopicResearch?.sourceLeadCount ?? 0) > 0 ? (
                      <div className="space-y-3 rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                              {liveEShiaLeadCount > 0 || liveEShiaVerifiedCount > 0
  ? (ur ? "براہِ راست ماخذی تحقیق" : "Live source research")
  : (ur ? "متعلقہ محفوظ تحقیقی مواد" : "Related verified local material")}
                            </h4>
                            <p className="mt-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                              {liveEShiaLeadCount > 0 || liveEShiaVerifiedCount > 0
  ? (ur
      ? "ای شیعہ کے متعلقہ اصل صفحات مل گئے ہیں۔ صفحاتی متن بطور ماخذی سراغ دکھایا جا رہا ہے؛ اسے ابھی لفظ بہ لفظ مصدقہ روایت یا حتمی اقتباس نہ سمجھیں۔"
      : "Relevant eShia source pages were found. Page text is shown as a source lead, not yet as a quote-verified narration.")
  : (ur
      ? "یہ مواد براہِ راست ای شیعہ سے نہیں ملا؛ قریب ترین محفوظ موضوع سے مصدقہ مواد دکھایا جا رہا ہے۔"
      : "No live eShia hit was found; this is verified material from the closest local topic.")}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#F7F5EF] px-2.5 py-1 text-xs font-semibold text-[#6b776d] dark:bg-[#0e1c15] dark:text-[#98aa9b]">
                            {liveEShiaLeadCount > 0 || liveEShiaVerifiedCount > 0
  ? (ur ? `${liveEShiaLeadCount + liveEShiaVerifiedCount} ای شیعہ ماخذی صفحات، ${localVerifiedCount} محفوظ مصدقہ` : `${liveEShiaLeadCount + liveEShiaVerifiedCount} eShia source pages, ${localVerifiedCount} verified local`)
  : (ur ? `${localVerifiedCount} محفوظ مصدقہ اندراج` : `${localVerifiedCount} verified local records`)}
                          </span>
                        </div>

                        {liveHadithCandidateQueue.length > 0 ? (
                          <div className="rounded-xl border border-[#31513a]/20 bg-[#f5faf6] p-4 dark:border-[#45604b] dark:bg-[#122319]">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                  {ur ? "ممکنہ روایات — تصدیقی قطار" : "Possible narrations — verification queue"}
                                </h5>
                                <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                                  {ur
                                    ? candidateQueueSummaryUr(liveHadithCandidateQueue)
                                    : candidateQueueSummaryEn(liveHadithCandidateQueue)}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#47654d] dark:bg-[#162a1e] dark:text-[#b9d4bf]">
                                {liveHadithCandidateQueue.length} {ur ? "زیرِ جانچ" : "to review"}
                              </span>
                            </div>

                            <div className="mt-3 space-y-3">
                              {liveHadithCandidateQueue.slice(0, 5).map((candidate, index) => (
                                <article
                                  key={candidate.id}
                                  className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1A3A2A] text-[11px] font-bold text-white">
                                        {index + 1}
                                      </span>
                                      <strong className="text-xs text-[#1A3A2A] dark:text-[#e7eee9]">
                                        {candidate.status === "candidate"
                                          ? (ur ? "مضبوط امیدوار" : "Strong candidate")
                                          : (ur ? "مزید سیاق درکار" : "Needs more context")}
                                      </strong>
                                    </div>
                                    <span className="rounded-full bg-[#F7F5EF] px-2 py-1 text-[11px] text-[#687469] dark:bg-[#0e1c15] dark:text-[#9fb0a2]">
                                      {ur ? "ترجیح" : "score"} {candidate.score}
                                    </span>
                                  </div>

                                  <div dir="rtl" className="mt-3 rounded-lg bg-[#F7F5EF] px-3 py-2 text-sm leading-8 text-[#1A3A2A] dark:bg-[#0e1c15] dark:text-[#e7eee9]">
                                    <KhateebScriptText
                                      text={candidate.exactPageText}
                                      forcePersian={/[پچژگک]/u.test(candidate.exactPageText)}
                                      forceArabic={!/[پچژگک]/u.test(candidate.exactPageText)}
                                    />
                                  </div>

                                  <div className="mt-2 text-xs leading-6 text-[#6f5730] dark:text-[#d7bc8a]">
                                    <strong>{ur ? "صفحاتی حوالہ: " : "Page reference: "}</strong>
                                    {ur ? candidate.citationUr : candidate.citationEn}
                                  </div>

                                  <div className="mt-2 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                                    {ur
                                      ? "یہ صرف تصدیقی امیدوار ہے۔ امام/راوی، باب، حدیث نمبر اور اصل ماخذ کی براہِ راست جانچ کے بغیر اسے روایت کے طور پر نقل نہ کریں۔"
                                      : "This is only a verification candidate. Do not quote it as a hadith until attribution, chapter/hadith number, and the direct source are checked."}
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {ur && liveThemeMap.length > 0 ? (
                          <div className="rounded-xl border border-[#B8935A]/25 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                تحقیقی نقشہ
                              </h5>
                              <span className="text-xs text-[#687469] dark:text-[#9fb0a2]">
                                {liveThemeMap.length} موضوعاتی محور
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {liveThemeMap.map(({ theme, titles }) => (
                                <div
                                  key={theme}
                                  className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]"
                                >
                                  <strong className="text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                                    {theme}
                                  </strong>
                                  <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                                    {titles.length} متعلقہ ماخذی صفحہ{titles.length === 1 ? "" : "ات"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                          {([20, 30, 45] as SermonDuration[]).map((minutes) => (
                            <button
                              key={minutes}
                              type="button"
                              onClick={() => setDuration(minutes)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                duration === minutes
                                  ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                                  : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                              }`}
                            >
                              {minutes} {ur ? "منٹ" : "min"}
                            </button>
                          ))}
                        </div>

                        {liveResearchPack && liveResearchPack.evidence.length > 0 ? (
                          liveResearchPack.ready ? (
                            <div className="rounded-xl border border-[#B8935A]/30 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                    {ur
                                      ? `${duration} منٹ کا مصدقہ منبری خاکہ`
                                      : `${duration}-minute verified sermon blueprint`}
                                  </h5>
                                  <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                                    {ur
                                      ? "اصل نصوص اور علمی توضیحات ماخذی اندراجات سے ہیں؛ منبری ربط اور اختتام واضح طور پر تدوینی حصے ہیں۔"
                                      : "Primary texts and scholarly explanations are source-grounded; transitions and closing remain clearly editorial."}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#6b776d] dark:bg-[#162a1e] dark:text-[#98aa9b]">
                                    {liveResearchPack.evidence.length} {ur ? "مصدقہ اندراج" : "verified records"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(groundedLiveBlueprintText);
                                      } catch {
                                        // Clipboard may be unavailable.
                                      }
                                    }}
                                    className="rounded-lg bg-[#1A3A2A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#244E38]"
                                  >
                                    {ur ? "مصدقہ خاکہ نقل کریں" : "Copy verified blueprint"}
                                  </button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                  [ur ? "قرآنی بنیاد" : "Qur'an", liveResearchPack.profile.quran],
                                  [ur ? "مصدقہ روایات" : "Hadith", liveResearchPack.profile.hadith],
                                  [ur ? "علمی توضیح" : "Scholar", liveResearchPack.profile.scholar],
                                  [ur ? "بنیادی ماخذ" : "Core evidence", liveResearchPack.profile.core],
                                ].map(([label, count]) => (
                                  <div
                                    key={String(label)}
                                    className="rounded-lg border border-[#1A3A2A]/10 bg-white px-3 py-2 dark:border-[#35513d] dark:bg-[#162a1e]"
                                  >
                                    <div className="text-[11px] text-[#687469] dark:text-[#9fb0a2]">
                                      {label}
                                    </div>
                                    <div className="mt-1 text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                      {count}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {liveResearchPack.sections.map((section) => (
                                  <div
                                    key={section.id}
                                    className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <strong className="text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                                          {ur ? section.headingUr : section.headingEn}
                                        </strong>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          section.role === "source-grounded"
                                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                        }`}>
                                          {section.role === "source-grounded"
                                            ? (ur ? "ماخذی بنیاد" : "Source-grounded")
                                            : (ur ? "تدوینی ربط" : "Editorial bridge")}
                                        </span>
                                      </div>
                                      <span className="text-xs text-[#8a6838] dark:text-[#d7bc8a]">
                                        {section.minutes} {ur ? "منٹ" : "min"}
                                      </span>
                                    </div>
                                    {section.evidenceIds.length ? (
                                      <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                                        {ur
                                          ? `${section.evidenceIds.length} ماخذی اندراج اس حصے کے لیے منتخب`
                                          : `${section.evidenceIds.length} source records selected for this section`}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                              <strong>
                                {ur
                                  ? `${duration} منٹ کا مصدقہ منبری خاکہ ابھی فعال نہیں۔`
                                  : `The ${duration}-minute verified sermon blueprint is not ready yet.`}
                              </strong>
                              <div className="mt-2 space-y-1">
                                {liveResearchPack.blockers.map((blocker) => (
                                  <p key={blocker.code}>
                                    • {ur ? blocker.messageUr : blocker.messageEn}
                                  </p>
                                ))}
                              </div>
                              <p className="mt-2 text-xs">
                                {ur
                                  ? `مصدقہ اندراج: ${liveResearchPack.profile.verified}؛ بنیادی روایت/علمی توضیح: ${liveResearchPack.profile.core}۔`
                                  : `Verified records: ${liveResearchPack.profile.verified}; core hadith/scholar records: ${liveResearchPack.profile.core}.`}
                              </p>
                            </div>
                          )
                        ) : null}

                        {!liveResearchPack?.evidence.length && liveEShiaSourceLeads.length > 0 ? (
                          <div className="rounded-xl border border-dashed border-[#B8935A]/35 bg-[#fbf7ee] px-4 py-3 text-sm leading-7 text-[#6f5730] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#d7bc8a]">
                            {ur
                              ? "یہ ماخذی صفحات تحقیق کے لیے مفید ہیں، مگر ان کے اصل اقتباسات کی لفظ بہ لفظ تصدیق ابھی باقی ہے۔ مصدقہ اصل اقتباسات تیار ہونے کے بعد ہی 20/30/45 منٹ کا منبری پیک فعال ہوگا۔"
                              : "These source pages are useful research leads, but their exact quotations are not yet verified word-for-word. Timed sermon packs activate only after exact quotations are verified."}
                          </div>
                        ) : null}

                        {(
                          liveResearchPack?.evidence.length
                            ? liveResearchPack.evidence
                            : liveEShiaSourceLeads
                        )
                          .slice(0, duration === 20 ? 5 : duration === 30 ? 8 : 12)
                          .map((item) => (
                            <article
                              key={item.id}
                              className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong className="text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                                  {ur ? item.titleUr : item.titleEn}
                                </strong>
                                {item.providerId === "eshia-library" ? (
                                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#8a6838] dark:bg-[#162a1e] dark:text-[#d7bc8a]">
                                    {ur ? "ای شیعہ سے" : "eShia"}
                                  </span>
                                ) : item.kind === "hadith" && item.status === "verified" ? (
                                  <span className="rounded-full border border-emerald-700/20 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/25 dark:bg-[#162a1e] dark:text-emerald-300">
                                    {ur ? "لفظ بہ لفظ مصدقہ" : "Exact text verified"}
                                  </span>
                                ) : null}
                              </div>
                              {item.providerId === "eshia-library" ? (
                                <div className="mt-3 space-y-3">
                                  {item.sourceExcerpt ? (
                                    <div className="rounded-lg border border-[#31513a]/20 bg-white p-3 dark:border-[#45604b] dark:bg-[#162a1e]">
                                      <div className="text-xs font-bold text-[#31513a] dark:text-[#b9d4bf]">
                                        {ur
                                          ? "صفحے سے لفظ بہ لفظ اقتباس — ابھی روایت کے طور پر مصدقہ نہیں"
                                          : "Verbatim page excerpt — not yet verified as a narration"}
                                      </div>
                                      <div dir="rtl" className="mt-2 text-sm leading-8 text-[#1A3A2A] dark:text-[#e7eee9]">
                                        <KhateebScriptText
                                          text={item.sourceExcerpt}
                                          forcePersian={/[پچژگک]/u.test(item.sourceExcerpt)}
                                          forceArabic={!/[پچژگک]/u.test(item.sourceExcerpt)}
                                        />
                                      </div>
                                    </div>
                                  ) : null}
                                  <div dir="rtl" className="rounded-lg bg-white px-4 py-3 text-sm leading-8 text-[#1A3A2A] dark:bg-[#162a1e] dark:text-[#e7eee9]">
                                    <KhateebScriptText
                                      text={ur ? item.detailUr : item.detailEn}
                                      forcePersian={/[پچژگک]/u.test(ur ? item.detailUr : item.detailEn)}
                                      forceArabic={!/[پچژگک]/u.test(ur ? item.detailUr : item.detailEn)}
                                    />
                                  </div>
                                </div>
                              ) : item.arabic ? (
                                <>
                                  <div dir="rtl" className="mt-3 rounded-lg bg-white px-4 py-3 text-sm leading-8 text-[#1A3A2A] dark:bg-[#162a1e] dark:text-[#e7eee9]">
                                    <KhateebScriptText text={item.arabic} forceArabic />
                                  </div>
                                  {item.kind === "quran" || item.kind === "hadith" ? (
                                    <div className="mt-3 rounded-lg border border-[#B8935A]/20 bg-white px-3 py-2 text-sm leading-7 text-[#445247] dark:border-[#6f5b35] dark:bg-[#162a1e] dark:text-[#b8c8bb]">
                                      <strong className="me-2 text-[#6f5730] dark:text-[#d7bc8a]">
                                        {ur ? "موضوعی ربط:" : "Topic link:"}
                                      </strong>
                                      {ur ? item.detailUr : item.detailEn}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <p className="mt-2 text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                                  {ur ? item.detailUr : item.detailEn}
                                </p>
                              )}
                              {ur && item.themesUr?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.themesUr.map((theme) => (
                                    <span key={theme} className="rounded-full border border-[#B8935A]/25 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6f5730] dark:border-[#6f5b35] dark:bg-[#162a1e] dark:text-[#d7bc8a]">
                                      {theme}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              <div className="mt-3 text-xs leading-6 text-[#6f5730] dark:text-[#d7bc8a]">
                                <strong>{ur ? "حوالہ: " : "Reference: "}</strong>
                                {ur ? item.citationUr : item.citationEn}
                              </div>
                            </article>
                          ))}
                      </div>
                    ) : liveTopicResearch && !liveTopicLoading ? (
                      <p className="rounded-xl border border-dashed border-[#1A3A2A]/15 bg-[#F7F5EF] px-4 py-3 text-sm text-[#5f6f61] dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#a8c8b0]">
                        {ur
                          ? "اس تلاش میں ابھی قابلِ پیشکش اصل متن نہیں ملا؛ قلم کوئی عبارت یا حوالہ گھڑ کر شامل نہیں کرے گا۔"
                          : "No source-grounded text was found in this search; Qalam will not invent a quotation or citation."}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                {ur
                  ? "عنوان لکھیں؛ متعلقہ تیار موضوعات فوراً سامنے آجائیں گے۔"
                  : "Type a title and matching prepared topics will appear immediately."}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCustomWorkspaceOpen((value) => !value);
                setNotesLibraryOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#244E38]"
            >
              <PenLine className="h-4 w-4" />
              {ur ? "میری مجلس / میرا موضوع" : "My sermon / my topic"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNotesLibraryOpen((value) => !value);
                setCustomWorkspaceOpen(false);
              }}
              className="inline-flex items-center rounded-xl border border-[#B8935A]/35 bg-white px-4 py-2 text-sm font-semibold text-[#6f5730] shadow-sm hover:bg-[#fbf7ee] dark:border-[#6f5b35] dark:bg-[#162a1e] dark:text-[#e2c895]"
            >
              {ur ? "میرے تمام نوٹس" : "My notes library"}
            </button>
          </div>
        </header>

        {notesLibraryOpen ? (
          <AllKhateebNotesPanel
            ur={ur}
            onClose={() => setNotesLibraryOpen(false)}
          />
        ) : null}

        {customWorkspaceOpen ? (
          <div className="mb-8">
            <CustomSermonWorkspace locale={ur ? "ur" : "en"} />
          </div>
        ) : null}

        <nav className="mb-6 rounded-2xl border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]" aria-label={ur ? "تیاری کے مراحل" : "Preparation steps"}>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              [1, ur ? "1 — موضوع یا مناسبت" : "1 — Topic or occasion"],
              ...(PUBLIC_KHATEEB_CORPUS.length > 0
                ? ([[2, ur ? "2 — خطیب (اختیاری)" : "2 — Speaker (optional)"]] as const)
                : []),
              [3, ur ? "2 — تیار مواد" : "2 — Preparation"],
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

        <section
          ref={topicResultRef}
          id={workflowStep === 3 && preparationMode === "topic" ? "khateeb-print-area" : "khateeb-topic-result"}
          className={`${workflowStep === 1 && preparationMode === "topic" ? "block" : workflowStep === 3 && preparationMode === "topic" ? "block" : "hidden"} scroll-mt-6 mb-6 rounded-2xl border border-[#B8935A]/30 bg-white p-5 sm:p-6 shadow-sm dark:border-[#6f5b35] dark:bg-[#162a1e]`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A3A2A]/8 text-[#1A3A2A] dark:bg-[#2a5a3a]/50 dark:text-[#8faa93]">
                <PenLine className="h-5 w-5" />
              </span>
              {workflowStep === 3 && topic ? (
                <div>
                  <h2 className="text-xl font-bold text-[#1A3A2A] dark:text-white">
                    {ur ? "آپ کا منتخب موضوع" : "Selected topic"}
                  </h2>
                  <h3 className="mt-2 text-lg font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                    {topicTitle(topic, ur ? "ur" : "en")}
                  </h3>
                  <p className="mt-1 text-sm text-[#5f6f61] dark:text-[#a8c8b0]">
                    {ur
                      ? "متعلقہ تحقیقی اور منبری مواد نیچے کھل گیا ہے۔"
                      : "The relevant research and pulpit material is open below."}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="khateeb-no-print flex items-center gap-2">
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
          <p className="mt-3 rounded-xl border border-[#B8935A]/25 bg-[#fbf7ee] px-4 py-3 text-sm leading-7 text-[#5a4830] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#e2c895]">
            {durationBrief(duration, ur ? "ur" : "en")}
          </p>

          <div className="khateeb-no-print mt-4 rounded-xl border border-[#B8935A]/25 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
            <div className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
              {ur ? "ایک مجلس یا مکمل سلسلہ؟" : "One sermon or a complete series?"}
            </div>
            <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
              {ur
                ? "اسی موضوع پر ایک مجلس، سہ روزہ، خمسہ یا پورا عشرہ تیار کیا جا سکتا ہے۔"
                : "Prepare one sermon, a 3-session series, a 5-session series, or a full 10-session series on this topic."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {([
                [1, ur ? "ایک مجلس" : "Single sermon"],
                [3, ur ? "سہ روزہ مجالس" : "3-session series"],
                [5, ur ? "خمسہ مجالس" : "5-session series"],
                [10, ur ? "عشرۂ مجالس" : "10-session series"],
              ] as const).map(([count, label]) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSeriesLength(count)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    seriesLength === count
                      ? "border-[#1A3A2A] bg-[#1A3A2A] text-white shadow-sm dark:border-[#8faa93] dark:bg-[#35513d]"
                      : "border-[#B8935A]/25 bg-white text-[#425247] hover:border-[#B8935A] dark:border-[#6f5b35] dark:bg-[#162a1e] dark:text-[#b7c8bb]"
                  }`}
                >
                  <span className="block">{label}</span>
                  <span className={`mt-1 block text-xs font-normal ${
                    seriesLength === count ? "text-white/80" : "text-[#7a857c] dark:text-[#9fb0a2]"
                  }`}>
                    {count === 1
                      ? (ur ? "ایک نشست کی مکمل تیاری" : "Complete preparation for one sitting")
                      : count === 3
                        ? (ur ? "تین مربوط مجالس" : "Three connected sessions")
                        : count === 5
                          ? (ur ? "پانچ مرحلوں کا علمی سفر" : "Five-stage scholarly journey")
                          : (ur ? "دس مربوط مجالس کا عشرہ" : "Ten connected sessions")}
                  </span>
                </button>
              ))}
            </div>
            {seriesLength > 1 ? (
              <>
                <p className="mt-2 text-xs text-[#687469] dark:text-[#9fb0a2]">
                  {ur
                    ? "ہر مجلس پچھلی مجلس پر تعمیر ہوگی؛ ایک ہی مضمون کو کئی بار دہرانے کے بجائے علمی سفر مرحلہ وار آگے بڑھے گا۔"
                    : "Each session builds on the previous one; the subject advances instead of repeating the same sermon."}
                </p>
                <div className="mt-3 border-t border-[#1A3A2A]/10 pt-3 dark:border-[#35513d]">
                  <div className="mb-2 text-xs font-bold text-[#687469] dark:text-[#9fb0a2]">
                    {ur ? "مواد کس صورت میں چاہیے؟" : "How should the series use its sources?"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSeriesLayer("fresh")}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        seriesLayer === "fresh"
                          ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                          : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                      }`}
                    >
                      {ur ? "نئی منبری تشکیل" : "Fresh pulpit composition"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeriesLayer("research")}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        seriesLayer === "research"
                          ? "border-[#1A3A2A] bg-[#1A3A2A] text-white dark:border-[#8faa93] dark:bg-[#35513d]"
                          : "border-[#1A3A2A]/12 text-[#425247] dark:border-[#35513d] dark:text-[#b7c8bb]"
                      }`}
                    >
                      {ur ? "تحقیقی نقشہ" : "Research map"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#687469] dark:text-[#9fb0a2]">
                    {ur
                      ? seriesLayer === "fresh"
                        ? "اصل ماخذ علمی پشت پر رہیں گے، مگر سوال، ترتیب، مثال اور منبری بہاؤ نئی تشکیل ہوگا؛ کسی عالم کی مجلس دوبارہ نہیں سنائی جائے گی۔"
                        : "یہ سطح دکھاتی ہے کہ اصل اہلِ علم نے موضوع کو کس علمی ترتیب اور کس ماخذ سے کھولا؛ اسے بعینہٖ منبر پر پڑھنے کے لیے نہیں بنایا گیا۔"
                      : seriesLayer === "fresh"
                        ? "Sources remain behind the argument, while questions, sequence, examples, and pulpit flow are newly composed."
                        : "This layer maps how the source scholars developed the topic; it is for study and verification, not verbatim delivery."}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {!topic ? (
            <p className="mt-4 rounded-xl bg-[#F7F5EF] p-4 text-sm text-[#5f6f61] dark:bg-[#0e1c15] dark:text-[#a8c8b0]">
              {ur ? "اس تلاش سے ابھی کوئی محفوظ موضوع نہیں ملا۔" : "No stored topic matches this search yet."}
            </p>
          ) : workflowStep === 3 ? (
            <div className="mt-5 rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]">
              <div className="mb-4 rounded-xl border border-[#B8935A]/25 bg-white px-4 py-3 dark:border-[#6f5b35] dark:bg-[#162a1e]">
                <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                  {ur ? "آپ کا منتخب موضوع" : "Selected topic"}
                </div>
                <div className="mt-1 font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                  {topicTitle(topic, ur ? "ur" : "en")}
                </div>
                <p className="mt-1 text-xs text-[#687469] dark:text-[#9fb0a2]">
                  {ur
                    ? "متعلقہ تحقیقی اور منبری مواد نیچے کھل گیا ہے؛ خطیب کا انتخاب اختیاری ہے۔"
                    : "The relevant research and pulpit material is open below; choosing a speaker is optional."}
                </p>
              </div>
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
                <div className="khateeb-no-print flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={printPreparation}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#1A3A2A]/15 bg-white px-4 py-2 text-sm font-semibold text-[#1A3A2A] hover:border-[#B8935A] dark:border-[#4b594f] dark:bg-[#162a1e] dark:text-[#d7e1d9]"
                  >
                    <Printer className="h-4 w-4" />
                    {ur ? "مجلس پرنٹ کریں / PDF محفوظ کریں" : "Print / Save PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={copyTopicPreparation}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38]"
                  >
                    <Copy className="h-4 w-4" />
                    {seriesLength > 1
                      ? (ur
                          ? seriesLayer === "fresh"
                            ? "نئی تشکیل نقل کریں"
                            : "تحقیقی نقشہ نقل کریں"
                          : seriesLayer === "fresh"
                            ? "Copy fresh composition"
                            : "Copy research map")
                      : topicDossier
                      ? (ur ? "تحقیقی دستاویز نقل کریں" : "Copy research dossier")
                      : (ur ? "مکمل تیاری نقل کریں" : "Copy full preparation")}
                  </button>
                </div>
              </div>

              {topicDossier && seriesLength > 1 && topicSeries ? (
                <div className="mt-5 space-y-5">
                  <section className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]">
                    <div className="text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur
                        ? seriesLayer === "fresh"
                          ? "یہ منبر کے لیے نئی تشکیل ہے"
                          : "یہ تحقیق اور ماخذ کی جانچ کا نقشہ ہے"
                        : seriesLayer === "fresh"
                          ? "Fresh composition for delivery"
                          : "Research and source map"}
                    </div>
                    <p className="mt-1 text-sm leading-7 text-[#5f6f61] dark:text-[#a8c8b0]">
                      {ur
                        ? seriesLayer === "fresh"
                          ? "علمی نکات معتبر ماخذوں سے ہیں، مگر مجلس کی ترتیب، سوالات اور عملی ربط ازسرِنو بنایا گیا ہے۔ خطیب اپنی مقامی مثال اور اپنے سامع کی ضرورت بھی شامل کرے۔"
                          : "اس نقشے سے اصل عالم کا علمی بہاؤ، دلیل اور ماخذ سمجھیں۔ اسے کسی عالم کی مجلس کے بدل یا نقل کے طور پر نہ پڑھیں۔"
                        : seriesLayer === "fresh"
                          ? "Verified scholarship supports the material, while the sermon sequence and framing are newly composed."
                          : "Use this to study source logic and provenance; do not deliver it as a reproduction of a source sermon."}
                    </p>
                  </section>
                  <section className="rounded-xl border border-[#B8935A]/30 bg-white p-4 dark:border-[#6f5b35] dark:bg-[#162a1e]">
                    <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                      {ur ? "پورے سلسلے کا علمی مقصد" : "Aim of the whole series"}
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? topicSeries.titleUr : topicSeries.titleEn}
                    </h3>
                    <p className="mt-2 text-sm leading-8 text-[#303830] dark:text-[#d7e1d9]">
                      {ur ? topicSeries.aimUr : topicSeries.aimEn}
                    </p>
                  </section>

                  {seriesLayer === "fresh" && originalityReport ? (
                    <section className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                            {ur ? "اصالت و عدمِ نقل جانچ" : "Originality check"}
                          </div>
                          <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                            {ur
                              ? "یہ جانچ نئی منبری تشکیل کو تحقیقی نقشے سے ملا کر دیکھتی ہے؛ مقصد یہ ہے کہ معتبر علم محفوظ رہے مگر کسی عالم کی مجلس غیر محسوس طور پر دوبارہ نہ بن جائے۔"
                              : "This compares the fresh composition with the research map so verified scholarship remains while source sermons are not inadvertently reproduced."}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          originalityReport.status === "clear"
                            ? "bg-[#eaf3ec] text-[#315f3d] dark:bg-[#173222] dark:text-[#a8d4b3]"
                            : "bg-[#fbf1de] text-[#7a5a21] dark:bg-[#382b13] dark:text-[#e3c77f]"
                        }`}>
                          {ur
                            ? originalityReport.status === "clear"
                              ? "نئی تشکیل مناسب طور پر آزاد ہے"
                              : "کچھ حصوں پر دوبارہ نظر ڈالیں"
                            : originalityReport.status === "clear"
                              ? "Composition is sufficiently independent"
                              : "Review recommended"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {originalityReport.checks.map((check) => (
                          <div
                            key={check.id}
                            className="rounded-lg border border-[#1A3A2A]/10 bg-[#F7F5EF] p-3 dark:border-[#35513d] dark:bg-[#0e1c15]"
                          >
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true">
                                {check.status === "clear" ? "✓" : "△"}
                              </span>
                              <strong className="text-sm text-[#37443a] dark:text-[#d7e1d9]">
                                {ur ? ORIGINALITY_LABEL_UR[check.id] : check.labelEn}
                              </strong>
                            </div>
                            <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                              {ur ? check.detailUr : check.detailEn}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="space-y-4">
                    {(displaySeries ?? topicSeries).sessions.map((session) => (
                      <article
                        key={session.number}
                        className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A3A2A] text-sm font-bold text-white dark:bg-[#35513d]">
                            {session.number}
                          </span>
                          <div>
                            <h4 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                              {ur ? session.titleUr : session.titleEn}
                            </h4>
                            <p className="mt-1 text-xs text-[#8a6838] dark:text-[#d7bc8a]">
                              {ur ? `علمی بنیاد: ${session.sourceUr}` : `Source basis: ${session.sourceEn}`}
                            </p>
                          </div>
                        </div>
                        {(ur ? session.previousBridgeUr : session.previousBridgeEn) ? (
                          <div className="mt-3 rounded-lg bg-[#F7F5EF] p-3 text-sm text-[#5a4830] dark:bg-[#0e1c15] dark:text-[#d7bc8a]">
                            <strong>{ur ? "ربطِ گزشتہ: " : "Bridge from previous: "}</strong>
                            {ur ? session.previousBridgeUr : session.previousBridgeEn}
                          </div>
                        ) : null}
                        <p className="mt-3 text-sm font-semibold leading-7 text-[#37443a] dark:text-[#c8d5cc]">
                          {ur ? session.purposeUr : session.purposeEn}
                        </p>
                        {(ur ? session.quranUr : session.quranEn)?.length ? (
                          <div className="mt-3 rounded-lg bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
                            <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                              {ur ? "قرآنی بنیاد" : "Qur'anic foundation"}
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-[#303830] dark:text-[#d7e1d9]">
                              {(ur ? session.quranUr : session.quranEn)?.map((item) => (
                                <p key={item}>• {item}</p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-3 space-y-2">
                          {(ur ? session.materialUr : session.materialEn).map((point) => (
                            <p key={point} className="text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                              • {point}
                            </p>
                          ))}
                        </div>
                        {(ur ? session.takeawayUr : session.takeawayEn) ? (
                          <div className="mt-3 rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#0e1c15]">
                            <strong>{ur ? "حاصلِ مجلس: " : "Session takeaway: "}</strong>
                            {ur ? session.takeawayUr : session.takeawayEn}
                          </div>
                        ) : null}
                        {(ur ? session.avoidRepeatUr : session.avoidRepeatEn) ? (
                          <div className="mt-3 text-xs leading-6 text-[#7b6750] dark:text-[#c0a77c]">
                            <strong>{ur ? "تکرار سے بچیں: " : "Avoid repetition: "}</strong>
                            {ur ? session.avoidRepeatUr : session.avoidRepeatEn}
                          </div>
                        ) : null}
                        {(ur ? session.nextBridgeUr : session.nextBridgeEn) ? (
                          <div className="mt-3 rounded-lg border border-[#B8935A]/25 bg-[#fbf7ee] p-3 text-sm text-[#5a4830] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#d7bc8a]">
                            <strong>{ur ? "اگلی مجلس کی تمہید: " : "Lead into next: "}</strong>
                            {ur ? session.nextBridgeUr : session.nextBridgeEn}
                          </div>
                        ) : null}
                        {seriesLayer === "fresh" ? (
                          <details className="mt-4 rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-3 dark:border-[#35513d] dark:bg-[#0e1c15]">
                            <summary className="cursor-pointer font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                              {ur ? "اس مجلس کی مکمل منبری تیاری" : "Open full session workbench"}
                            </summary>
                            {(() => {
                              const workbench = buildSessionWorkbench(session, duration);
                              return (
                                <div className="mt-4 space-y-4">
                                  <div className="rounded-lg bg-white p-3 dark:bg-[#162a1e]">
                                    <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                                      {ur ? "مرکزی مقصد" : "Central purpose"}
                                    </div>
                                    <p className="mt-1 text-sm leading-7 text-[#37443a] dark:text-[#c8d5cc]">
                                      {ur ? workbench.centralUr : workbench.centralEn}
                                    </p>
                                  </div>

                                  <div className="space-y-3">
                                    {workbench.blocks.map((block, blockIndex) => (
                                      <div
                                        key={`${session.number}-${blockIndex}`}
                                        className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <strong className="text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                                            {ur ? block.headingUr : block.headingEn}
                                          </strong>
                                          <span className="shrink-0 rounded-full bg-[#F7F5EF] px-2 py-1 text-xs text-[#687469] dark:bg-[#0e1c15] dark:text-[#9fb0a2]">
                                            {block.minutes} {ur ? "منٹ" : "min"}
                                          </span>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                          {(ur ? block.bodyUr : block.bodyEn).map((point) => (
                                            <p key={point} className="text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                                              • {point}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="rounded-lg border border-[#B8935A]/25 bg-[#fbf7ee] p-3 dark:border-[#6f5b35] dark:bg-[#241f14]">
                                      <strong className="text-sm text-[#5a4830] dark:text-[#e2c895]">
                                        {ur ? "سامع کے لیے سوال" : "Audience question"}
                                      </strong>
                                      <p className="mt-1 text-sm leading-7 text-[#5a4830] dark:text-[#d7bc8a]">
                                        {ur ? workbench.audienceQuestionUr : workbench.audienceQuestionEn}
                                      </p>
                                    </div>
                                    <div className="rounded-lg border border-[#B8935A]/25 bg-[#fbf7ee] p-3 dark:border-[#6f5b35] dark:bg-[#241f14]">
                                      <strong className="text-sm text-[#5a4830] dark:text-[#e2c895]">
                                        {ur ? "اپنی مثال کی جگہ" : "Own-example slot"}
                                      </strong>
                                      <p className="mt-1 text-sm leading-7 text-[#5a4830] dark:text-[#d7bc8a]">
                                        {ur ? workbench.ownExampleUr : workbench.ownExampleEn}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-[#1A3A2A]/10 bg-white p-3 dark:border-[#35513d] dark:bg-[#162a1e]">
                                    <strong className="text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                                      {ur ? "اپنی آواز محفوظ رکھیں" : "Protect your own voice"}
                                    </strong>
                                    <p className="mt-1 text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                                      {ur ? workbench.voiceGuardUr : workbench.voiceGuardEn}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(
                                          buildSessionWorkbenchText(workbench, ur ? "ur" : "en"),
                                        );
                                      } catch {
                                        // Clipboard may be unavailable.
                                      }
                                    }}
                                    className="rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38]"
                                  >
                                    {ur ? "اس مجلس کی مکمل تیاری نقل کریں" : "Copy full session workbench"}
                                  </button>
                                </div>
                              );
                            })()}
                          </details>
                        ) : null}
                        <SessionNotesEditor
                          key={`${topic.id}:${seriesLength}:${seriesLayer}:${session.number}`}
                          topicId={topic.id}
                          seriesLength={seriesLength}
                          layer={seriesLayer}
                          sessionNumber={session.number}
                          topicTitleUr={topic.titleUr}
                          topicTitleEn={topic.titleEn}
                          sessionTitleUr={session.titleUr}
                          sessionTitleEn={session.titleEn}
                          ur={ur}
                        />
                        <SessionDeliveryHistory
                          topicId={topic.id}
                          topicTitleUr={topic.titleUr}
                          topicTitleEn={topic.titleEn}
                          seriesLength={seriesLength}
                          layer={seriesLayer}
                          session={session}
                          ur={ur}
                          occasion={
                            preparationMode === "occasion" && event
                              ? {
                                  id: event.id,
                                  titleUr: event.title,
                                  month: event.month,
                                  day: event.day,
                                }
                              : undefined
                          }
                        />
                      </article>
                    ))}
                  </section>

                  <section className="rounded-xl border border-[#B8935A]/30 bg-[#fbf7ee] p-4 text-sm leading-8 text-[#5a4830] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#e2c895]">
                    <strong>{ur ? "آخری مجلس کے لیے ہدایت: " : "Guidance for the final session: "}</strong>
                    {ur ? topicSeries.finalUr : topicSeries.finalEn}
                  </section>
                </div>
              ) : topicDossier ? (
                <div className="mt-5 space-y-5">
                  <section className="rounded-xl border border-[#B8935A]/30 bg-white p-4 dark:border-[#6f5b35] dark:bg-[#162a1e]">
                    <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                      {ur ? "مرکزی مقدمہ" : "Central thesis"}
                    </div>
                    <p className="mt-2 text-sm leading-8 text-[#303830] dark:text-[#d7e1d9]">
                      {ur ? topicDossier.thesisUr : topicDossier.thesisEn}
                    </p>
                    <div className="mt-3 rounded-lg bg-[#F7F5EF] p-3 text-sm font-semibold text-[#5a4830] dark:bg-[#0e1c15] dark:text-[#d7bc8a]">
                      {ur ? "مرکزی سوال: " : "Governing question: "}
                      {ur ? topicDossier.governingQuestionUr : topicDossier.governingQuestionEn}
                    </div>
                  </section>

                  {groundedFullSermon ? (
                    <section className="rounded-xl border border-[#31513a]/25 bg-[#f5faf6] p-4 dark:border-[#45604b] dark:bg-[#122319]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-[#47654d] dark:text-[#b9d4bf]">
                            {ur ? "مصدقہ مکمل مجلس — خودکار تشکیل" : "Verified full sermon — automatic composition"}
                          </div>
                          <h4 className="mt-1 text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                            {groundedFullSermon.ready
                              ? (ur
                                  ? `${duration} منٹ کی ماخذی مجلس تیار ہے`
                                  : `${duration}-minute source-grounded sermon is ready`)
                              : (ur
                                  ? "مکمل مجلس ابھی تیار نہیں"
                                  : "Full sermon is not ready yet")}
                          </h4>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                            {ur
                              ? "اصل آیات اور روایات مصدقہ ماخذ سے لی گئی ہیں۔ علمی توضیح صرف source-grounded اندراج سے آتی ہے۔ تمہید، ربط، جمع بندی اور اختتام الگ تدوینی حصے ہیں۔"
                              : "Verses and narrations come from verified sources. Scholarly explanation is drawn only from source-grounded records. Opening, transitions, synthesis, and closing remain separate editorial layers."}
                          </p>
                        </div>
                        {groundedFullSermon.ready ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(groundedFullSermonText);
                              } catch {
                                // Clipboard may be unavailable.
                              }
                            }}
                            className="khateeb-no-print rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244E38]"
                          >
                            {ur ? "مکمل مصدقہ مجلس نقل کریں" : "Copy verified full sermon"}
                          </button>
                        ) : null}
                      </div>

                      {groundedFullSermonAudit ? (
                        <div className="mt-4 rounded-xl border border-[#31513a]/20 bg-white p-4 dark:border-[#45604b] dark:bg-[#162a1e]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm text-[#31513a] dark:text-[#b9d4bf]">
                              {ur ? "ماخذی و تدوینی جانچ" : "Source and editorial audit"}
                            </strong>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              groundedFullSermonAudit.status === "pass"
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : groundedFullSermonAudit.status === "warning"
                                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                  : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                            }`}>
                              {groundedFullSermonAudit.status === "pass"
                                ? (ur ? "جانچ مکمل" : "Audit passed")
                                : groundedFullSermonAudit.status === "warning"
                                  ? (ur ? "بہتری کی گنجائش" : "Review suggested")
                                  : (ur ? "اہم مسئلہ" : "Audit error")}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {groundedFullSermonAudit.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-lg border border-[#1A3A2A]/10 bg-[#F7F5EF] p-3 dark:border-[#35513d] dark:bg-[#0e1c15]"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${
                                    item.level === "pass"
                                      ? "bg-emerald-600"
                                      : item.level === "warning"
                                        ? "bg-amber-500"
                                        : "bg-red-600"
                                  }`} />
                                  <strong className="text-xs text-[#1A3A2A] dark:text-[#e7eee9]">
                                    {ur ? item.titleUr : item.titleEn}
                                  </strong>
                                </div>
                                <p className="mt-1 text-xs leading-6 text-[#687469] dark:text-[#9fb0a2]">
                                  {ur ? item.detailUr : item.detailEn}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          [ur ? "قرآنی بنیاد" : "Qur'an", groundedFullSermon.quranCount],
                          [ur ? "مصدقہ روایات" : "Verified hadith", groundedFullSermon.verifiedHadithCount],
                          [ur ? "علمی توضیحات" : "Scholar blocks", groundedFullSermon.scholarCount],
                          [ur ? "تدوینی حصے" : "Editorial blocks", groundedFullSermon.editorialCount],
                        ].map(([label, count]) => (
                          <div
                            key={String(label)}
                            className="rounded-lg border border-[#31513a]/15 bg-white px-3 py-2 dark:border-[#45604b] dark:bg-[#162a1e]"
                          >
                            <div className="text-[11px] text-[#687469] dark:text-[#9fb0a2]">
                              {label}
                            </div>
                            <div className="mt-1 text-sm font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                              {count}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!groundedFullSermon.ready ? (
                        <div className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm leading-7 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                          {(ur
                            ? groundedFullSermon.blockersUr
                            : groundedFullSermon.blockersEn
                          ).map((blocker) => (
                            <p key={blocker}>• {blocker}</p>
                          ))}
                        </div>
                      ) : (
                        <details className="mt-4 rounded-xl border border-[#31513a]/20 bg-white p-4 dark:border-[#45604b] dark:bg-[#162a1e]">
                          <summary className="cursor-pointer font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                            {ur ? "مکمل مجلس کی ماخذی ترتیب دیکھیں" : "Open the full source-grounded sermon"}
                          </summary>
                          <div className="mt-4 space-y-4">
                            {groundedFullSermon.blocks.map((block) => (
                              <article
                                key={block.id}
                                className="rounded-lg border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <strong className="text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                                    {ur ? block.headingUr : block.headingEn}
                                  </strong>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#8a6838] dark:bg-[#162a1e] dark:text-[#d7bc8a]">
                                      {block.minutes} {ur ? "منٹ" : "min"}
                                    </span>
                                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                      block.provenance === "source-grounded"
                                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                    }`}>
                                      {block.provenance === "source-grounded"
                                        ? (ur ? "ماخذی بنیاد" : "Source-grounded")
                                        : (ur ? "تدوینی حصہ" : "Editorial")}
                                    </span>
                                  </div>
                                </div>
                                {block.arabic ? (
                                  <div dir="rtl" className="mt-3 rounded-lg bg-white px-4 py-3 text-sm leading-8 text-[#1A3A2A] dark:bg-[#162a1e] dark:text-[#e7eee9]">
                                    <KhateebScriptText text={block.arabic} forceArabic />
                                  </div>
                                ) : null}
                                <p className="mt-3 text-sm leading-8 text-[#445247] dark:text-[#b8c8bb]">
                                  {ur ? block.bodyUr : block.bodyEn}
                                </p>
                                {(ur ? block.citationUr : block.citationEn) ? (
                                  <div className="mt-3 text-xs leading-6 text-[#6f5730] dark:text-[#d7bc8a]">
                                    <strong>{ur ? "حوالہ: " : "Reference: "}</strong>
                                    {ur ? block.citationUr : block.citationEn}
                                  </div>
                                ) : null}
                              </article>
                            ))}

                          <div className="mt-5 rounded-xl border border-[#B8935A]/25 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-sm text-[#5a4830] dark:text-[#e2c895]">
                                {ur ? "ماخذی رجسٹر" : "Source ledger"}
                              </strong>
                              <span className="text-xs text-[#687469] dark:text-[#9fb0a2]">
                                {groundedFullSermon.sourceLedger.length} {ur ? "منفرد مراجع" : "unique references"}
                              </span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {groundedFullSermon.sourceLedger.map((source) => (
                                <div
                                  key={source.id}
                                  className="rounded-lg bg-white px-3 py-2 text-xs leading-6 text-[#5a4830] dark:bg-[#162a1e] dark:text-[#d7bc8a]"
                                >
                                  <strong>
                                    {source.kind === "quran"
                                      ? (ur ? "قرآن: " : "Qur'an: ")
                                      : source.kind === "hadith"
                                        ? (ur ? "روایت: " : "Hadith: ")
                                        : (ur ? "علمی ماخذ: " : "Scholar source: ")}
                                  </strong>
                                  {ur ? source.citationUr : source.citationEn}
                                </div>
                              ))}
                            </div>
                          </div>
                          </div>
                        </details>
                      )}
                    </section>
                  ) : null}

                  {topicDossier.primaryTexts?.length ? (
                    <section className="rounded-xl border border-[#B8935A]/30 bg-white p-4 dark:border-[#6f5b35] dark:bg-[#162a1e]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-[#8a6838]" />
                        <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                          {ur ? "اصل آیات و روایات" : "Primary verses and narrations"}
                        </h4>
                      </div>
                      <p className="mt-1 text-sm text-[#687469] dark:text-[#9fb0a2]">
                        {ur
                          ? "مجلس کی علمی بنیاد کے لیے اصل عربی متن، حوالہ اور مختصر وضاحت۔"
                          : "Original Arabic text, reference, and a short explanation for the sermon's textual foundation."}
                      </p>
                      <div className="mt-4 space-y-4">
                        {topicDossier.primaryTexts.map((item) => {
                          const verifiedHadith =
                            item.kind === "hadith"
                              ? verifiedHadithForDossierText(item.id)
                              : null;
                          const hadithInventory =
                            item.kind === "hadith"
                              ? hadithRecordForDossierText(item.id)
                              : null;

                          return (
                            <article
                              key={item.id}
                              className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong className="text-sm text-[#6f5730] dark:text-[#e2c895]">
                                  {ur ? item.refUr : item.refEn}
                                </strong>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white px-2 py-1 text-xs text-[#687469] dark:bg-[#162a1e] dark:text-[#9fb0a2]">
                                    {item.kind === "quran"
                                      ? (ur ? "آیت" : "Qur'an")
                                      : (ur ? "روایت" : "Narration")}
                                  </span>
                                  {verifiedHadith ? (
                                    <span className="rounded-full border border-emerald-700/20 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/25 dark:bg-[#162a1e] dark:text-emerald-300">
                                      {ur ? "لفظ بہ لفظ مصدقہ" : "Exact text verified"}
                                    </span>
                                  ) : item.kind === "hadith" ? (
                                    <span className="rounded-full border border-amber-700/20 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-500/25 dark:bg-[#162a1e] dark:text-amber-300">
                                      {ur ? "زیرِ تصدیق" : "Pending verification"}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {item.kind === "quran" ? (
                                <div className="mt-3 rounded-lg bg-white px-4 py-3 dark:bg-[#162a1e]">
                                  <KhateebPrimaryArabic
                                    kind={item.kind}
                                    quranLocation={item.quranLocation}
                                    sourceArabic={item.sourceArabic ?? item.arabic ?? ""}
                                    sourceArabicMarked={item.sourceArabicMarked}
                                  />
                                </div>
                              ) : verifiedHadith?.exactArabic ? (
                                <div dir="rtl" className="mt-3 rounded-lg bg-white px-4 py-3 text-sm leading-8 text-[#1A3A2A] dark:bg-[#162a1e] dark:text-[#e7eee9]">
                                  <KhateebScriptText text={verifiedHadith.exactArabic} forceArabic />
                                </div>
                              ) : (
                                <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                                  {ur
                                    ? "اصل عربی متن کی لفظ بہ لفظ ماخذی تصدیق ابھی باقی ہے؛ غیر مصدقہ عبارت یہاں نہیں دکھائی جا رہی۔"
                                    : "The exact Arabic source text is still pending word-for-word verification; unverified wording is not displayed here."}
                                </div>
                              )}

                              <div className="mt-3 rounded-lg border border-[#B8935A]/20 bg-white px-3 py-2 text-sm leading-7 text-[#445247] dark:border-[#6f5b35] dark:bg-[#162a1e] dark:text-[#b8c8bb]">
                                <strong className="me-2 text-[#6f5730] dark:text-[#d7bc8a]">
                                  {ur ? "موضوعی ربط:" : "Topic link:"}
                                </strong>
                                {ur ? item.explanationUr : item.explanationEn}
                              </div>

                              {item.kind === "hadith" ? (
                                <div className="mt-3 text-sm leading-7 text-[#5a4830] dark:text-[#d7bc8a]">
                                  <strong>
                                    {verifiedHadith
                                      ? (ur ? "مصدقہ حوالہ: " : "Verified reference: ")
                                      : (ur ? "ماخذی حوالہ (زیرِ تصدیق): " : "Source reference (pending verification): ")}
                                  </strong>
                                  {verifiedHadith
                                    ? (ur ? verifiedHadith.verifiedReferenceUr : verifiedHadith.verifiedReferenceEn)
                                    : hadithInventory
                                      ? (ur ? hadithInventory.citedReferenceUr : hadithInventory.citedReferenceEn)
                                      : (ur ? item.sourceRefUr : item.sourceRefEn)}
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur
                        ? new Set(topicDossier.perspectives.map((item) => item.nameUr)).size === 1
                          ? "اصل ماخذ کے علمی زاویے"
                          : "مختلف اہلِ علم نے اسے کیسے کھولا؟"
                        : new Set(topicDossier.perspectives.map((item) => item.nameEn)).size === 1
                          ? "Scholarly angles from the source"
                          : "How different scholars develop the topic"}
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
                              {ur ? "ماخذ سے ثابت شدہ" : "source-backed"}
                            </span>
                          </div>

                          <p className="mt-3 text-sm font-semibold leading-7 text-[#37443a] dark:text-[#c8d5cc]">
                            {ur
                              ? <KhateebScriptText text={perspective.coreUr} />
                              : perspective.coreEn}
                          </p>

                          <div className="mt-3 space-y-2">
                            {pointsForDuration(ur ? perspective.explanationUr : perspective.explanationEn, duration).map((point) => (
                              <p key={point} className="text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                                {ur ? <KhateebScriptText text={point} /> : point}
                              </p>
                            ))}
                          </div>

                          {(ur ? perspective.sourceGroundedUr : perspective.sourceGroundedEn)?.length ? (
                            <div className="mt-4 rounded-xl border border-[#31513a]/20 bg-[#f5faf6] p-4 dark:border-[#45604b] dark:bg-[#122319]">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-bold text-[#31513a] dark:text-[#b9d4bf]">
                                  {ur ? "اصل ماخذ سے اخذ شدہ تفصیل" : "Source-grounded detail"}
                                </div>
                                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#47654d] dark:bg-[#162a1e] dark:text-[#b9d4bf]">
                                  {ur ? "تدوینی اضافہ نہیں" : "Not editorial invention"}
                                </span>
                              </div>
                              <div className="mt-3 space-y-4">
                                {(ur ? perspective.sourceGroundedUr : perspective.sourceGroundedEn)?.map((section) => (
                                  <article key={section.heading} className="rounded-lg bg-white p-3 dark:bg-[#162a1e]">
                                    <h6 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                      {section.heading}
                                    </h6>
                                    <p className="mt-2 text-sm leading-8 text-[#37443a] dark:text-[#c8d5cc]">
                                      {section.explanation}
                                    </p>
                                    <div className="mt-3 text-xs leading-7 text-[#6f5730] dark:text-[#d7bc8a]">
                                      <strong>{ur ? "حوالہ: " : "Reference: "}</strong>
                                      {section.exactRef}
                                    </div>
                                    {!ur && section.sourceUrl ? (
                                      <a
                                        href={section.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-xs font-semibold text-[#31513a] underline underline-offset-4 dark:text-[#b9d4bf]"
                                      >
                                        Open source
                                      </a>
                                    ) : null}
                                  </article>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {(ur ? perspective.editorialBridgeUr : perspective.editorialBridgeEn) ? (
                            <div className="mt-4 rounded-xl border border-[#B8935A]/25 bg-[#fbf7ee] p-3 dark:border-[#6f5b35] dark:bg-[#241f14]">
                              <div className="text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                                {ur ? "منبری ربط — تدوینی" : "Editorial pulpit bridge"}
                              </div>
                              <p className="mt-1 text-sm leading-8 text-[#5a4830] dark:text-[#d7bc8a]">
                                {ur ? perspective.editorialBridgeUr : perspective.editorialBridgeEn}
                              </p>
                            </div>
                          ) : null}

                          {(ur ? perspective.readyUr : perspective.readyEn)?.length ? (
                            <div className="mt-4 rounded-xl border border-[#B8935A]/25 bg-[#fffdf8] p-4 dark:border-[#6f5b35] dark:bg-[#201d15]">
                              <div className="text-sm font-bold text-[#6f5730] dark:text-[#e2c895]">
                                {ur ? "تفصیلی قابلِ بیان مواد" : "Detailed speaking material"}
                              </div>
                              <div className="mt-3 space-y-4">
                                {(ur ? perspective.readyUr : perspective.readyEn)?.map((section) => (
                                  <div key={section.heading}>
                                    <h6 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                                      {section.heading}
                                    </h6>
                                    <p className="mt-1 text-sm leading-8 text-[#37443a] dark:text-[#c8d5cc]">
                                      {ur ? <KhateebScriptText text={section.body} /> : section.body}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {duration === 45 && perspective.originalSnippet ? (
                            <blockquote
                              dir="rtl"
                              className="mt-3 rounded-lg border-s-4 border-[#B8935A] bg-[#F7F5EF] px-4 py-2 text-sm text-[#303830] dark:bg-[#0e1c15] dark:text-[#d7e1d9]"
                            >
                              {ur
                                ? <KhateebScriptText text={perspective.originalSnippet} forceArabic />
                                : perspective.originalSnippet}
                            </blockquote>
                          ) : null}

                          {duration > 20 ? (
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
                                {ur ? "اس حصے کا منبری مقصد" : "Sermonic purpose of this section"}
                              </div>
                              <p className="mt-1 text-sm text-[#445247] dark:text-[#b8c8bb]">
                                {ur ? perspective.useUr : perspective.useEn}
                              </p>
                            </div>
                          </div>
                          ) : null}

                          <div className="mt-3 text-[11px] text-[#7c877e] dark:text-[#8fa294]">
                            {ur ? "اصل ماخذ تصدیق کے لیے محفوظ ہے؛ بنیادی مواد اوپر دے دیا گیا ہے۔" : "The original source is retained for verification; the usable material is provided above."}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-4 dark:border-[#35513d] dark:bg-[#0e1c15]">
                    <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? "اب ان سب زاویوں کو ایک منبر میں کیسے یکجا کریں؟" : "How to synthesize these into one sermon"}
                    </h4>
                    <div className="mt-3 space-y-2">
                      {pointsForDuration(ur ? topicDossier.synthesisUr : topicDossier.synthesisEn, duration).map((point) => (
                        <p key={point} className="text-sm leading-7 text-[#445247] dark:text-[#b8c8bb]">
                          • {ur ? <KhateebScriptText text={point} /> : point}
                        </p>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-base font-bold text-[#1A3A2A] dark:text-[#e7eee9]">
                      {ur ? "قابلِ بیان منبری ترتیب" : "Ready speaking flow"}
                    </h4>
                    <div className="mt-3 space-y-3">
                      {(ur ? topicDossier.pulpitFlowUr : topicDossier.pulpitFlowEn).map((block) => (
                        <article key={block.heading} className="rounded-xl border border-[#1A3A2A]/10 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e]">
                          <h5 className="font-bold text-[#1A3A2A] dark:text-[#e7eee9]">{block.heading}</h5>
                          {duration > 20 ? (
                            <p className="mt-2 text-sm leading-8 text-[#37443a] dark:text-[#c8d5cc]">
                              {ur ? <KhateebScriptText text={block.body} /> : block.body}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-[#B8935A]/30 bg-[#fbf7ee] p-4 text-sm leading-8 text-[#5a4830] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#e2c895]">
                      <strong>{ur ? "اختتام: " : "Closing: "}</strong>
                      {ur
                        ? <KhateebScriptText text={topicDossier.closingUr} />
                        : topicDossier.closingEn}
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
                        <div dir="rtl" className="mt-0.5 text-sm text-[#1A3A2A] dark:text-[#e7eee9]">
                          <KhateebScriptText text={anchor.arabic} forceArabic />
                        </div>
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
                    {pointsForDuration(ur ? topic.anglesUr : topic.anglesEn, duration).map((angle) => (
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
                        ? "صرف وہی خطابات یا محفوظ مجموعے دکھائے جاتے ہیں جنہیں اس موضوع سے واضح طور پر موضوعاتی فہرست میں شامل کیا گیا ہے۔"
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
                      ? "اس موضوع کے لیے خطباء کا مصدقہ مواد ابھی موضوعاتی فہرست میں شامل نہیں ہوا؛ قلم یہاں کوئی مصنوعی نسبت نہیں بناتا۔"
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
                      ? "یہاں صرف وہی مواد دکھایا جاتا ہے جس کا اصل ماخذ محفوظ ہے۔ عمومی موضوعاتی نشانات کو قول یا خلاصہ بنا کر پیش نہیں کیا جاتا۔"
                      : "Only source-backed material appears here. Generic profile tags are never presented as quotations or speech summaries."}
                  </p>
                </div>

                {speakerIndexedTopics.length ? (
                  <div className="mb-4">
                    <div className="text-xs font-bold text-[#6b776d] dark:text-[#98aa9b]">
                      {ur ? "اس خطیب کے موضوعاتی طور پر شامل کردہ موضوعات" : "Indexed topics for this speaker"}
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
                      ? "اس شخصیت کا مصدقہ خطاب یا متن ابھی علمی ذخیرے میں شامل نہیں ہوا۔ اس لیے قلم یہاں کوئی فرضی خلاصہ نہیں دکھاتا۔"
                      : "No verified transcript or text for this speaker has been ingested yet, so Qalam does not invent a summary."}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {workflowStep === 3 && preparationMode === "occasion" && preparation ? (
          <section id="khateeb-print-area" className="mt-6 rounded-2xl border border-[#B8935A]/25 bg-white p-5 sm:p-6 shadow-sm dark:border-[#6f5b35] dark:bg-[#162a1e]">
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

              <div className="khateeb-no-print flex flex-wrap items-center gap-2">
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
                <button
                  type="button"
                  onClick={printPreparation}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#1A3A2A]/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#1A3A2A] hover:border-[#B8935A] dark:border-[#4b594f] dark:bg-[#162a1e] dark:text-[#d7e1d9]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {ur ? "پرنٹ / PDF" : "Print / PDF"}
                </button>
              </div>
            </div>
            <p className="mt-4 rounded-xl border border-[#B8935A]/25 bg-[#fbf7ee] px-4 py-3 text-sm leading-7 text-[#5a4830] dark:border-[#6f5b35] dark:bg-[#241f14] dark:text-[#e2c895]">
              {durationBrief(duration, ur ? "ur" : "en")}
            </p>

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
                        <div dir="rtl" className="mt-2 text-lg leading-9 text-[#17251c] dark:text-[#edf4ef]">
                          <KhateebScriptText text={anchor.arabic} forceArabic />
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
                      ? "اس مناسبت کے لیے مخصوص قرآنی آیات ابھی مرتب شدہ مجموعے میں شامل نہیں؛ نیچے تحقیق کے زاویے سے آغاز کریں۔"
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
                          ? "یہ حوالہ تصدیق کے لیے محفوظ ہے؛ خطیب کو بنیادی مواد اسی صفحے پر ملنا چاہیے۔"
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
                  {pointsForDuration(ur ? preparation.anglesUr : preparation.anglesEn, duration).map((angle) => (
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
                      ? `${speakerEvidence.length} ماخذ سے ثابت شدہ تیار مواد اوپر خطیب کے حصے میں موجود ہے۔`
                      : `${speakerEvidence.length} source-backed ready material record(s) are available in the speaker section above.`}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#8a6838] dark:text-[#d7bc8a]">
                    {ur
                      ? "اس خطیب کا اصل متن ابھی علمی ذخیرے میں شامل نہیں ہوا، اس لیے یہاں محض خارجی ربط نہیں دیا جا رہا۔"
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
