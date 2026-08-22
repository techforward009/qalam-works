/**
 * _IZ_ Izafat Placeholder Leakage Regression Tests
 *
 * The `_IZ_` marker is an internal compound-resolver implementation detail.
 * It must NEVER appear in any user-facing output surface:
 * - primary Urdu output
 * - Alternative Version candidates
 * - Copy / TXT source text
 * - Document Studio handoff
 * - WhatsApp Ready source
 * - Review card text
 * - persistence (activeUrduText)
 *
 * Root cause fixed in 87a1a010+: `resolveIzafatInOutput` is now applied to
 * ALL sentence candidates inside `convertRomanUrdu`, not only the primary.
 */

import { describe, test, expect } from "vitest";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  fixFormalOutput,
  transformPKRAmount,
  transformPercentage,
  transformAcronymsAndBrands,
  cleanParentheticals,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  const p2 = transformPKRAmount(p1);
  const p3 = transformPercentage(p2);
  const p4 = transformAcronymsAndBrands(p3);
  const p5 = cleanParentheticals(p4);
  return normalizeUrduProsePunctuation(p5);
}

function allCandidates(input: string): string[] {
  const r = convertRomanUrdu(input);
  return r.candidates.map(c => c.output);
}

const IZ = "_IZ_";

// ── Engine-level: candidates ──────────────────────────────────────────────────

describe("_IZ_ absent from all engine candidates", () => {

  test("Aazaadi-e-izhaar-e-raaye: no _IZ_ in any candidate", () => {
    const candidates = allCandidates("Aazaadi-e-izhaar-e-raaye muhim hai");
    for (const c of candidates) {
      expect(c, `candidate: ${c}`).not.toContain(IZ);
    }
    // Primary should be the correct izafat chain
    expect(candidates[0]).toMatch(/آزادی[ِ\s]/);
  });

  test("haq-e-tanqeed: no _IZ_ in any candidate", () => {
    const candidates = allCandidates("haq-e-tanqeed aain ki rooh hai");
    for (const c of candidates) {
      expect(c, `candidate: ${c}`).not.toContain(IZ);
    }
    expect(candidates[0]).toContain("حقِ تنقید");
  });

  test("ikhtilaaf-e-raaye: no _IZ_ in any candidate", () => {
    const candidates = allCandidates("ikhtilaaf-e-raaye mein farq hai");
    for (const c of candidates) {
      expect(c, `candidate: ${c}`).not.toContain(IZ);
    }
  });

  test("adalat-e-aaliya: no _IZ_ in any candidate", () => {
    const candidates = allCandidates("adalat-e-aaliya ka faisla aaya");
    for (const c of candidates) {
      expect(c, `candidate: ${c}`).not.toContain(IZ);
    }
    expect(candidates[0]).toContain("عدالتِ عالیہ");
  });

  test("multi-link chain: Aazaadi-e-izhaar-e-raaye all candidates clean", () => {
    const r = convertRomanUrdu("Aazaadi-e-izhaar-e-raaye aur haq-e-tanqeed muhim hain");
    // All 3 candidates (if multiple exist) must be clean
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of r.candidates) {
      expect(c.output).not.toContain(IZ);
    }
  });

  test("result.output field also clean", () => {
    const r = convertRomanUrdu("haq-e-tanqeed aain ki rooh hai");
    expect(r.output).not.toContain(IZ);
    expect(r.output).not.toContain("_IZ");
    expect(r.output).not.toContain("IZ_");
  });
});

// ── Full pipeline: primary output ─────────────────────────────────────────────

describe("_IZ_ absent from primary display output (full pipeline)", () => {
  test("Aazaadi-e-izhaar-e-raaye through full pipe", () => {
    const out = pipe("Aazaadi-e-izhaar-e-raaye muhim hai");
    expect(out).not.toContain(IZ);
    expect(out).toMatch(/آزادی[ِ\s]/);
  });

  test("haq-e-tanqeed through full pipe → حقِ تنقید", () => {
    const out = pipe("haq-e-tanqeed aain ki rooh hai");
    expect(out).not.toContain(IZ);
    expect(out).toContain("حقِ تنقید");
  });

  test("long paragraph with izafat — no _IZ_ in primary", () => {
    const para = "Aazaadi-e-izhaar-e-raaye aur haq-e-tanqeed ko bohat ahmiyet hai. Adalat-e-aaliya ne ikhtilaaf-e-raaye ka haq diya hai.";
    const out = pipe(para);
    expect(out).not.toContain(IZ);
  });
});

// ── Export/handoff source equivalence ────────────────────────────────────────
// The activeUrduText (source for Copy, TXT, Document Studio, WhatsApp) is
// derived from the same pipeline as displayUrduOutput. Since the engine now
// cleans _IZ_ before returning, and the pipeline applies fixFormalOutput
// (which also calls resolveIzafatInOutput), both paths are clean.

describe("_IZ_ absent from export source text", () => {
  test("Copy source (activeUrduText path) is clean", () => {
    // activeUrduText = pipe(finalOutput) — same pipeline, so clean by construction
    const out = pipe("haq-e-tanqeed aur azaadi-e-izhaar muhim hain");
    expect(out).not.toContain(IZ);
  });

  test("WhatsApp source text is clean", () => {
    const out = pipe("Aazaadi-e-izhaar-e-raaye ko protect karo");
    expect(out).not.toContain(IZ);
    expect(out).not.toContain("IZ");
  });
});

// ── Stress paragraphs: no _IZ_ anywhere ──────────────────────────────────────

describe("_IZ_ absent from 3 production stress paragraphs", () => {
  const STRESS = [
    `"Wujoodiyat-pasandana fikr ke mutabiq fard ki takhleeq: azaad roaydaadein basa auqaat samajik jabriyat aur riwayati iqdaar ke mabain shadeed tasaadum ka baa'is banti hain."`,
    `"Aazaadi-e-izhaar-e-raaye aur awaami amn-o-amaan ki baqa ke mabain tawazun qaim rakhna har jadeed jamhoori riyasat ka bunyadi aaini challenge hai. Is liye, idaaron ko chahiye ke wo jaza-o-saza ke sakht qawaneen ke nafaaz ke saath saath awaam mein fikri pukhtagii aur zimmedaarana iblaagh ki saqafat ko bedaar karein."`,
    `"Jadeed daur ke ism-o-ma'ani ke is bahraan mein, insani nafsiyat aur digital iblaagh ka baahami taluq nihayat uljhaao ka shikar ho chuka hai."`,
  ];

  for (let i = 0; i < STRESS.length; i++) {
    test(`STRESS-0${i + 1}: no _IZ_ in primary output`, () => {
      const out = pipe(STRESS[i]);
      expect(out).not.toContain(IZ);
    });

    test(`STRESS-0${i + 1}: no _IZ_ in any alternative candidate`, () => {
      const candidates = allCandidates(STRESS[i]);
      for (const c of candidates) {
        expect(c).not.toContain(IZ);
      }
    });
  }
});

// ── Review token text ─────────────────────────────────────────────────────────

describe("_IZ_ tokens are protected — not user-facing", () => {
  test("_IZ_ tokens are marked protected (not shown in Review)", () => {
    const r = convertRomanUrdu("Aazaadi-e-izhaar-e-raaye aur haq-e-tanqeed muhim hain");
    const izTokens = r.tokens.filter(t => t.roman.includes(IZ));
    // _IZ_ tokens may exist internally as protected passthrough
    // but they must ALL be protected (never shown in Review or exports)
    for (const t of izTokens) {
      expect(t.isProtected, `_IZ_ token must be protected: ${t.roman}`).toBe(true);
    }
  });

  test("no _IZ_ appears in any candidate output text (including primary)", () => {
    const r = convertRomanUrdu("Aazaadi-e-izhaar-e-raaye aur haq-e-tanqeed muhim hain");
    for (const c of r.candidates) {
      expect(c.output).not.toContain(IZ);
    }
    expect(r.output).not.toContain(IZ);
  });
});
