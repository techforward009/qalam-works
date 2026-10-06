import { quranTranslationFor } from "../app/tools/khateeb-studio/engine/quranTranslationProvider";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { allowKnowledgeGeneration, answerKnowledgeQuestion, clearKnowledgeAnswerCache } from "../app/lib/knowledge/answerService";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { retrieveKnowledge } from "../app/lib/knowledge/retrieval";
import type { KnowledgeSynthesisProvider } from "../app/lib/knowledge/researchAnswer";
const result = () => retrieveKnowledge({ question: "2:153", scope: "quran", locale: "ur", records: [], sources: [], quran: ahmedgrafQuranReference.listAyahs().map(a => ({ ...a, suppliedTranslation: { text: quranTranslationFor(a.surah, a.ayah, "ur") ?? "", language: "ur" as const, translator: "Provided translator" } })), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
const provider = (): KnowledgeSynthesisProvider => ({ id: "test", draft: vi.fn(async () => ({ answered: true, claims: [{ text: "Claim", citations: [{ ref: 1, quote: result().passages[0].text }] }] })), review: vi.fn(async () => ({ supported: true, unsupportedClaimIds: [] })) });
beforeEach(clearKnowledgeAnswerCache); afterEach(() => vi.useRealTimers());
it("coalesces identical requests, assigns a generation ID and reuses a source-version-bound cache", async () => {
  const p = provider(); const r = result();
  const [a,b] = await Promise.all([answerKnowledgeQuestion(r, "ur", p, "one"), answerKnowledgeQuestion(r, "ur", p, "two")]);
  expect(a.generationId).toMatch(/^knowledge-/); expect(a).toEqual(b); expect(p.draft).toHaveBeenCalledTimes(1);
  expect(await answerKnowledgeQuestion(r, "ur", p, "one")).toEqual(a); expect(p.draft).toHaveBeenCalledTimes(1);
  await answerKnowledgeQuestion({ ...r, passages: r.passages.map(x => ({ ...x, id: x.id + "new-version" })) }, "ur", p, "one"); expect(p.draft).toHaveBeenCalledTimes(2);
});
it("bounds per-caller uncached generations and resets their window", () => {
  for(let i=0;i<6;i++) expect(allowKnowledgeGeneration("caller",1000)).toBe(true);
  expect(allowKnowledgeGeneration("caller",1001)).toBe(false); expect(allowKnowledgeGeneration("caller",61001)).toBe(true);
});
it("does not cache failures as successful research", async () => {
  const p = provider(); p.review = vi.fn(async () => ({ supported: false, unsupportedClaimIds: ["claim-1"] }));
  expect((await answerKnowledgeQuestion(result(),"ur",p,"caller")).status).toBe("unverified");
  await answerKnowledgeQuestion(result(),"ur",p,"caller"); expect(p.draft).toHaveBeenCalledTimes(2);
});
it("expires answers after the bounded cache lifetime", async () => {
  vi.useFakeTimers(); const p = provider(); await answerKnowledgeQuestion(result(),"ur",p,"caller");
  vi.advanceTimersByTime(600001); await answerKnowledgeQuestion(result(),"ur",p,"caller"); expect(p.draft).toHaveBeenCalledTimes(2);
});
