import { describe, it, expect } from "vitest";
import { previewKafiCitation, type KafiCitationReview } from "../app/lib/knowledge/kafiCitationPreview";
import type { BookExcerpt } from "../app/lib/knowledge/bookCorpus";

const sourceSha = "a".repeat(64), recordSha = "b".repeat(64);
const recordId = "kafi-v8-ar:section:10";
const paragraphId = `${recordId}:p3`;
const excerpt: BookExcerpt = {
  id: "synthetic-excerpt", sourceId: "kafi-v8-ar",
  recordId, sourceSha256: sourceSha, recordSha256: recordSha,
  title: "Synthetic test chapter", language: "ar", filename: "fixture.json",
  translator: null, locator: "synthetic",
  paragraphNumbers: [3],
  paragraphs: [{ id: paragraphId, text: "219- عدة من أصحابنا عن سهل بن زياد (نص تجريبي)" }],
};
const review: KafiCitationReview = {
  status: "reviewed", source_id: excerpt.sourceId, source_sha256: sourceSha,
  record_id: recordId, record_sha256: recordSha, paragraph_id: paragraphId,
  volume: 8, printed_local_number: 219, print_page: 190,
  book_title: "كتاب الروضة", chapter_title: null,
  edition: "Dar al-Kutub al-Islamiyyah, Tehran, online edition 11027",
  evidence_url: "https://lib.eshia.ir/11027/8/190",
};
describe("Kafi citation supplementary preview (unused by runtime)", () => {
  it("shows only anchored reference metadata, with immutable source text", () => {
    const snapshot = JSON.stringify(excerpt);
    expect(previewKafiCitation(excerpt, review)).toEqual({
      labelUr: "الکافی، جلد 8، روایت 219، صفحہ 190",
      edition: review.edition, evidenceUrl: review.evidence_url,
      sourceParagraphId: paragraphId, previewOnly: true,
    });
    expect(JSON.stringify(excerpt)).toBe(snapshot);
  });
  it("does not show pending, false source revision or invented paragraph", () => {
    expect(previewKafiCitation(excerpt, { ...review, status: "pending" })).toBeNull();
    expect(previewKafiCitation(excerpt, { ...review, source_sha256: "0".repeat(64) })).toBeNull();
    expect(previewKafiCitation(excerpt, { ...review, record_sha256: "0".repeat(64) })).toBeNull();
    expect(previewKafiCitation(excerpt, { ...review, paragraph_id: `${recordId}:p44` })).toBeNull();
  });
  it("refuses invented or mismatched printed local narration", () => {
    expect(previewKafiCitation(excerpt, { ...review, printed_local_number: 218 })).toBeNull();
    expect(previewKafiCitation(excerpt, { ...review, volume: 7 })).toBeNull();
    expect(previewKafiCitation(excerpt, { ...review, print_page: 191 })).toBeNull();
    expect(previewKafiCitation(excerpt, { ...review, evidence_url: "https://lib.eshia.ir/11027/7/190" })).toBeNull();
  });
  it("refuses arbitrary URLs, lookalikes and query parameter injection", () => {
    for (const evidence_url of [
      "http://lib.eshia.ir/11027/8/190",
      "https://lib.eshia.ir.evil.org/11027/8/190",
      "https://example.org/11027/8/190",
      "https://lib.eshia.ir/11027/8/190?redirect=1",
      "https://lib.eshia.ir/11027/8/190#other",
      "https://lib.eshia.ir/99999/8/190",
    ]) expect(previewKafiCitation(excerpt, { ...review, evidence_url })).toBeNull();
  });
});
