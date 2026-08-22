/**
 * Phase 19A.18 — Compound Resolver Focused Tests
 */

import { describe, test, expect } from "vitest";
import { resolveCompounds, resolveIzafatInOutput } from "../app/tools/roman-urdu-writer/utils/romanUrduCompoundResolver";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import { fixFormalOutput, transformPKRAmount, transformPercentage, transformAcronymsAndBrands, cleanParentheticals } from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  const p2 = transformPKRAmount(p1);
  const p3 = transformPercentage(p2);
  const p4 = transformAcronymsAndBrands(p3);
  const p5 = cleanParentheticals(p4);
  return normalizeUrduProsePunctuation(p5);
}

// ── resolveCompounds unit tests ───────────────────────────────────────────────

describe("resolveCompounds — pre-tokenization", () => {

  describe("Izafat chains X-e-Y", () => {
    test("single izafat: haq-e-tanqeed → parts with placeholder", () => {
      const r = resolveCompounds("haq-e-tanqeed zaroori hai");
      expect(r).toContain("_IZ_");
      expect(r).not.toContain("haq-e-tanqeed");
    });

    test("chained izafat: Aazaadi-e-izhaar-e-raaye", () => {
      const r = resolveCompounds("Aazaadi-e-izhaar-e-raaye muhim hai");
      expect(r).toContain("_IZ_");
      // Should have 2 placeholders for a 3-part chain
      expect(r.match(/_IZ_/g)?.length).toBe(2);
    });

    test("adalat-e-aaliya", () => {
      const r = resolveCompounds("adalat-e-aaliya ne faisla diya");
      expect(r).toContain("_IZ_");
      expect(r).not.toContain("adalat-e-aaliya");
    });

    test("mustaqbil-e-qareeb", () => {
      const r = resolveCompounds("mustaqbil-e-qareeb ke liye");
      expect(r).toContain("_IZ_");
    });

    test("ikhtilaaf-e-raaye", () => {
      const r = resolveCompounds("ikhtilaaf-e-raaye tha");
      expect(r).toContain("_IZ_");
    });

    test("sentence-start capitalization handled", () => {
      const r = resolveCompounds("Haq-e-tanqeed aain ki rooh hai");
      expect(r).toContain("_IZ_");
    });
  });

  describe("Izafat output resolution", () => {
    test("resolveIzafatInOutput converts placeholder to ِ", () => {
      const r = resolveIzafatInOutput("حق _IZ_ تنقید");
      expect(r).toBe("حقِ تنقید");
    });

    test("chained izafat output", () => {
      const r = resolveIzafatInOutput("آزادی _IZ_ اظہار _IZ_ رائے");
      expect(r).toBe("آزادیِ اظہارِ رائے");
    });
  });

  describe("Coordination X-o-Y", () => {
    test("amn-o-amaan → امن و امان (via LEXICAL_COMPOUNDS)", () => {
      // amn-o-amaan is in LEXICAL_COMPOUNDS → resolved directly to Urdu
      const r = resolveCompounds("amn-o-amaan ki zaroorat hai");
      expect(r).toContain("امن و امان");
      expect(r).not.toContain("amn-o-amaan");
    });

    test("ilm-o-hikmat → علم و حکمت (via LEXICAL_COMPOUNDS)", () => {
      const r = resolveCompounds("ilm-o-hikmat hamara waaris hai");
      expect(r).toContain("علم و حکمت");
    });

    test("naqd-o-nazar (in LEXICAL_COMPOUNDS — resolves to Urdu)", () => {
      const r = resolveCompounds("naqd-o-nazar ka usloob");
      expect(r).toContain("نقد و نظر");
    });

    test("falah-o-behbood → فلاح و بہبود", () => {
      const r = resolveCompounds("falah-o-behbood ke liye");
      expect(r).toContain("فلاح و بہبود");
    });

    test("unknown X-o-Y becomes space-separated for engine", () => {
      // A new word pair not in LEXICAL_COMPOUNDS goes through coordination resolver
      const r = resolveCompounds("takhluq-o-ibdaa ka amal");
      // Coordination uses Urdu و
      expect(r).toContain("takhluq");
      expect(r).toContain("ibdaa");
      expect(r).not.toContain("takhluq-o-ibdaa");
    });
  });

  describe("Lexical hyphen compounds", () => {
    test("na-mumkin → ناممکن", () => {
      const r = resolveCompounds("yeh na-mumkin khwaab hai");
      expect(r).toContain("ناممکن");
      expect(r).not.toContain("na-mumkin");
    });

    test("ham-aahanggi → ہم آہنگی", () => {
      const r = resolveCompounds("ham-aahanggi zaroori hai");
      expect(r).toContain("ہم آہنگی");
    });

    test("darham-barham → درہم برہم", () => {
      const r = resolveCompounds("tawaazun darham-barham ho gaya");
      expect(r).toContain("درہم برہم");
    });

    test("ghair-qanooni → غیر قانونی", () => {
      const r = resolveCompounds("ghair-qanooni kaam");
      expect(r).toContain("غیر قانونی");
    });

    test("bila-tahqeeq → بلا تحقیق", () => {
      const r = resolveCompounds("bila-tahqeeq khabrein");
      expect(r).toContain("بلا تحقیق");
    });

    test("ghair-sanjida → غیر سنجیدہ", () => {
      const r = resolveCompounds("ghair-sanjida guftagu");
      expect(r).toContain("غیر سنجیدہ");
    });
  });

  describe("Safety — protected tokens NOT touched", () => {
    test("URL preserved", () => {
      const r = resolveCompounds("https://qalam-works.com/api ke saath");
      expect(r).toContain("https://qalam-works.com/api");
    });

    test("email preserved", () => {
      const r = resolveCompounds("info@qalam-works.com par bhejo");
      expect(r).toContain("info@qalam-works.com");
    });

    test("filename preserved", () => {
      const r = resolveCompounds("report-final.pdf dekho");
      expect(r).toContain("report-final.pdf");
    });

    test("version string preserved", () => {
      const r = resolveCompounds("v2.1-beta install karo");
      // v2.1-beta contains a hyphen but starts with v + digit — protected
      expect(r).toContain("v2.1-beta");
    });

    test("English-only hyphenated terms not rewritten", () => {
      // "e-mail" — English compound
      // Both "e" (1 char) and "mail" should not trigger izafat
      const r = resolveCompounds("e-mail bhejo");
      // 'e' is 1 char, so looksLikeRomanUrdu returns false
      expect(r).not.toContain("_IZ_");
    });

    test("apostrophe clusters in adjacent compound are correctly resolved", () => {
      const r = resolveCompounds("ijtima'ai sho'oor aur amn-o-amaan");
      // resolveApostropheClusters converts known forms to Urdu directly
      expect(r).toContain("اجتماعی");  // ijtima'ai → اجتماعی
      expect(r).toContain("شعور");      // sho'oor → شعور
      // amn-o-amaan is in LEXICAL_COMPOUNDS → resolves to Urdu
      expect(r).toContain("امن و امان");
    });
  });
});

// ── Full pipeline integration tests ──────────────────────────────────────────

describe("Full pipeline — compound resolution end-to-end", () => {

  test("haq-e-tanqeed → حقِ تنقید", () => {
    const out = pipe("haq-e-tanqeed aain ki rooh hai");
    expect(out).toContain("حقِ تنقید");
    expect(out).not.toContain("_IZ_");
    expect(out).not.toContain("-e-");
  });

  test("amn-o-amaan → امن و امان", () => {
    const out = pipe("amn-o-amaan ki zaroorat hai");
    expect(out).toContain("امن و امان");
  });

  test("naqd-o-nazar → نقد و نظر", () => {
    const out = pipe("naqd-o-nazar ka usloob ikhtiaar karo");
    expect(out).toContain("نقد و نظر");
  });

  test("na-mumkin → ناممکن", () => {
    const out = pipe("yeh na-mumkin khwaab hai");
    expect(out).toContain("ناممکن");
  });

  test("ham-aahanggi → ہم آہنگی", () => {
    const out = pipe("mu'aashrati ham-aahanggi zaroori hai");
    expect(out).toContain("ہم آہنگی");
  });

  test("darham-barham → درہم برہم", () => {
    const out = pipe("tawaazun darham-barham kar deta hai");
    expect(out).toContain("درہم برہم");
  });

  test("ghair-sanjida guftagu → غیر سنجیدہ گفتگو", () => {
    const out = pipe("ghair-sanjida guftagu achi nahi");
    expect(out).toContain("غیر سنجیدہ");
  });

  test("bila-tahqeeq → بلا تحقیق", () => {
    const out = pipe("bila-tahqeeq shaye hone wali khabrein");
    expect(out).toContain("بلا تحقیق");
  });

  test("ism-o-ma'ani resolves to separated components", () => {
    // Coordination resolver splits ism-o-ma'ani into "ism o ma'ani"
    // V2 may or may not know ism/ma'ani — check that separation happened
    const preProcessed = resolveCompounds("ism-o-ma'ani ke is bahraan mein");
    // Should no longer have the hyphenated form
    expect(preProcessed).not.toContain("ism-o-ma'ani");
    // The full output should contain the bahraan part (engine handles rest)
    const out = pipe("ism-o-ma'ani ke is bahraan mein");
    expect(out).toContain("بحران");
    expect(out).not.toContain("_IZ_");
  });

  test("no _IZ_ placeholder leaked to output", () => {
    const out = pipe("haq-e-tanqeed aur azaadi-e-izhaar muhim hain");
    expect(out).not.toContain("_IZ_");
    expect(out).not.toContain("-e-");
  });

  test("Aazaadi-e-izhaar-e-raaye produces izafat chain", () => {
    const out = pipe("Aazaadi-e-izhaar-e-raaye muhim hai");
    // Should contain آزادیِ or at minimum آزادی with ِ nearby
    expect(out).toMatch(/آزادی[ِ\s]/);
    expect(out).not.toContain("_IZ_");
  });

  test("protected tokens still exact through pipeline", () => {
    const out = pipe("report-final.pdf aur v2.1-beta ka link bhejo");
    expect(out).toContain("report-final.pdf");
    expect(out).toContain("v2.1-beta");
  });
});
