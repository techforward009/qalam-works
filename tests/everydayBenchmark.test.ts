/**
 * EVERYDAY Benchmark — 100 common Pakistani Roman Urdu sentences
 * Real-user acceptance audit: chat, WhatsApp, social media, office.
 *
 * This is a DIAGNOSTIC scorecard, not a regression gate.
 * Expected outputs are human-reviewed Urdu (NOT engine output).
 * Purpose: track progress on real-world quality, separate from GS-001..120.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import {
  fixFormalOutput, transformPKRAmount, transformPercentage,
  transformAcronymsAndBrands, cleanParentheticals,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

const fixtures = JSON.parse(
  readFileSync(join(__dirname, "fixtures/everydayBenchmark.json"), "utf8")
);

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  return normalizeUrduProsePunctuation(cleanParentheticals(
    transformAcronymsAndBrands(transformPercentage(transformPKRAmount(p1)))
  ));
}

function urduWords(s: string): string[] {
  return s.replace(/[^\u0600-\u06FF\s]/g, " ").trim().split(/\s+/).filter(Boolean);
}

function wordOverlap(received: string, expected: string): number {
  const recSet = new Set(urduWords(received));
  const expWords = urduWords(expected);
  if (!expWords.length) return 1;
  return expWords.filter(w => recSet.has(w)).length / expWords.length;
}

function latinLeaks(text: string): string[] {
  return (text.match(/\b[a-zA-Z]{3,}\b/g) || [])
    .filter(w => !/^(allah|alhamdulillah|inshaallah|mashallah|jazakallah|subhanallah)$/i.test(w));
}

describe("EVERYDAY Benchmark — 100 real-user sentences", () => {
  test("Scorecard: EVERYDAY-001..100 quality audit", () => {
    const results: Record<string, { pass: number; wcr: number; latin: number; critical: string[] }> = {};
    const categories = [...new Set<string>(fixtures.map((f: any) => f.cat as string))];
    for (const cat of categories) results[cat] = { pass: 0, wcr: 0, latin: 0, critical: [] as string[] };

    let totalPass = 0, totalWcr = 0, totalLatin = 0;
    const criticalFails: string[] = [];
    const latinLeakCases: string[] = [];

    for (const f of fixtures) {
      const received = pipe(f.input);
      const wcr = wordOverlap(received, f.expected);
      const leaks = latinLeaks(received);
      const pass = wcr >= 0.85 && !leaks.length;

      totalWcr += wcr;
      if (pass) totalPass++;
      if (leaks.length) {
        totalLatin++;
        latinLeakCases.push(`${f.id}: ${leaks.join(",")} (from: ${f.input})`);
      }
      if (f.failure?.includes("CRITICAL")) {
        criticalFails.push(`${f.id}: ${f.failure}`);
      }
      if (results[f.cat]) {
        results[f.cat].wcr += wcr;
        if (pass) results[f.cat].pass++;
        if (leaks.length) results[f.cat].latin++;
      }
    }

    const n = fixtures.length;
    console.log("\n═══════════════════════════════════════");
    console.log("EVERYDAY BENCHMARK — 100 sentence audit");
    console.log("═══════════════════════════════════════");
    console.log(`Sentences: ${n}`);
    console.log(`Human-readability pass (WCR≥85%, no Latin): ${totalPass}/${n} (${(totalPass/n*100).toFixed(1)}%)`);
    console.log(`Avg Word Correction Rate: ${(totalWcr/n*100).toFixed(1)}%`);
    console.log(`Latin leakage cases: ${totalLatin}`);
    console.log(`\nBy category:`);
    for (const cat of categories) {
      const catItems = fixtures.filter((f: any) => f.cat === cat);
      const r = results[cat];
      if (catItems.length) {
        console.log(`  ${cat.padEnd(14)} n=${catItems.length}  pass=${r.pass}/${catItems.length}  avgWCR=${(r.wcr/catItems.length*100).toFixed(0)}%  latin=${r.latin}`);
      }
    }
    console.log(`\nLatin leaks:`);
    latinLeakCases.forEach(c => console.log(`  ${c}`));
    console.log(`\nCRITICAL semantic errors:`);
    criticalFails.forEach(c => console.log(`  ${c}`));

    // Hard assertions — minimum sanity
    expect(totalLatin).toBeLessThan(20);     // No more than 20 Latin leaks
    expect(criticalFails.length).toBeLessThan(10); // < 10 critical semantic errors
    expect(totalPass).toBeGreaterThan(20);   // At least 20 fully passing
  });

  // Spot-check must-pass cases
  test("Core particles always correct", () => {
    const mustPass = [
      ["phir kya hua?", "پھر کیا ہوا؟"],
      ["aur kya chahiye?", "اور کیا چاہیے؟"],
      ["us k baad kya hua?", "اس کے بعد کیا ہوا؟"],
      ["yeh toh hona hi tha", "یہ تو ہونا ہی تھا"],
      ["jo hona tha so ho gaya", "جو ہونا تھا سو ہو گیا"],
    ];
    for (const [input, expected] of mustPass) {
      const out = pipe(input);
      const wcr = wordOverlap(out, expected);
      expect(wcr, `"${input}" → "${out}"`).toBeGreaterThanOrEqual(0.8);
    }
  });

  test("English loanwords: mobile, file, meeting convert correctly", () => {
    expect(pipe("mera mobile kho gaya")).toContain("موبائل");
    expect(pipe("meri file kahan hai")).toContain("فائل");
    expect(pipe("meeting hai kal")).toContain("میٹنگ");
    expect(pipe("deadline kal hai")).toContain("ڈیڈ لائن");
    expect(pipe("report submit kar di")).toContain("رپورٹ");
  });

  test("Numbers stay as digits", () => {
    const out1 = pipe("mere paas 100 rupay hain");
    expect(out1).toContain("100");
    const out2 = pipe("woh 10 minute mein aayega");
    expect(out2).toContain("10");
    const out3 = pipe("aaj 25 taarikh hai");
    expect(out3).toContain("25");
  });

  test("aik → ایک", () => {
    expect(pipe("sirf aik baat bolni hai")).toContain("ایک");
    expect(pipe("aik kaam karo pehle")).toContain("ایک");
  });

  test("phir correct", () => {
    expect(pipe("phir se aana parta hai")).toContain("پھر");
    expect(pipe("phir milenge inshaAllah")).toContain("پھر");
  });

  test("no Latin leakage in best-performing sentences", () => {
    const clean = [
      "ghar aa jao yaar",
      "koi baat nahi, sab theek ho jayega",
      "mere paas 100 rupay hain",
      "ammi ne khana banaya",
      "chai pi lo",
      "kitni door hai woh jagah?",
      "yaar bohot bura hua",
      "phir kya hua?",
    ];
    for (const s of clean) {
      const leaks = latinLeaks(pipe(s));
      expect(leaks, `Latin in: ${s}`).toHaveLength(0);
    }
  });
});
