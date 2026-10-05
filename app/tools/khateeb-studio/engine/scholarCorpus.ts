import { KHATEEB_CORPUS, type KhateebProfile } from "./khateebCorpus";
import {
  SPEAKER_EVIDENCE,
  normalizeSpeakerEvidenceUrdu,
  type SpeakerEvidence,
} from "./speakerEvidence";
import {
  southAsiaSourcesForSpeaker,
  type SouthAsiaCorpusRecord,
} from "./southAsianCorpusQueue";

export type ScholarCorpusStatus =
  | "registry-only"
  | "source-backed"
  | "indexed";

export type ScholarCorpusSourceStatus =
  | "catalog-only"
  | "partially-indexed"
  | "indexed";

export type ScholarCorpusSource = {
  key: string;
  catalogId?: string;
  labelUr: string;
  labelEn: string;
  url: string;
  kinds: readonly string[];
  recordIds: readonly string[];
  readyRecordIds: readonly string[];
  topicHints: readonly string[];
  status: ScholarCorpusSourceStatus;
};

export type ScholarCorpusEntry = {
  profile: KhateebProfile;
  status: ScholarCorpusStatus;
  readyRecordCount: number;
  catalogRecordCount: number;
  catalogSourceCount: number;
  indexedSourceCount: number;
  partialSourceCount: number;
  topicIds: readonly string[];
  sources: readonly ScholarCorpusSource[];
  evidence: readonly SpeakerEvidence[];
};

function evidenceSourceKey(record: SpeakerEvidence): string {
  return `${record.sourceUrl}::${record.sourceLabelUr}`;
}

function sourceStatus(
  readyCount: number,
  hasCatalogRecord: boolean,
): ScholarCorpusSourceStatus {
  if (readyCount === 0) return "catalog-only";
  if (hasCatalogRecord) return "partially-indexed";
  return "indexed";
}

function catalogSource(
  record: SouthAsiaCorpusRecord,
  evidence: readonly SpeakerEvidence[],
): ScholarCorpusSource {
  const related = evidence.filter((item) => item.sourceUrl === record.sourceUrl);
  const ready = related.filter((item) => item.status === "ready");

  return {
    key: `catalog::${record.id}`,
    catalogId: record.id,
    labelUr: record.titleUr,
    labelEn: record.titleEn,
    url: record.sourceUrl,
    kinds: [record.kind],
    recordIds: related.map((item) => item.id),
    readyRecordIds: ready.map((item) => item.id),
    topicHints: record.topicHints,
    status: sourceStatus(ready.length, true),
  };
}

function evidenceOnlySources(
  records: readonly SpeakerEvidence[],
  catalog: readonly SouthAsiaCorpusRecord[],
): ScholarCorpusSource[] {
  const catalogUrls = new Set(catalog.map((item) => item.sourceUrl));
  const groups = new Map<string, SpeakerEvidence[]>();

  for (const record of records) {
    if (catalogUrls.has(record.sourceUrl)) continue;
    const key = evidenceSourceKey(record);
    const current = groups.get(key) ?? [];
    current.push(record);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([key, grouped]) => {
    const ready = grouped.filter((item) => item.status === "ready");
    return {
      key,
      labelUr: grouped[0].sourceLabelUr,
      labelEn: grouped[0].sourceLabelEn,
      url: grouped[0].sourceUrl,
      kinds: [...new Set(grouped.map((record) => record.kind))],
      recordIds: grouped.map((record) => record.id),
      readyRecordIds: ready.map((record) => record.id),
      topicHints: [],
      status: sourceStatus(ready.length, false),
    };
  });
}

function buildSources(
  speakerId: string,
  evidence: readonly SpeakerEvidence[],
): ScholarCorpusSource[] {
  const catalog = southAsiaSourcesForSpeaker(speakerId);
  return [
    ...catalog.map((record) => catalogSource(record, evidence)),
    ...evidenceOnlySources(evidence, catalog),
  ];
}

export function corpusEntryForScholar(speakerId: string): ScholarCorpusEntry | null {
  const profile = KHATEEB_CORPUS.find((item) => item.id === speakerId);
  if (!profile) return null;

  const allEvidence = SPEAKER_EVIDENCE.filter(
    (record) => record.speakerId === speakerId,
  );
  const readyEvidence = allEvidence
    .filter((record) => record.status === "ready")
    .map(normalizeSpeakerEvidenceUrdu);
  const catalogRecordCount = allEvidence.filter(
    (record) => record.status === "catalog-only",
  ).length;
  const topicIds = [
    ...new Set(readyEvidence.flatMap((record) => [...record.topicIds])),
  ];
  const sources = buildSources(speakerId, allEvidence);
  const hasKnownSource = sources.length > 0 || allEvidence.length > 0;

  const status: ScholarCorpusStatus =
    readyEvidence.length > 0 && topicIds.length > 0
      ? "indexed"
      : hasKnownSource
        ? "source-backed"
        : "registry-only";

  return {
    profile,
    status,
    readyRecordCount: readyEvidence.length,
    catalogRecordCount,
    catalogSourceCount: sources.filter((item) => item.catalogId).length,
    indexedSourceCount: sources.filter((item) => item.status === "indexed").length,
    partialSourceCount: sources.filter(
      (item) => item.status === "partially-indexed",
    ).length,
    topicIds,
    sources,
    evidence: readyEvidence,
  };
}

export function readyEvidenceForScholar(
  speakerId: string,
): readonly SpeakerEvidence[] {
  return corpusEntryForScholar(speakerId)?.evidence ?? [];
}

export const SCHOLAR_CORPUS: readonly ScholarCorpusEntry[] =
  KHATEEB_CORPUS.map((profile) => corpusEntryForScholar(profile.id))
    .filter((entry): entry is ScholarCorpusEntry => entry !== null);

export const INDEXED_SCHOLAR_CORPUS: readonly ScholarCorpusEntry[] =
  SCHOLAR_CORPUS.filter((entry) => entry.status === "indexed");
