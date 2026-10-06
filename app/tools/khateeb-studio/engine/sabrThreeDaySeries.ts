import material from './sabrThreeDayMaterial.json';
import type { MajlisSeriesPlan } from './seriesPlanner';
export const SABR_THREE_DAY_SERIES: MajlisSeriesPlan = {
 length:3,titleUr:'صبر — تین مربوط مجالس',titleEn:'Patience — three connected sessions',
 aimUr:'درست ذمہ داری، تکلیف میں ضبط، اور باہمی تعاون کا مربوط سفر۔ ہر مجلس کا الگ سوال، قرآنی بنیاد، قابلِ بیان عبارت اور عملی قدم ہے۔',
 aimEn:'A connected journey through responsibility, restraint under distress, and mutual support. Each session has its own question, Qur’anic foundation, delivery material, and practical step.',
 sessions:material.map((row,index)=>({
  number:index+1,titleUr:row.title.ur,titleEn:row.title.en,purposeUr:row.purpose.ur,purposeEn:row.purpose.en,
  sourceUr:index===1?'البقرہ 2:155–157؛ مشکاۃ الانوار، ص 484، روایت 1625':'قرآن؛ قابلِ بیان عبارت اور عملی توضیح قلم ورکس کی تدوین',
  sourceEn:index===1?'Qur’an 2:155–157; Mishkat al-Anwar, p. 484, tradition 1625':'Qur’an; delivery material and practical explanation composed by Qalam Works',
  materialUr:row.blocks.map(block=>block.delivery.ur),materialEn:row.blocks.map(block=>block.delivery.en),
  quranUr:index===2?['آل عمران 3:200','سورۃ العصر 103:1–3 — پوری سورت']:row.quran.map(location=>`${location.surah}:${location.ayah}`),quranEn:index===2?['Qur’an 3:200','Surah al-Asr 103:1–3 — complete surah']:row.quran.map(location=>`${location.surah}:${location.ayah}`),
  previousBridgeUr:row.previous?.ur,previousBridgeEn:row.previous?.en,nextBridgeUr:row.next?.ur,nextBridgeEn:row.next?.en,
  takeawayUr:row.action.ur,takeawayEn:row.action.en,avoidRepeatUr:row.guard.ur,avoidRepeatEn:row.guard.en,
  preparation:{blocks:row.blocks,quran:row.quran,quranGroups:row.quranGroups,hadithId:row.hadithId,question:row.question,example:row.example,action:row.action},
 })),
 finalUr:'ذمہ داری پہچانیں، ردِّعمل سنبھالیں اور ممکن تعاون کریں؛ اپنے حالات کے مطابق ایک واضح قدم منتخب کریں۔',
 finalEn:'Recognize responsibility, attend to responses, and offer possible support; choose one clear step appropriate to your circumstances.',
};
