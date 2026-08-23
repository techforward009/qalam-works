/**
 * Phase 19A.20 — Noisy Roman Recovery focused tests
 * Tests all 12 human-locked deterministic mappings.
 */

import { describe, test, expect } from "vitest";
import { resolveCompounds } from "../app/tools/roman-urdu-writer/utils/romanUrduCompoundResolver";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  fixFormalOutput, transformPKRAmount, transformPercentage,
  transformAcronymsAndBrands, cleanParentheticals,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  return normalizeUrduProsePunctuation(cleanParentheticals(transformAcronymsAndBrands(transformPercentage(transformPKRAmount(p1)))));
}

// ── resolveCompounds pre-engine verification ──────────────────────────────────

describe("resolveNoisyRoman — pre-engine resolution", () => {
  test("wujoodiyat-pasandana → وجودیت پسندانہ (LEXICAL_COMPOUNDS)", () => {
    const r = resolveCompounds("wujoodiyat-pasandana fikr ke mutabiq");
    expect(r).toContain("وجودیت پسندانہ");
    expect(r).not.toContain("wujoodiyat-pasandana");
  });

  test("wujoodiyat standalone → وجودیت (NOISY_ROMAN_DIRECT)", () => {
    const r = resolveCompounds("wujoodiyat ek falsafa hai");
    expect(r).toContain("وجودیت");
    expect(r).not.toContain("wujoodiyat");
  });

  test("samajik → سماجی", () => {
    const r = resolveCompounds("samajik jabriyat ki wajah se");
    expect(r).toContain("سماجی");
  });

  test("hayajaan → ہیجان", () => {
    const r = resolveCompounds("jazbaati hayajaan mein");
    expect(r).toContain("ہیجان");
  });

  test("majrooh → مجروح", () => {
    const r = resolveCompounds("sho'oor ko majrooh karta hai");
    expect(r).toContain("مجروح");
  });

  test("mubham → مبہم", () => {
    const r = resolveCompounds("mubham nazriyaat");
    expect(r).toContain("مبہم");
  });

  test("tawaazun → توازن", () => {
    const r = resolveCompounds("naazuk tawaazun ko");
    expect(r).toContain("توازن");
  });

  test("soorathaal → صورتِ حال", () => {
    const r = resolveCompounds("is soorathaal mein");
    expect(r).toContain("صورتِ حال");
  });

  test("inhinraf → انحراف", () => {
    const r = resolveCompounds("ikhlaqi inhinraf nahi");
    expect(r).toContain("انحراف");
  });
});

// ── Full pipeline tests ───────────────────────────────────────────────────────

describe("12 locked forms — full pipeline accuracy", () => {
  const LOCKED: [string, string, string][] = [
    ["wujoodiyat",          "وجودیت",         "wujoodiyat ek falsafa hai"],
    ["wujoodiyat-pasandana","وجودیت پسندانہ", "wujoodiyat-pasandana fikr ke mutabiq fard ki takhleq hai"],
    ["samajik",             "سماجی",           "samajik jabriyat ki wajah se"],
    ["jabriyat",            "جبریت",           "samajik jabriyat nahi honi chahiye"],
    ["hayajaan",            "ہیجان",           "jazbaati hayajaan mein aakar"],
    ["majrooh",             "مجروح",           "ijtima'ai sho'oor ko majrooh karta hai"],
    ["mubham",              "مبہم",            "mubham nazriyaat ki taroij karta hai"],
    ["nazriyaat",           "نظریات",          "mubham nazriyaat ki taroij"],
    ["tawaazun",            "توازن",           "naazuk tawaazun ko bhi darham-barham kar deta hai"],
    ["pukhtagii",           "پختگی",           "fikri pukhtagii zaroori hai"],
    ["soorathaal",          "صورتِ حال",       "is soorathaal mein tanqeedi sho'oor zaroori hai"],
    ["inhinraf",            "انحراف",          "ikhlaqi inhinraf nahi balkay sareehan qanoon-shikni hai"],
  ];

  for (const [form, target, ctx] of LOCKED) {
    test(`${form} → ${target}`, () => {
      const out = pipe(ctx);
      expect(out).toContain(target);
    });
  }
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  test("sentence-start: Samajik (capital) → سماجی", () => {
    const out = pipe("Samajik insaf zaroori hai");
    expect(out).toContain("سماجی");
  });

  test("punctuation around: majrooh, → مجروح،", () => {
    const out = pipe("sho'oor ko majrooh, balkay darham-barham bhi kar deta hai");
    expect(out).toContain("مجروح");
  });

  test("repeated: tawaazun...tawaazun both converted", () => {
    const out = pipe("tawaazun bahaal karo, tawaazun zaroori hai");
    const count = (out.match(/توازن/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("wujoodiyat-pasandana: no hyphen retained in output", () => {
    const out = pipe("wujoodiyat-pasandana fikr ke mutabiq");
    expect(out).not.toContain("wujoodiyat-pasandana");
    expect(out).toContain("وجودیت پسندانہ");
  });

  test("soorathaal: izafat kasra present in output", () => {
    const out = pipe("is soorathaal mein behtar hona chahiye");
    expect(out).toContain("صورتِ حال");
    // Should contain kasra ِ attached to صورت
    expect(out).toMatch(/صورتِ/);
  });

  test("no _IZ_ leaks from noisy Roman pipeline", () => {
    const out = pipe("wujoodiyat-pasandana fikr aur haq-e-tanqeed ke saath soorathaal behtar ho sakta hai");
    expect(out).not.toContain("_IZ_");
  });
});

// ── Negative controls: excluded forms NOT hardcoded ──────────────────────────

describe("Excluded forms: NOT silently hardcoded", () => {
  test("roaydaadein: no forced Urdu mapping", () => {
    // Per spec: roaydaadein is ambiguous/malformed — should NOT be hardcoded
    const r = resolveCompounds("roaydaadein basa auqaat hain");
    // Must not produce a specific Urdu word via NOISY_ROMAN_DIRECT
    expect(r).toContain("roaydaadein"); // still Roman — not forced
  });

  test("tanweeq: no forced Urdu mapping", () => {
    // Per spec: tanweeq → ترویج would be semantic, not Roman recovery
    const r = resolveCompounds("mubham nazriyaat ki tanweeq");
    expect(r).toContain("tanweeq"); // NOT forced to ترویج
  });

  test("tarseei: no forced Urdu mapping", () => {
    // Per spec: tarseei → ترسیل is context-dependent
    const r = resolveCompounds("afwaahon ki tarseei hoti hai");
    expect(r).toContain("tarseei"); // NOT forced to ترسیل
  });
});
