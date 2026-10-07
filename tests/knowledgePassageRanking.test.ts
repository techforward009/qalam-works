import { expect, it, vi } from "vitest";
import { applyPassageRanking, rankKnowledgePassages, validatePassageRanking } from "../app/lib/knowledge/passageRanking";
import type { KnowledgePassage, KnowledgeResult } from "../app/lib/knowledge/retrieval";
const passages: KnowledgePassage[] = [
  { id: "legal", collection: "kafi", language: "ar", referenceUr: "میراث", referenceEn: "Inheritance", text: "هذا حكم في ميراث الولد", sourceSha256: "a", translator: null },
  { id: "education", collection: "kafi", language: "ar", referenceUr: "تربیت", referenceEn: "Upbringing", text: "أدب ولدك وارفق به", sourceSha256: "b", translator: null },
  { id: "benefit", collection: "kafi", language: "ar", referenceUr: "اولاد", referenceEn: "Children", text: "الولد الصالح", sourceSha256: "c", translator: null },
];
const result: KnowledgeResult = { question: "بچہ بات نہیں مانتا", status: "evidence", method: "lexical-bm25-topic-expansion", passages, expandedTerms: [], availableCollections: ["kafi"] };
it("rejects missing, duplicate, invented and malformed rankings", () => {
  for (const rankings of [[{ref:1,relevance:3}], [{ref:1,relevance:3},{ref:1,relevance:2}], [{ref:1,relevance:3},{ref:3,relevance:2}], [{ref:1,relevance:4},{ref:2,relevance:2}], [{ref:1,relevance:1.5},{ref:2,relevance:2}]]) expect(validatePassageRanking({rankings},2)).toBeNull();
});
it("removes incidental matches, orders useful units and preserves exact source objects", () => {
  const selected = applyPassageRanking(passages,[{ref:1,relevance:1},{ref:3,relevance:2},{ref:2,relevance:3}]);
  expect(selected).toEqual([passages[1],passages[2]]);
  expect(selected[0]).toBe(passages[1]);
});
it("ranks through the provider and caches source-bound decisions", async () => {
  const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({rankings:[{ref:1,relevance:1},{ref:2,relevance:3},{ref:3,relevance:2}]})}}]})));
  const options={accountId:"test-rank",token:"secret",caller:"rank",fetchImpl};
  const ranked=await rankKnowledgePassages(result,options);
  expect(ranked.passageRanking).toBe("model");
  expect(ranked.passages.map(p=>p.id)).toEqual(["education","benefit"]);
  await rankKnowledgePassages(result,options);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it("returns not-found when all units are unrelated", async () => {
  const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({rankings:[{ref:1,relevance:0},{ref:2,relevance:1},{ref:3,relevance:0}]})}}]})));
  expect((await rankKnowledgePassages(result,{accountId:"none",token:"secret",caller:"none",fetchImpl})).status).toBe("not-found");
});
it("preserves lexical sources on provider failure and skips oversized complete units", async () => {
  const fetchImpl=vi.fn().mockRejectedValue(new Error("offline"));
  const options={accountId:"offline",token:"secret",caller:"offline",fetchImpl};
  const ranked=await rankKnowledgePassages(result,options);
  expect(ranked.passages).toEqual(passages);
  expect(ranked.passageRanking).toBe("lexical");
  await rankKnowledgePassages({...result,passages:[{...passages[0],text:"ع".repeat(50000)}]},options);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it("preserves numbered and quoted reference requests without model judgment", async () => {
  const fetchImpl=vi.fn();
  for(const question of ['حدیث 1','"أدب ولدك"']) await rankKnowledgePassages({...result,question},{accountId:"exact",token:"secret",caller:"exact",fetchImpl});
  expect(fetchImpl).not.toHaveBeenCalled();
});
