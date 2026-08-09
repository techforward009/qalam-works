// Document Intelligence v2 (2026-08-09) — Document Health Report. Purely
// a MERGE of two already-existing, already-tested reports
// (buildDocumentAuditReport + buildDocumentStats) into one unified
// summary — it does NOT re-scan the document's text itself, avoiding a
// third traversal of the same content (both source functions already
// walk the DocNode/text once each internally).

import { buildDocumentAuditReport } from "./buildDocumentAuditReport";
import { buildDocumentStats } from "./buildDocumentStats";
import type { DocNode } from "./extractPlainText";

export type HealthStatus = "ok" | "needs_review";

export interface DocumentHealthReport {
  unicodeConsistency: HealthStatus;
  typographyIssueCount: number;
  numeralConsistency: HealthStatus;
  languageDistribution: {
    arabicScriptPercent: number;
    latinPercent: number;
    dominant: "arabic-script" | "latin" | "mixed" | "none";
  };
  paragraphStructure: HealthStatus;
  headingHierarchy: HealthStatus;
}

/**
 * Pure — combines the outputs of buildDocumentAuditReport(doc) and
 * buildDocumentStats(doc), both already-existing pure functions, into one
 * report shaped for a document-health summary view. Each field maps
 * directly to an already-computed value; nothing here is recalculated
 * from raw text.
 */
export function buildDocumentHealthReport(doc: DocNode): DocumentHealthReport {
  const audit = buildDocumentAuditReport(doc);
  const stats = buildDocumentStats(doc);

  return {
    unicodeConsistency: audit.readiness.unicodeConsistency,
    typographyIssueCount:
      audit.counts.spacing +
      audit.counts.longParagraphs +
      audit.counts.spaceBeforePunctuation +
      audit.counts.tatweelCount +
      audit.counts.inconsistentPunctuationStyle,
    numeralConsistency: stats.numerals.isMixed ? "needs_review" : "ok",
    languageDistribution: {
      arabicScriptPercent: stats.language.arabicScriptPercent,
      latinPercent: stats.language.latinPercent,
      dominant: stats.language.dominant,
    },
    paragraphStructure: audit.readiness.structure,
    headingHierarchy: audit.counts.headingHierarchy === 0 ? "ok" : "needs_review",
  };
}
