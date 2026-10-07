import { describe, expect, it, vi } from "vitest";
import { understandKnowledgeQuestion, validateQuestionTopics } from "../app/lib/knowledge/questionUnderstanding";
import { planKnowledgeQuery } from "../app/lib/knowledge/searchConcepts";
describe("question understanding", () => {
  it("rejects invented and excessive topics", () => {
    expect(validateQuestionTopics({ topicIds: ["children", "invented"] })).toEqual([]);
    expect(validateQuestionTopics({ topicIds: ["children", "anger", "patience", "parents"] })).toEqual([]);
    expect(validateQuestionTopics({ topicIds: ["children", "children"] })).toEqual(["children"]);
  });
  it("uses approved meanings without making colloquial words mandatory", () => {
    const plan = planKnowledgeQuery("بچہ بات نہیں مانتا", ["children", "upbringing"]);
    expect(plan.topics.map(t => t.id)).toEqual(["upbringing", "children"]);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups.flat()).not.toContain("مانتا");
  });
  it("interprets a question, caches it, and never exposes provider text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"topicIds":["children","upbringing"]}' } }] })));
    const options = { accountId: "test", token: "secret", caller: "test", fetchImpl };
    expect(await understandKnowledgeQuestion("بچہ بات نہیں مانتا", options)).toEqual(["children", "upbringing"]);
    expect(await understandKnowledgeQuestion("بچہ بات نہیں مانتا", options)).toEqual(["children", "upbringing"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("falls back on provider failure and leaves precise references alone", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const options = { accountId: "fail", token: "secret", caller: "fail", fetchImpl };
    expect(await understandKnowledgeQuestion("مجھے بہت جلد غصہ آتا ہے", options)).toEqual([]);
    expect(await understandKnowledgeQuestion("حدیث 1", options)).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
