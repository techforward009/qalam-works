import { KHATEEB_CORPUS, type KhateebProfile } from "./khateebCorpus";
import {
  SPEAKER_EVIDENCE,
  normalizeSpeakerEvidenceUrdu,
  type SpeakerEvidence,
} from "./speakerEvidence";

export type ScholarCorpusStatus =
  | "registry-only"
  | "source-backed"
  | "indexed";

export type ScholarCorpusSource = {
  key: string;
  labelUr: string;
  labelEn: string;
  url: string;
  kinds: readonly SpeakerEvidence["kind"][];
  recordIds: readonly string[];
};

export type ScholarCorpusEntry = {
  profile: KhateebProfile;
  status: ScholarCorpusStatus;
  readyRecordCount: number;
  catalogRecordCount: number;
  topicIds: readonly string[];
  sources: readonly ScholarCorpusSource[];
  evidence: readonly SpeakerEvidence[];
};

function sourceKey(record: SpeakerEvidence): string {
  return `${record.sourceUrl}::${record.sourceLabelUr}`;
}

function buildSources(records: readonly SpeakerEvidence[]): ScholarCorpusSource[] {
  const groups = new Map<string, SpeakerEvidence[]>();

  for (const record of records) {
    const key = sourceKey(record);
    const current = groups.get(key) ?? [];
    current.push(record);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([key, grouped]) => ({
    key,
    labelUr: grouped[0].sourceLabelUr,
    labelEn: grouped[0].sourceLabelEn,
    url: grouped[0].sourceUrl,
    kinds: [...new Set(grouped.map((record) => record.kind))],
    recordIds: grouped.map((record) => record.id),
  }));
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

  const status: ScholarCorpusStatus =
    readyEvidence.length === 0
      ? "registry-only"
      : topicIds.length > 0
        ? "indexed"
        : "source-backed";

  return {
    profile,
    status,
    readyRecordCount: readyEvidence.length,
    catalogRecordCount,
    topicIds,
    sources: buildSources(allEvidence),
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
