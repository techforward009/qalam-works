import { expect, it } from "vitest";
import { hasAnswerLanguageText, hasSuppliedAnswerText } from "../app/lib/knowledge/answerLanguage";
import { synthesizeKnowledgeAnswer, type KnowledgeSynthesisProvider } from "../app/lib/knowledge/researchAnswer";
import type { KnowledgePassage, KnowledgeResult } from "../app/lib/knowledge/retrieval";
const arabic: KnowledgePassage = { id: "arabic-only", collection: "nahj", language: "ar", referenceUr: "نہج البلاغہ", referenceEn: "Nahj", text: "اِنْ صَبَرْتَ صَبْرَ الْاَكَارِمِ، وَ اِلَّا سَلَوْتَ سُلُوَّ الْبَهَآئِمِ.", sourceSha256: "test", translator: null };
it("distinguishes actual answer-language prose from Arabic quotations in a translated edition", () => {
  expect(hasAnswerLanguageText("Be patient.", "en")).toBe(true);
  expect(hasAnswerLanguageText("fasabrun jamil", "en")).toBe(false);
  expect(hasAnswerLanguageText("صبر دو طرح کا ہوتا ہے۔", "ur")).toBe(true);
  expect(hasAnswerLanguageText(arabic.text, "ur")).toBe(false);
  expect(hasAnswerLanguageText("فَهَبْنِیْ يَاۤ اِلٰهِی صَبَرْتُ عَلٰى عَذَابِكَ", "ur")).toBe(false);
  expect(hasSuppliedAnswerText({ ...arabic, language: "ur" }, "ur")).toBe(false);
  expect(hasSuppliedAnswerText({ ...arabic, suppliedTranslation: { text: "اگر صبر کرو تو بزرگوں کی طرح صبر کرو۔", language: "ur", translator: "Provided translator" } }, "ur")).toBe(true);
  expect(hasSuppliedAnswerText({ ...arabic, suppliedTranslation: { text: "Be patient.", language: "en", translator: "Provided translator" } }, "ur")).toBe(false);
});
it("retains Arabic sources but never asks a model to invent a missing translation", async () => {
  const passages = [arabic]; const result = { status: "evidence", question: "صبر", passages } as KnowledgeResult;
  const provider: KnowledgeSynthesisProvider = { id: "test", draft: async () => { throw new Error("must not run"); }, review: async () => { throw new Error("must not run"); } };
  expect(await synthesizeKnowledgeAnswer(result, "ur", provider)).toEqual({ status: "no-evidence", claims: [] });
  expect(result.passages).toBe(passages); expect(result.passages[0].text).toBe(arabic.text);
});
it("renumbers only eligible evidence, preventing a summary from citing an excluded Arabic-only passage", async () => {
  const translated = { ...arabic, id: "urdu-original", language: "ur" as const, text: "صبر دو قسم کا ہوتا ہے۔" };
  const result = { status: "evidence", question: "صبر", passages: [arabic, translated] } as KnowledgeResult;
  const provider: KnowledgeSynthesisProvider = { id: "test", draft: async input => {
    expect(input.evidence).toHaveLength(1); expect(input.evidence[0].ref).toBe(1); expect(input.evidence[0].passage.id).toBe(translated.id);
    return { answered: true, claims: [{ text: "صبر کی دو قسمیں ہیں۔", citations: [{ ref: 1 }] }] };
  }, review: async () => ({ reviews: [{ claimId: "claim-1", verdict: "supported", reason: "entailed" }] }) };
  const answer = await synthesizeKnowledgeAnswer(result, "ur", provider); expect(answer.status).toBe("answered"); expect(answer.claims[0].citations[0].passageId).toBe(translated.id);
});
