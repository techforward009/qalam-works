import { expect, it } from "vitest";
import { queryTerms } from "../app/lib/knowledge/retrieval";
import { rankLexicalDocuments } from "../app/lib/knowledge/lexicalRanking";
it("weights rare query terms and useful density above common repetition", () => {
  const docs = [{ text: "patience justice" }, { text: "patience ".repeat(100) }, { text: "justice" }, { text: "unrelated words" }];
  const scores = rankLexicalDocuments(docs, [["patience"], ["justice"]], ["patience", "justice"]);
  expect(scores[0]).toBeGreaterThan(scores[1]); expect(scores[0]).toBeGreaterThan(scores[2]); expect(scores[3]).toBe(0);
});
it("expands multilingual concepts without counting overlapping aliases twice", () => {
  const docs = [{ text: "الصبر صبر" }, { text: "patience" }, { text: "unrelated" }];
  const one = rankLexicalDocuments(docs, [["صبر", "الصبر", "patience"]], []);
  const repeated = rankLexicalDocuments(docs, [["صبر", "الصبر", "patience"], ["صبر", "الصبر", "patience"]], []);
  expect(one).toEqual(repeated); expect(one[0]).toBeGreaterThan(0); expect(one[1]).toBeGreaterThan(0); expect(one[2]).toBe(0);
});
it("does not match substrings of English words or mutate original source spelling", () => {
  const docs = [{ text: "impatient" }, { text: "صَبْرٌ" }]; const before = JSON.stringify(docs);
  expect(rankLexicalDocuments(docs, [["patient"]], ["patient"])[0]).toBe(0);
  expect(rankLexicalDocuments(docs, [["صبر"]], ["صبر"])[1]).toBeGreaterThan(0); expect(JSON.stringify(docs)).toBe(before);
});

it("expands Urdu parent and upbringing queries into Arabic and English source terms", () => {
  const parents = queryTerms("والدین");
  expect(rankLexicalDocuments([{ text: "بر الوالدين" }, { text: "kindness to parents" }, { text: "unrelated" }], parents.groups, parents.direct).map(s => s > 0)).toEqual([true, true, false]);
  const upbringing = queryTerms("تربیت اولاد");
  expect(upbringing.groups.flat()).toContain("تربيه");
  expect(upbringing.groups.flat()).toContain("children");
  expect(upbringing.groups.flat()).toContain("الولد");
});

it('matches Arabic articles and attached pronouns without unrelated internal substrings', () => {
  const scores = rankLexicalDocuments([{text:'الجَارُ وَبِالْجَارِ جَارُهُ'}, {text:'التجارة تجارة التجار'}], [['جار']], ['جار']);
  expect(scores[0]).toBeGreaterThan(0); expect(scores[1]).toBe(0);
});
it('matches multiword Arabic concepts as phrases', () => {
  const scores = rankLexicalDocuments([{text:'يحث على صلة الرحم والإحسان'}, {text:'صلة المعرفة والرحم'}], [['صلة الرحم']], []);
  expect(scores[0]).toBeGreaterThan(0); expect(scores[1]).toBe(0);
});
it('requires both recognized topics for a two-topic question, including the original chapter context', () => {
  const docs = [{text:'الولد الرفق'}, {text:'الولد'}, {text:'الرفق',heading:'باب الولد'}];
  const groups = [['الولد'], ['الرفق']];
  const scores = rankLexicalDocuments(docs, groups, [], groups);
  expect(scores[0]).toBeGreaterThan(0); expect(scores[1]).toBe(0); expect(scores[2]).toBeGreaterThan(0);
});
it('requires two thirds of three recognized topics without rounding 0.67 up to all three', () => {
  const groups = [['children'], ['kindness'], ['parents']];
  const scores = rankLexicalDocuments([{text:'children kindness'}, {text:'children'}], groups, [], groups);
  expect(scores[0]).toBeGreaterThan(0); expect(scores[1]).toBe(0);
});
