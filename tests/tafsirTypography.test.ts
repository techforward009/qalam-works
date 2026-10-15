import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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

  it("keeps complete standalone Arabic quotations, including U+06D2, in one Arabic run", () => {
    const text = "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ\nوَقَالَ ارْكَبُواْ فِيهَا بِسْمِ اللّهِ مَجْرِےهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ (ہود، آیت ۴۱)۔";
    const runs = splitTafsirTypography(text);
    expect(runs.filter((run) => run.kind === "arabic").map((run) => run.text)).toEqual([
      "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
      "وَقَالَ ارْكَبُواْ فِيهَا بِسْمِ اللّهِ مَجْرِےهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ",
    ]);
    expect(runs.some((run) => run.kind === "reference")).toBe(true);
    expect(runs.filter((run) => run.kind === "reference").map((run) => run.text)).toEqual([" (ہود، آیت ۴۱)۔"]);
    expect(flatten(text)).toBe(text);
  });

  it("recognizes verified unvowelled Arabic quotations in Urdu first-page topics without rewriting text", () => {
    const examples = [
      "کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر",
      "استرق الشیطان من الناس اعظم آیة من القرآن بسم اللہ الرحمن الرحیم ۔",
      "فان اللہ غفور رحیم (بقرہ، ۲۲۶)۔",
      "ھو اللہ الذی لا الہ الا ھو الملک القدوس السلام المومن المھیمن العزیز الجبار المتکبر۔",
      "واللہ الہ کل شیئی الرحمان بجمیع خلقہ الرحیم بالمومنین خاصة۔ (بحوالہ: المیزان بسند کافی، توحید صدوق اور معانی الاخبار۔)",
      "و رحمتی وسعت کل شئی",
      "ربنا وسعت کل شئی رحمة۔",
      "و نجنا برحمتک ۔",
      "فانجیناہ والذین معہ برحمة منا۔",
      "اللھم ربنا انزل علینا مائدة من السماء و ارزقنا و انت خیر الرازقین۔",
      "رب انزلنی منزلا مبارکا و انت خیرالمنزلین۔",
      "رب لا تذرنی فردا و انت خیر الوارثین۔",
      "یا من سبقت رحمتہ غضبہ۔",
    ];
    for (const text of examples) {
      const runs = splitTafsirTypography(text, "ur");
      expect(runs.some((r) => r.kind === "arabic"), text).toBe(true);
      expect(runs.map((r) => r.text).join(""), text).toBe(text);
    }
    for (const ordinaryUrdu of ["خدا کی رحمت عام اور رحمت خاص", "اس گفتگو سے معلوم ہوا کہ بسم اللہ سورت کا جزء ہے۔"]) {
      expect(splitTafsirTypography(ordinaryUrdu, "ur")).toEqual([{ kind: "urdu", text: ordinaryUrdu }]);
    }
  });

  it("uses the existing approved public Scheherazade New file only for Tafsir Arabic quotations", () => {
    const page = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
    const catalog = readFileSync("app/tools/document-studio/utils/publicBlobFontCatalog.ts", "utf8");
    expect(catalog).toContain('ScheherazadeNew-Medium.woff2');
    expect(page).toContain('publicBlobFontUrl("ScheherazadeNew-Medium.woff2")');
    expect(page).toContain('fontFamily: \'"Qalam Tafsir Scheherazade", serif\'');
    expect(page).toContain('data-tafsir-font="scheherazade-new"');
    expect(page).toContain('<style>{TAFSIR_SCHEHERAZADE_CSS + TAFSIR_READING_SURFACE_CSS}</style>');
    expect(page).not.toContain('data-tafsir-font-warning');
    expect(page).not.toContain('Digital Khatt lacks a glyph');
    expect(page).toContain('fontFamily: \'"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif\'');
    expect(page).toContain('fontFamily: \'"Gulzar", serif\'');
  });

  it("styles all eleven reported unvowelled quotations in English Tafsir as complete Arabic-script runs", () => {
    const quotations = [
          "کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر",
          "استرق الشیطان من الناس اعظم آیة من القرآن بسم اللہ الرحمن الرحیم .",
          "ھو اللہ الذی لا الہ الا ھو الملک القدوس السلام المومن المھیمن العزیز الجبار المتکبر۔",
          "و رحمتی وسعت کل شئی",
          "ربنا وسعت کل شئی رحمة۔",
          "و نجنا برحمتک ۔",
          "فانجیناہ والذین معہ برحمة منا۔",
          "اللھم ربنا انزل علینا مائدة من السماء و ارزقنا و انت خیر الرازقین۔",
          "رب انزلنی منزلا مبارکا و انت خیرالمنزلین۔",
          "رب لا تذرنی فردا و انت خیر الوارثین۔",
          "یا من سبقت رحمتہ غضبہ۔"
    ];
    for (const quote of quotations) {
      const runs = splitTafsirTypography(quote, "en");
      const arabic = runs.filter((run) => run.kind === "arabic");
      expect(arabic, quote).toHaveLength(1);
      expect(arabic[0].text.startsWith(quote.trim().split(" ")[0]), quote).toBe(true);
      expect(runs.map((run) => run.text).join(""), quote).toBe(quote);
    }
  });

  it("recognizes Arabic words mid-sentence, while retaining English letters, numbers, punctuation, and line breaks", () => {
    const input = "The hadith says: کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر. Next: و رحمتی وسعت کل شئی (2:255).\\nThe name اللّٰهُ is Arabic.\\nNot Arabic: नमस्ते, Αβραχαμ, 2026!";
    const runs = splitTafsirTypography(input, "en");
    expect(runs.map((run) => run.text).join("")).toBe(input);
    expect(runs.filter((run) => run.kind === "arabic").map((run) => run.text)).toEqual([
      "کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر",
      "و رحمتی وسعت کل شئی",
      "اللّٰهُ",
    ]);
    expect(runs.filter((run) => run.kind !== "arabic").map((run) => run.text).join("")).toContain("Not Arabic: नमस्ते, Αβραχαμ, 2026!");
  });

  it("does not change conservative Urdu segmentation when Arabic detection is enabled for English", () => {
    const sample = "یہ عبارت اِنَّا لِلّٰهِ کو مثال کے طور پر پیش کرتی ہے۔";
    expect(splitTafsirTypography(sample, "ur")).toEqual(splitTafsirTypography(sample));
    expect(splitTafsirTypography(sample, "ur")).toEqual([{ kind: "urdu", text: sample }]);
    expect(splitTafsirTypography(sample, "en").some((run) => run.kind === "arabic")).toBe(true);
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
