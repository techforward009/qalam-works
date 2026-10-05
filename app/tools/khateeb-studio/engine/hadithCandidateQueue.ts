import type {
  KhateebHadithCandidate,
  KhateebResearchEvidence,
} from "./researchTypes";

export type LiveHadithCandidateStatus = KhateebHadithCandidate["status"];
export type LiveHadithCandidate = KhateebHadithCandidate;

const HADITH_SIGNALS: readonly {
  id: string;
  pattern: RegExp;
  weight: number;
}[] = [
  { id: "qala", pattern: /(?:^|\s)قال(?:\s|[:：])/u, weight: 4 },
  { id: "an", pattern: /(?:^|\s)عن(?:\s)/u, weight: 2 },
  { id: "rasul", pattern: /رسول\s+الله|النبي|النَّبي|النبيّ/u, weight: 4 },
  {
    id: "imam",
    pattern:
      /(?:الإمام|الامام|أمير\s*المؤمنين|امير\s*المؤمنين|أب[يوی]\s*عبد\s*الله|اب[يوی]\s*عبد\s*الله|أب[يوی]\s*جعفر|اب[يوی]\s*جعفر|الصادق|الباقر|الرضا|الكاظم|العسكري)/u,
    weight: 4,
  },
  {
    id: "honorific",
    pattern:
      /عليه\s*السلام|عليهما\s*السلام|عليهم\s*السلام|صلّى\s*الله|صلى\s*الله/u,
    weight: 2,
  },
  { id: "isnad-link", pattern: /حدّثنا|حدثنا|أخبرنا|اخبرنا|روى|رُوي/u, weight: 3 },
];

function hasExplicitAttribution(text: string): boolean {
  return (
    /رسول\s+الله|النبي|النَّبي|الإمام|الامام|أمير\s*المؤمنين|امير\s*المؤمنين|أب[يوی]\s*عبد\s*الله|اب[يوی]\s*عبد\s*الله|أب[يوی]\s*جعفر|اب[يوی]\s*جعفر|الصادق|الباقر|الرضا|الكاظم|العسكري/u.test(
      text,
    ) ||
    /(?:^|\s)(?:قال|عن)\s+[\p{L}\s]{2,40}(?:عليه\s*السلام|عليهما\s*السلام|عليهم\s*السلام)/u.test(
      text,
    )
  );
}

function hasClearTextBoundaries(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 35) return false;
  const startsCleanly =
    /^[«"“‘(\[]|^[\p{L}\p{N}]/u.test(trimmed) &&
    !/^[،,:؛؛]/u.test(trimmed);
  const endsCleanly = /[.!؟!؛»"”’\])…]$/u.test(trimmed);
  return startsCleanly && endsCleanly;
}

export function buildLiveHadithCandidate(
  evidence: KhateebResearchEvidence,
): LiveHadithCandidate | null {
  if (
    evidence.providerId !== "eshia-library" ||
    evidence.status !== "source-lead" ||
    evidence.sourceExcerptStatus !== "page-excerpt" ||
    !evidence.sourceExcerpt?.trim() ||
    !evidence.sourceUrl
  ) {
    return null;
  }

  const text = evidence.sourceExcerpt.trim();
  const detectionText = text.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/gu, "");
  const signals = HADITH_SIGNALS.filter((signal) => signal.pattern.test(detectionText));
  let score = signals.reduce((sum, signal) => sum + signal.weight, 0);

  if (text.length >= 70 && text.length <= 700) score += 1;
  if (/[:：]/u.test(text)) score += 1;

  const attribution = hasExplicitAttribution(detectionText);
  const boundaries = hasClearTextBoundaries(text);
  const missing: LiveHadithCandidate["missing"][number][] = [
    "primary-source-confirmation",
  ];

  if (!attribution) missing.unshift("explicit-attribution");
  if (!boundaries) missing.unshift("clear-text-boundaries");

  const status: LiveHadithCandidateStatus =
    score >= 7 && attribution
      ? "candidate"
      : score >= 3 || signals.some(signal => signal.id === "an")
        ? "needs-context"
        : "not-hadith-like";

  return {
    id: `candidate-${evidence.id}`,
    evidenceId: evidence.id,
    status,
    exactPageText: text,
    sourceUrl: evidence.sourceUrl,
    citationUr: evidence.citationUr,
    citationEn: evidence.citationEn,
    score,
    signals: signals.map((signal) => signal.id),
    missing,
  };
}

export function buildLiveHadithCandidateQueue(
  evidence: readonly KhateebResearchEvidence[],
): readonly LiveHadithCandidate[] {
  return evidence
    .map(buildLiveHadithCandidate)
    .filter((item): item is LiveHadithCandidate => Boolean(item))
    .filter((item) => item.status !== "not-hadith-like")
    .sort((a, b) => {
      const statusRank = (value: LiveHadithCandidateStatus) =>
        value === "candidate" ? 2 : value === "needs-context" ? 1 : 0;
      return (
        statusRank(b.status) - statusRank(a.status) ||
        b.score - a.score ||
        a.id.localeCompare(b.id)
      );
    });
}

export function validateLiveHadithCandidateQueue(
  evidence: readonly KhateebResearchEvidence[],
  queue: readonly LiveHadithCandidate[],
): readonly string[] {
  const errors: string[] = [];
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const candidateIds = new Set<string>();

  for (const candidate of queue) {
    if (candidateIds.has(candidate.id)) {
      errors.push(`duplicate candidate id: ${candidate.id}`);
    }
    candidateIds.add(candidate.id);

    const source = evidenceById.get(candidate.evidenceId);
    if (!source) {
      errors.push(`${candidate.id}: source evidence not found`);
      continue;
    }
    if (source.status !== "source-lead") {
      errors.push(`${candidate.id}: source is not a source-lead`);
    }
    if (source.providerId !== "eshia-library") {
      errors.push(`${candidate.id}: source is not an eShia record`);
    }
    if (source.sourceExcerptStatus !== "page-excerpt") {
      errors.push(`${candidate.id}: source has no page-excerpt status`);
    }
    if (!source.sourceExcerpt || candidate.exactPageText !== source.sourceExcerpt.trim()) {
      errors.push(`${candidate.id}: candidate text differs from exact page excerpt`);
    }
    if (candidate.sourceUrl !== source.sourceUrl) {
      errors.push(`${candidate.id}: source URL drift`);
    }
    if (
      candidate.citationUr !== source.citationUr ||
      candidate.citationEn !== source.citationEn
    ) {
      errors.push(`${candidate.id}: citation drift`);
    }
    if (candidate.status === "not-hadith-like") {
      errors.push(`${candidate.id}: rejected prose must not remain in queue`);
    }
    if (!candidate.missing.includes("primary-source-confirmation")) {
      errors.push(`${candidate.id}: primary verification requirement missing`);
    }
  }

  return errors;
}

export function candidateQueueSummaryUr(
  queue: readonly LiveHadithCandidate[],
): string {
  const strong = queue.filter((item) => item.status === "candidate").length;
  const context = queue.filter((item) => item.status === "needs-context").length;
  return `${queue.length} ممکنہ روایتی اندراج: ${strong} مضبوط امیدوار، ${context} مزید سیاق کے محتاج۔ کوئی اندراج خودکار طور پر مصدقہ روایت نہیں۔`;
}

export function candidateQueueSummaryEn(
  queue: readonly LiveHadithCandidate[],
): string {
  const strong = queue.filter((item) => item.status === "candidate").length;
  const context = queue.filter((item) => item.status === "needs-context").length;
  return `${queue.length} possible narration lead(s): ${strong} strong candidate(s), ${context} needing more context. Nothing is auto-promoted to a verified hadith.`;
}
