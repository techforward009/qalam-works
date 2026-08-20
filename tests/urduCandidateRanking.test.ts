
import { describe, test, expect } from "vitest";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { rankUrduCandidates, romanFitScore } from "../app/tools/roman-urdu-writer/utils/candidateRanker";
import { generateCandidates } from "../app/tools/roman-urdu-writer/utils/graphemeGenerator";
import { ngramScore } from "../app/tools/roman-urdu-writer/utils/urduNgramScorer";

const cv = (s: string) => engineV2.convert(s).output;

describe("Urdu candidate ranking (no new lexicon words)", () => {
  test("ranking prefers better orthography", () => {
    expect(cv("mahrum hai")).toContain("محروم");
    expect(cv("khilaf hai")).toContain("خلاف");
    expect(cv("qadam hai")).toContain("قدم");
    expect(cv("huqooq hai")).toContain("حقوق");
    expect(cv("shakhs hai")).toContain("شخص");
    expect(cv("mali hai")).toContain("مالی");
    expect(cv("dabao hai")).toContain("دبا");
    expect(cv("jari hai")).toContain("جاری");
  });

  test("آ not inserted without roman aa", () => {
    expect(cv("mali wajah")).not.toMatch(/مآلی/);
  });

  test("rank API", () => {
    const pool = generateCandidates("mahrum").map(c => ({ text: c.text, score: c.score }));
    expect(rankUrduCandidates("mahrum", pool, ngramScore)[0]).toBe("محروم");
    expect(romanFitScore("mali", "مالی")).toBeGreaterThan(romanFitScore("mali", "ملی"));
  });
});
