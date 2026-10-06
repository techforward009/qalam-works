import { describe, expect, it } from "vitest";
import { ahmedgrafQuranReference } from "../app/tools/arabic-diacritics/quran/ahmedgrafProvider";
import { retrieveKnowledge, knowledgeResultText } from "../app/lib/knowledge/retrieval";
import { parseResearchClaims, selectAnswerEvidence, synthesizeKnowledgeAnswer, type KnowledgeSynthesisProvider } from "../app/lib/knowledge/researchAnswer";
import { createKnowledgeDraft } from "../app/tools/khateeb-studio/engine/knowledgeDraft";
import { buildCustomSermonText, parseCustomSermonProject, serializeCustomSermonProject, validateCustomSermonProject } from "../app/tools/khateeb-studio/engine/customSermonProject";
const result = () => retrieveKnowledge({ question: "103:1–3", scope: "quran", locale: "ur", records: [], sources: [], quran: ahmedgrafQuranReference.listAyahs(), quranSha256: ahmedgrafQuranReference.getMetadata().sourceSha256! });
const draft = () => ({ answered: true, claims: [{ text: "سورۃ العصر میں حق اور صبر کی باہمی نصیحت کا ذکر ہے۔", citations: [{ ref: 3, quote: result().passages[2].text }] }] });
const provider = (raw: unknown = draft(), review: unknown = { supported: true, unsupportedClaimIds: [] }): KnowledgeSynthesisProvider => ({ id: "test-only", draft: async () => raw, review: async () => review });
describe("source-bound research synthesis", () => {
  it("accepts exact original quotes only after a separate support review", async () => {
    const r = result(); const answer = await synthesizeKnowledgeAnswer(r, "ur", provider());
    expect(answer.status).toBe("answered"); expect(answer.claims[0].citations[0].passageId).toBe(r.passages[2].id);
    expect(answer.claims[0].citations[0].quote).toBe(r.passages[2].text);
  });
  it("resolves reference-only citations to original server evidence rather than model-rewritten Arabic", async () => {
    const r = result(); const raw = { answered: true, claims: [{ text: "Claim", citations: [{ ref: 3 }] }] };
    const answer = await synthesizeKnowledgeAnswer(r, "ur", provider(raw)); expect(answer.status).toBe("answered"); expect(answer.claims[0].citations[0].quote).toBe(r.passages[2].text);
  });
  it("rejects malformed outputs, unknown citations, tiny quotes and modified Arabic", async () => {
    const malformed = [null, "text", [], { answered: true, claims: [] }, { answered: true, claims: [{ text: "Claim", citations: [] }] }, { answered: true, claims: [{ text: "Claim", citations: [{ ref: 99, quote: result().passages[2].text }] }] }, { answered: true, claims: [{ text: "Claim", citations: [{ ref: 3, quote: "الصبر" }] }] }, { answered: true, claims: [{ text: "Claim", citations: [{ ref: 3, quote: "This quote is fabricated and not in any original passage" }] }] }];
    for (const raw of malformed) expect((await synthesizeKnowledgeAnswer(result(), "ur", provider(raw))).status).toBe("unverified");
  });
  it("rejects a claim even when its quotation is real but support review fails", async () => {
    for (const review of [null, { supported: false, unsupportedClaimIds: ["claim-1"] }, { supported: true, unsupportedClaimIds: ["claim-1"] }, { supported: true }]) expect((await synthesizeKnowledgeAnswer(result(), "ur", provider(draft(), review))).status).toBe("unverified");
  });
  it("does not invoke a provider without evidence or for authoritative fatwas", async () => {
    const p = provider(); p.draft = async () => { throw new Error("must not run"); };
    expect((await synthesizeKnowledgeAnswer({ ...result(), status: "not-found", passages: [] }, "ur", p)).status).toBe("no-evidence");
    expect((await synthesizeKnowledgeAnswer({ ...result(), status: "unsupported-fatwa", passages: [] }, "ur", p)).status).toBe("unsupported-fatwa");
    expect((await synthesizeKnowledgeAnswer(result(), "ur", null)).status).toBe("not-configured");
  });
  it("keeps sources available when generation refuses or fails", async () => {
    const r = result(); const before = JSON.stringify(r.passages);
    expect((await synthesizeKnowledgeAnswer(r, "ur", provider({ answered: false, claims: [] }))).status).toBe("no-evidence");
    const p = provider(); p.review = async () => { throw new Error("timeout"); };
    expect((await synthesizeKnowledgeAnswer(r, "ur", p)).status).toBe("unavailable"); expect(JSON.stringify(r.passages)).toBe(before);
  });
  it("does not silently clip source text to fit the evidence budget", () => {
    const passages = result().passages.map((p, i) => ({ ...p, text: "original-text ".repeat(i === 0 ? 2000 : 20) }));
    const selected = selectAnswerEvidence(passages);
    expect(selected.map(e => e.passage.id)).not.toContain(passages[0].id);
    expect(selected[0].passage.text).toBe(passages[1].text);
  });
  it("saves the summary as editorial content and keeps its actual sources through restore and print", async () => {
    const r = result(); r.research = await synthesizeKnowledgeAnswer(r, "ur", provider());
    const p = createKnowledgeDraft(r, r.passages.map(p => p.id), "ur", 45);
    expect(validateCustomSermonProject(p)).toEqual([]); expect(parseCustomSermonProject(serializeCustomSermonProject(p))).toEqual(p);
    const section = p.sections.find(s => s.kind === "editorial-bridge")!;
    expect(section.provenance).toBe("editorial"); expect(section.userText).toContain("سورۃ العصر");
    expect(buildCustomSermonText(p, "ur")).toContain(r.passages[2].text);
    expect(knowledgeResultText(r, "ur")).toContain("تحقیقی خلاصہ — اصل عبارت نہیں");
  });
  it("omits a summary claim from copy/draft if its supporting source was deselected", async () => {
    const r = result(); r.research = await synthesizeKnowledgeAnswer(r, "ur", provider());
    const selected = r.passages.slice(0, 2);
    expect(knowledgeResultText({ ...r, passages: selected }, "ur")).not.toContain(draft().claims[0].text);
    const p = createKnowledgeDraft(r, selected.map(p => p.id), "ur", 30);
    expect(p.sections.some(s => s.userText.includes(draft().claims[0].text))).toBe(false);
  });
  it("allows a short verse only when the exact complete source is cited", () => {
    const e = selectAnswerEvidence(result().passages);
    expect(parseResearchClaims({ answered: true, claims: [{ text: "Claim", citations: [{ ref: 1, quote: e[0].passage.text }] }] }, e)).not.toBeNull();
  });
});
