/**
 * "verified" means the text/reference has been source-verified for presentation.
 * It is not a grading of hadith authenticity or chain strength.
 */
export type KhateebEvidenceStatus = "verified" | "source-lead" | "catalog-only";

export type KhateebEvidenceKind =
  | "quran"
  | "hadith"
  | "scholar"
  | "speaker"
  | "source";

export type KhateebResearchEvidence = {
  id: string;
  topicId: string;
  kind: KhateebEvidenceKind;
  status: KhateebEvidenceStatus;
  titleUr: string;
  titleEn: string;
  detailUr: string;
  detailEn: string;
  citationUr: string;
  citationEn: string;
  sourceUrl?: string;
  providerId?: string;
  arabic?: string;
  themesUr?: readonly string[];
};

export type KhateebResearchRequest = {
  query: string;
  locale?: "ur" | "en";
  maxEvidence?: number;
};

export type KhateebResearchResult = {
  query: string;
  locale: "ur" | "en";
  matchedTopicIds: readonly string[];
  evidence: readonly KhateebResearchEvidence[];
  verifiedCount: number;
  sourceLeadCount: number;
  catalogOnlyCount: number;
  canBuildSermon: boolean;
  providerHints: readonly {
    id: string;
    nameUr: string;
    nameEn: string;
    baseUrl: string;
  }[];
  gapsUr: readonly string[];
  gapsEn: readonly string[];
};
