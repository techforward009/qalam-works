import { KHATEEB_CORPUS } from "./khateebCorpus";
import {
  SPEAKER_EVIDENCE,
  normalizeSpeakerEvidenceUrdu,
  type SpeakerEvidence,
} from "./speakerEvidence";
import { TOPIC_PREPS, type TopicPrep } from "./topicPrep";

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

export function evidenceForSpeakerAndTopic(
  speakerId: string,
  topicId: string,
): readonly SpeakerEvidence[] {
  return SPEAKER_EVIDENCE.filter(
    (record) =>
      record.status === "ready" &&
      record.speakerId === speakerId &&
      record.topicIds.includes(topicId),
  ).map(normalizeSpeakerEvidenceUrdu);
}

export function topicsForSpeaker(speakerId: string): readonly SpeakerTopicIndexRow[] {
  const records = SPEAKER_EVIDENCE.filter(
    (record) => record.speakerId === speakerId && record.status === "ready",
  );

  return TOPIC_PREPS.flatMap((topic) => {
    const matches = records.filter((record) => record.topicIds.includes(topic.id));
    return matches.length
      ? [{ topic, records: matches.map(normalizeSpeakerEvidenceUrdu) }]
      : [];
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
} {
  const speakerIds = new Set(KHATEEB_CORPUS.map((item) => item.id));
  const topicIds = new Set(TOPIC_PREPS.map((item) => item.id));

  const unknownSpeakerIds = new Set<string>();
  const unknownTopicIds = new Set<string>();

  for (const record of SPEAKER_EVIDENCE) {
    if (!speakerIds.has(record.speakerId)) unknownSpeakerIds.add(record.speakerId);
    for (const topicId of record.topicIds) {
      if (!topicIds.has(topicId)) unknownTopicIds.add(topicId);
    }
  }

  return {
    unknownSpeakerIds: [...unknownSpeakerIds],
    unknownTopicIds: [...unknownTopicIds],
  };
}
