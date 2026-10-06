import { expect, it } from "vitest";
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
