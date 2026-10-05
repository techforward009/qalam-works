import { KHATEEB_CORPUS } from "./khateebCorpus";
import { readyEvidenceForScholar } from "./scholarCorpus";
import {
  SPEAKER_EVIDENCE,
  normalizeSpeakerEvidenceUrdu,
  type SpeakerEvidence,
} from "./speakerEvidence";
import { TOPIC_PREPS, type TopicPrep } from "./topicPrep";
import { SHIA_CALENDAR_1448_EVENTS } from "./shiaCalendar";

export type SpeakerTopicIndexRow = {
  topic: TopicPrep;
  records: readonly SpeakerEvidence[];
};

export type TopicSpeakerIndexRow = {
  speakerId: string;
  records: readonly SpeakerEvidence[];
};

/**
 * Evidence is stored once, then projected in both directions:
 * speaker -> topics and topic -> speakers.
 *
 * No inference is performed here. A record only appears under a topic when
 * that record explicitly carries the topic id in `topicIds`.
 */
export function evidenceForTopic(topicId: string): readonly SpeakerEvidence[] {
  return SPEAKER_EVIDENCE.filter(
    (record) =>
      record.status === "ready" && record.topicIds.includes(topicId),
  ).map(normalizeSpeakerEvidenceUrdu);
}

export function evidenceForOccasion(occasionId: string): readonly SpeakerEvidence[] {
  return SPEAKER_EVIDENCE.filter(
    (record) =>
      record.status === "ready" && record.occasionIds?.includes(occasionId),
  ).map(normalizeSpeakerEvidenceUrdu);
}

export function evidenceForOccasions(
  occasionIds: readonly string[],
): readonly SpeakerEvidence[] {
  const ids = new Set(occasionIds);
  const seen = new Set<string>();

  return SPEAKER_EVIDENCE.filter((record) => {
    if (record.status !== "ready") return false;
    if (!(record.occasionIds ?? []).some((occasionId) => ids.has(occasionId))) {
      return false;
    }
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  }).map(normalizeSpeakerEvidenceUrdu);
}

export function buildOccasionEvidenceText(
  records: readonly SpeakerEvidence[],
  locale: "ur" | "en",
): string {
  if (!records.length) return "";

  const ur = locale === "ur";
  const heading = ur
    ? "اس مناسبت پر اہلِ علم کا اصل مواد"
    : "SOURCE-BACKED SCHOLAR MATERIAL FOR THIS OCCASION";

  const sections = records.map((record) => {
    const title = ur ? record.titleUr : record.titleEn;
    const summary = ur ? record.summaryUr : record.summaryEn;
    const material = ur ? record.materialUr ?? [] : record.materialEn ?? [];
    const source = ur ? record.sourceLabelUr : record.sourceLabelEn;

    return [
      title,
      ur ? "علمی توضیح:" : "Scholarly explanation:",
      summary,
      material.length
        ? [
            ur ? "منبر کے لیے قابلِ استعمال نکات:" : "Usable study material:",
            ...material.map((point) => `• ${point}`),
          ].join("\n")
        : "",
      `${ur ? "اصل ماخذ:" : "Primary source:"} ${source}`,
      record.sourceUrl,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [heading, ...sections].join("\n\n");
}

export function evidenceForSpeakerAndTopic(
  speakerId: string,
  topicId: string,
): readonly SpeakerEvidence[] {
  return readyEvidenceForScholar(speakerId).filter((record) =>
    record.topicIds.includes(topicId),
  );
}

export function topicsForSpeaker(speakerId: string): readonly SpeakerTopicIndexRow[] {
  const records = readyEvidenceForScholar(speakerId);

  return TOPIC_PREPS.flatMap((topic) => {
    const matches = records.filter((record) => record.topicIds.includes(topic.id));
    return matches.length ? [{ topic, records: matches }] : [];
  });
}

export function speakersForTopic(topicId: string): readonly TopicSpeakerIndexRow[] {
  const records = evidenceForTopic(topicId);

  return KHATEEB_CORPUS.flatMap((speaker) => {
    const matches = records.filter((record) => record.speakerId === speaker.id);
    return matches.length ? [{ speakerId: speaker.id, records: matches }] : [];
  });
}

export function validateSpeakerTopicIndex(): {
  unknownSpeakerIds: string[];
  unknownTopicIds: string[];
  unknownOccasionIds: string[];
} {
  const speakerIds = new Set(KHATEEB_CORPUS.map((item) => item.id));
  const topicIds = new Set(TOPIC_PREPS.map((item) => item.id));
  const occasionIds = new Set(SHIA_CALENDAR_1448_EVENTS.map((item) => item.id));

  const unknownSpeakerIds = new Set<string>();
  const unknownTopicIds = new Set<string>();
  const unknownOccasionIds = new Set<string>();

  for (const record of SPEAKER_EVIDENCE) {
    if (!speakerIds.has(record.speakerId)) unknownSpeakerIds.add(record.speakerId);
    for (const topicId of record.topicIds) {
      if (!topicIds.has(topicId)) unknownTopicIds.add(topicId);
    }
    for (const occasionId of record.occasionIds ?? []) {
      if (!occasionIds.has(occasionId)) unknownOccasionIds.add(occasionId);
    }
  }

  return {
    unknownSpeakerIds: [...unknownSpeakerIds],
    unknownTopicIds: [...unknownTopicIds],
    unknownOccasionIds: [...unknownOccasionIds],
  };
}
