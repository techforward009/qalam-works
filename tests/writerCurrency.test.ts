/**
 * Phase 19A.13 — Currency, BiDi, and Review-cleanup focused tests
 */

import {
  toUrduWords,
  transformPKRAmount,
  splitBidiSegments,
} from "../app/tools/roman-urdu-writer/utils/writerCurrency";

// ── toUrduWords ───────────────────────────────────────────────────────────────

describe("toUrduWords", () => {
  test("zero", () => expect(toUrduWords(0)).toBe("صفر"));
  test("1", () => expect(toUrduWords(1)).toBe("ایک"));
  test("10", () => expect(toUrduWords(10)).toBe("دس"));
  test("20", () => expect(toUrduWords(20)).toBe("بیس"));
  test("21", () => expect(toUrduWords(21)).toBe("اکیس"));
  test("100", () => expect(toUrduWords(100)).toBe("ایک سو"));
  test("1000", () => expect(toUrduWords(1000)).toBe("ایک ہزار"));
  test("1250", () => expect(toUrduWords(1250)).toBe("ایک ہزار دو سو پچاس"));
  test("75000", () => expect(toUrduWords(75000)).toBe("پچھتر ہزار"));
  test("100000 (1 lakh)", () => expect(toUrduWords(100000)).toBe("ایک لاکھ"));
  test("250000", () => expect(toUrduWords(250000)).toBe("دو لاکھ پچاس ہزار"));
  test("1000000 (10 lakh)", () => expect(toUrduWords(1000000)).toBe("دس لاکھ"));
  test("10000000 (1 crore)", () => expect(toUrduWords(10000000)).toBe("ایک کروڑ"));
  test("30 has correct urdu", () => expect(toUrduWords(30)).toBe("تیس"));
  test("50 panchaa sey", () => expect(toUrduWords(50)).toBe("پچاس"));
});

// ── transformPKRAmount ────────────────────────────────────────────────────────

describe("transformPKRAmount", () => {
  test("RS. 75,000 → 75,000 (پچھتر ہزار) روپے", () => {
    const r = transformPKRAmount("RS. 75,000");
    expect(r).toBe("75,000 (پچھتر ہزار) روپے");
  });

  test("Rs. 1,250 → 1,250 (ایک ہزار دو سو پچاس) روپے", () => {
    const r = transformPKRAmount("Rs. 1,250");
    expect(r).toBe("1,250 (ایک ہزار دو سو پچاس) روپے");
  });

  test("PKR 250,000 → 250,000 (دو لاکھ پچاس ہزار) روپے", () => {
    const r = transformPKRAmount("PKR 250,000");
    expect(r).toBe("250,000 (دو لاکھ پچاس ہزار) روپے");
  });

  test("rs. 500 (lowercase) → 500 (پانچ سو) روپے", () => {
    const r = transformPKRAmount("rs. 500");
    expect(r).toBe("500 (پانچ سو) روپے");
  });

  test("in-sentence transform", () => {
    const input = "maali rukawat se bacha jaa sakay RS. 75,000 tak";
    const out = transformPKRAmount(input);
    expect(out).toContain("75,000 (پچھتر ہزار) روپے");
    expect(out).not.toContain("RS.");
  });

  // Non-currency: must NOT be changed
  test("plain 75,000 unchanged", () => expect(transformPKRAmount("75,000")).toBe("75,000"));
  test("15% unchanged", () => expect(transformPKRAmount("15%")).toBe("15%"));
  test("2025-26 unchanged", () => expect(transformPKRAmount("2025-26")).toBe("2025-26"));
  test("3.14 unchanged", () => expect(transformPKRAmount("3.14")).toBe("3.14"));
  test("phone number unchanged", () => expect(transformPKRAmount("0321-9876543")).toBe("0321-9876543"));
  test("URL unchanged", () => expect(transformPKRAmount("https://qalam.works/path")).toBe("https://qalam.works/path"));
  test("email unchanged", () => expect(transformPKRAmount("info@qalam.works")).toBe("info@qalam.works"));

  test("acceptance paragraph transforms RS. but leaves 2025-26 and 15% intact", () => {
    const para = "Company ne 2025-26 ke maali saal ke liye 15% idhaafay ka aelaan kiya. RS. 75,000 tak ki maali rukawat.";
    const out = transformPKRAmount(para);
    expect(out).toContain("2025-26");
    expect(out).toContain("15%");
    expect(out).toContain("75,000 (پچھتر ہزار) روپے");
    expect(out).not.toContain("RS. 75");
  });
});

// ── splitBidiSegments ─────────────────────────────────────────────────────────

describe("splitBidiSegments", () => {
  test("plain Urdu text returns single text segment", () => {
    const segs = splitBidiSegments("آج کا دن اچھا ہے");
    expect(segs.every(s => s.kind === "text")).toBe(true);
  });

  test("2025-26 becomes ltr segment", () => {
    const segs = splitBidiSegments("سال 2025-26 کے لیے");
    const ltr = segs.filter(s => s.kind === "ltr");
    expect(ltr.length).toBeGreaterThan(0);
    expect(ltr[0].text).toBe("2025-26");
  });

  test("15% becomes ltr segment", () => {
    const segs = splitBidiSegments("15% اضافہ");
    const ltr = segs.filter(s => s.kind === "ltr");
    expect(ltr.some(s => s.text === "15%")).toBe(true);
  });

  test("75,000 becomes ltr segment", () => {
    const segs = splitBidiSegments("75,000 روپے");
    const ltr = segs.filter(s => s.kind === "ltr");
    expect(ltr.some(s => s.text === "75,000")).toBe(true);
  });

  test("3.14 becomes ltr segment", () => {
    const segs = splitBidiSegments("قدر 3.14 ہے");
    const ltr = segs.filter(s => s.kind === "ltr");
    expect(ltr.some(s => s.text === "3.14")).toBe(true);
  });

  test("plain text between numbers preserved", () => {
    const segs = splitBidiSegments("سال 2025-26 میں 15% اضافہ");
    const texts = segs.map(s => s.text).join("");
    expect(texts).toBe("سال 2025-26 میں 15% اضافہ");
  });

  test("no segments lost — reassembled equals input", () => {
    const input = "Company ne 2025-26 ke liye 15% ka aelaan kiya RS. 75,000";
    const segs = splitBidiSegments(input);
    const reassembled = segs.map(s => s.text).join("");
    expect(reassembled).toBe(input);
  });
});
