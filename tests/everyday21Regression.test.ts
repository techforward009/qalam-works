/**
 * Phase 19A.21 — Everyday Urdu Acceptance Fixes
 * Regression tests for all 4 priorities.
 */

import { describe, test, expect } from "vitest";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  fixFormalOutput, transformPKRAmount, transformPercentage,
  transformAcronymsAndBrands, cleanParentheticals,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  return normalizeUrduProsePunctuation(cleanParentheticals(
    transformAcronymsAndBrands(transformPercentage(transformPKRAmount(p1)))
  ));
}

// ── Priority 1: Critical semantic errors ─────────────────────────────────────

describe("Priority 1 — Critical semantic error fixes", () => {
  test("EVERYDAY-038: cancel → کینسل (NOT کنکال)", () => {
    const out = pipe("meeting cancel ho gayi");
    expect(out).toContain("کینسل");
    expect(out).not.toContain("کنکال");
  });

  test("EVERYDAY-042: sasta → سستا (NOT سست)", () => {
    const out = pipe("thoda sasta kar do");
    expect(out).toContain("سستا");
    expect(out).not.toMatch(/^.*سست[^ا].*$/);  // سست not followed by ا
  });

  test("EVERYDAY-050: order → آرڈر (NOT وردار)", () => {
    const out = pipe("order kar do");
    expect(out).toContain("آرڈر");
    expect(out).not.toContain("وردار");
  });

  test("EVERYDAY-053: raste → راستے (NOT ریاست)", () => {
    const out = pipe("pani hoga kya raste mein");
    expect(out).toContain("راستے");
    expect(out).not.toContain("ریاست");
  });

  test("EVERYDAY-093: karni → کرنی (NOT قرآن)", () => {
    const out = pipe("gari kahan kharhi karni hai?");
    expect(out).toContain("کرنی");
    expect(out).not.toContain("قرآن");
  });

  test("karna → کرنا", () => {
    const out = pipe("yeh kaam karna hai");
    expect(out).toContain("کرنا");
  });
});

// ── Priority 2: Common verb forms ────────────────────────────────────────────

describe("Priority 2 — Common verb form fixes", () => {
  test("hun → ہوں (NOT حان) in isolation context", () => {
    const out = pipe("main hun yahan");
    expect(out).toContain("ہوں");
    expect(out).not.toContain("حان");
  });

  test("hun → ہوں in sentence: abhi aa raha hun", () => {
    const out = pipe("abhi aa raha hun");
    expect(out).toContain("ہوں");
    expect(out).not.toContain("حان");
  });

  test("aayega → آئے گا (NOT آیاگا)", () => {
    const out = pipe("wo aayega kal");
    expect(out).toContain("آئے گا");
    expect(out).not.toContain("آیاگا");
  });

  test("aayenge → آئیں گے (NOT آیانگے)", () => {
    const out = pipe("sab aayenge kal");
    expect(out).toContain("آئیں گے");
    expect(out).not.toContain("آیانگے");
  });

  test("nahi aayega → نہیں آئے گا", () => {
    const out = pipe("mujhe lag raha hai wo nahi aayega");
    expect(out).toContain("آئے گا");
  });
});

// ── Priority 3: Islamic expressions ─────────────────────────────────────────

describe("Priority 3 — Islamic expressions", () => {
  test("mashallah → ماشاء اللہ (NOT مشللح)", () => {
    const out = pipe("mashallah kitna sundar hai");
    expect(out).toContain("ماشاء اللہ");
    expect(out).not.toContain("مشللح");
  });

  test("jazakallah → جزاک اللہ (NOT جزکللح)", () => {
    const out = pipe("jazakallah khair bhai");
    expect(out).toContain("جزاک اللہ");
    expect(out).not.toContain("جزکللح");
  });

  test("subhanallah → سبحان اللہ (NOT سبھاناللہ)", () => {
    const out = pipe("subhanallah yeh duniya kitni haseen hai");
    expect(out).toContain("سبحان اللہ");
    expect(out).not.toContain("سبھاناللہ");
  });

  test("inshallah → انشاء اللہ", () => {
    const out = pipe("inshallah kal aa jayenge");
    expect(out).toContain("اللہ");
  });

  test("alhamdulillah still correct (was already passing)", () => {
    const out = pipe("alhamdulillah sab theek hai");
    expect(out).toContain("الحمدللہ");
  });
});

// ── Priority 4: English loanwords ────────────────────────────────────────────

describe("Priority 4 — Everyday English loanwords", () => {
  const LOANWORDS: [string, string, string][] = [
    ["raat ko call karo", "کال", "EVERYDAY-010"],
    ["apna phone update karo", "فون", "EVERYDAY-020"],
    ["bachay school gaye hain", "اسکول", "EVERYDAY-034"],
    ["result achha aaya", "رزلٹ", "EVERYDAY-023/089"],
    ["kya idea hai", "آئیڈیا", "EVERYDAY-021"],
    ["game khelna hai", "گیم", "EVERYDAY-019/083"],
    ["battery khatam ho gayi", "بیٹری", "EVERYDAY-057"],
    ["charger kahan hai", "چارجر", "EVERYDAY-058"],
    ["wifi password kya hai", "وائی فائی", "EVERYDAY-059"],
    ["uber book kar lo", "اوبر", "EVERYDAY-055"],
  ];
  for (const [input, expected, id] of LOANWORDS) {
    test(`${id}: ${input.split(" ")[2] || input.split(" ")[1]} → ${expected}`, () => {
      const out = pipe(input);
      expect(out).toContain(expected);
    });
  }
});

// ── Existing loanwords must not regress ───────────────────────────────────────

describe("Existing loanwords must not regress", () => {
  const EXISTING: [string, string][] = [
    ["mera mobile kho gaya", "موبائل"],
    ["meeting hai kal subah", "میٹنگ"],
    ["deadline kal hai", "ڈیڈ لائن"],
    ["internet slow hai", "انٹرنیٹ"],
    ["report submit kar di", "رپورٹ"],
    ["email bhej do", "ای میل"],
  ];
  for (const [input, expected] of EXISTING) {
    test(`${expected} still correct`, () => {
      const out = pipe(input);
      expect(out).toContain(expected);
    });
  }
});

// ── Bonus fixes ───────────────────────────────────────────────────────────────

describe("Bonus fixes from audit", () => {
  test("kaun → کون (NOT قاوں)", () => {
    const out = pipe("kaun kaun aa raha hai");
    expect(out).toContain("کون");
    expect(out).not.toContain("قاوں");
  });

  test("biryani → بریانی (NOT برینی)", () => {
    const out = pipe("biryani khani hai");
    expect(out).toContain("بریانی");
    expect(out).not.toContain("برینی");
  });

  test("salam → سلام (NOT سالم)", () => {
    const out = pipe("sab ko salam bhai");
    expect(out).toContain("سلام");
    expect(out).not.toContain("سالم");
  });
});
