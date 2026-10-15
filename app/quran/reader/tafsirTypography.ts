/**
 * Conservative, presentation-only Arabic quotation detection for Tafsir text.
 * Source structure is the boundary: only a complete standalone line (or the
 * text before a recognized trailing verse reference) can become Arabic.
 * Ambiguous mixed Arabic-script lines remain Urdu. Source characters and
 * whitespace are never normalized, removed, or replaced.
 */
export type TafsirTypographyRun = Readonly<{
  kind: "urdu" | "arabic" | "reference";
  text: string;
}>;

const ARABIC_LETTER = /[\u0621-\u064A\u066E-\u06D3]/u;
const ARABIC_DIACRITIC = /[\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/u;
const URDU_EXCLUSIVE = /[پچژگٹڈڑں]/u;
const LATIN_LETTER = /[A-Za-z]/u;
const URDU_REFERENCE_SUFFIX = /(\s*\(\s*[^()\n]*(?:سورہ|سورۃ|ہود|نمل|آیت|آیات|بقرہ|حجرات|ذاریات|حشر|توبہ|بحوالہ)[^()\n]*\)\s*[۔.؟?]?)$/u;
const ENGLISH_REFERENCE_SUFFIX = /(\s*\(\s*[^()\n]*(?:surah|verse|ayah)[^()\n]*\)\s*[۔.؟?]?)$/iu;

/** Vetted standalone source-quotation beginnings from reviewed first-ten Tafsir source topics (including all Al-Fatihah).
 * This avoids treating unvowelled Urdu commentary as Arabic just because of shared letters.
 * Phrases are source markers, not text substitutions.
 */
const VERIFIED_URDU_TAFSIR_QUOTATIONS: readonly string[] = [
  "کل امر ذی بال",
  "استرق الشیطان من الناس",
  "فان اللہ غفور رحیم",
  "فان اللہ سمیع علیم",
  "واللہ بصیر بما تعملون",
  "ان اللہ ھو الرزاق",
  "ھو اللہ الخالق",
  "ھو اللہ الذی",
  "واللہ الہ کل شیئی",
  "عزیز علیہ ما عنتم",
  "الرحمن اسم خاص",
  "یا رحمان الدنیا",
  "ان اللہ عزوجل",
  "و رحمتی وسعت",
  "ربنا وسعت",
  "و نجنا برحمتک",
  "فانجیناہ والذین",
  "اللھم ربنا انزل",
  "رب انزلنی منزلا",
  "رب لا تذرنی فردا",
  "یا من سبقت رحمتہ",
  "اقْرَأْ بِاسْمِ",
  "وَقَالَ ارْكَبُوا",
  "قِيلَ يَا نُوحُ",
  "إِنَّهُ مِن سُلَيْمَانَ",
  "وما من دابة فی الارض",
  "دعواھم فیھا سبحانک",
  "اتخذوا احبارھم و رھبانہم",
  "قل یا عبادی الذین اسرفوا",
  "ولئن سالتھم من خلق",
  "و قال الذین کفروا",
  "و یزید اللہ الذین اھتدوا",
  "و الذین اھتدوا ازادھم",
  "قل اننی ھدانی ربی",
  "الم اعھد الیکم",
  "ومن یعتصم باللہ",
  "ان الدین عنداللہ",
  "الصراط المستقیم صراط الانبیاء",
  "واللہ نحن صراط المستقیم",
  "ومن یطع اللہ والرسول",
  "ولکن من شرح بالکفر",
  "و یعذب المنافقین و المنافقات",
  "وباء و بغضب من اللہ",
  "یصدون عن سبیل اللہ",
  "والذین یحاجون فی اللہ",
  "قال ربنا الذی اعطی",
  "و جعلناھم ائمة",
  "ان معناہ و مما علمناھم",
  "و لا یتبع الھوی",
  "ان اکرمکم عنداللہ",
  "ان تقوی اللہ مفتاح",
  "و اذ زاغت الابصار",
  "و ختم علی سمعہ"
];

function confidentArabicQuotation(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || LATIN_LETTER.test(trimmed)) return false;
  if (URDU_EXCLUSIVE.test(trimmed)) return false;
  if (trimmed.length <= 280 && VERIFIED_URDU_TAFSIR_QUOTATIONS.some((prefix) => trimmed.startsWith(prefix))) return true;
  const words = trimmed.split(/\s+/u).filter(Boolean);
  if (words.length < 2) return false;
  if (words.some((word) => !ARABIC_LETTER.test(word) && !/[ۚۖۗۙۛۜ۞،؛:؟,.()0-9٠-٩۰-۹]/u.test(word))) return false;

  const letters = [...trimmed].filter((char) => ARABIC_LETTER.test(char));
  const markedWords = words.filter((word) => ARABIC_LETTER.test(word) && ARABIC_DIACRITIC.test(word));
  const markedWordRatio = markedWords.length / Math.max(1, words.filter((word) => ARABIC_LETTER.test(word)).length);
  // Require both the standalone source-line boundary and Arabic orthographic
  // evidence. Diacritics alone never classify a mixed commentary sentence.
  return letters.length >= 8 && markedWords.length >= 2 && markedWordRatio >= 0.55;
}

function appendRun(runs: TafsirTypographyRun[], kind: TafsirTypographyRun["kind"], text: string) {
  if (!text) return;
  const last = runs[runs.length - 1];
  if (last?.kind === kind) runs[runs.length - 1] = { kind, text: last.text + text };
  else runs.push({ kind, text });
}

/**
 * Verified Arabic phrases that appear *within* otherwise Urdu prose. Matching
 * a specific source passage is safer than switching the whole mixed line.
 * Also includes recurring Arabic salawat and Quranic phrases when quoted in Urdu.
 */
const VERIFIED_INLINE_ARABIC_SPANS: readonly string[] = [
  "قال فرعون و مارب العالمین۔ قال رب السموات والارض و ما بینھما۔",
  "رب العالمین ھم الجماعات من کل مخلوق من الجمادات والحیوانات۔",
  "لاموٴثر فی الوجود الّا اللہ",
  "صلى الله عليه وآله وسلم",
  "وکان بالمومنین رحیما",
  "بسم اللہ الرحمن الرحیم",
  "الحمد للہ رب العالمین",
  "اھدنا الصراط المستقیم",
  "رب زدنی علما",
  "ایاک نعبد و ایاک نستعین",
  "انا اعطیناک الکوثر",
  "مالک یوم الدین",
  "الذین انعمت علیھم",
];

/** Only split exact verified phrases at lexical boundaries, never a guessed Urdu/Arabic word. */
function splitVerifiedInlineArabic(line: string): TafsirTypographyRun[] {
  const matches: { start: number; end: number }[] = [];
  for (const phrase of VERIFIED_INLINE_ARABIC_SPANS) {
    let from = 0;
    while (from < line.length) {
      const start = line.indexOf(phrase, from);
      if (start < 0) break;
      const end = start + phrase.length;
      const left = start > 0 ? line[start - 1] : "";
      const right = end < line.length ? line[end] : "";
      const touchesWord = (left && /[\\p{Script=Arabic}\\p{Mark}]/u.test(left)) ||
        (right && /[\\p{Script=Arabic}\\p{Mark}]/u.test(right));
      if (!touchesWord) matches.push({ start, end });
      from = end;
    }
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const runs: TafsirTypographyRun[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    appendRun(runs, "urdu", line.slice(cursor, match.start));
    appendRun(runs, "arabic", line.slice(match.start, match.end));
    cursor = match.end;
  }
  appendRun(runs, "urdu", line.slice(cursor));
  return runs;
}

function lineRuns(line: string): TafsirTypographyRun[] {
  if (!line) return [];

  // A trailing printed source note is metadata, not part of the quotation.
  // The exact source slice (including its leading whitespace and punctuation)
  // is retained verbatim in the following run.
  const suffix = line.match(URDU_REFERENCE_SUFFIX) ?? line.match(ENGLISH_REFERENCE_SUFFIX);
  const quoteText = suffix ? line.slice(0, suffix.index) : line;
  const referenceText = suffix?.[0] ?? "";
  if (confidentArabicQuotation(quoteText)) {
    return [
      { kind: "arabic", text: quoteText },
      ...(referenceText ? [{ kind: "reference" as const, text: referenceText }] : []),
    ];
  }
  return splitVerifiedInlineArabic(line);
}

/**
 * In the English commentary the script boundary itself is reliable evidence:
 * every Arabic-script word or consecutive phrase receives the Arabic font,
 * including unvowelled Urdu/Persian spelling forms used in cited Arabic text.
 * This never changes the characters, spaces, or punctuation from the corpus.
 * Other non-Latin scripts are not automatically classified as Arabic.
 */
const ENGLISH_ARABIC_PHRASE =
  /\p{Script=Arabic}[\p{Script=Arabic}\p{Mark}\u200C\u200D]*(?:(?:[ \t\u00A0\u202F]+|[،؛؟۔,:.!?]+[ \t\u00A0\u202F]*)\p{Script=Arabic}[\p{Script=Arabic}\p{Mark}\u200C\u200D]*)*[،؛؟۔]*/gu;

function splitEnglishArabicScript(text: string): TafsirTypographyRun[] {
  const runs: TafsirTypographyRun[] = [];
  let cursor = 0;
  for (const match of text.matchAll(ENGLISH_ARABIC_PHRASE)) {
    const start = match.index;
    appendRun(runs, "urdu", text.slice(cursor, start));
    appendRun(runs, "arabic", match[0]);
    cursor = start + match[0].length;
  }
  appendRun(runs, "urdu", text.slice(cursor));
  return runs;
}

export function splitTafsirTypography(text: string, language: "ur" | "en" = "ur"): TafsirTypographyRun[] {
  if (!text) return [];
  if (language === "en") return splitEnglishArabicScript(text);
  const runs: TafsirTypographyRun[] = [];
  const lines = text.split(/(\n)/u);
  for (const line of lines) {
    if (line === "\n") appendRun(runs, "urdu", line);
    else for (const run of lineRuns(line)) appendRun(runs, run.kind, run.text);
  }
  return runs;
}

/** Verified display-only heading repairs; raw source titles remain unchanged. */
const VERIFIED_ENGLISH_HEADING_DISPLAY: Readonly<Record<string, string>> = {
  "Tafsir Bismillah-your-Rahman al-Rahim": "Tafsir of Bismillah al-Rahman al-Rahim",
  "Allah is the most comprehensive of the names of Allah": "Allah: the most comprehensive of God's names",
  "He doesn't sleep, he doesn't sleep.": "Neither drowsiness nor sleep overtakes Him",
  "What do you mean by the Throne and the Throne?": "What is meant by the Throne and the Kursi?",
  "The background of the revelation of Ayat": "Occasion of Revelation",
  "Commentary\nI seek refuge in the Lord of mankind.": "I seek refuge in the Lord of mankind",
};

export function displayTafsirHeading(title: string, language: "ur" | "en"): string {
  return language === "en" ? VERIFIED_ENGLISH_HEADING_DISPLAY[title] ?? title : title;
}

export function tafsirSourceHeading(title: string, language: "ur" | "en"): string {
  return displayTafsirHeading(title, language) === title ? "" : title;
}
