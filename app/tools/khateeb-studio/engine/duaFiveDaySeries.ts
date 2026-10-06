import material from './duaFiveDayMaterial.json';
import type { MajlisSeriesPlan } from './seriesPlanner';

export const DUA_FIVE_DAY_SERIES: MajlisSeriesPlan = {
  length: 5,
  titleUr: 'دعا — قرب سے کردار تک پانچ مربوط مجالس',
  titleEn: 'Supplication — five connected sessions from nearness to conduct',
  aimUr: 'اللہ سے تعلق، آداب، انتظار میں امید، ذمہ دارانہ کوشش اور دعائے مکارم الاخلاق سے کردار سازی کا مربوط سفر۔ ہر مجلس کی اصل قرآنی بنیاد، قابلِ بیان عبارت، توضیح، فرضی مثال اور عملی قدم الگ ہے۔',
  aimEn: 'A connected journey through relationship, etiquette, hope while waiting, responsible effort, and moral formation through the prayer for noble conduct. Each session has distinct source passages, delivery material, explanation, a hypothetical example, and an action.',
  sessions: material.map((row, index) => ({
    number: index + 1,
    titleUr: row.title.ur, titleEn: row.title.en,
    purposeUr: row.purpose.ur, purposeEn: row.purpose.en,
    sourceUr: row.source.ur, sourceEn: row.source.en,
    materialUr: row.blocks.map(block => block.delivery.ur),
    materialEn: row.blocks.map(block => block.delivery.en),
    quranUr: row.quran.map(({surah, ayah}) => `${surah}:${ayah}`),
    quranEn: row.quran.map(({surah, ayah}) => `${surah}:${ayah}`),
    previousBridgeUr: row.previous?.ur, previousBridgeEn: row.previous?.en,
    nextBridgeUr: row.next?.ur, nextBridgeEn: row.next?.en,
    takeawayUr: row.action.ur, takeawayEn: row.action.en,
    avoidRepeatUr: row.guard.ur, avoidRepeatEn: row.guard.en,
    preparation: {
      blocks: row.blocks, quran: row.quran, quranGroups: row.quranGroups,
      hadithId: row.hadithId, primaryExcerpts: row.primaryExcerpts,
      question: row.question, example: row.example, action: row.action,
    },
  })),
  finalUr: 'ایک دعا کا ایک فقرہ سمجھیں، اس سے اپنی ذمہ داری کا ایک عمل منتخب کریں، اور سات دن بعد اپنی جانچ کریں۔ اصل عربی، نام زد تراجم اور قلم ورکس کی عملی توضیح الگ رکھی گئی ہے۔',
  finalEn: 'Understand one prayer passage, choose one responsible action connected to it, and review after seven days. Original Arabic, attributed translations, and Qalam Works practical exposition are clearly distinguished.',
};
