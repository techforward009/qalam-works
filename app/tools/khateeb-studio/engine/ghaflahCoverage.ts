import { KHATEEB_CORPUS } from "./khateebCorpus";
import { SPEAKER_EVIDENCE } from "./speakerEvidence";

export type GhaflahScholarReview = {
  scholarId: string;
  scholarName: string;
  region: "pk" | "in" | "ir";
  status: "source-analysed" | "catalog-only" | "not-researched";
  records: readonly { id: string; sourceUrl: string; status: string }[];
};
/** Exact evidence records only; never infer the scholar has discussed Ghaflah from generic profile tags. */
export function ghaflahScholarCoverage(): readonly GhaflahScholarReview[] {
  return KHATEEB_CORPUS.map((person) => {
    const records = SPEAKER_EVIDENCE.filter(
      (row) => row.speakerId === person.id && row.topicIds.includes("ghaflah"),
    );
    return {
      scholarId: person.id,
      scholarName: person.name,
      region: person.region,
      status: records.some((row) => row.status === "ready")
        ? "source-analysed"
        : records.some((row) => row.status === "catalog-only")
        ? "catalog-only"
        : "not-researched",
      records: records.map(({ id, sourceUrl, status }) => ({ id, sourceUrl, status })),
    };
  });
}
