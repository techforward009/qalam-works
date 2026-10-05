import { ahmedgrafQuranReference } from "../../arabic-diacritics/quran/ahmedgrafProvider";
import type { KhateebResearchEvidence } from "./researchTypes";

type QuranTopicEntry = {
  id: string;
  aliases: readonly string[];
  ayahs: readonly {
    surah: number;
    ayah: number;
    refUr: string;
    refEn: string;
    noteUr: string;
    noteEn: string;
  }[];
};

const TOPICS: readonly QuranTopicEntry[] = [
  {
    id: "rizq",
    aliases: ["رزق", "روزی", "برکت", "کسب حلال", "حلال روزی", "معاش", "رزق میں برکت"],
    ayahs: [
      {
        surah: 65,
        ayah: 2,
        refUr: "سورۂ طلاق 65:2",
        refEn: "Qur'an 65:2",
        noteUr: "تقویٰ کے ساتھ اللہ کی طرف سے نکلنے کی راہ پیدا ہونے کا اصول۔",
        noteEn: "A Qur'anic basis for linking taqwa with a divinely opened way out.",
      },
      {
        surah: 65,
        ayah: 3,
        refUr: "سورۂ طلاق 65:3",
        refEn: "Qur'an 65:3",
        noteUr: "غیر متوقع رزق اور توکل کو ایک ہی قرآنی سیاق میں جوڑتی ہے۔",
        noteEn: "Links provision from unexpected sources with trust in Allah.",
      },
      {
        surah: 29,
        ayah: 60,
        refUr: "سورۂ عنکبوت 29:60",
        refEn: "Qur'an 29:60",
        noteUr: "رزق کو صرف انسانی تدبیر کا نتیجہ سمجھنے کے بجائے اللہ کی کفالت کے وسیع تصور سے جوڑتی ہے۔",
        noteEn: "Places provision within the wider Qur'anic idea of divine sustenance.",
      },
      {
        surah: 11,
        ayah: 6,
        refUr: "سورۂ ہود 11:6",
        refEn: "Qur'an 11:6",
        noteUr: "زمین کے ہر جاندار کے رزق کو اللہ کی کفالت سے جوڑتی ہے؛ رزق کے باب میں بنیادی توحیدی اصول فراہم کرتی ہے۔",
        noteEn: "Grounds the provision of every creature in Allah's care, giving a foundational monotheistic principle for rizq.",
      },
      {
        surah: 71,
        ayah: 10,
        refUr: "سورۂ نوح 71:10",
        refEn: "Qur'an 71:10",
        noteUr: "استغفار کو حضرت نوحؑ کی دعوت میں ایک بنیادی اصلاحی عمل کے طور پر پیش کرتی ہے، جس کے مادی آثار اگلی آیات میں بیان ہوتے ہیں۔",
        noteEn: "Presents seeking forgiveness as a central reformative act in Noah's call, with material effects described in the following verses.",
      },
      {
        surah: 71,
        ayah: 11,
        refUr: "سورۂ نوح 71:11",
        refEn: "Qur'an 71:11",
        noteUr: "استغفار کے نتیجے میں آسمانی برکت اور فراوانیِ بارش کے ذکر کو سامنے لاتی ہے، جو اگلی آیت میں معاشی وسعت کے ساتھ جڑتا ہے۔",
        noteEn: "Mentions abundant rain in the sequence following istighfar, leading into the material abundance named in the next verse.",
      },
      {
        surah: 71,
        ayah: 12,
        refUr: "سورۂ نوح 71:12",
        refEn: "Qur'an 71:12",
        noteUr: "استغفار کے سیاق میں مال، اولاد، باغات اور نہروں کی فراوانی کا ذکر کرتی ہے؛ رزق میں وسعت کے محور کے لیے براہِ راست قرآنی بنیاد ہے۔",
        noteEn: "In the context of seeking forgiveness, mentions increase in wealth, children, gardens, and rivers, providing a direct Qur'anic basis for abundance.",
      },
      {
        surah: 2,
        ayah: 267,
        refUr: "سورۂ بقرہ 2:267",
        refEn: "Qur'an 2:267",
        noteUr: "اپنی کمائی کی پاکیزہ چیزوں میں سے خرچ کرنے کی ہدایت دیتی ہے؛ اسے حلال کمائی کی مستقل دلیل کے بجائے کمائی اور انفاق کی پاکیزگی کے اخلاقی اصول کے طور پر لینا زیادہ محتاط ہے۔",
        noteEn: "Commands spending from the good things one has earned; it is safer to use this as an ethical principle of wholesome earning and spending rather than as a standalone proof-text for lawful income.",
      },
    ],
  },
  {
    id: "parents",
    aliases: ["والدین", "ماں باپ", "والدہ", "والد", "اولاد اور والدین", "احسان والدین"],
    ayahs: [
      {
        surah: 17,
        ayah: 23,
        refUr: "سورۂ اسراء 17:23",
        refEn: "Qur'an 17:23",
        noteUr: "والدین کے ساتھ احسان، ادبِ گفتگو اور بڑھاپے میں حسنِ سلوک کی بنیادی آیت۔",
        noteEn: "A foundational verse on kindness, speech, and care toward parents.",
      },
      {
        surah: 17,
        ayah: 24,
        refUr: "سورۂ اسراء 17:24",
        refEn: "Qur'an 17:24",
        noteUr: "والدین کے سامنے تواضع اور ان کے لیے دعا کا قرآنی اسلوب۔",
        noteEn: "Frames humility before parents and prayer for them.",
      },
      {
        surah: 31,
        ayah: 14,
        refUr: "سورۂ لقمان 31:14",
        refEn: "Qur'an 31:14",
        noteUr: "ماں کی مشقت اور والدین کے شکر کو توحیدی شکر کے ساتھ جوڑتی ہے۔",
        noteEn: "Connects gratitude to parents with gratitude to Allah.",
      },
      {
        surah: 46,
        ayah: 15,
        refUr: "سورۂ احقاف 46:15",
        refEn: "Qur'an 46:15",
        noteUr: "ماں کی حمل و ولادت کی مشقت، والدین کے حق اور صالح اولاد کی دعا کو ایک ہی مقام پر جمع کرتی ہے؛ والدین اور برسی کے موضوعات کے لیے خاص طور پر موزوں ہے۔",
        noteEn: "Brings together a mother's hardship in pregnancy and birth, the rights of parents, and the prayer of a righteous child; especially useful for parent and remembrance themes.",
      },
    ],
  },
  {
    id: "sabr",
    aliases: ["صبر", "مصیبت", "آزمائش", "ثابت قدمی", "برداشت"],
    ayahs: [
      {
        surah: 2,
        ayah: 153,
        refUr: "سورۂ بقرہ 2:153",
        refEn: "Qur'an 2:153",
        noteUr: "صبر اور نماز کو مدد طلب کرنے کے دو بنیادی دینی وسائل کے طور پر پیش کرتی ہے۔",
        noteEn: "Presents patience and prayer as two primary means of seeking help.",
      },
      {
        surah: 2,
        ayah: 155,
        refUr: "سورۂ بقرہ 2:155",
        refEn: "Qur'an 2:155",
        noteUr: "خوف، بھوک اور نقصان کو انسانی آزمائش کے حقیقی میدان کے طور پر بیان کرتی ہے۔",
        noteEn: "Names fear, hunger, and loss as concrete fields of trial.",
      },
      {
        surah: 3,
        ayah: 200,
        refUr: "سورۂ آل عمران 3:200",
        refEn: "Qur'an 3:200",
        noteUr: "صبر، مصابرہ اور مرابطہ کو ایک تدریجی تربیتی ترتیب میں جمع کرتی ہے؛ منبر پر صبر کے مختلف درجوں کو واضح کرنے کے لیے نہایت موزوں ہے۔",
        noteEn: "Brings patience, mutual steadfastness, and vigilance together in a progressive discipline, making it especially useful for explaining levels of sabr from the pulpit.",
      },
    ],
  },
  {
    id: "dua",
    aliases: ["دعا", "مناجات", "استجابت", "اللہ سے مانگنا"],
    ayahs: [
      {
        surah: 2,
        ayah: 186,
        refUr: "سورۂ بقرہ 2:186",
        refEn: "Qur'an 2:186",
        noteUr: "قربِ الٰہی اور دعا کی قبولیت کو براہِ راست ایک ساتھ بیان کرتی ہے۔",
        noteEn: "Directly joins divine nearness with answering supplication.",
      },
      {
        surah: 40,
        ayah: 60,
        refUr: "سورۂ غافر 40:60",
        refEn: "Qur'an 40:60",
        noteUr: "دعا کو بندگی کے ایک بنیادی عمل کے طور پر سامنے لاتی ہے۔",
        noteEn: "Presents supplication as a central act of servitude.",
      },
      {
        surah: 7,
        ayah: 55,
        refUr: "سورۂ اعراف 7:55",
        refEn: "Qur'an 7:55",
        noteUr: "دعا کے آداب میں تضرع، اخفا اور حد سے تجاوز نہ کرنے کا قرآنی اصول دیتی ہے۔",
        noteEn: "Provides Qur'anic etiquette for supplication: humility, privacy, and avoiding excess.",
      },
      {
        surah: 27,
        ayah: 62,
        refUr: "سورۂ نمل 27:62",
        refEn: "Qur'an 27:62",
        noteUr: "بے بس انسان کی پکار اور اللہ کی طرف سے جواب و کشفِ ضرر کو براہِ راست بیان کرتی ہے۔",
        noteEn: "Directly describes the cry of the distressed and Allah's response in removing harm.",
      },
    ],
  },
  {
    id: "anger",
    aliases: ["غصہ", "غصے", "غضب", "کظم غیظ", "غصہ پر قابو", "غصے پر قابو"],
    ayahs: [
      {
        surah: 3,
        ayah: 134,
        refUr: "سورۂ آل عمران 3:134",
        refEn: "Qur'an 3:134",
        noteUr: "غصہ پی جانے اور لوگوں کو معاف کرنے کو اہلِ تقویٰ کی نمایاں صفت قرار دیتی ہے۔",
        noteEn: "Names restraint of anger and forgiveness as marks of the God-conscious.",
      },
      {
        surah: 42,
        ayah: 37,
        refUr: "سورۂ شوریٰ 42:37",
        refEn: "Qur'an 42:37",
        noteUr: "غصے کی حالت میں درگزر کو اہلِ ایمان کے عملی اوصاف میں شمار کرتی ہے۔",
        noteEn: "Counts forgiveness during anger among the practical traits of believers.",
      },
    ],
  },
  {
    id: "tawakkul",
    aliases: ["توکل", "اعتماد علی اللہ", "اللہ پر بھروسہ", "بھروسہ"],
    ayahs: [
      {
        surah: 65,
        ayah: 3,
        refUr: "سورۂ طلاق 65:3",
        refEn: "Qur'an 65:3",
        noteUr: "توکل کے ساتھ اللہ کی کفایت اور رزق کے تعلق کو واضح کرتی ہے۔",
        noteEn: "Connects reliance on Allah with divine sufficiency and provision.",
      },
      {
        surah: 3,
        ayah: 159,
        refUr: "سورۂ آل عمران 3:159",
        refEn: "Qur'an 3:159",
        noteUr: "مشورے اور فیصلہ کے بعد توکل کا عملی مقام متعین کرتی ہے۔",
        noteEn: "Places tawakkul after consultation and decision.",
      },
      {
        surah: 8,
        ayah: 2,
        refUr: "سورۂ انفال 8:2",
        refEn: "Qur'an 8:2",
        noteUr: "توکل کو زندہ ایمان کی داخلی کیفیت سے جوڑتی ہے۔",
        noteEn: "Connects trust in Allah with the inward life of faith.",
      },
    ],
  },
  {
    id: "taqwa",
    aliases: ["تقوی", "تقویٰ", "پرہیزگاری", "خوف خدا"],
    ayahs: [
      {
        surah: 65,
        ayah: 2,
        refUr: "سورۂ طلاق 65:2",
        refEn: "Qur'an 65:2",
        noteUr: "تقویٰ کو مشکل سے نکلنے کی راہ کے ساتھ جوڑتی ہے۔",
        noteEn: "Links taqwa with a divinely granted way out.",
      },
      {
        surah: 65,
        ayah: 3,
        refUr: "سورۂ طلاق 65:3",
        refEn: "Qur'an 65:3",
        noteUr: "تقویٰ کے سیاق میں رزق، توکل اور اللہ کی کفایت کو جمع کرتی ہے۔",
        noteEn: "Brings provision, reliance, and divine sufficiency together in a taqwa context.",
      },
      {
        surah: 3,
        ayah: 102,
        refUr: "سورۂ آل عمران 3:102",
        refEn: "Qur'an 3:102",
        noteUr: "تقویٰ کو مومن کی پوری زندگی کے بنیادی عہد کے طور پر رکھتی ہے۔",
        noteEn: "Frames taqwa as a governing covenant for a believer's life.",
      },
    ],
  },
  {
    id: "gratitude",
    aliases: ["شکر", "شکرگزاری", "نعمت", "نعمتوں کا شکر"],
    ayahs: [
      {
        surah: 14,
        ayah: 7,
        refUr: "سورۂ ابراہیم 14:7",
        refEn: "Qur'an 14:7",
        noteUr: "شکر اور نعمت میں زیادتی کے واضح قرآنی تعلق کو بیان کرتی ہے۔",
        noteEn: "States the Qur'anic link between gratitude and increase.",
      },
      {
        surah: 2,
        ayah: 152,
        refUr: "سورۂ بقرہ 2:152",
        refEn: "Qur'an 2:152",
        noteUr: "ذکر، شکر اور ناشکری سے اجتناب کو ایک مختصر تربیتی اصول میں جمع کرتی ہے۔",
        noteEn: "Combines remembrance, gratitude, and rejection of ingratitude.",
      },
      {
        surah: 31,
        ayah: 12,
        refUr: "سورۂ لقمان 31:12",
        refEn: "Qur'an 31:12",
        noteUr: "شکر کا فائدہ خود شکر گزار انسان کی طرف لوٹنے کا اصول واضح کرتی ہے۔",
        noteEn: "Makes clear that the benefit of gratitude returns to the grateful person.",
      },
    ],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .replace(/\s+/gu, " ")
    .trim();
}

function scoreTopic(entry: QuranTopicEntry, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  let score = 0;
  for (const alias of entry.aliases) {
    const term = normalize(alias);
    if (q === term) score = Math.max(score, 100 + term.length);
    else if ((` ${q} `).includes(` ${term} `)) score = Math.max(score, 50 + term.length);
    else if ((` ${term} `).includes(` ${q} `) && q.length >= 3) score = Math.max(score, 20 + q.length);
  }
  return score;
}

export function quranEvidenceForTopic(
  query: string,
  limit = 8,
): readonly KhateebResearchEvidence[] {
  const matches = TOPICS
    .map((entry) => ({ entry, score: scoreTopic(entry, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const evidence: KhateebResearchEvidence[] = [];
  const seen = new Set<string>();

  for (const { entry } of matches) {
    for (const row of entry.ayahs) {
      const key = `${row.surah}:${row.ayah}`;
      if (seen.has(key)) continue;
      const ayah = ahmedgrafQuranReference.getAyah(row.surah, row.ayah);
      if (!ayah) continue;
      seen.add(key);
      evidence.push({
        id: `quran-topic-${entry.id}-${row.surah}-${row.ayah}`,
        topicId: entry.id,
        kind: "quran",
        status: "verified",
        titleUr: row.refUr,
        titleEn: row.refEn,
        detailUr: row.noteUr,
        detailEn: row.noteEn,
        citationUr: row.refUr,
        citationEn: row.refEn,
        providerId: "ahmedgraf-quran",
        arabic: ayah.text,
        quranLocation: { surah: row.surah, ayah: row.ayah },
        themesUr: [entry.aliases[0] ?? entry.id],
      });
      if (evidence.length >= limit) return evidence;
    }
  }

  return evidence;
}

export function quranTopicIndexSize(): number {
  return TOPICS.reduce((sum, entry) => sum + entry.ayahs.length, 0);
}
