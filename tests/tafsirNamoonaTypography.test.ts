import { describe, expect, it } from "vitest";
import { splitTafsirTypography } from "../app/quran/reader/tafsirTypography";

function segments(source: string) {
  const runs = splitTafsirTypography(source);
  expect(runs.map((part) => part.text).join("")).toBe(source);
  return runs;
}

describe("Tafsir Namoona typography preserves the original source", () => {
  it("renders Bismillah in Arabic between Urdu without changing any character", () => {
    const source = "تفسیر ۱۔ بِسْمِ اللّهِ الرَّحْمَنِ الرَّحِيمِ اور اس کی وضاحت\nتمام لوگوں میں یہ رسم ہے۔";
    const runs = segments(source);
    expect(runs.some((r) => r.kind === "arabic" && r.text.includes("بِسْمِ"))).toBe(true);
    expect(runs.some((r) => r.kind === "urdu" && r.text.includes("تفسیر ۱۔"))).toBe(true);
    expect(runs.some((r) => r.kind === "urdu" && r.text.includes("وضاحت"))).toBe(true);
  });

  it("recognizes full ayah lines containing Arabic vocalization", () => {
    const source = "۲۵۵۔اللَّہُ لا إِلہَ إِلاَّ ہُوَ الْحَیُّ الْقَیُّومُ";
    expect(segments(source)).toEqual([{ kind: "arabic", text: source }]);
  });

  it("handles multiple Arabic ayah lines with original numbering and whitespace", () => {
    const source = "(2) وَالْقُرْاٰنِ الْحَكِـيْـمِ \n(3) اِنَّكَ لَمِنَ الْمُرْسَلِيْنَ";
    const runs = segments(source);
    expect(runs.filter((r) => r.kind === "arabic")).toHaveLength(2);
  });

  it("does not guess Arabic for undiacritized Urdu or undiacritized quotations", () => {
    const source = "اگر حاتم کا نام باقی ہے تو سخاوت کے باعث ہے۔\nکل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابرت";
    expect(segments(source).every((r) => r.kind === "urdu")).toBe(true);
  });

  it("retains mixed Urdu, Arabic and English text without adding spaces", () => {
    const source = "قرآن کی آیت وَالْقُرْاٰنِ الْحَكِـيْـمِ میں Qalam Works کا ذکر نہیں";
    const runs = segments(source);
    expect(runs.some((r) => r.kind === "urdu" && r.text.includes("Qalam Works"))).toBe(true);
    expect(runs.some((r) => r.kind === "arabic")).toBe(true);
  });

  it("does not change tatweel, Arabic harakat, Urdu punctuation or line endings", () => {
    const source = "يٰـسٓ \nپیدائشِ آدم — الْحَمْدُ لِلّٰهِ \r\n(1) بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِیْمِ ";
    segments(source);
  });

  it("handles blank and Urdu-only records", () => {
    expect(splitTafsirTypography("")).toEqual([]);
    expect(segments("تفسیر نمونہ کا متن")).toEqual([{ kind: "urdu", text: "تفسیر نمونہ کا متن" }]);
  });
});
