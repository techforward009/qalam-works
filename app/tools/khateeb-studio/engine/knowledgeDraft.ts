import { researchSummaryText } from "../../../lib/knowledge/researchAnswer";
import { completeQuranTranslationFor } from "../../../lib/knowledge/completeQuranTranslations";
import { QURAN_TRANSLATION_SOURCES } from "./quranTranslationProvider";
import type { KnowledgeResult } from "../../../lib/knowledge/retrieval";
import { createCustomSermonProject, buildCustomSermonSections } from "./customSermonProject";
import type { SermonDuration } from "./sermonPrep";

export function createKnowledgeDraft(result: KnowledgeResult, selected: readonly string[], locale: "ur" | "en", duration: SermonDuration) {
  const passages = result.passages.filter(p => selected.includes(p.id));
  if (!passages.length || result.status !== "evidence") throw new Error("no-evidence");
  const ur = locale === "ur";
  const project = createCustomSermonProject({ kind: "majlis", title: result.question, objective: ur ? "منتخب اصل عبارتوں سے موضوع کی تیاری؛ تشریح اور ربط خطیب مکمل کرے" : "Prepare the topic from selected source passages; add your explanation and transitions", duration });
  // Quran translation is edition-linked ONLY when it exactly matches the
  // application's complete, named translation corpus for this ayah.
  // A supplied translator label alone does not prove edition fidelity.
  const quran = passages.filter(p => p.quranLocation).map(p => {
    const location=p.quranLocation!;
    const expectedTranslator=locale==="ur"?QURAN_TRANSLATION_SOURCES.ur.translatorUr:QURAN_TRANSLATION_SOURCES.en.translatorEn;
    const namedEdition=Boolean(p.suppliedTranslation
      && p.suppliedTranslation.language===locale
      && p.suppliedTranslation.translator===expectedTranslator
      && p.suppliedTranslation.text===completeQuranTranslationFor(location.surah,location.ayah,locale));
    return ({ id: p.id, kind: "quran" as const, status: "verified" as const, titleUr: p.referenceUr, titleEn: p.referenceEn, detailUr: p.suppliedTranslation?.language === "ur" ? `${p.suppliedTranslation.text}\nمترجم: ${p.suppliedTranslation.translator}` : "احمدگراف قرآنی مسودے کی اصل عبارت", detailEn: p.suppliedTranslation?.language === "en" ? `${p.suppliedTranslation.text}\nTranslator: ${p.suppliedTranslation.translator}` : "Original Ahmedgraf Quran corpus text", citationUr: p.referenceUr, citationEn: p.referenceEn, arabic: p.text,
    sourceSha256: p.sourceSha256,
    sourceReviewStatus: /^[a-f0-9]{64}$/u.test(p.sourceSha256) ? "corpus-linked" as const : "untraced" as const,
    translationSourceId: p.suppliedTranslation?.sourceId,
    translationSha256: p.suppliedTranslation?.sourceSha256,
    translationReviewStatus: namedEdition || p.suppliedTranslation?.sourceId && /^[a-f0-9]{64}$/u.test(p.suppliedTranslation.sourceSha256??"") ? "source-linked" as const : "supplied-unreviewed" as const,
    translationSource: namedEdition ? (locale==="ur"?QURAN_TRANSLATION_SOURCES.ur.sourceLabelUr:QURAN_TRANSLATION_SOURCES.en.sourceLabelEn) : p.suppliedTranslation?.source
  });
  });
  const summary = researchSummaryText(result.research, passages, locale);
  const sections = buildCustomSermonSections("majlis", duration, quran).map(section => section.kind === "editorial-bridge" && summary ? { ...section, provenance: "editorial" as const, userText: summary } : section);
  return { ...project, sections, evidence: quran, selectedEvidenceIds: quran.map(p => p.id), bookExcerpts: passages.flatMap(p => p.excerpt ? [{ ...p.excerpt, ...(p.suppliedTranslation ? { suppliedTranslation: p.suppliedTranslation } : {}) }] : []), ownMaterial: ur ? "یہ ماخذی مواد کا مسودہ ہے۔ آیات اور کتابی اقتباسات الگ محفوظ ہیں؛ منبری تشریح ابھی مکمل کرنا باقی ہے۔" : "This is a source-material draft. Verses and book quotations are saved separately; sermon explanation remains to be written." };
}
