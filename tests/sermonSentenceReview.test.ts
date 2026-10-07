import { expect, it, vi } from "vitest";
import { createSermonSentenceReviewer, parseSentenceReviews, sermonSentences } from "../app/lib/knowledge/sermonReview";
import type { AnswerInput, ResearchClaim } from "../app/lib/knowledge/researchAnswer";

const input: AnswerInput = { question: "صبر", locale: "ur", evidence: [
  { ref: 1, passage: { id: "quran:2:45", collection: "quran", language: "ar", referenceUr: "قرآن، 2:45", referenceEn: "Quran, 2:45", text: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", sourceSha256: "a".repeat(64), translator: null, suppliedTranslation: { language: "ur", translator: "فراہم کردہ مترجم", text: "اور صبر اور نماز کا سہارا لو اور یہ (نماز) بارگراں ہے، مگر خشوع رکھنے والوں پر نہیں۔" } } },
  { ref: 2, passage: { id: "quran:2:153", collection: "quran", language: "ar", referenceUr: "قرآن، 2:153", referenceEn: "Quran, 2:153", text: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", sourceSha256: "a".repeat(64), translator: null, suppliedTranslation: { language: "ur", translator: "فراہم کردہ مترجم", text: "اللہ یقینا صبر کرنے والوں کے ساتھ ہے۔" } } },
] };
const claims: ResearchClaim[] = [{ id: "section-1", text: "محترم سامعین! نماز خشوع رکھنے والوں کے سوا کسی پر بھاری نہیں ہوتی۔", citations: [{ passageId: "quran:2:45", quote: input.evidence[0].passage.text }] }];
const review = () => ({ reviews: [{ claimId: "section-1", sentences: [
  { index: 1, verdict: "nonfactual", reason: "nonfactual", refs: [] },
  { index: 2, verdict: "unsupported", reason: "contradiction", refs: [1] },
] }] });

it("checks each Urdu sentence including a greeting and a reversed exception", () => {
  expect(sermonSentences(claims[0].text)).toHaveLength(2);
  expect(parseSentenceReviews(review(), input, claims)).toEqual({ reviews: [{ claimId: "section-1", verdict: "unsupported", reason: "contradiction" }] });
});
it("rejects a skipped or duplicated sentence rather than accepting the rest of a section", () => {
  const missing = review(); missing.reviews[0].sentences.pop();
  expect(parseSentenceReviews(missing, input, claims)).toBeNull();
  const duplicate = review(); duplicate.reviews[0].sentences[1].index = 1;
  expect(parseSentenceReviews(duplicate, input, claims)).toBeNull();
});
it("requires supporting references from that section, not another available verse", () => {
  const wrong = review(); wrong.reviews[0].sentences[1] = { index: 2, verdict: "supported", reason: "entailed", refs: [2] };
  expect(parseSentenceReviews(wrong, input, claims)).toBeNull();
  wrong.reviews[0].sentences[1].refs = [];
  expect(parseSentenceReviews(wrong, input, claims)).toBeNull();
});
it("requires explicit consistent reasons and refuses an unnumbered audit", () => {
  const wrong = review(); wrong.reviews[0].sentences[1].reason = "entailed";
  expect(parseSentenceReviews(wrong, input, claims)).toBeNull();
  expect(parseSentenceReviews({ supported: true }, input, claims)).toBeNull();
});
it("uses a separate source-only reasoning request and never returns model reasoning as sermon text", async () => {
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(review()), reasoning: "not part of the response" } }] })));
  const provider = createSermonSentenceReviewer({ apiKey: "test-key", fetchImpl: fetchMock })!;
  expect(await provider.review(input, claims)).toEqual({ reviews: [{ claimId: "section-1", verdict: "unsupported", reason: "contradiction" }] });
  const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
  expect(body.max_completion_tokens).toBe(1600);
  expect(body.reasoning_effort).toBe("low"); expect(body.reasoning_format).toBe("hidden");
  expect(body.messages[0].content).toContain("reverses the exception");
  const request = JSON.parse(body.messages[1].content);
  expect(request.evidence).toHaveLength(1);
  expect(request.sections[0].sentences).toHaveLength(2);expect(request.sections[0].refs).toEqual([1]);
  expect(request.evidence[0].suppliedTranslation.text).toBe(input.evidence[0].passage.suppliedTranslation?.text);
});
it("fails closed on provider rejection and incomplete review output", async () => {
  const rejected = createSermonSentenceReviewer({ apiKey: "test", fetchImpl: vi.fn(async () => new Response("", { status: 429 })) })!;
  await expect(rejected.review(input, claims)).rejects.toThrow("provider-unavailable");
  const malformed = createSermonSentenceReviewer({ apiKey: "test", fetchImpl: vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"reviews":[]}' } }] }))) })!;
  await expect(malformed.review(input, claims)).rejects.toThrow("provider-format");
  expect(createSermonSentenceReviewer({ apiKey: "" })).toBeNull();
});
