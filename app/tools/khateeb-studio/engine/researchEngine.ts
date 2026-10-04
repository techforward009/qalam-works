import { ahmedgrafQuranReference } from "../../arabic-diacritics/quran/ahmedgrafProvider";
import { SPEAKER_EVIDENCE } from "./speakerEvidence";
import {
  preferredIslamicDiscoveryProviders,
  sourceProviderForUrl,
} from "./islamicSourceRegistry";
import { getTopicDossier } from "./topicDossier";
import { TOPIC_PREPS, type TopicPrep } from "./topicPrep";
import { quranEvidenceForTopic } from "./quranTopicIndex";
import { verifiedLiveHadithEvidenceForQuery, verifiedLiveHadithTopicIds } from "./verifiedLiveTopicHadiths";
import {
  hadithRecordForDossierText,
  verifiedHadithForDossierText,
} from "./verifiedHadithCorpus";
import type {
  KhateebResearchEvidence,
  KhateebResearchRequest,
  KhateebResearchResult,
} from "./researchTypes";

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/\s+/gu, " ")
    .trim();
}

function topicHaystack(topic: TopicPrep): string {
  return normalize(
    [
      topic.titleUr,
      topic.titleEn,
      topic.themeUr,
      topic.themeEn,
      ...topic.keywordsUr,
      ...topic.keywordsEn,
    ].join(" "),
  );
}

const SEARCH_STOP_WORDS = new Set([
  "میں",
  "سے",
  "کے",
  "کی",
  "کا",
  "کو",
  "اور",
  "ہے",
  "ہیں",
  "ایک",
  "یہ",
  "وہ",
  "موضوع",
  "پر",
  "the",
  "a",
  "an",
  "of",
  "and",
  "in",
  "on",
  "for",
  "topic",
]);

function topicScore(topic: TopicPrep, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const haystack = topicHaystack(topic);
  if (haystack.includes(q)) return 100 + q.length;

  const tokens = Array.from(
    new Set(
      q
        .split(" ")
        .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token)),
    ),
  );
  if (!tokens.length) return 0;

  const matched = tokens.filter((token) => haystack.includes(token)).length;
  if (tokens.length === 1) return matched ? 10 : 0;
  if (matched < 2) return 0;
  return matched * 10;
}

function matchedTopics(query: string): readonly TopicPrep[] {
  return TOPIC_PREPS
    .map((topic) => ({ topic, score: topicScore(topic, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.topic);
}

function pushUnique(
  target: KhateebResearchEvidence[],
  seen: Set<string>,
  row: KhateebResearchEvidence,
): void {
  const key = [row.kind, row.status, row.citationUr, row.detailUr].join("|");
  if (seen.has(key)) return;
  seen.add(key);
  target.push(row);
}

export function researchKhateebTopic(
  request: KhateebResearchRequest,
): KhateebResearchResult {
  const query = request.query.trim();
  const locale = request.locale === "en" ? "en" : "ur";
  const maxEvidence = Math.min(Math.max(request.maxEvidence ?? 40, 5), 100);
  const topics = matchedTopics(query);
  const evidence: KhateebResearchEvidence[] = [];
  const seen = new Set<string>();

  for (const row of quranEvidenceForTopic(query, 8)) {
    pushUnique(evidence, seen, row);
  }

  for (const row of verifiedLiveHadithEvidenceForQuery(query, 8)) {
    pushUnique(evidence, seen, row);
  }

  const liveHadithTopicIds = verifiedLiveHadithTopicIds(query);

  for (const topic of topics) {
    const dossier = getTopicDossier(topic.id);

    for (const row of dossier?.primaryTexts ?? []) {
      let arabic = row.sourceArabicMarked || row.sourceArabic || row.arabic;
      let citationUr = row.sourceRefUr;
      let citationEn = row.sourceRefEn;
      let sourceUrl = row.sourceUrl;
      let status: KhateebResearchEvidence["status"] = "verified";

      if (row.kind === "quran" && row.quranLocation) {
        arabic =
          ahmedgrafQuranReference.getAyah(
            row.quranLocation.surah,
            row.quranLocation.ayah,
          )?.text ?? "";
        citationUr = row.refUr;
        citationEn = row.refEn;
      }

      if (row.kind === "hadith") {
        const inventory = hadithRecordForDossierText(row.id);
        const verified = inventory
          ? verifiedHadithForDossierText(row.id)
          : null;

        if (verified) {
          arabic = verified.exactArabic;
          citationUr = verified.verifiedReferenceUr ?? verified.citedReferenceUr;
          citationEn = verified.verifiedReferenceEn ?? verified.citedReferenceEn;
          sourceUrl = verified.verifiedSourceUrl ?? verified.sourceUrl;
        } else {
          status = "source-lead";
          arabic = undefined;
          if (inventory) {
            citationUr = inventory.citedReferenceUr;
            citationEn = inventory.citedReferenceEn;
            sourceUrl = inventory.sourceUrl;
          }
        }
      }

      pushUnique(evidence, seen, {
        id: `${topic.id}-primary-${row.id}`,
        topicId: topic.id,
        kind: row.kind,
        status,
        titleUr: row.refUr,
        titleEn: row.refEn,
        detailUr:
          status === "source-lead" && row.kind === "hadith"
            ? `${row.explanationUr} — اصل متن کی لفظ بہ لفظ ماخذی تصدیق ابھی باقی ہے؛ غیر درج شدہ روایت بھی خودکار طور پر مصدقہ نہیں مانی جائے گی۔`
            : row.explanationUr,
        detailEn:
          status === "source-lead" && row.kind === "hadith"
            ? `${row.explanationEn} — The exact source text still needs word-for-word verification; an untracked narration is never auto-promoted to verified.`
            : row.explanationEn,
        citationUr,
        citationEn,
        sourceUrl,
        providerId: sourceProviderForUrl(sourceUrl)?.id,
        arabic,
      });
    }

    for (const perspective of dossier?.perspectives ?? []) {
      for (const section of perspective.sourceGroundedUr ?? []) {
        pushUnique(evidence, seen, {
          id: `${topic.id}-scholar-${perspective.id}-${section.heading}`,
          topicId: topic.id,
          kind: "scholar",
          status: "verified",
          titleUr: `${perspective.nameUr} — ${section.heading}`,
          titleEn: perspective.nameEn,
          detailUr: section.explanation,
          detailEn:
            perspective.sourceGroundedEn?.find(
              (item) => item.heading === section.heading,
            )?.explanation ?? perspective.coreEn,
          citationUr: section.exactRef,
          citationEn:
            perspective.sourceGroundedEn?.find(
              (item) => item.heading === section.heading,
            )?.exactRef ?? perspective.sourceTitleEn,
          sourceUrl: section.sourceUrl ?? perspective.sourceUrl,
          providerId: sourceProviderForUrl(section.sourceUrl ?? perspective.sourceUrl)?.id,
        });
      }
    }

    for (const source of topic.sources) {
      pushUnique(evidence, seen, {
        id: `${topic.id}-source-${source.labelUr}`,
        topicId: topic.id,
        kind: "source",
        status: "source-lead",
        titleUr: source.labelUr,
        titleEn: source.labelEn,
        detailUr: source.detailUr,
        detailEn: source.detailEn,
        citationUr: source.labelUr,
        citationEn: source.labelEn,
        sourceUrl: source.url,
        providerId: sourceProviderForUrl(source.url)?.id,
      });
    }

    for (const speaker of SPEAKER_EVIDENCE.filter((item) =>
      item.topicIds.includes(topic.id),
    )) {
      pushUnique(evidence, seen, {
        id: `${topic.id}-speaker-${speaker.id}`,
        topicId: topic.id,
        kind: "speaker",
        status: speaker.status === "ready" ? "verified" : "catalog-only",
        titleUr: speaker.titleUr,
        titleEn: speaker.titleEn,
        detailUr:
          speaker.status === "ready"
            ? speaker.summaryUr
            : "اس ماخذ کا ریکارڈ محفوظ ہے، مگر مکمل متن ابھی علمی ذخیرے میں شامل نہیں؛ اس لیے اس سے مخصوص دعویٰ اخذ نہیں کیا گیا۔",
        detailEn:
          speaker.status === "ready"
            ? speaker.summaryEn
            : "The source record is preserved, but its full text has not yet been ingested, so no specific claim is derived from it.",
        citationUr: speaker.sourceLabelUr,
        citationEn: speaker.sourceLabelEn,
        sourceUrl: speaker.sourceUrl,
        providerId: sourceProviderForUrl(speaker.sourceUrl)?.id,
      });
    }
  }

  const limited = evidence.slice(0, maxEvidence);
  const verifiedCount = limited.filter((item) => item.status === "verified").length;
  const sourceLeadCount = limited.filter((item) => item.status === "source-lead").length;
  const catalogOnlyCount = limited.filter((item) => item.status === "catalog-only").length;
  const hasVerifiedSermonCore = limited.some(
    (item) =>
      item.status === "verified" &&
      (item.kind === "hadith" || item.kind === "scholar"),
  );

  const gapsUr: string[] = [];
  const gapsEn: string[] = [];

  if (!topics.length && verifiedCount === 0) {
    gapsUr.push(
      "اس موضوع کے لیے ابھی مقامی مصدقہ تحقیقی اندراج موجود نہیں۔ قلم کسی آیت، روایت، قول یا حوالہ کو اندازے سے شامل نہیں کرے گا۔",
    );
    gapsEn.push(
      "No verified local research entry exists for this topic yet. Qalam will not invent a verse, narration, quotation, or citation.",
    );
  } else if (!topics.length && verifiedCount > 0) {
    gapsUr.push(
      "موضوع سے متعلق قرآنی بنیاد داخلی احمد گراف ذخیرے سے مل گئی ہے؛ روایت اور علمی توضیح کے لیے مزید مصدقہ ماخذ درکار ہیں۔",
    );
    gapsEn.push(
      "A Qur'anic foundation was found in the internal AhmedGraf corpus; verified narration and scholarly material are still needed.",
    );
  } else if (!verifiedCount) {
    gapsUr.push(
      "موضوع کی شناخت موجود ہے، مگر قابلِ استناد بنیادی مواد ابھی کافی نہیں؛ پہلے مصدقہ ماخذ شامل کرنا ضروری ہے۔",
    );
    gapsEn.push(
      "The topic is recognized, but there is not yet enough verified evidence to build a sourced sermon.",
    );
  }

  return {
    query,
    locale,
    matchedTopicIds: Array.from(new Set([...topics.map((topic) => topic.id), ...liveHadithTopicIds])),
    evidence: limited,
    verifiedCount,
    sourceLeadCount,
    catalogOnlyCount,
    canBuildSermon: hasVerifiedSermonCore,
    providerHints: preferredIslamicDiscoveryProviders().map((provider) => ({
      id: provider.id,
      nameUr: provider.nameUr,
      nameEn: provider.nameEn,
      baseUrl: provider.baseUrl,
    })),
    gapsUr,
    gapsEn,
  };
}
