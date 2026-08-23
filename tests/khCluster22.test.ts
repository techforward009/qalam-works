/**
 * Phase 19A.21a — Loanword hotfix + Phase 19A.22 — kh cluster morphology
 */

import { describe, test, expect } from "vitest";
import { resolveCompounds } from "../app/tools/roman-urdu-writer/utils/romanUrduCompoundResolver";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import { fixFormalOutput, transformPKRAmount, transformPercentage, transformAcronymsAndBrands, cleanParentheticals } from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  return normalizeUrduProsePunctuation(cleanParentheticals(transformAcronymsAndBrands(transformPercentage(transformPKRAmount(p1)))));
}

// ── Phase 19A.21a: endless ────────────────────────────────────────────────────

describe("19A.21a — endless loanword", () => {
  test("endless → اینڈلیس (NOT اندلیسس)", () => {
    const out = pipe("ye to aik endless game hai");
    expect(out).toContain("اینڈلیس");
    expect(out).not.toContain("اندلیسس");
  });

  test("endless game — full production sentence", () => {
    const out = pipe("ye to aik endless game hai, 100 k baad phir 100, phir aur 100");
    expect(out).toContain("اینڈلیس");
    expect(out).toContain("گیم");
    expect(out).toContain("100");
    expect(out).not.toContain("endless");
  });

  test("game still converts in this sentence context", () => {
    const out = pipe("ye to aik endless game hai");
    expect(out).toContain("گیم");
    expect(out).not.toContain("game");
  });

  test("mobile game → موبائل گیم", () => {
    const out = pipe("mobile game download karo");
    expect(out).toContain("موبائل");
    expect(out).toContain("گیم");
  });

  test("game khelna → گیم کھیلنا", () => {
    const out = pipe("game khelna hai");
    expect(out).toContain("گیم");
    expect(out).toContain("کھیلنا");
  });
});

// ── Phase 19A.22: kh cluster ─────────────────────────────────────────────────

describe("19A.22 — kh cluster morphology", () => {

  describe("khelna family (eating/playing)", () => {
    test("khelna → کھیلنا", () => {
      expect(pipe("game khelna hai")).toContain("کھیلنا");
    });
    test("khelne → کھیلنے", () => {
      expect(pipe("game khelne aao")).toContain("کھیلنے");
    });
    test("khelo → کھیلو", () => {
      expect(pipe("khelo yaar maza aata hai")).toContain("کھیلو");
    });
  });

  describe("kharhi / khara / khare (standing)", () => {
    test("kharhi → کھڑی (NOT خرہی)", () => {
      const out = pipe("gari kharhi hai");
      expect(out).toContain("کھڑی");
      expect(out).not.toContain("خرہی");
    });
    test("khara → کھڑا (NOT خار — thorn)", () => {
      const out = pipe("woh khara hai");
      expect(out).toContain("کھڑا");
      expect(out).not.toContain("خار");
    });
    test("khare → کھڑے (NOT کرے)", () => {
      const out = pipe("sab khare hain");
      expect(out).toContain("کھڑے");
      expect(out).not.toContain("کرے");
    });
  });

  describe("khula (open) — was producing خدا (God!) CRITICAL", () => {
    test("khula → کھلا (NOT خدا)", () => {
      const out = pipe("darwaza khula hai");
      expect(out).toContain("کھلا");
      expect(out).not.toContain("خدا");
    });
    test("khuli → کھلی", () => {
      const out = pipe("khirkhi khuli hai");
      expect(out).toContain("کھل");
    });
  });

  describe("khud (self) — was producing خدا (God!) CRITICAL", () => {
    test("khud → خود (NOT خدا)", () => {
      const out = pipe("khud karo yaar");
      expect(out).toContain("خود");
      expect(out).not.toContain("خدا");
    });
    test("khud karo → خود کرو", () => {
      const out = pipe("khud kar lo");
      expect(out).toContain("خود");
    });
  });

  describe("khalo (eat it up)", () => {
    test("khalo → کھا لو", () => {
      const out = pipe("jaldi khalo subah school jana hai");
      expect(out).toContain("کھا");
    });
  });

  describe("khana / khaana (food) — already worked", () => {
    test("khana → کھانا ✓", () => {
      expect(pipe("khana khao")).toContain("کھانا");
    });
  });

  describe("khol / kholo (open)", () => {
    test("khol → کھول ✓", () => {
      expect(pipe("darwaza khol do")).toContain("کھول");
    });
    test("kholo → کھولو ✓", () => {
      expect(pipe("ankhain kholo")).toContain("کھولو");
    });
  });

  describe("khayenge (will eat)", () => {
    test("khayenge → کھائیں گے ✓", () => {
      expect(pipe("hum bahar khayenge")).toContain("کھائیں گے");
    });
  });

  describe("khair (goodness)", () => {
    test("khair → خیر ✓", () => {
      expect(pipe("jazakallah khair bhai")).toContain("خیر");
    });
  });

  describe("No regression on other khud/khuda forms", () => {
    test("khuda stays خدا (khud is خود now separate)", () => {
      const out = pipe("khuda ka shukar hai");
      expect(out).toContain("خدا");
    });
  });
});

// ── Verify EVERYDAY-021 (idea was already fixed) ─────────────────────────────

describe("Previously fixed — no regression", () => {
  test("game still converts standalone", () => {
    expect(pipe("aik game khelna hai")).toContain("گیم");
  });
  test("mobile still converts", () => {
    expect(pipe("mera mobile kho gaya")).toContain("موبائل");
  });
});
