import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { KHATEEB_CALENDAR_SOURCE_ARCHIVE } from "../app/tools/khateeb-studio/engine/calendarSourceArchive";
import { KHATEEB_CORPUS } from "../app/tools/khateeb-studio/engine/khateebCorpus";
import { RABI_AL_THANI_1448_EVENTS, SHIA_CALENDAR_1448_EVENTS } from "../app/tools/khateeb-studio/engine/shiaCalendar";
import { buildPreparationText, durationBrief, getSermonPrep, outlineMinutes, pointsForDuration } from "../app/tools/khateeb-studio/engine/sermonPrep";
import {
  catalogEvidenceForSpeaker,
  evidenceForSpeaker,
  SPEAKER_EVIDENCE,
} from "../app/tools/khateeb-studio/engine/speakerEvidence";
import {
  evidenceForSpeakerAndTopic,
  evidenceForTopic,
  speakersForTopic,
  topicsForSpeaker,
  validateSpeakerTopicIndex,
} from "../app/tools/khateeb-studio/engine/speakerTopicIndex";
import { searchTopicPreps, TOPIC_PREPS } from "../app/tools/khateeb-studio/engine/topicPrep";
import { buildDossierText, getTopicDossier } from "../app/tools/khateeb-studio/engine/topicDossier";
import { NAQQAN_ASHRA_EVIDENCE } from "../app/tools/khateeb-studio/engine/naqqanEvidence";
import { TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE } from "../app/tools/khateeb-studio/engine/talibJohariEvidence";
import {
  SOUTH_ASIA_CORPUS_QUEUE,
  southAsiaSourcesForSpeaker,
} from "../app/tools/khateeb-studio/engine/southAsianCorpusQueue";
import { hasLatinWord, pureKhateebUrdu } from "../app/tools/khateeb-studio/engine/urduPurity";
import { buildMajlisSeries, buildMajlisSeriesText } from "../app/tools/khateeb-studio/engine/seriesPlanner";
import { buildFreshMajlisSeries } from "../app/tools/khateeb-studio/engine/freshPulpitSeries";
import { checkSeriesOriginality } from "../app/tools/khateeb-studio/engine/originalityGuard";
import {
  buildSessionWorkbench,
  buildSessionWorkbenchText,
} from "../app/tools/khateeb-studio/engine/sessionWorkbench";
import { groupCalendarEvents } from "../app/tools/khateeb-studio/engine/groupCalendarEvents";
import {
  applyKhateebStudioQuery,
  khateebStudioQuery,
  parseKhateebStudioView,
} from "../app/tools/khateeb-studio/engine/studioView";

describe("Khateeb Studio seed corpus", () => {
  test("contains the requested historical speakers", () => {
    const names = KHATEEB_CORPUS.map((item) => item.name).join("|");
    expect(names).toContain("علامہ سید رشید ترابیؒ");
    expect(names).toContain("علامہ اظہر حسن زیدیؒ");
    expect(names).toContain("آیت اللہ سید علی نقی نقوی لکھنویؒ (نقنؒ)");
    expect(names).toContain("علامہ سید ذیشان حیدر جوادیؒ");
    expect(names).toContain("علامہ سید شہنشاہ حسین نقوی");
  });

  test("covers all three regions without ranking", () => {
    expect(KHATEEB_CORPUS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(KHATEEB_CORPUS.map((item) => item.region))).toEqual(new Set(["pk", "in", "ir"]));
    for (const item of KHATEEB_CORPUS) expect(item.corpusFocus.length).toBeGreaterThan(0);
  });
});

describe("Rabi al-Thani calendar seed", () => {
  test("contains a broad set of occasions", () => {
    expect(RABI_AL_THANI_1448_EVENTS.length).toBeGreaterThan(8);
    expect(RABI_AL_THANI_1448_EVENTS.some((item) => item.day === 14)).toBe(true);
    expect(RABI_AL_THANI_1448_EVENTS.some((item) => item.day === 22)).toBe(true);
  });

  test("keeps source attribution", () => {
    const archiveIds = new Set(KHATEEB_CALENDAR_SOURCE_ARCHIVE.map((item) => item.id));
    for (const item of SHIA_CALENDAR_1448_EVENTS) {
      expect(item.sourceLabel).toBeTruthy();
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.sourceCapturedAt).toBe("2026-10-02");
      expect(archiveIds.has(item.sourceId)).toBe(true);
    }
    const askari = RABI_AL_THANI_1448_EVENTS.filter((item) => item.title === "ولادت امام حسن عسکریؑ");
    expect(new Set(askari.map((item) => item.day))).toEqual(new Set([6, 8, 10]));
    expect(askari.some((item) => item.regions?.includes("pk") && item.day === 10)).toBe(true);
  });
});

describe("Khateeb Studio typography", () => {
  test("keeps Jameel on the studio body and Noto Nastaliq on headings only", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    const globals = readFileSync("app/globals.css", "utf8");
    expect(studio).toContain("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/jameel-noori-nastaleeq-400.woff2");
    expect(studio).toContain("khateeb-studio-ur");
    expect(studio).toContain(".khateeb-studio-ur h1");
    expect(studio).toContain("var(--font-nastaliq), var(--font-nastaliq-latin)");
    expect(studio).toContain("Visible occasions");
    expect(globals).not.toContain("khateeb-studio");
    expect(globals).not.toContain("jameel-noori-nastaleeq-400.woff2");
    expect(studio).not.toContain("max-h-[560px]");
  });
});

describe("Khateeb Studio sermon preparation", () => {
  test("provides a substantive Askari preparation pack", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title === "ولادت امام حسن عسکریؑ");
    const prep = getSermonPrep(event);
    expect(prep).not.toBeNull();
    expect(prep?.quran.length).toBeGreaterThanOrEqual(3);
    expect(prep?.sources.length).toBeGreaterThanOrEqual(3);
    expect(prep?.anglesUr.length).toBeGreaterThanOrEqual(3);
  });

  test("provides source-led preparation for Tawwabun", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title.includes("توابین"));
    const prep = getSermonPrep(event);
    expect(prep?.id).toBe("tawwabin");
    expect(prep?.sources.some((item) => item.labelEn.includes("Tabari"))).toBe(true);
  });

  test("every other occasion still gets a useful fallback", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title.includes("موسیٰ مبرقع"));
    const prep = getSermonPrep(event);
    expect(prep?.id.startsWith("generic-")).toBe(true);
    expect(prep?.anglesUr.length).toBeGreaterThanOrEqual(4);
    expect(prep?.titleEn).not.toMatch(/[\u0600-\u06FF]/u);
  });

  test("duration allocation is deterministic and sums correctly", () => {
    expect(outlineMinutes(20).reduce((a, b) => a + b, 0)).toBe(20);
    expect(outlineMinutes(30).reduce((a, b) => a + b, 0)).toBe(30);
    expect(outlineMinutes(45).reduce((a, b) => a + b, 0)).toBe(45);
  });

  test("copyable preparation includes evidence and outline", () => {
    const event = RABI_AL_THANI_1448_EVENTS.find((item) => item.title === "ولادت امام حسن عسکریؑ");
    const prep = getSermonPrep(event)!;
    const text = buildPreparationText(prep, "ur", 30, {
      name: "علامہ سید رشید ترابیؒ",
      focus: ["مجالس", "خطابت"],
    });
    expect(text).toContain("قرآنی بنیاد");
    expect(text).toContain("خطبہ خاکہ");
    expect(text).toContain("علامہ سید رشید ترابیؒ");
  });

  test("speaker list uses page flow rather than an internal scrollbar", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).not.toContain("max-h-[560px] overflow-auto");
    expect(studio).toContain("Sermon preparation");
  });
});

describe("Khateeb Studio year-round topic preparation", () => {
  test("ships a substantive year-round starter library", () => {
    expect(TOPIC_PREPS.length).toBeGreaterThanOrEqual(10);
    for (const topic of TOPIC_PREPS) {
      expect(topic.quran.length).toBeGreaterThanOrEqual(2);
      expect(topic.sources.length).toBeGreaterThanOrEqual(2);
      expect(topic.anglesUr.length).toBeGreaterThanOrEqual(4);
      expect(topic.anglesEn.length).toBeGreaterThanOrEqual(4);
    }
  });

  test("finds topics in Urdu and English", () => {
    expect(searchTopicPreps("صبر", "ur")[0]?.id).toBe("sabr");
    expect(searchTopicPreps("family", "en")[0]?.id).toBe("family");
    expect(searchTopicPreps("امامت", "ur")[0]?.id).toBe("imamate");
  });

  test("topic packs use the same timed preparation builder", () => {
    const topic = searchTopicPreps("دعا", "ur")[0];
    expect(topic).toBeTruthy();
    const text = buildPreparationText(topic!, "ur", 45);
    expect(text).toContain("قرآنی بنیاد");
    expect(text).toContain("خطبہ خاکہ");
  });

  test("studio exposes topic-first preparation before the calendar workflow", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("موضوع سے خطبہ تیار کریں");
    expect(studio).toContain("Prepare a sermon by topic");
    expect(studio.indexOf("موضوع سے خطبہ تیار کریں")).toBeLessThan(studio.indexOf("۱۴۴۸ھ کی تقویمی مناسبتیں"));
  });
});

describe("Khateeb Studio real speaker material", () => {
  test("does not treat profile tags as speech content", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("حقیقی مواد");
    expect(studio).toContain("فرضی خلاصہ نہیں دکھاتا");
    expect(studio).toContain("verified material");
  });

  test("ships source-backed Kashani transcripts", () => {
    const rows = evidenceForSpeaker("hamed-kashani");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => row.kind === "transcript")).toBe(true);
    expect(rows.every((row) => row.status === "ready")).toBe(true);
    expect(rows.every((row) => (row.materialUr?.length ?? 0) >= 4)).toBe(true);
    expect(rows.every((row) => row.sourceUrl.startsWith("https://www.hkashani.com/"))).toBe(true);
    expect(rows.some((row) => row.topicsUr.includes("امام حسن عسکریؑ"))).toBe(true);
  });

  test("does not expose catalog-only Turabi records as ready sermon material", () => {
    expect(evidenceForSpeaker("rashid-turabi")).toHaveLength(0);
    const rows = catalogEvidenceForSpeaker("rashid-turabi");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.every((row) => row.kind === "compiled-majalis")).toBe(true);
    expect(rows.every((row) => row.status === "catalog-only")).toBe(true);
    expect(rows.some((row) => row.titleUr.includes("توحید اور شرک"))).toBe(true);
  });

  test("every evidence row carries an inspectable source", () => {
    for (const row of SPEAKER_EVIDENCE) {
      expect(row.sourceUrl).toMatch(/^https:\/\//);
      expect(row.summaryUr.length).toBeGreaterThan(40);
      expect(row.takeawaysUr.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Khateeb Studio speaker × topic index", () => {
  test("has no dangling speaker or topic references", () => {
    expect(validateSpeakerTopicIndex()).toEqual({
      unknownSpeakerIds: [],
      unknownTopicIds: [],
    });
  });

  test("projects one evidence record in both directions without duplication", () => {
    const byTopic = evidenceForTopic("imamate");
    const bySpeaker = evidenceForSpeakerAndTopic("hamed-kashani", "imamate");
    expect(byTopic.map((item) => item.id)).toContain("kashani-askari-1402");
    expect(bySpeaker.map((item) => item.id)).toContain("kashani-askari-1402");
    expect(SPEAKER_EVIDENCE.filter((item) => item.id === "kashani-askari-1402")).toHaveLength(1);
  });

  test("indexes Rashid Turabi under real source-backed topics only", () => {
    const topics = topicsForSpeaker("rashid-turabi").map((row) => row.topic.id);
    expect(topics).toEqual([]);
  });

  test("topic view can enumerate contributing speakers", () => {
    const rows = speakersForTopic("imamate");
    expect(rows.some((row) => row.speakerId === "hamed-kashani")).toBe(true);
  });

  test("UI exposes both topic-to-speaker and speaker-to-topic navigation", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("اس موضوع پر خطباء کا حقیقی مواد");
    expect(studio).toContain("اس خطیب کے موضوعاتی طور پر شامل کردہ موضوعات");
    expect(studio).toContain("No verified speaker material is indexed to this topic yet");
  });

  test("bare external links are not presented as the material itself", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("خطابت کے لیے تیار مواد");
    expect(studio).toContain("اس خطیب کا اصل متن ابھی علمی ذخیرے میں شامل نہیں ہوا");
    expect(studio).not.toContain("دستیاب ذخیرہ کھولیں");
    expect(studio).not.toContain("Open available corpus");
  });
});

describe("Khateeb Studio deep sermon dossiers", () => {
  test("Sabr is a multi-scholar dossier rather than a bare outline", () => {
    const dossier = getTopicDossier("sabr");
    expect(dossier).not.toBeNull();
    expect(dossier?.perspectives.length).toBeGreaterThanOrEqual(3);
    expect(dossier?.perspectives.some((item) => item.speakerId === "hamed-kashani")).toBe(true);
    expect(dossier?.perspectives.some((item) => item.speakerId === "alireza-panahian")).toBe(true);
    expect(dossier?.perspectives.some((item) => item.speakerId === "shojaei")).toBe(true);
    expect(dossier?.pulpitFlowUr.length).toBeGreaterThanOrEqual(5);
  });

  test("dossier copy text contains scholarship, synthesis, and speaking material", () => {
    const dossier = getTopicDossier("sabr")!;
    const text = buildDossierText(dossier, "ur");
    expect(text).toContain("اہلِ علم کے زاویے");
    expect(text).toContain("منبری جامع نتیجہ");
    expect(text).toContain("قابلِ بیان ترتیب");
    expect(text).toContain("حامد کاشانی");
    expect(text).toContain("علیرضا پناہیان");
    expect(text).toContain("محمد شجاعی");
  });

  test("UI foregrounds scholar explanation and ready speaking flow", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("مختلف اہلِ علم نے اسے کیسے کھولا؟");
    expect(studio).toContain("ان کے بیان کا انداز");
    expect(studio).toContain("منبر میں آپ کیا لے سکتے ہیں؟");
    expect(studio).toContain("قابلِ بیان منبری ترتیب");
  });

  test("Imamate is a multi-scholar doctrinal dossier, not the legacy outline", () => {
    const dossier = getTopicDossier("imamate");
    expect(dossier).not.toBeNull();
    expect(dossier?.perspectives.length).toBeGreaterThanOrEqual(4);
    expect(dossier?.perspectives.some((item) => item.speakerId === "hamed-kashani")).toBe(true);
    expect(dossier?.perspectives.some((item) => item.nameUr.includes("طباطبائی"))).toBe(true);
    expect(dossier?.perspectives.some((item) => item.nameUr.includes("مطہری"))).toBe(true);
    expect(dossier?.perspectives.some((item) => item.nameUr.includes("ابراہیم امینی"))).toBe(true);
    expect(dossier?.pulpitFlowUr.length).toBeGreaterThanOrEqual(6);
  });

  test("Imamate dossier moves from definition to evidence to lived recognition", () => {
    const text = buildDossierText(getTopicDossier("imamate")!, "ur");
    expect(text).toContain("حامد کاشانی");
    expect(text).toContain("علامہ سید محمد حسین طباطبائی");
    expect(text).toContain("شہید مرتضیٰ مطہری");
    expect(text).toContain("آیت اللہ ابراہیم امینی");
    expect(text).toContain("معرفت");
    expect(text).toContain("قابلِ بیان ترتیب");
  });

  test("Dua is a deep dossier grounded in primary text and scholarly explanation", () => {
    const dossier = getTopicDossier("dua");
    expect(dossier).not.toBeNull();
    expect(dossier?.perspectives.length).toBeGreaterThanOrEqual(4);
    expect(dossier?.perspectives.some((item) => item.nameUr.includes("زین العابدین"))).toBe(true);
    expect(dossier?.perspectives.some((item) => item.nameUr.includes("طباطبائی"))).toBe(true);
    expect(dossier?.perspectives.some((item) => item.nameUr.includes("جوادی آملی"))).toBe(true);
    expect(dossier?.perspectives.some((item) => item.speakerId === "alireza-panahian")).toBe(true);
    expect(dossier?.pulpitFlowUr.length).toBeGreaterThanOrEqual(6);
  });

  test("Dua dossier moves from nearness to character and action", () => {
    const text = buildDossierText(getTopicDossier("dua")!, "ur");
    expect(text).toContain("فَإِنِّي قَرِيبٌ");
    expect(text).toContain("صحیفہ");
    expect(text).toContain("خیر");
    expect(text).toContain("حضور قلب");
    expect(text).toContain("عمل");
  });
});

describe("Khateeb Studio guided workflow", () => {
  test("presents a clear three-step preparation journey", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("1 — موضوع یا مناسبت");
    expect(studio).toContain("2 — خطیب (اختیاری)");
    expect(studio).toContain("3 — تیار مواد");
    expect(studio).toContain("Step 1: Where do you want to begin?");
  });

  test("separates topic and occasion entry paths", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain('preparationMode === "topic"');
    expect(studio).toContain('preparationMode === "occasion"');
    expect(studio).toContain("موضوع سے تیاری");
    expect(studio).toContain("مناسبت سے تیاری");
  });

  test("makes speaker selection optional and advances to preparation", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("خطیب منتخب کیے بغیر آگے بڑھیں");
    expect(studio).toContain("Continue without a speaker");
    expect(studio).toContain("setWorkflowStep(3)");
  });

  test("calendar and speaker index are no longer forced side by side", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).not.toContain("lg:grid-cols-[1.05fr_0.95fr]");
    expect(studio).toContain("space-y-6");
  });
});

describe("Khateeb Studio multi-majlis series planning", () => {
  test("builds one, three, five, and ten-session plans from a deep dossier", () => {
    const dossier = getTopicDossier("sabr")!;
    expect(buildMajlisSeries(dossier, 1).sessions).toHaveLength(1);
    expect(buildMajlisSeries(dossier, 3).sessions).toHaveLength(3);
    expect(buildMajlisSeries(dossier, 5).sessions).toHaveLength(5);
    expect(buildMajlisSeries(dossier, 10).sessions).toHaveLength(10);
  });

  test("multi-session plans contain continuity bridges instead of isolated repeats", () => {
    const plan = buildMajlisSeries(getTopicDossier("imamate")!, 5);
    expect(plan.sessions[0].previousBridgeUr).toBeUndefined();
    expect(plan.sessions[0].nextBridgeUr).toBeTruthy();
    expect(plan.sessions[1].previousBridgeUr).toBeTruthy();
    expect(plan.sessions[plan.sessions.length - 1].nextBridgeUr).toBeUndefined();
  });

  test("copyable Urdu series text exposes session-by-session progression", () => {
    const text = buildMajlisSeriesText(buildMajlisSeries(getTopicDossier("dua")!, 3), "ur");
    expect(text).toContain("مجلس 1:");
    expect(text).toContain("مجلس 2:");
    expect(text).toContain("مجلس 3:");
    expect(text).toContain("ربطِ گزشتہ");
    expect(text).toContain("اگلی مجلس کی تمہید");
  });

  test("series length survives refresh in the URL view state", () => {
    const view = parseKhateebStudioView({
      step: "3",
      mode: "topic",
      topic: "imamate",
      series: "10",
    });
    expect(view.series).toBe(10);
    expect(khateebStudioQuery(view)).toContain("series=10");
  });

  test("studio offers single, three-day, five-part, and ten-part preparation", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("ایک مجلس");
    expect(studio).toContain("سہ روزہ مجالس");
    expect(studio).toContain("خمسہ مجالس");
    expect(studio).toContain("عشرۂ مجالس");
    expect(studio).toContain("ربطِ گزشتہ");
    expect(studio).toContain("اگلی مجلس کی تمہید");
  });
});

describe("Khateeb Studio curated Imamate ashra", () => {
  test("uses a hand-curated ten-session scholarly journey for Imamate", () => {
    const plan = buildMajlisSeries(getTopicDossier("imamate")!, 10);
    expect(plan.sessions).toHaveLength(10);
    expect(plan.titleUr).toContain("عشرۂ مجالس");
    expect(plan.sessions[0].titleUr).toContain("امامت کا سوال");
    expect(plan.sessions[4].titleUr).toContain("ابراہیم");
    expect(plan.sessions[9].titleUr).toContain("عہدِ زندگی");
  });

  test("every curated Imamate session has a distinct purpose, source, and takeaway", () => {
    const plan = buildMajlisSeries(getTopicDossier("imamate")!, 10);
    expect(new Set(plan.sessions.map((item) => item.titleUr)).size).toBe(10);
    for (const session of plan.sessions) {
      expect(session.purposeUr.length).toBeGreaterThan(70);
      expect(session.sourceUr.length).toBeGreaterThan(5);
      expect(session.takeawayUr?.length).toBeGreaterThan(20);
      expect(session.avoidRepeatUr?.length).toBeGreaterThan(20);
    }
  });

  test("curated Imamate ashra deliberately includes Pakistani and Indian scholarship", () => {
    const plan = buildMajlisSeries(getTopicDossier("imamate")!, 10);
    const sources = plan.sessions.map((item) => item.sourceUr).join(" ");
    expect(sources).toContain("طالب جوہری");
    expect(sources).toContain("علی نقی نقوی");
  });

  test("curated Imamate Urdu contains no English words", () => {
    const plan = buildMajlisSeries(getTopicDossier("imamate")!, 10);
    const payload = [
      plan.titleUr,
      plan.aimUr,
      plan.finalUr,
      ...plan.sessions.flatMap((item) => [
        item.titleUr,
        item.purposeUr,
        ...item.materialUr,
        item.sourceUr,
        ...(item.quranUr ?? []),
        item.previousBridgeUr ?? "",
        item.nextBridgeUr ?? "",
        item.takeawayUr ?? "",
        item.avoidRepeatUr ?? "",
      ]),
    ].join("\n");
    expect(hasLatinWord(payload)).toBe(false);
  });

  test("series UI exposes Qur'anic foundation, takeaway, and anti-repetition guidance", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("قرآنی بنیاد");
    expect(studio).toContain("حاصلِ مجلس");
    expect(studio).toContain("تکرار سے بچیں");
  });
});

describe("Khateeb Studio curated Qur'an and guidance series", () => {
  test("uses a hand-curated khamsa for Qur'an and guidance", () => {
    const plan = buildMajlisSeries(getTopicDossier("quran-hidayat")!, 5);
    expect(plan.sessions).toHaveLength(5);
    expect(plan.titleUr).toContain("خمسۂ مجالس");
    expect(plan.sessions[0].titleUr).toContain("زندہ ہدایت");
    expect(plan.sessions[3].titleUr).toContain("اطاعتِ رسول");
    expect(plan.sessions[4].titleUr).toContain("کربلا");
  });

  test("uses the original nine majalis plus Sham-e-Ghariban as the curated ashra spine", () => {
    const plan = buildMajlisSeries(getTopicDossier("quran-hidayat")!, 10);
    expect(plan.sessions).toHaveLength(10);
    expect(plan.titleUr).toContain("عشرۂ مجالس");
    expect(plan.sessions[0].sourceUr).toContain("مجلس اول");
    expect(plan.sessions[7].sourceUr).toContain("مجلس ہشتم");
    expect(plan.sessions[8].sourceUr).toContain("مجلس نہم");
    expect(plan.sessions[9].sourceUr).toContain("شامِ غریباں");
  });

  test("every curated Qur'an series session has continuity and anti-repetition guidance", () => {
    for (const length of [5, 10] as const) {
      const plan = buildMajlisSeries(getTopicDossier("quran-hidayat")!, length);
      expect(new Set(plan.sessions.map((item) => item.titleUr)).size).toBe(length);
      for (const session of plan.sessions) {
        expect(session.purposeUr.length).toBeGreaterThan(60);
        expect(session.sourceUr.length).toBeGreaterThan(8);
        expect(session.takeawayUr?.length).toBeGreaterThan(20);
        expect(session.avoidRepeatUr?.length).toBeGreaterThan(20);
      }
    }
  });

  test("curated Qur'an and guidance Urdu contains no English words", () => {
    for (const length of [5, 10] as const) {
      const plan = buildMajlisSeries(getTopicDossier("quran-hidayat")!, length);
      const payload = [
        plan.titleUr,
        plan.aimUr,
        plan.finalUr,
        ...plan.sessions.flatMap((item) => [
          item.titleUr,
          item.purposeUr,
          ...item.materialUr,
          item.sourceUr,
          ...(item.quranUr ?? []),
          item.previousBridgeUr ?? "",
          item.nextBridgeUr ?? "",
          item.takeawayUr ?? "",
          item.avoidRepeatUr ?? "",
        ]),
      ].join("\n");
      expect(hasLatinWord(payload)).toBe(false);
    }
  });
});

describe("Khateeb Studio separates source study from fresh pulpit composition", () => {
  test("Qur'an and guidance khamsa has a newly composed pulpit layer", () => {
    const source = buildMajlisSeries(getTopicDossier("quran-hidayat")!, 5);
    const fresh = buildFreshMajlisSeries(getTopicDossier("quran-hidayat")!, 5)!;
    expect(fresh.sessions).toHaveLength(5);
    expect(fresh.titleUr).toContain("قرآن میرے فیصلوں میں کہاں ہے");
    expect(fresh.sessions.map((item) => item.titleUr)).not.toEqual(
      source.sessions.map((item) => item.titleUr),
    );
    expect(fresh.sessions[0].avoidRepeatUr).toContain("اصل ترتیب");
  });

  test("Imamate ashra has a fresh multi-source journey distinct from the research map", () => {
    const source = buildMajlisSeries(getTopicDossier("imamate")!, 10);
    const fresh = buildFreshMajlisSeries(getTopicDossier("imamate")!, 10)!;
    expect(fresh.sessions).toHaveLength(10);
    expect(fresh.titleUr).toContain("آج کیا بدلتا ہے");
    expect(fresh.sessions.map((item) => item.titleUr)).not.toEqual(
      source.sessions.map((item) => item.titleUr),
    );
    const sources = fresh.sessions.map((item) => item.sourceUr).join(" ");
    expect(sources).toContain("طالب جوہری");
    expect(sources).toContain("علی نقی نقوی");
    expect(sources).toContain("طباطبائی");
    expect(sources).toContain("مطہری");
    expect(sources).toContain("ابراہیم امینی");
    expect(sources).toContain("حامد کاشانی");
  });

  test("fresh Urdu series remains free of English vocabulary", () => {
    for (const [topicId, length] of [["quran-hidayat", 5], ["imamate", 10]] as const) {
      const plan = buildFreshMajlisSeries(getTopicDossier(topicId)!, length)!;
      const payload = [
        plan.titleUr,
        plan.aimUr,
        plan.finalUr,
        ...plan.sessions.flatMap((item) => [
          item.titleUr,
          item.purposeUr,
          ...item.materialUr,
          item.sourceUr,
          ...(item.quranUr ?? []),
          item.previousBridgeUr ?? "",
          item.nextBridgeUr ?? "",
          item.takeawayUr ?? "",
          item.avoidRepeatUr ?? "",
        ]),
      ].join("\n");
      expect(hasLatinWord(payload)).toBe(false);
    }
  });

  test("studio clearly distinguishes research map from new pulpit composition", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("نئی منبری تشکیل");
    expect(studio).toContain("تحقیقی نقشہ");
    expect(studio).toContain("کسی عالم کی مجلس دوبارہ نہیں سنائی جائے گی");
    expect(studio).toContain("یہ منبر کے لیے نئی تشکیل ہے");
  });
});

describe("Khateeb Studio originality guard", () => {
  test("fresh Qur'an and guidance khamsa passes title and structure checks", () => {
    const dossier = getTopicDossier("quran-hidayat")!;
    const research = buildMajlisSeries(dossier, 5);
    const fresh = buildFreshMajlisSeries(dossier, 5)!;
    const report = checkSeriesOriginality(fresh, research);
    expect(report.checks.find((item) => item.id === "titles")?.status).toBe("clear");
    expect(report.checks.find((item) => item.id === "structure")?.status).toBe("clear");
  });

  test("fresh Imamate ashra does not reuse research-map titles", () => {
    const dossier = getTopicDossier("imamate")!;
    const research = buildMajlisSeries(dossier, 10);
    const fresh = buildFreshMajlisSeries(dossier, 10)!;
    const report = checkSeriesOriginality(fresh, research);
    expect(report.checks.find((item) => item.id === "titles")?.status).toBe("clear");
  });

  test("a copied plan is correctly flagged for review", () => {
    const dossier = getTopicDossier("imamate")!;
    const research = buildMajlisSeries(dossier, 10);
    const report = checkSeriesOriginality(research, research);
    expect(report.status).toBe("review");
    expect(report.checks.find((item) => item.id === "titles")?.status).toBe("review");
    expect(report.checks.find((item) => item.id === "structure")?.status).toBe("review");
    expect(report.checks.find((item) => item.id === "wording")?.status).toBe("review");
  });

  test("studio shows originality checks only for fresh composition", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("اصالت و عدمِ نقل جانچ");
    expect(studio).toContain('seriesLayer === "fresh" && originalityReport');
    expect(studio).toContain("عنوانات کی آزادی");
  });
});

describe("Khateeb Studio full session workbench", () => {
  test("turns a fresh series session into timed pulpit preparation", () => {
    const series = buildFreshMajlisSeries(getTopicDossier("imamate")!, 10)!;
    const workbench = buildSessionWorkbench(series.sessions[0], 30);
    expect(workbench.blocks.length).toBe(5);
    expect(workbench.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(30);
    expect(workbench.audienceQuestionUr.length).toBeGreaterThan(30);
    expect(workbench.ownExampleUr).toContain("اپنی مثال");
    expect(workbench.voiceGuardUr.length).toBeGreaterThan(30);
  });

  test("adapts the same session to 20, 30, and 45 minutes", () => {
    const session = buildFreshMajlisSeries(getTopicDossier("quran-hidayat")!, 5)!.sessions[0];
    for (const duration of [20, 30, 45] as const) {
      const workbench = buildSessionWorkbench(session, duration);
      expect(workbench.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(duration);
    }
  });

  test("copyable Urdu workbench contains evidence, own-example slot, and voice protection", () => {
    const session = buildFreshMajlisSeries(getTopicDossier("quran-hidayat")!, 5)!.sessions[0];
    const text = buildSessionWorkbenchText(buildSessionWorkbench(session, 30), "ur");
    expect(text).toContain("قرآنی اور علمی بنیاد");
    expect(text).toContain("اپنی مثال");
    expect(text).toContain("اپنی آواز محفوظ رکھیں");
    expect(text).toContain("حاصلِ مجلس اور اختتام");
    expect(hasLatinWord(text)).toBe(false);
  });

  test("studio exposes the workbench only in fresh composition", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("اس مجلس کی مکمل منبری تیاری");
    expect(studio).toContain('seriesLayer === "fresh"');
    expect(studio).toContain("اس مجلس کی مکمل تیاری نقل کریں");
    expect(studio).toContain("اپنی آواز محفوظ رکھیں");
  });
});

describe("Khateeb Studio sermon duration", () => {
  test("twenty, thirty, and forty-five minutes change the visible brief and the amount of material", () => {
    const items = ["ایک", "دو", "تین", "چار"];
    expect(pointsForDuration(items, 20)).toEqual(["ایک"]);
    expect(pointsForDuration(items, 30)).toEqual(["ایک", "دو"]);
    expect(pointsForDuration(items, 45)).toEqual(items);
    expect(durationBrief(20, "ur")).not.toBe(durationBrief(30, "ur"));
    expect(durationBrief(30, "ur")).not.toBe(durationBrief(45, "ur"));
    expect(outlineMinutes(20).reduce((sum, item) => sum + item, 0)).toBe(20);
    expect(outlineMinutes(30).reduce((sum, item) => sum + item, 0)).toBe(30);
    expect(outlineMinutes(45).reduce((sum, item) => sum + item, 0)).toBe(45);
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("durationBrief(duration");
    expect(studio).toContain("pointsForDuration");
  });
});

describe("Khateeb Studio South Asian corpus intake", () => {
  test("starts with a substantial verified Pakistan/India intake queue", () => {
    expect(SOUTH_ASIA_CORPUS_QUEUE.length).toBeGreaterThanOrEqual(12);
    expect(new Set(SOUTH_ASIA_CORPUS_QUEUE.map((item) => item.region))).toEqual(
      new Set(["pk", "in"]),
    );
    expect(SOUTH_ASIA_CORPUS_QUEUE.every((item) => item.status === "catalog-verified")).toBe(true);
    expect(SOUTH_ASIA_CORPUS_QUEUE.every((item) => item.nextAction === "full-text-ingest")).toBe(true);
  });

  test("covers the first four priority South Asian voices", () => {
    expect(southAsiaSourcesForSpeaker("talib-johari").length).toBeGreaterThanOrEqual(5);
    expect(southAsiaSourcesForSpeaker("rashid-turabi").length).toBeGreaterThanOrEqual(3);
    expect(southAsiaSourcesForSpeaker("ali-naqi-naqvi").length).toBeGreaterThanOrEqual(2);
    expect(southAsiaSourcesForSpeaker("zeeshan-jawadi").length).toBeGreaterThanOrEqual(3);
  });

  test("does not pretend catalog metadata is already ingested sermon content", () => {
    for (const record of SOUTH_ASIA_CORPUS_QUEUE) {
      expect(record.status).toBe("catalog-verified");
      expect(record.nextAction).toBe("full-text-ingest");
      expect(record.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

describe("Khateeb Studio Naqqan full-text ingestion", () => {
  test("ingests all nine numbered majalis present in the supplied transcript", () => {
    expect(NAQQAN_ASHRA_EVIDENCE).toHaveLength(9);
    expect(NAQQAN_ASHRA_EVIDENCE.every((item) => item.speakerId === "ali-naqi-naqvi")).toBe(true);
    expect(NAQQAN_ASHRA_EVIDENCE.every((item) => item.status === "ready")).toBe(true);
    expect(NAQQAN_ASHRA_EVIDENCE.every((item) => (item.materialUr?.length ?? 0) >= 3)).toBe(true);
  });

  test("adds a selectable deep dossier for ismah", () => {
    const topic = searchTopicPreps("عصمت", "ur")[0];
    expect(topic?.id).toBe("ismah");
    const dossier = getTopicDossier("ismah");
    expect(dossier).not.toBeNull();
    expect(dossier?.perspectives.length).toBeGreaterThanOrEqual(4);
    expect(dossier?.pulpitFlowUr.length).toBeGreaterThanOrEqual(7);
  });

  test("Naqqan material now contributes directly to the Imamate topic index", () => {
    const records = evidenceForSpeakerAndTopic("ali-naqi-naqvi", "imamate");
    expect(records.length).toBeGreaterThanOrEqual(3);
    expect(records.some((item) => item.id === "naqqan-ashra-09-nubuwwah-imamate")).toBe(true);
  });

  test("speaker selection exposes actual ready Naqqan material, not a catalog link", () => {
    const records = evidenceForSpeaker("ali-naqi-naqvi");
    expect(records.length).toBeGreaterThanOrEqual(9);
    expect(records.every((item) => item.kind === "transcript")).toBe(true);
    expect(records.some((item) => item.summaryUr.includes("اصطف"))).toBe(true);
  });
});

describe("Khateeb Studio Talib Johari full-book ingestion", () => {
  test("ingests the nine numbered majalis plus Sham-e-Ghariban from Mansab-e-Hidayat", () => {
    expect(TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE).toHaveLength(10);
    expect(
      TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE.every(
        (item) => item.speakerId === "talib-johari" && item.status === "ready",
      ),
    ).toBe(true);
    expect(
      TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE.every(
        (item) => (item.materialUr?.length ?? 0) >= 3,
      ),
    ).toBe(true);
  });

  test("Talib Johari now contributes real Pakistani material to Imamate", () => {
    const records = evidenceForSpeakerAndTopic("talib-johari", "imamate");
    expect(records.length).toBeGreaterThanOrEqual(6);
    expect(records.some((item) => item.id === "talib-mansab-08-obedience-authority")).toBe(true);
    expect(records.some((item) => item.id === "talib-mansab-09-guidance-continuity")).toBe(true);
  });

  test("the main Imamate dossier now contains Talib Johari as a substantive perspective", () => {
    const dossier = getTopicDossier("imamate");
    expect(dossier?.perspectives.some((item) => item.speakerId === "talib-johari")).toBe(true);
  });

  test("Talib Johari Urdu material contains no English words", () => {
    const payload = TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE.flatMap((item) => [
      item.titleUr,
      ...item.topicsUr,
      item.summaryUr,
      ...(item.materialUr ?? []),
      ...item.takeawaysUr,
      item.sourceLabelUr,
    ]).join("\n");
    expect(hasLatinWord(payload)).toBe(false);
  });
});

describe("Khateeb Studio Qur'an and guidance deep topic", () => {
  test("adds a searchable year-round Qur'an and guidance topic", () => {
    const topic = searchTopicPreps("قرآن اور ہدایت", "ur")[0];
    expect(topic?.id).toBe("quran-hidayat");
    expect(topic?.quran.length).toBeGreaterThanOrEqual(3);
  });

  test("builds the deep dossier directly from Talib Johari's full-book material", () => {
    const dossier = getTopicDossier("quran-hidayat");
    expect(dossier).not.toBeNull();
    expect(dossier?.perspectives.length).toBeGreaterThanOrEqual(5);
    expect(dossier?.perspectives.every((item) => item.speakerId === "talib-johari")).toBe(true);
    expect(dossier?.pulpitFlowUr.length).toBeGreaterThanOrEqual(7);
  });

  test("maps the relevant Talib Johari majalis into the new topic", () => {
    const records = evidenceForSpeakerAndTopic("talib-johari", "quran-hidayat");
    expect(records.length).toBeGreaterThanOrEqual(7);
    expect(records.some((item) => item.id === "talib-mansab-01-quran-guidance")).toBe(true);
    expect(records.some((item) => item.id === "talib-mansab-08-obedience-authority")).toBe(true);
    expect(records.some((item) => item.id === "talib-mansab-09-guidance-continuity")).toBe(true);
  });

  test("Qur'an and guidance dossier Urdu is free of English vocabulary", () => {
    const dossier = getTopicDossier("quran-hidayat")!;
    const payload = [
      dossier.titleUr,
      dossier.thesisUr,
      dossier.governingQuestionUr,
      ...dossier.synthesisUr,
      dossier.closingUr,
      ...dossier.pulpitFlowUr.flatMap((item) => [item.heading, item.body]),
      ...dossier.perspectives.flatMap((item) => [
        item.nameUr,
        item.sourceTitleUr,
        item.coreUr,
        ...item.explanationUr,
        item.styleUr,
        item.useUr,
      ]),
    ].join("\n");
    expect(hasLatinWord(payload)).toBe(false);
  });

  test("single-author dossiers use an accurate Urdu heading", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("اصل ماخذ کے علمی زاویے");
  });
});

describe("Khateeb Studio Urdu language purity", () => {
  test("normalizes legacy mixed terminology into Urdu", () => {
    const mixed =
      "یہ research dossier source-backed material اور ready speaking flow دیتا ہے۔";
    const cleaned = pureKhateebUrdu(mixed);
    expect(cleaned).toContain("تحقیقی دستاویز");
    expect(cleaned).toContain("ماخذ سے ثابت شدہ");
    expect(cleaned).toContain("قابلِ بیان منبری ترتیب");
    expect(hasLatinWord(cleaned)).toBe(false);
  });

  test("new Urdu UI wording avoids internal engineering vocabulary", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("تحقیقی دستاویز نقل کریں");
    expect(studio).toContain("مرکزی مقدمہ");
    expect(studio).toContain("قابلِ بیان منبری ترتیب");
    expect(studio).toContain("ماخذ سے ثابت شدہ تیار مواد");
  });

  test("Ismah dossier contains no English words in any Urdu user-facing field", () => {
    const dossier = getTopicDossier("ismah")!;
    const urduPayload = [
      dossier.titleUr,
      dossier.thesisUr,
      dossier.governingQuestionUr,
      ...dossier.synthesisUr,
      dossier.closingUr,
      ...dossier.pulpitFlowUr.flatMap((item) => [item.heading, item.body]),
      ...dossier.perspectives.flatMap((item) => [
        item.nameUr,
        item.sourceTitleUr,
        item.coreUr,
        ...item.explanationUr,
        item.styleUr,
        item.useUr,
      ]),
    ].join("\n");
    expect(hasLatinWord(urduPayload)).toBe(false);
  });

  test("Naqqan topic-index material is also clean Urdu", () => {
    const records = evidenceForTopic("ismah");
    const urduPayload = records.flatMap((item) => [
      item.titleUr,
      ...item.topicsUr,
      item.summaryUr,
      ...(item.materialUr ?? []),
      ...item.takeawaysUr,
      item.sourceLabelUr,
    ]).join("\n");
    expect(hasLatinWord(urduPayload)).toBe(false);
  });

  test("Urdu UI never shows the English source-backed badge", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain('{ur ? "ماخذ سے ثابت شدہ" : "source-backed"}');
  });
});

describe("Khateeb Studio refresh", () => {
  test("restores the opened topic, speaker, and preparation step", () => {
    const view = parseKhateebStudioView({
      step: "3",
      mode: "topic",
      topic: "ismah",
      speaker: "ali-naqi-naqvi",
      duration: "45",
    });
    expect(view).toMatchObject({
      step: 3,
      mode: "topic",
      topic: "ismah",
      speaker: "ali-naqi-naqvi",
      duration: 45,
    });
    const again = parseKhateebStudioView(
      Object.fromEntries(new URLSearchParams(khateebStudioQuery(view))),
    );
    expect(again).toEqual(view);
  });

  test("keeps an opened occasion instead of returning to the studio start", () => {
    const event = groupCalendarEvents(
      SHIA_CALENDAR_1448_EVENTS.filter((item) => item.month === "muharram"),
    )[0];
    const view = parseKhateebStudioView({
      step: "3",
      mode: "occasion",
      month: "muharram",
      event: event.key,
    });
    expect(view.step).toBe(3);
    expect(view.mode).toBe("occasion");
    expect(view.month).toBe("muharram");
    expect(view.event).toBe(event.key);
  });

  test("an empty address stays on the main studio", () => {
    const view = parseKhateebStudioView({});
    expect(view).toMatchObject({ step: 1, mode: "topic", topic: "sabr", speaker: "" });
    expect(khateebStudioQuery(view)).toBe("");
  });

  test("address update keeps unrelated parameters", () => {
    const next = applyKhateebStudioQuery("?lang=ur", {
      step: 3,
      mode: "topic",
      topic: "imamate",
      speaker: "",
      month: "rabi-al-thani",
      region: "all",
      event: "",
      duration: 30,
      series: 1,
    });
    const params = new URLSearchParams(next);
    expect(params.get("lang")).toBe("ur");
    expect(params.get("step")).toBe("3");
    expect(params.get("topic")).toBe("imamate");
  });
});
