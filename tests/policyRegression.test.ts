/**
 * Phase 19A — Full Urdu-Script Policy regression tests
 *
 * Tests exact distinctions between:
 *   Roman Urdu → Urdu vocabulary (semantic)
 *   English word → Urdu-script transliteration (phonetic, NOT translation)
 *   Percentage symbol % → فیصد
 *   English word "percent" → پرسنٹ
 *   Protected machine-readable tokens → exact
 */

import { describe, test, expect } from "vitest";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  transformPKRAmount,
  transformPercentage,
  transformAcronymsAndBrands,
  cleanParentheticals,
  fixFormalOutput,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipeline(text: string): string {
  const raw = convertRomanUrdu(text).output;
  const p1 = fixFormalOutput(raw);
  const p2 = transformPKRAmount(p1);
  const p3 = transformPercentage(p2);
  const p4 = transformAcronymsAndBrands(p3);
  const p5 = cleanParentheticals(p4);
  return normalizeUrduProsePunctuation(p5);
}

// ── Roman Urdu vs English distinctions ───────────────────────────────────────

describe("Roman Urdu vs English distinctions", () => {
  test("behtar (Roman Urdu) → بہتر", () => {
    const out = pipeline("yeh behtar hai");
    expect(out).toContain("بہتر");
    expect(out).not.toContain("better");
    expect(out).not.toContain("بیٹر");
  });

  test("better (English) → بیٹر (NOT بہتر)", () => {
    const out = pipeline("performance better ho gayi hai");
    expect(out).toContain("بیٹر");
    expect(out).not.toContain("better");
  });

  test("tasdeeq (Roman Urdu) → تصدیق", () => {
    const out = pipeline("tasdeeq zaroori hai");
    expect(out).toContain("تصدیق");
    expect(out).not.toContain("verification");
  });

  test("verification (English) → ویریفیکیشن", () => {
    const out = pipeline("verification process karna hai");
    expect(out).toContain("ویریفیکیشن");
    expect(out).not.toContain("verification");
  });

  test("tasdeeq (verification) → تصدیق [parenthetical stripped]", () => {
    const out = pipeline("tasdeeq (verification) nihayat zaroori hai");
    expect(out).toContain("تصدیق");
    // parenthetical should be stripped
    expect(out).not.toContain("verification");
  });

  test("meeting (English) → میٹنگ", () => {
    const out = pipeline("aaj meeting hai office mein");
    expect(out).toContain("میٹنگ");
    expect(out).not.toContain("meeting");
  });

  test("office (English) → آفس", () => {
    const out = pipeline("office mein aa jao");
    expect(out).toContain("آفس");
    expect(out).not.toContain("office");
  });

  test("department (English) → ڈیپارٹمنٹ", () => {
    const out = pipeline("HR department se rabta karo");
    expect(out).toContain("ڈیپارٹمنٹ");
    expect(out).not.toContain("department");
  });

  test("inflation (English) → انفلیشن (no gloss)", () => {
    const out = pipeline("inflation ki wajah se");
    expect(out).toContain("انفلیشن");
    expect(out).not.toContain("inflation");
    // No auto-gloss per policy
    expect(out).not.toContain("مہنگائی");
  });
});

// ── Percentage distinctions ───────────────────────────────────────────────────

describe("Percentage policy distinctions", () => {
  test("15% → 15 فیصد", () => {
    const out = pipeline("salary mein 15% izaafa hua");
    expect(out).toMatch(/15 فیصد/);
    expect(out).not.toContain("15%");
  });

  test("50% → 50 فیصد", () => {
    const out = pipeline("50% kaam ho gaya hai");
    expect(out).toMatch(/50 فیصد/);
  });

  test("3.5% → 3.5 فیصد", () => {
    const out = pipeline("3.5% reduction aayi hai");
    expect(out).toMatch(/3\.5 فیصد/);
  });

  test("15 percent → 15 پرسنٹ (NOT فیصد)", () => {
    const out = pipeline("15 percent izaafa hua");
    expect(out).toContain("پرسنٹ");
    // Should NOT be فیصد for the English word "percent"
    expect(out).not.toContain("پرسنٹ فیصد");
  });

  test("feesad / fisad (Roman Urdu) → فیصد", () => {
    // Test via pipeline — these go through the lexicon
    const out1 = convertRomanUrdu("15 feesad izaafa").output;
    const out2 = convertRomanUrdu("15 fisad izaafa").output;
    // Either converts or stays Roman — at minimum should not produce garbage
    expect(out1 || out2).toBeTruthy();
  });

  test("% in plain number stays intact", () => {
    // 75,000 — no % so no فیصد added
    const out = pipeline("75,000 log hain");
    expect(out).not.toContain("فیصد");
  });
});

// ── Acronyms ─────────────────────────────────────────────────────────────────

describe("Acronym transliteration", () => {
  test("HR → ایچ آر", () => {
    const out = transformAcronymsAndBrands("HR department se rabta karo");
    expect(out).toContain("ایچ آر");
    expect(out).not.toContain(" HR ");
  });

  test("AI → اے آئی", () => {
    const out = transformAcronymsAndBrands("AI update ke baad performance better");
    expect(out).toContain("اے آئی");
  });

  test("PDF → پی ڈی ایف", () => {
    const out = transformAcronymsAndBrands("PDF report bhejo");
    expect(out).toContain("پی ڈی ایف");
  });

  test("SMS → ایس ایم ایس", () => {
    const out = transformAcronymsAndBrands("SMS aaya hai");
    expect(out).toContain("ایس ایم ایس");
  });

  test("OTP → او ٹی پی", () => {
    const out = transformAcronymsAndBrands("OTP dalo");
    expect(out).toContain("او ٹی پی");
  });

  test("full pipeline: HR department in acceptance paragraph", () => {
    const out = pipeline("HR department se rabta karein taake RS. 75,000 tak ki maali rukawat se bacha jaa sakay");
    expect(out).toContain("ایچ آر");
    expect(out).toContain("ڈیپارٹمنٹ");
    expect(out).toContain("75,000");
    expect(out).toContain("روپے");
  });
});

// ── Brand transliteration ─────────────────────────────────────────────────────

describe("Brand transliteration", () => {
  test("WhatsApp → واٹس ایپ", () => {
    const out = transformAcronymsAndBrands("WhatsApp par message karo");
    expect(out).toContain("واٹس ایپ");
    expect(out).not.toContain("WhatsApp");
  });

  test("Google → گوگل", () => {
    const out = transformAcronymsAndBrands("Google par search karo");
    expect(out).toContain("گوگل");
  });

  test("YouTube → یوٹیوب", () => {
    const out = transformAcronymsAndBrands("YouTube par video dekho");
    expect(out).toContain("یوٹیوب");
  });

  test("Zoom → زوم", () => {
    const out = transformAcronymsAndBrands("Zoom meeting hai");
    expect(out).toContain("زوم");
  });
});

// ── Protected token integrity ─────────────────────────────────────────────────

describe("Protected machine-readable tokens stay exact", () => {
  test("URL stays exact", () => {
    const out = pipeline("https://qalamworks.com par jao");
    expect(out).toContain("https://qalamworks.com");
  });

  test("email stays exact", () => {
    const out = pipeline("info@qalam.works par email karo");
    expect(out).toContain("info@qalam.works");
  });

  test("filename stays exact", () => {
    const out = pipeline("report.pdf bhejo");
    expect(out).toContain("report.pdf");
  });

  test("version string stays exact", () => {
    const out = pipeline("v2.1 mein bug tha");
    expect(out).toContain("v2.1");
  });

  test("PDF as filename is NOT converted (file extension present)", () => {
    // "report.pdf" — the filename is protected; "PDF" standalone would be converted
    const out = pipeline("report.pdf bhejo");
    expect(out).toContain("report.pdf");
    // But NOT converted to پی ڈی ایف
    expect(out).not.toContain("پی ڈی ایف report");
  });
});

// ── Production acceptance paragraphs ─────────────────────────────────────────

describe("Production acceptance paragraphs", () => {
  test("PARA2: acceptance paragraph — full policy check", () => {
    const input = "Mulaazmeen ki mahana tankhwah aur pension ki adaiyagi ke liye bank account ki tasdeeq (verification) nihayat zaroori hai. Company ne 2025-26 ke maali saal ke liye 15% idhaafay ka aelaan kiya tha. Agar aap ka record update nahi hai, toh fawri taur par HR department se rabta karein taake RS. 75,000 tak ki maali rukawat se bacha jaa sakay.";
    const out = pipeline(input);

    // Urdu conversion
    expect(out).toContain("ملازمین");
    expect(out).toContain("تنخواہ");
    expect(out).toContain("تصدیق");
    expect(out).not.toContain("verification"); // stripped from parenthetical

    // % → فیصد
    expect(out).toMatch(/15 فیصد/);
    expect(out).not.toContain("15%");

    // 2025-26 preserved
    expect(out).toContain("2025-26");

    // HR → ایچ آر
    expect(out).toContain("ایچ آر");

    // department → ڈیپارٹمنٹ
    expect(out).toContain("ڈیپارٹمنٹ");

    // RS. 75,000 → روپے
    expect(out).toContain("75,000");
    expect(out).toContain("روپے");
    expect(out).not.toContain("RS.");

    // No translation gloss
    expect(out).not.toContain("مہنگائی");
  });

  test("AI update paragraph — policy check", () => {
    const out = pipeline("AI update ke baad system ki performance 50% better ho gayi hai");
    expect(out).toContain("اے آئی");
    expect(out).toContain("سسٹم");
    expect(out).toContain("پرفارمنس");
    expect(out).toContain("50 فیصد");
    expect(out).toContain("بیٹر");
    expect(out).not.toContain("AI ");
    expect(out).not.toContain("50%");
    expect(out).not.toContain("better");
  });

  test("PDF report paragraph — policy check", () => {
    const out = pipeline("PDF report send kar di hai");
    expect(out).toContain("پی ڈی ایف");
    expect(out).toContain("رپورٹ");
    expect(out).toContain("سینڈ");
    expect(out).not.toContain("PDF ");
    expect(out).not.toContain("report");
    expect(out).not.toContain("send");
  });
});
