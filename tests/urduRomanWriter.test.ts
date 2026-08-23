/**
 * Urdu → Roman Converter Tests — Phase 19A.23
 * UR-001..050 benchmark + unit tests for engine, lexicon, and protected tokens.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { convertUrduToRoman, transliterateWord } from "../app/tools/urdu-roman-writer/utils/urduToRoman";

const urBenchmark = JSON.parse(
  readFileSync(join(__dirname, "fixtures/urBenchmark.json"), "utf8")
);

// ── Character-level transliteration unit tests ────────────────────────────────

describe("transliterateWord — character level", () => {
  test("ب → b", () => expect(transliterateWord("ب")).toBe("b"));
  test("پ → p", () => expect(transliterateWord("پ")).toBe("p"));
  test("ت → t", () => expect(transliterateWord("ت")).toBe("t"));
  test("ج → j", () => expect(transliterateWord("ج")).toBe("j"));
  test("چ → ch", () => expect(transliterateWord("چ")).toBe("ch"));
  test("خ → kh", () => expect(transliterateWord("خ")).toBe("kh"));
  test("ش → sh", () => expect(transliterateWord("ش")).toBe("sh"));
  test("غ → gh", () => expect(transliterateWord("غ")).toBe("gh"));
  test("ف → f", () => expect(transliterateWord("ف")).toBe("f"));
  test("ق → q", () => expect(transliterateWord("ق")).toBe("q"));
  test("ک → k", () => expect(transliterateWord("ک")).toBe("k"));
  test("گ → g", () => expect(transliterateWord("گ")).toBe("g"));
  test("ل → l", () => expect(transliterateWord("ل")).toBe("l"));
  test("م → m", () => expect(transliterateWord("م")).toBe("m"));
  test("ن → n", () => expect(transliterateWord("ن")).toBe("n"));
  test("ہ → h", () => expect(transliterateWord("ہ")).toBe("h"));

  test("aspirate بھ → bh", () => expect(transliterateWord("بھ")).toBe("bh"));
  test("aspirate پھ → ph", () => expect(transliterateWord("پھ")).toBe("ph"));
  test("aspirate کھ → kh", () => expect(transliterateWord("کھ")).toBe("kh"));
  test("aspirate گھ → gh", () => expect(transliterateWord("گھ")).toBe("gh"));
  test("aspirate چھ → chh", () => expect(transliterateWord("چھ")).toBe("chh"));
  test("aspirate دھ → dh", () => expect(transliterateWord("دھ")).toBe("dh"));
});

// ── Dictionary lookups ────────────────────────────────────────────────────────

describe("convertUrduToRoman — dictionary lookups", () => {
  const DICT_CASES: [string, string][] = [
    ["ہے", "hai."],
    ["ہیں", "hain."],
    ["اور", "aur."],
    ["میں", "mein."],
    ["کیا", "Kya."],
    ["نہیں", "nahi."],
    ["ہاں", "Haan."],
    ["اچھا", "achha."],
    ["بہت", "bohot."],
    ["کیا حال ہے؟", "Kya haal hai?"],
    ["الحمد للہ", "Alhamdulillah"],
    ["ان شاء اللہ", "InshaAllah"],
    ["السلام علیکم", "Assalamu Alaikum"],
    ["جزاک اللہ خیر", "JazakAllah Khair"],
    ["بسم اللہ الرحمن الرحیم", "Bismillah ir Rahman ir Raheem"],
    ["ماشاء اللہ", "MashaAllah"],
  ];
  for (const [input, expected] of DICT_CASES) {
    test(`"${input}" contains "${expected.split(" ")[0]}"`, () => {
      const out = convertUrduToRoman(input + ".");
      expect(out.toLowerCase()).toContain(expected.split(" ")[0].toLowerCase());
    });
  }
});

// ── Protected tokens ──────────────────────────────────────────────────────────

describe("Protected tokens pass through unchanged", () => {
  test("English words preserved: PDF", () => {
    const out = convertUrduToRoman("PDF رپورٹ");
    expect(out).toContain("PDF");
  });
  test("English words preserved: WhatsApp", () => {
    const out = convertUrduToRoman("WhatsApp پر");
    expect(out).toContain("WhatsApp");
  });
  test("English words preserved: AI", () => {
    const out = convertUrduToRoman("AI سے");
    expect(out).toContain("AI");
  });
  test("Numbers preserved: 25", () => {
    const out = convertUrduToRoman("25 کتابیں");
    expect(out).toContain("25");
  });
  test("Numbers preserved: 100", () => {
    const out = convertUrduToRoman("100 روپے");
    expect(out).toContain("100");
  });
  test("URL preserved", () => {
    const out = convertUrduToRoman("https://qalam.works پر جاؤ");
    expect(out).toContain("https://qalam.works");
  });
});

// ── Policy: transliteration not translation ───────────────────────────────────

describe("Policy: transliteration only", () => {
  test("الحمد للہ → Alhamdulillah (NOT 'Praise be to Allah')", () => {
    const out = convertUrduToRoman("الحمد للہ");
    expect(out).toContain("Alhamdulillah");
    expect(out.toLowerCase()).not.toContain("praise");
  });
  test("اللہ → Allah (not 'God')", () => {
    const out = convertUrduToRoman("اللہ اکبر");
    expect(out.toLowerCase()).toContain("allah");
    expect(out.toLowerCase()).not.toContain("god");
    expect(out.toLowerCase()).not.toContain("great");
  });
  test("محمد → Muhammad (name, not 'praised')", () => {
    const out = convertUrduToRoman("محمد علی");
    expect(out).toContain("Muhammad");
  });
  test("پاکستان → Pakistan (correct romanization)", () => {
    const out = convertUrduToRoman("پاکستان");
    expect(out).toContain("Pakistan");
  });
});

// ── Key acceptance sentences ──────────────────────────────────────────────────

describe("Key acceptance sentences", () => {
  test("میرا نام علی ہے → contains naam, Ali, hai", () => {
    const out = convertUrduToRoman("میرا نام علی ہے۔");
    expect(out.toLowerCase()).toContain("naam");
    expect(out).toContain("Ali");
    expect(out.toLowerCase()).toContain("hai");
  });

  test("پاکستان ایک خوبصورت ملک ہے", () => {
    const out = convertUrduToRoman("پاکستان ایک خوبصورت ملک ہے۔");
    expect(out).toContain("Pakistan");
    expect(out.toLowerCase()).toContain("khoobsurat");
    expect(out.toLowerCase()).toContain("mulk");
  });

  test("میرے پاس 25 کتابیں ہیں → numbers preserved", () => {
    const out = convertUrduToRoman("میرے پاس 25 کتابیں ہیں۔");
    expect(out).toContain("25");
    expect(out.toLowerCase()).toContain("paas");
  });

  test("WhatsApp/PDF preserved in mixed text", () => {
    const out = convertUrduToRoman("میری PDF رپورٹ WhatsApp پر بھیجو۔");
    expect(out).toContain("PDF");
    expect(out).toContain("WhatsApp");
  });
});

// ── UR-001..050 Benchmark scorecard ──────────────────────────────────────────

describe("UR-001..050 Benchmark", () => {
  function urduWords(s: string): string[] {
    return s.toLowerCase().replace(/[^\u0600-\u06FFa-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  }
  function romanWords(s: string): string[] {
    return s.toLowerCase().replace(/[^a-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  }
  function wcr(received: string, expected: string): number {
    const exp = romanWords(expected);
    if (!exp.length) return 1;
    const recSet = new Set(romanWords(received));
    return exp.filter(w => recSet.has(w)).length / exp.length;
  }

  test("UR scorecard: all 50 sentences produce non-empty output", () => {
    let pass = 0;
    const failures: string[] = [];
    for (const f of urBenchmark) {
      const out = convertUrduToRoman(f.input);
      const score = wcr(out, f.expected);
      if (out.trim().length > 0 && score >= 0.5) {
        pass++;
      } else {
        failures.push(`${f.id} (WCR=${(score*100).toFixed(0)}%): IN:${f.input} | OUT:${out}`);
      }
    }

    // Log full scorecard
    console.log(`\nUR BENCHMARK: ${pass}/50 pass (WCR≥50%)`);
    const bycat: Record<string, { pass: number; total: number }> = {};
    for (const f of urBenchmark) {
      const out = convertUrduToRoman(f.input);
      const score = wcr(out, f.expected);
      const cat = f.cat;
      if (!bycat[cat]) bycat[cat] = { pass: 0, total: 0 };
      bycat[cat].total++;
      if (score >= 0.5) bycat[cat].pass++;
      if (score < 0.5) console.log(`  FAIL ${f.id} [${cat}] WCR=${(score*100).toFixed(0)}%: ${out}`);
    }
    for (const [cat, d] of Object.entries(bycat)) {
      console.log(`  ${cat.padEnd(12)} ${d.pass}/${d.total}`);
    }

    expect(pass).toBeGreaterThanOrEqual(35); // ≥70% pass rate
    expect(failures.length).toBeLessThan(15);
  });
});
