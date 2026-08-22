/**
 * Phase 19A.19 — Apostrophe/Ain Cluster Recovery focused tests
 */

import { describe, test, expect } from "vitest";
import { encodeAinApostrophes, normalizeRomanUrduToken } from "../app/tools/roman-urdu-writer/utils/romanUrduNormalize";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
import { fixFormalOutput, transformPKRAmount, cleanParentheticals, transformAcronymsAndBrands, transformPercentage } from "../app/tools/roman-urdu-writer/utils/writerCurrency";
import { normalizeUrduProsePunctuation } from "../app/tools/roman-urdu-writer/utils/normalizeUrduProsePunctuation";

function pipe(s: string): string {
  const p1 = fixFormalOutput(convertRomanUrdu(s).output);
  const p2 = transformPKRAmount(p1);
  const p3 = transformPercentage(p2);
  const p4 = transformAcronymsAndBrands(p3);
  const p5 = cleanParentheticals(p4);
  return normalizeUrduProsePunctuation(p5);
}

// ── encodeAinApostrophes unit tests ──────────────────────────────────────────

describe("encodeAinApostrophes", () => {
  test("a'i → 3i: baa'is → ba3is", () => {
    expect(encodeAinApostrophes("baa'is")).toBe("ba3is");
  });

  test("a'a → 3a: ijtima'ai → ijtim3ai", () => {
    // first matches a'a at 'ma'a', then 'i' follows
    expect(encodeAinApostrophes("ijtima'ai")).toBe("ijtim3ai");
  });

  test("o'o → o3o: sho'oor → sho3or (then collapses)", () => {
    // o'oo matches, giving sho3or (oo not 3+)
    expect(encodeAinApostrophes("sho'oor")).toBe("sho3or");
  });

  test("a'a → 3a: ma'ani → m3ani", () => {
    expect(encodeAinApostrophes("ma'ani")).toBe("m3ani");
  });

  test("u'a → u3a: mu'aashra → mu3ashra", () => {
    expect(encodeAinApostrophes("mu'aashra")).toBe("mu3ashra");
  });

  test("n'a → n3a: in'aam → in3am (double-a consumed by n'aa pattern)", () => {
    // n'aa pattern: in'aam → i + n3a + m = in3am
    expect(encodeAinApostrophes("in'aam")).toBe("in3am");
  });

  test("a'i → 3i: jaa'iz → ja3iz", () => {
    expect(encodeAinApostrophes("jaa'iz")).toBe("ja3iz");
  });

  test("a' → 3: ta'assub → t3assub", () => {
    expect(encodeAinApostrophes("ta'assub")).toBe("t3assub");
  });

  test("fallback ' removal doesn't fire before specific patterns", () => {
    // sho'oor should produce sho3or, NOT shoor (which would collapse to shor)
    const enc = encodeAinApostrophes("sho'oor");
    expect(enc).toContain("3");
    expect(enc).not.toBe("shoor");
  });
});

// ── normalizeRomanUrduToken ───────────────────────────────────────────────────

describe("normalizeRomanUrduToken encodes correctly", () => {
  test("baa'is → ba3is", () => expect(normalizeRomanUrduToken("baa'is")).toBe("ba3is"));
  test("sho'oor → sho3or", () => expect(normalizeRomanUrduToken("sho'oor")).toBe("sho3or"));
  test("ma'ani → m3ani", () => expect(normalizeRomanUrduToken("ma'ani")).toBe("m3ani"));
  test("ijtima'ai → ijtim3ai", () => expect(normalizeRomanUrduToken("ijtima'ai")).toBe("ijtim3ai"));
  test("in'aam → in3am (n'aa pattern)", () => expect(normalizeRomanUrduToken("in'aam")).toBe("in3am"));
});

// ── Full pipeline tests (in Urdu context so hasUrduCue fires) ────────────────

describe("Full pipeline — apostrophe recovery in Urdu context", () => {

  test("baa'is → باعث", () => {
    const out = pipe("yeh baa'is banti hain");
    expect(out).toContain("باعث");
    expect(out).not.toContain("بائیس");
  });

  test("ijtima'ai → اجتماعی", () => {
    const out = pipe("ijtima'ai sho'oor zaroori hai");
    expect(out).toContain("اجتماعی");
  });

  test("sho'oor → شعور", () => {
    const out = pipe("sho'oor ko barhana chahiye");
    expect(out).toContain("شعور");
    expect(out).not.toContain("شور");
  });

  test("ma'ani → معانی", () => {
    const out = pipe("alfaaz ke ma'ani samjhain");
    expect(out).toContain("معانی");
  });

  test("mu'aashra → معاشرہ", () => {
    const out = pipe("mu'aashra behtar hona chahiye");
    expect(out).toContain("معاشر");  // معاشرہ or معاشرے
  });

  test("mu'aashray → معاشرے", () => {
    const out = pipe("mu'aashray mein amn hona chahiye");
    expect(out).toContain("معاشرے");
  });

  test("mu'aashrati → معاشرتی", () => {
    const out = pipe("mu'aashrati taraqqii zaroori hai");
    expect(out).toContain("معاشرتی");
  });

  test("mu'aashi → معاشی", () => {
    const out = pipe("mu'aashi behbood chahiye");
    expect(out).toContain("معاشی");
  });

  test("ta'assub → تعصب (was already working)", () => {
    const out = pipe("ta'assub se bachna chahiye");
    expect(out).toContain("تعصب");
  });

  test("in'aam → انعام", () => {
    const out = pipe("yeh in'aam mila hai");
    expect(out).toContain("انعام");
  });

  test("jaa'iz → جائز", () => {
    const out = pipe("yeh kaam jaa'iz hai ya nahi");
    expect(out).toContain("جائز");
  });

  test("no _IZ_ leaks from izafat placeholder", () => {
    const out = pipe("ijtima'ai sho'oor aur baa'is banti hain");
    expect(out).not.toContain("_IZ_");
  });
});

// ── Negative controls — apostrophe must NOT force ع ──────────────────────────

describe("Negative controls — apostrophe NOT forced to ع", () => {
  test("English contractions not corrupted: don't", () => {
    // "don't" has apostrophe but is English — engine marks as English, not converted
    const out = pipe("don't go wahan");
    // Should not produce garbage Urdu from don't
    expect(out).not.toContain("_IZ_");
  });

  test("ta'arruf — different ain form, not destroyed", () => {
    const out = pipe("ta'arruf zaroori hai");
    // Should produce some Urdu — not undefined/empty
    expect(out.length).toBeGreaterThan(5);
  });

  test("URL with apostrophe-like chars preserved", () => {
    // URLs are protected
    const out = pipe("https://example.com par jao");
    expect(out).toContain("https://example.com");
  });

  test("email preserved", () => {
    const out = pipe("info@qalam.works par bhejo");
    expect(out).toContain("info@qalam.works");
  });

  test("filename preserved", () => {
    const out = pipe("report.pdf bhejo");
    expect(out).toContain("report.pdf");
  });
});

// ── معاشر OUTPUT_CORRECTIONS ─────────────────────────────────────────────────

describe("OUTPUT_CORRECTIONS: معشر → معاشر", () => {
  test("fixFormalOutput corrects معشرہ → معاشرہ", () => {
    expect(fixFormalOutput("معشرہ achi jagah hai")).toContain("معاشرہ");
  });

  test("fixFormalOutput corrects معشرے → معاشرے", () => {
    expect(fixFormalOutput("معشرے mein")).toContain("معاشرے");
  });

  test("fixFormalOutput corrects معشرتی → معاشرتی", () => {
    expect(fixFormalOutput("معشرتی taraqqii")).toContain("معاشرتی");
  });

  test("fixFormalOutput corrects معشری → معاشری", () => {
    expect(fixFormalOutput("ghair معشری")).toContain("معاشری");
  });
});
