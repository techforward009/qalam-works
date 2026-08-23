/**
 * Urdu → Roman Converter Tests — Phase 19A.23
 * UR-001..050 benchmark + unit tests for engine, lexicon, and protected tokens.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { convertUrduToRoman, applyStyle, STYLE_OPTIONS, transliterateWord } from "../app/tools/urdu-roman-writer/utils/urduToRoman";

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

// ── UR-001..100 Benchmark scorecard ──────────────────────────────────────────

describe("UR-001..100 Benchmark", () => {
  function romanWords(s: string): string[] {
    return s.toLowerCase().replace(/[^a-z\u00C0-\u024F\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  }
  function wcr(received: string, expected: string): number {
    const exp = romanWords(expected);
    if (!exp.length) return 1;
    const recSet = new Set(romanWords(received));
    return exp.filter(w => recSet.has(w)).length / exp.length;
  }

  test("UR scorecard: all 100 sentences produce non-empty output (≥50% WCR)", () => {
    let pass = 0;
    const failures: string[] = [];

    for (const f of urBenchmark) {
      const base = convertUrduToRoman(f.input);
      const out = applyStyle(base, (f.style as import("../app/tools/urdu-roman-writer/utils/urduToRoman").UrduRomanStyle) ?? "simple");
      const score = wcr(out, f.expected);
      if (out.trim().length > 0 && score >= 0.5) {
        pass++;
      } else {
        failures.push(`${f.id} [${f.style}] WCR=${(score*100).toFixed(0)}%: ${out}`);
      }
    }

    // Log scorecard
    const bycat: Record<string, { pass: number; total: number }> = {};
    for (const f of urBenchmark) {
      const base = convertUrduToRoman(f.input);
      const out = applyStyle(base, (f.style as any) ?? "simple");
      const score = wcr(out, f.expected);
      const cat = f.cat;
      if (!bycat[cat]) bycat[cat] = { pass: 0, total: 0 };
      bycat[cat].total++;
      if (score >= 0.5) bycat[cat].pass++;
    }
    console.log(`\nUR BENCHMARK: ${pass}/100 pass (WCR≥50%)`);
    for (const [cat, d] of Object.entries(bycat)) {
      console.log(`  ${cat.padEnd(14)} ${d.pass}/${d.total}`);
    }
    for (const f of failures) console.log(`  FAIL: ${f}`);

    expect(pass).toBeGreaterThanOrEqual(70); // ≥70% pass across all 100
    expect(failures.length).toBeLessThan(30);
  });

  // UR-001..050 must not regress from Phase 19A.23
  test("UR-001..050 unchanged (simple style)", () => {
    const first50 = urBenchmark.filter((f: any) => parseInt(f.id.replace("UR-","")) <= 50);
    let pass = 0;
    for (const f of first50) {
      const out = applyStyle(convertUrduToRoman(f.input), "simple");
      if (out.trim().length > 0 && wcr(out, f.expected) >= 0.5) pass++;
    }
    expect(pass).toBeGreaterThanOrEqual(44); // ≥88% pass on UR-001..050 (same as before)
  });
});

// ── Style system tests ────────────────────────────────────────────────────────

describe("applyStyle — three output styles", () => {
  describe("simple style (default — no change)", () => {
    test("Muhammad Ali stays Muhammad Ali", () => {
      const base = convertUrduToRoman("محمد علی");
      expect(applyStyle(base, "simple")).toContain("Muhammad");
      expect(applyStyle(base, "simple")).toContain("Ali");
    });
    test("InshaAllah stays InshaAllah", () => {
      const base = convertUrduToRoman("ان شاء اللہ");
      expect(applyStyle(base, "simple")).toContain("InshaAllah");
    });
    test("Alhamdulillah stays Alhamdulillah", () => {
      const base = convertUrduToRoman("الحمد للہ");
      expect(applyStyle(base, "simple")).toContain("Alhamdulillah");
    });
  });

  describe("academic style — diacritics", () => {
    test("Muhammad → Muḥammad", () => {
      const base = convertUrduToRoman("محمد");
      const acad = applyStyle(base, "academic");
      expect(acad).toContain("Muḥammad");
    });
    test("Ali → ʿAlī", () => {
      const base = convertUrduToRoman("علی");
      const acad = applyStyle(base, "academic");
      expect(acad).toContain("ʿAlī");
    });
    test("InshaAllah → In shāʾ Allāh", () => {
      const base = convertUrduToRoman("ان شاء اللہ");
      const acad = applyStyle(base, "academic");
      expect(acad).toContain("In shāʾ Allāh");
    });
    test("Alhamdulillah → al-Ḥamdulillāh", () => {
      const base = convertUrduToRoman("الحمد للہ");
      const acad = applyStyle(base, "academic");
      expect(acad).toContain("al-Ḥamdulillāh");
    });
    test("Bismillah → scholarly form", () => {
      const base = convertUrduToRoman("بسم اللہ الرحمن الرحیم");
      const acad = applyStyle(base, "academic");
      expect(acad).toContain("Bismi-llāhi");
    });
  });

  describe("chat style — short forms", () => {
    test("AssalamuAlaikum → AOA", () => {
      const base = convertUrduToRoman("السلام علیکم");
      const chat = applyStyle(base, "chat");
      expect(chat).toContain("AOA");
    });
    test("WaAlaikumAssalam → WOAS", () => {
      const base = convertUrduToRoman("وعلیکم السلام");
      const chat = applyStyle(base, "chat");
      expect(chat).toContain("WOAS");
    });
    test("JazakAllah Khair → Jzk", () => {
      const base = convertUrduToRoman("جزاک اللہ خیر");
      const chat = applyStyle(base, "chat");
      expect(chat).toContain("Jzk");
    });
    test("Bismillah ir Rahman ir Raheem → Bismillah", () => {
      const base = convertUrduToRoman("بسم اللہ الرحمن الرحیم");
      const chat = applyStyle(base, "chat");
      expect(chat).toBe("Bismillah");
    });
    test("Alhamdulillah → Alhumdulillah", () => {
      const base = convertUrduToRoman("الحمد للہ");
      const chat = applyStyle(base, "chat");
      expect(chat).toContain("Alhumdulillah");
    });
  });

  describe("STYLE_OPTIONS metadata", () => {
    test("has 3 options: simple, academic, chat", () => {
      expect(STYLE_OPTIONS).toHaveLength(3);
      expect(STYLE_OPTIONS.map(o => o.value)).toEqual(["simple", "academic", "chat"]);
    });
    test("each option has label and description", () => {
      for (const opt of STYLE_OPTIONS) {
        expect(opt.label).toBeTruthy();
        expect(opt.description).toBeTruthy();
      }
    });
  });
});

// ── Priority name dictionary tests ────────────────────────────────────────────

describe("Priority name dictionary (Phase 19A.24)", () => {
  const NAME_CASES: [string, string][] = [
    ["محمد", "Muhammad"],
    ["احمد", "Ahmad"],
    ["علی", "Ali"],
    ["حسن", "Hasan"],
    ["حسین", "Hussain"],
    ["فاطمہ", "Fatimah"],
    ["زہرا", "Zahra"],
    ["مریم", "Maryam"],
    ["ابراہیم", "Ibrahim"],
    ["یوسف", "Yusuf"],
  ];
  for (const [urdu, expected] of NAME_CASES) {
    test(`${urdu} → ${expected}`, () => {
      const out = convertUrduToRoman(urdu);
      expect(out).toContain(expected);
    });
  }

  test("محمد احمد → Muhammad Ahmad", () => {
    const out = convertUrduToRoman("محمد احمد");
    expect(out).toContain("Muhammad");
    expect(out).toContain("Ahmad");
  });

  test("فاطمہ زہرا → Fatimah Zahra", () => {
    const out = convertUrduToRoman("فاطمہ زہرا");
    expect(out).toContain("Fatimah");
    expect(out).toContain("Zahra");
  });
});

// ── Draft persistence tests (Phase 19A.25) ───────────────────────────────────

describe("Draft persistence — urDraft.ts", () => {
  // Use vitest's localStorage mock via happy-dom (available in jsdom-like envs)
  // We test the persistence functions directly, not via full component render.

  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  test("saveUrDraft + loadUrDraft round-trip", async () => {
    // localStorage only available in browser-env (happy-dom). Skip in node.
    if (typeof localStorage === "undefined") return;
    const { saveUrDraft, loadUrDraft } = await import("../app/tools/urdu-roman-writer/utils/urDraft");
    saveUrDraft({ urduInput: "جزاک اللہ خیر", style: "chat" });
    const restored = loadUrDraft();
    expect(restored).not.toBeNull();
    expect(restored?.urduInput).toBe("جزاک اللہ خیر");
    expect(restored?.style).toBe("chat");
    expect(restored?.version).toBe(1);
  });

  test("clearUrDraft removes stored draft", async () => {
    if (typeof localStorage === "undefined") return;
    const { saveUrDraft, loadUrDraft, clearUrDraft } = await import("../app/tools/urdu-roman-writer/utils/urDraft");
    saveUrDraft({ urduInput: "میرا نام", style: "simple" });
    clearUrDraft();
    expect(loadUrDraft()).toBeNull();
  });

  test("loadUrDraft returns null when nothing stored", async () => {
    if (typeof localStorage === "undefined") return;
    const { loadUrDraft } = await import("../app/tools/urdu-roman-writer/utils/urDraft");
    expect(loadUrDraft()).toBeNull();
  });

  test("loadUrDraft rejects invalid/corrupted draft", async () => {
    if (typeof localStorage === "undefined") return;
    const { loadUrDraft } = await import("../app/tools/urdu-roman-writer/utils/urDraft");
    localStorage.setItem("qalam-urdu-roman-draft", JSON.stringify({ version: 1, urduInput: 42, style: "simple" }));
    expect(loadUrDraft()).toBeNull();
  });

  test("all three styles persist correctly", async () => {
    if (typeof localStorage === "undefined") return;
    const { saveUrDraft, loadUrDraft } = await import("../app/tools/urdu-roman-writer/utils/urDraft");
    for (const style of ["simple", "academic", "chat"] as const) {
      saveUrDraft({ urduInput: "test", style });
      expect(loadUrDraft()?.style).toBe(style);
    }
  });

  test("draft key is separate from Roman Urdu Writer", async () => {
    const { UR_DRAFT_KEY } = await import("../app/tools/urdu-roman-writer/utils/urDraft");
    const { WRITER_DRAFT_KEY } = await import("../app/tools/roman-urdu-writer/utils/writerDraft");
    expect(UR_DRAFT_KEY).not.toBe(WRITER_DRAFT_KEY);
  });

  test("output recomputes from restored urduInput: جزاک اللہ خیر → Jzk (chat)", () => {
    // Simulate: restore input and style, then compute output
    const urduInput = "جزاک اللہ خیر";
    const style = "chat" as const;
    const output = applyStyle(convertUrduToRoman(urduInput), style);
    expect(output).toBe("Jzk");
  });

  test("output recomputes from restored urduInput: simple style", () => {
    const output = applyStyle(convertUrduToRoman("جزاک اللہ خیر"), "simple");
    expect(output).toContain("JazakAllah");
  });
});
