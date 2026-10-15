import { describe, expect, it } from "vitest";
import { displayTafsirHeading, splitTafsirTypography, tafsirSourceHeading } from "../app/quran/reader/tafsirTypography";

const flatten = (text: string) => splitTafsirTypography(text).map((run) => run.text).join("");

describe("Tafsir source-preserving typography", () => {
  it("keeps all characters, punctuation, line breaks and meaningful spaces byte-for-byte", () => {
    const samples = [
      "پروگرام کودوام بخشنے کے لئے اسے ایسی ہستی سے منسوب کیا جائے۔",
      "اس کے نام سے شروع کریں:\nاقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ\n(ہود، آیت ۴۱)۔",
      "Mixed text: اِنَّ اللّٰهَ غَفُورٌ رَحِيمٌ (Hud, verse 41).",
      "  فاصلہ اور رموزِ اوقاف ،۔ محفوظ رہیں  \n",
    ];
    for (const sample of samples) expect(flatten(sample)).toBe(sample);
  });

  it("applies Digital Khatt to a complete standalone Arabic quotation and keeps its source note separate", () => {
    const text = "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ\nوَقَالَ ارْكَبُواْ فِيهَا بِسْمِ اللّهِ مَجْرِےهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ (ہود، آیت ۴۱)۔";
    const runs = splitTafsirTypography(text);
    expect(runs.filter((run) => run.kind === "arabic").map((run) => run.text)).toEqual([
      "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
    ]);
    expect(runs.filter((run) => run.kind === "arabic-unsupported").map((run) => run.text)).toEqual([
      "وَقَالَ ارْكَبُواْ فِيهَا بِسْمِ اللّهِ مَجْرِےهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ",
    ]);
    expect(runs.filter((run) => run.kind === "reference").map((run) => run.text)).toEqual([" (ہود، آیت ۴۱)۔"]);
  });

  it("leaves ambiguous and mixed Urdu lines intact instead of switching individual words", () => {
    const mixed = "یہ عبارت اِنَّا لِلّٰهِ کو مثال کے طور پر پیش کرتی ہے۔";
    const unvowelled = "بسم اللہ کے نام سے ہر کام شروع کریں۔";
    for (const text of [mixed, unvowelled]) {
      const runs = splitTafsirTypography(text);
      expect(runs).toEqual([{ kind: "urdu", text }]);
      expect(flatten(text)).toBe(text);
    }
  });

  it("corrects only reviewed English display headings and retains the original title separately", () => {
    const source = "Tafsir Bismillah-your-Rahman al-Rahim";
    expect(displayTafsirHeading(source, "en")).toBe("Tafsir of Bismillah al-Rahman al-Rahim");
    expect(tafsirSourceHeading(source, "en")).toBe(source);
    expect(displayTafsirHeading(source, "ur")).toBe(source);
    expect(displayTafsirHeading("A new source heading", "en")).toBe("A new source heading");
    expect(displayTafsirHeading("He doesn't sleep, he doesn't sleep.", "en"))
      .toBe("Neither drowsiness nor sleep overtakes Him");
  });
});
