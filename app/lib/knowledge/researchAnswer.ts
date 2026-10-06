import type { KnowledgePassage, KnowledgeResult } from "./retrieval";

export type ResearchCitation = { passageId: string; quote: string };
export type ResearchClaim = { id: string; text: string; citations: ResearchCitation[] };
export type KnowledgeResearchAnswer = {
  status: "answered" | "no-evidence" | "unsupported-fatwa" | "not-configured" | "unavailable" | "unverified" | "busy";
  claims: ResearchClaim[];
  generationId?: string;
  createdAt?: string;
  providerId?: string;
};
export type AnswerEvidence = { ref: number; passage: KnowledgePassage };
export type AnswerInput = { question: string; locale: "ur" | "en"; evidence: readonly AnswerEvidence[] };
export type KnowledgeSynthesisProvider = {
  id: string;
  draft(input: AnswerInput): Promise<unknown>;
  review(input: AnswerInput, claims: readonly ResearchClaim[]): Promise<unknown>;
};
const MAX_EVIDENCE_CHARS = 16_000;
export function selectAnswerEvidence(passages: readonly KnowledgePassage[]): AnswerEvidence[] {
  const selected: AnswerEvidence[] = []; let used = 0;
  for (const passage of passages) {
    if (selected.length === 8) break;
    if (used + passage.text.length + (passage.suppliedTranslation?.text.length ?? 0) > MAX_EVIDENCE_CHARS) continue;
    selected.push({ ref: selected.length + 1, passage }); used += passage.text.length + (passage.suppliedTranslation?.text.length ?? 0);
  }
  return selected;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function parseResearchClaims(value: unknown, evidence: readonly AnswerEvidence[]): ResearchClaim[] | null {
  if (!object(value) || value.answered !== true || !Array.isArray(value.claims) || !value.claims.length || value.claims.length > 6) return null;
  const claims: ResearchClaim[] = [];
  for (const raw of value.claims) {
    if (!object(raw) || typeof raw.text !== "string" || !raw.text.trim() || raw.text.length > 1600 || !Array.isArray(raw.citations) || !raw.citations.length || raw.citations.length > 4) return null;
    const citations: ResearchCitation[] = [];
    for (const citation of raw.citations) {
      if (!object(citation) || !Number.isInteger(citation.ref) || citation.quote !== undefined && (typeof citation.quote !== "string" || citation.quote.length > 1800)) return null;
      const hit = evidence.find(e => e.ref === citation.ref);
      const quote = typeof citation.quote === "string" ? citation.quote.trim() : hit?.passage.text ?? "";
      if (!hit || quote.length < Math.min(20, hit.passage.text.trim().length) || !hit.passage.text.includes(quote)) return null;
      if (citations.some(c => c.passageId === hit.passage.id && c.quote === quote)) continue;
      citations.push({ passageId: hit.passage.id, quote });
    }
    claims.push({ id: `claim-${claims.length + 1}`, text: raw.text.trim(), citations });
  }
  return claims;
}
export function supportReviewPassed(value: unknown): boolean {
  return object(value) && value.supported === true && Array.isArray(value.unsupportedClaimIds) && value.unsupportedClaimIds.length === 0;
}
export async function synthesizeKnowledgeAnswer(result: KnowledgeResult, locale: "ur" | "en", provider: KnowledgeSynthesisProvider | null): Promise<KnowledgeResearchAnswer> {
  const refusal = (status: KnowledgeResearchAnswer["status"]): KnowledgeResearchAnswer => ({ status, claims: [] });
  if (result.status === "unsupported-fatwa") return refusal("unsupported-fatwa");
  if (result.status !== "evidence") return refusal("no-evidence");
  if (!provider) return refusal("not-configured");
  const evidence = selectAnswerEvidence(result.passages);
  if (!evidence.length) return refusal("no-evidence");
  const input = { question: result.contextQuestion ? `Previous question: ${result.contextQuestion}\nFollow-up question: ${result.question}` : result.question, locale, evidence };
  try {
    const raw = await provider.draft(input);
    if (object(raw) && raw.answered === false && Array.isArray(raw.claims) && raw.claims.length === 0) return refusal("no-evidence");
    const claims = parseResearchClaims(raw, evidence);
    if (!claims) {
      console.warn("Knowledge research validation", { stage: "draft", code: "invalid-claims", answered: object(raw) ? raw.answered === true : false, claimCount: object(raw) && Array.isArray(raw.claims) ? raw.claims.length : 0, citationTypes: object(raw) && Array.isArray(raw.claims) ? raw.claims.slice(0, 6).map(c => object(c) && Array.isArray(c.citations) ? c.citations.slice(0, 4).map(r => object(r) ? typeof r.ref : typeof r) : []) : [] });
      return refusal("unverified");
    }
    const review = await provider.review(input, claims);
    if (!supportReviewPassed(review)) {
      console.warn("Knowledge research validation", { stage: "review", code: "unsupported-claims", supported: object(review) ? review.supported === true : false, unsupportedCount: object(review) && Array.isArray(review.unsupportedClaimIds) ? review.unsupportedClaimIds.length : null });
      return refusal("unverified");
    }
    return { status: "answered", claims, providerId: provider.id, createdAt: new Date().toISOString() };
  } catch { return refusal("unavailable"); }
}
export function selectedResearchClaims(answer: KnowledgeResearchAnswer | undefined, selectedIds: readonly string[]): ResearchClaim[] {
  const selected = new Set(selectedIds);
  return answer?.status === "answered" ? answer.claims.filter(c => c.citations.length > 0 && c.citations.every(ref => selected.has(ref.passageId))) : [];
}
export function researchSummaryText(answer: KnowledgeResearchAnswer | undefined, passages: readonly KnowledgePassage[], locale: "ur" | "en"): string {
  const claims = selectedResearchClaims(answer, passages.map(p => p.id));
  if (!claims.length) return "";
  const ur = locale === "ur";
  return [ur ? "تحقیقی خلاصہ — اصل عبارت نہیں" : "Research summary — not a source quotation", ...claims.map(c => [c.text, ...c.citations.map(ref => {
    const p = passages.find(p => p.id === ref.passageId)!;
    return `${ur ? "حوالہ" : "Reference"}: ${ur ? p.referenceUr : p.referenceEn}`;
  })].join("\n"))].join("\n\n");
}
