import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { KHATEEB_CALENDAR_SOURCE_ARCHIVE } from "../app/tools/khateeb-studio/engine/calendarSourceArchive";
import { KHATEEB_CORPUS } from "../app/tools/khateeb-studio/engine/khateebCorpus";
import { RABI_AL_THANI_1448_EVENTS, SHIA_CALENDAR_1448_EVENTS } from "../app/tools/khateeb-studio/engine/shiaCalendar";
import { buildPreparationText, getSermonPrep, outlineMinutes } from "../app/tools/khateeb-studio/engine/sermonPrep";
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
    expect(studio).toContain("فرضی خلاصہ نہیں دکھا رہا");
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
    expect(studio).toContain("اس خطیب کے index شدہ موضوعات");
    expect(studio).toContain("No verified speaker material is indexed to this topic yet");
  });

  test("bare external links are not presented as the material itself", () => {
    const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
    expect(studio).toContain("خطابت کے لیے تیار مواد");
    expect(studio).toContain("اس خطیب کا اصل متن ابھی ingest نہیں ہوا");
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
    expect(text).toContain("منبری synthesis");
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
    expect(studio).toContain("قابلِ بیان منبری flow");
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
