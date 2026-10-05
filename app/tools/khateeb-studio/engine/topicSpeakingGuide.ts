import parents from "./speakingGuides/parents-barsi.json";
import quran from "./speakingGuides/quran-hidayat.json";
import ismah from "./speakingGuides/ismah.json";
import sabr from "./speakingGuides/sabr.json";
import tawhid from "./speakingGuides/tawhid.json";
import imamate from "./speakingGuides/imamate.json";
import dua from "./speakingGuides/dua.json";
import youth from "./speakingGuides/youth.json";
import family from "./speakingGuides/family.json";
import ghibah from "./speakingGuides/ghibah.json";
import justice from "./speakingGuides/justice.json";
import rizq from "./speakingGuides/rizq.json";
import { DEATH_SPEAKING_GUIDE, buildDeathSpeakingGuideText, deathGuideMinutes, type SpeakingGuideMode } from "./deathSpeakingGuide";
import { TOPIC_PREPS, topicTitle, type TopicPrep } from "./topicPrep";
import { ahmedgrafQuranReference } from "../../arabic-diacritics/quran/ahmedgrafProvider";
import { quranLocationsFromReference, quranTranslationFor, QURAN_TRANSLATION_SOURCES } from "./quranTranslationProvider";
import type { SermonDuration, SermonLocale } from "./sermonPrep";
import type { SpeakerEvidence } from "./speakerEvidence";
import { KHATEEB_CORPUS } from "./khateebCorpus";
import { speakerName } from "./khateebLocale";
import { pureKhateebUrdu } from "./urduPurity";
import deliveryParagraphs from "./speakingGuides/deliveryParagraphs.json";

type Bilingual = { ur: string; en: string };
export type TopicGuideDraft = {
  point: Bilingual;
  explanation: Bilingual;
  example: Bilingual;
  question: Bilingual;
  action: Bilingual;
};
export type TopicGuideSection = TopicGuideDraft & { id: string; heading: Bilingual; transition: Bilingual; delivery: Bilingual };
const CONTENT: Record<string, readonly TopicGuideDraft[]> = {
  "parents-barsi": parents, "quran-hidayat": quran, ismah, sabr, tawhid, imamate, dua, youth, family, ghibah, justice, rizq,
};
export function topicGuideSourceLeads(topic: TopicPrep, locale: SermonLocale) {
  const urdu = (value: string) => pureKhateebUrdu(value).replace(/\bverify\b/gi, "جانچ").replace(/\btranscript\b/gi, "مکتوب خطاب").replace(/\banchors\b/gi, "بنیادی آیات");
  return topic.sources.map(source => ({ label: locale === "ur" ? urdu(source.labelUr) : source.labelEn, detail: locale === "ur" ? urdu(source.detailUr) : source.detailEn }));
}
export function topicGuideSections(topic: TopicPrep): readonly TopicGuideSection[] {
  if (topic.id === "death-akhirah") return DEATH_SPEAKING_GUIDE.map(section => ({ ...section, explanation: { ur: section.explanation.ur.join("\n\n"), en: section.explanation.en.join("\n\n") } }));
  return (CONTENT[topic.id] ?? []).map((section, index) => ({
    ...section, id: `${topic.id}-${index + 1}`,
    delivery: (deliveryParagraphs as Record<string, Bilingual[]>)[topic.id][index],
    heading: { ur: topic.anglesUr[index], en: topic.anglesEn[index] },
    transition: index + 1 < topic.anglesUr.length
      ? { ur: `یہاں سے اگلا سوال کھولیں: ${CONTENT[topic.id][index + 1].question.ur}`, en: `Develop the next question: ${CONTENT[topic.id][index + 1].question.en}` }
      : { ur: "اب ان نکات کو جمع کرکے سامع کو ایک واضح اور ممکن عملی قدم کی طرف لائیں۔", en: "Bring these points together and invite one clear, possible action." },
  }));
}
export function topicGuideMinutes(topic: TopicPrep, duration: SermonDuration): readonly number[] {
  if (topic.id === "death-akhirah") return deathGuideMinutes(duration);
  const count = topicGuideSections(topic).length;
  if (!count) return [];
  const edge = duration === 20 ? 2 : duration === 30 ? 3 : 5;
  const remaining = duration - edge * 2;
  const base = Math.floor(remaining / count);
  const extra = remaining % count;
  return [edge, ...Array.from({ length: count }, (_, index) => base + (index < extra ? 1 : 0)), edge];
}
export function relatedSpeakingMaterialText(topicId: string, locale: SermonLocale, mode: SpeakingGuideMode, records: readonly SpeakerEvidence[]): string {
  const ur = locale === "ur";
  const relevant = records.filter(record => record.status === "ready" && record.topicIds.includes(topicId));
  if (!relevant.length) return "";
  const lines = [ur ? "متعلقہ علمی مواد اور کتابی حوالے" : "Related study material and book references", ur ? "قلم ورکس کے تدوینی خلاصے — اصل کتاب کے لفظی اقتباسات نہیں" : "Qalam Works editorial summaries — not verbatim book quotations"];
  for (const record of relevant) {
    const speaker = KHATEEB_CORPUS.find(item => item.id === record.speakerId);
    lines.push("", ur ? record.titleUr : record.titleEn);
    if (speaker) lines.push(speakerName(speaker, ur));
    lines.push(ur ? record.summaryUr : record.summaryEn);
    if (mode === "detailed") lines.push(...(ur ? record.materialUr ?? [] : record.materialEn ?? []));
    lines.push(`${ur ? "اصل ماخذ" : "Primary source"}: ${ur ? record.sourceLabelUr : record.sourceLabelEn}`);
    if (record.sourceUrl) lines.push(record.sourceUrl);
  }
  return lines.join("\n");
}
export function buildTopicSpeakingGuideText(topic: TopicPrep, locale: SermonLocale, duration: SermonDuration, mode: SpeakingGuideMode, records: readonly SpeakerEvidence[] = []): string {
  if (topic.id === "death-akhirah") return buildDeathSpeakingGuideText(locale, duration, mode, records);
  const ur = locale === "ur";
  const sections = topicGuideSections(topic);
  if (!sections.length) return "";
  const minutes = topicGuideMinutes(topic, duration);
  const lines = [topicTitle(topic, locale), `${duration} ${ur ? "منٹ کا مجوزہ خاکہ" : "minute suggested outline"}`, ur ? "بیان کی رہنمائی — قلم ورکس کی تدوین؛ مثالیں فرضی ہیں، اصل آیات اور تراجم الگ درج ہیں۔" : "Speaking guide — Qalam Works editorial material; examples are hypothetical and verses and translations are identified separately.", `${ur ? "آغاز" : "Opening"} — ${minutes[0]} ${ur ? "منٹ" : "min"}`, ur ? topic.openingUr : topic.openingEn, ur ? topic.themeUr : topic.themeEn, "", ur ? "اصل قرآنی بنیاد" : "Qur'anic source verses"];
  const seen = new Set<string>();
  for (const anchor of topic.quran) for (const location of quranLocationsFromReference(anchor.ref)) {
    const key = `${location.surah}:${location.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const arabic = ahmedgrafQuranReference.getAyah(location.surah, location.ayah)?.text;
    const translation = quranTranslationFor(location.surah, location.ayah, locale);
    lines.push(key);
    if (arabic) lines.push(arabic);
    if (translation) lines.push(translation, QURAN_TRANSLATION_SOURCES[locale][ur ? "sourceLabelUr" : "sourceLabelEn"]);
  }
  for (const [index, section] of sections.entries()) {
    lines.push("", `${section.heading[locale]} — ${minutes[index + 1]} ${ur ? "منٹ" : "min"}`, section.point[locale]);
    if (mode === "detailed") lines.push(ur ? "براہِ راست قابلِ بیان عبارت — قلم ورکس کی تدوین" : "Ready-to-deliver paragraph — Qalam Works editorial material", section.delivery[locale], ur ? "خطیبانہ وضاحت — تدوینی مواد" : "Speaking explanation — editorial material", section.explanation[locale], `${ur ? "فرضی روزمرہ مثال" : "Hypothetical everyday example"}: ${section.example[locale]}`);
    lines.push(`${ur ? "سامعین سے سوال" : "Audience question"}: ${section.question[locale]}`, `${ur ? "عملی قدم" : "Practical step"}: ${section.action[locale]}`);
    if (mode === "detailed") lines.push(`${ur ? "اگلے حصے سے ربط" : "Transition"}: ${section.transition[locale]}`);
  }
  lines.push("", `${ur ? "اختتام اور دعوتِ عمل" : "Closing and action"} — ${minutes[minutes.length - 1]} ${ur ? "منٹ" : "min"}`, ur ? "مرکزی سوال کی طرف واپس آئیں۔ سامع سے ایک ممکن عمل اور اس کا وقت منتخب کرنے کو کہیں، پھر عمل کی توفیق کی دعا کریں۔" : "Return to the opening question. Invite listeners to choose one possible action and a time for it, then pray for the strength to act.", "", ur ? "مزید مطالعے کے ماخذ — مکمل اصل حوالہ دیکھ کر استعمال کریں" : "Further-study leads — consult the full original source before using a passage");
  for (const source of topicGuideSourceLeads(topic, locale)) lines.push(source.label, source.detail);
  const related = relatedSpeakingMaterialText(topic.id, locale, mode, records);
  if (related) lines.push("", related);
  return lines.join("\n");
}
export function speakingGuideCoverage() {
  return TOPIC_PREPS.map(topic => ({ topicId: topic.id, angles: topic.anglesUr.length, sections: topicGuideSections(topic).length }));
}
