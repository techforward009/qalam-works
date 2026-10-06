import { ahmedgrafQuranReference } from "../../arabic-diacritics/quran/ahmedgrafProvider";
import bindings from "./patienceBookBindings.json";
import { createBookExcerpt, bookExcerptText, type BookExcerpt, type BookRecord, type BookSource } from "./bookLibrary";
import { createCustomSermonProject } from "./customSermonProject";
import type { SermonDuration } from "./sermonPrep";

export const PATIENCE_QURAN = [
  { reference: "البقرہ 2:153", surah: 2, ayahs: [153] },
  { reference: "العصر 103:1–3", surah: 103, ayahs: [1, 2, 3] },
].map(group => ({ ...group, text: group.ayahs.map(ayah => {
  const verse = ahmedgrafQuranReference.getAyah(group.surah, ayah);
  if (!verse) throw new Error("missing-patience-quran-verse");
  return verse.text;
}).join(" ") }));
export function patienceTiming(duration: SermonDuration): number[] {
  const opening = Math.floor(duration * 3 / 20), material = Math.floor(duration * 12 / 20), application = Math.floor(duration * 3 / 20);
  return [opening, material, application, duration - opening - material - application];
}
export const PATIENCE_ANGLES = [
  { id: "meaning", ur: ["صبر کی دو صورتیں", "صبر صرف تکلیف برداشت کرنا نہیں؛ غلط خواہش سے رکنا بھی صبر ہے۔", "غصے میں جواب دینے کی خواہش ہو تو ایک لمحہ رک کر درست الفاظ چنیں۔", "میرے لیے کس غلط خواہش سے رکنا مشکل ہے؟", "آج ایک ردعمل سوچ سمجھ کر دیں۔"], en: ["Two forms of patience", "Patience includes bearing difficulty and resisting wrongful desire.", "Pause before answering in anger and choose fair words.", "Which harmful impulse is hardest to resist?", "Respond thoughtfully once today."] },
  { id: "faith", ur: ["ایمان، امید اور سیکھنا", "حکمت ۸۲ صبر کو امید، گناہ سے احتیاط اور علم سیکھنے کے ساتھ رکھتی ہے۔", "جس بات کا علم نہ ہو، اعتراف کرکے معتبر جواب تلاش کرنا بھی ثابت قدمی ہے۔", "کیا میں لاعلمی مان کر سیکھنے کے لیے تیار ہوں؟", "ایک دینی سوال کا جواب معتبر ماخذ سے معلوم کریں۔"], en: ["Faith, hope and learning", "Saying 82 places patience alongside hope, avoiding sin and learning.", "Admit uncertainty and seek a reliable answer.", "Am I willing to admit what I do not know?", "Research one religious question in a reliable source."] },
  { id: "hardship", ur: ["مشکل میں دعا اور ذمہ داری", "دعا ۷ میں مدد مانگنے کے ساتھ فرائض سے غافل نہ ہونے کی درخواست ہے۔", "مالی پریشانی میں مدد اور مشورہ لیں، اور ممکن ذمہ داریوں کو چھوٹے قدموں میں ادا کریں۔", "پریشانی میں کون سی ذمہ داری مجھ سے چھوٹ رہی ہے؟", "دعا کے ساتھ آج ایک قابل عمل قدم طے کریں۔"], en: ["Prayer and responsibility in hardship", "Supplication 7 asks for relief and for worry not to distract from obligations.", "Seek help and advice during financial difficulty, and fulfil manageable duties in small steps.", "Which duty is worry distracting me from?", "Pair prayer with one practical step today."] },
  { id: "justice", ur: ["زبان کی حفاظت اور انصاف", "دعا ۲۰ بدزبانی سے حفاظت اور ظلم نہ سہنے، نہ کرنے کی دعا سکھاتی ہے۔ صبر حق کی حفاظت کے ساتھ ہے۔", "خاندانی اختلاف میں تہمت اور گالی سے بچیں، اور حق کے لیے مناسب مدد حاصل کریں۔", "کیا میری زبان کسی کا حق پامال کرتی ہے؟", "ایک سخت جملے کو باوقار گفتگو سے بدلیں۔"], en: ["Speech and justice", "Supplication 20 asks for protection from harmful speech, oppression and oppressing others.", "Avoid slander in a family dispute and seek appropriate help to protect rights.", "Does my speech violate someone’s rights?", "Replace one harsh sentence with respectful speech."] },
  { id: "hope", ur: ["امید کا مرکز", "دعا ۲۸ امید کو خدا سے وابستہ کرتی ہے۔ اس سے اسباب اختیار کرنے اور لوگوں سے جائز مدد لینے کی نفی مراد نہ لیں۔", "علاج اور مشورہ جاری رکھتے ہوئے دعا کے ذریعے امید قائم رکھیں۔", "مشکل میں میری امید کس بنیاد پر قائم ہے؟", "دعا ۲۸ کا منتخب حصہ سمجھ کر پڑھیں۔"], en: ["The foundation of hope", "Supplication 28 directs hope toward God. This does not negate practical means or legitimate help.", "Continue treatment and advice while sustaining hope through prayer.", "What sustains my hope in difficulty?", "Read the selected passage of supplication 28 with its meaning."] },
  { id: "effort", ur: ["مستقل کوشش", "حکمت ۱۵۳ دیر کے باوجود ثابت قدمی کی قدر بتاتی ہے؛ اسے ہر مرض کے علاج یا کسی خاص دنیاوی نتیجے کی ضمانت نہ بنائیں۔", "رشتے کی اصلاح میں ایک معافی کے بعد بھی اچھے رویے کو جاری رکھنا پڑتا ہے۔", "میں کون سا درست کام جلد نتیجہ نہ ملنے سے چھوڑ دیتا ہوں؟", "ایک ہفتے کے لیے ایک چھوٹا درست عمل جاری رکھیں۔"], en: ["Sustained effort", "Saying 153 values perseverance despite delay; do not turn it into a guarantee of a particular worldly outcome.", "Repairing a relationship requires good conduct beyond a single apology.", "Which good action do I abandon when results are slow?", "Continue one small good action for a week."] },
] as const;
export type PatienceMaterial = { angleId: string; excerpt: BookExcerpt };
export function resolvePatienceMaterials(records: readonly BookRecord[], sources: readonly BookSource[], locale: "ur" | "en") {
  const selected = bindings.filter(b => b.sourceId.endsWith("-ar") || (locale === "ur" ? b.sourceId.endsWith("-ur") : b.sourceId.endsWith("-en")));
  const materials: PatienceMaterial[] = [];
  for (const b of selected) {
    const source = sources.find(s => s.id === b.sourceId);
    const record = records.find(r => r.id === b.recordId);
    if (!source || !record || source.sha256 !== b.sourceSha256 || record.textSha256 !== b.recordSha256 || b.paragraphNumbers.some(n => !record.paragraphs[n - 1])) continue;
    materials.push({ angleId: b.angleId, excerpt: { ...createBookExcerpt(record, source, b.paragraphNumbers.map(n => record.paragraphs[n - 1].id)), referenceLabelUr: b.referenceLabelUr, referenceLabelEn: b.referenceLabelEn } });
  }
  return { materials, unavailable: selected.length - materials.length };
}
export function patienceGuideText(materials: readonly PatienceMaterial[], locale: "ur" | "en", duration: SermonDuration) {
  const ur = locale === "ur";
  return [ur ? `صبر: درست موقف پر ثابت قدمی — ${duration} منٹ` : `Patience: steadfastness in doing right — ${duration} minutes`, ur ? "یہ موضوعاتی ترتیب اور مثالیں قلم ورکس کی تدوین ہیں؛ اصل اقتباسات الگ درج ہیں۔ قرآنی بنیاد: البقرہ ۲:۱۵۳؛ سورۃ العصر ۱۰۳:۱ تا ۳ پوری سورت ساتھ پڑھیں۔" : "The arrangement and examples are Qalam Works editorial guidance; source quotations appear separately. Quran foundation: 2:153 and the complete surah 103:1–3.", ...PATIENCE_QURAN.flatMap(q => [ur ? "اصل قرآنی عبارت" : "Original Quran text", q.reference, q.text]), ...PATIENCE_ANGLES.filter(a => !materials.length || materials.some(m => m.angleId === a.id)).flatMap(a => {
    const t = a[locale];
    return ["", t[0], `${ur ? "تدوینی وضاحت" : "Editorial explanation"}: ${t[1]}`, `${ur ? "مثال" : "Example"}: ${t[2]}`, `${ur ? "سامعین سے سوال" : "Audience question"}: ${t[3]}`, `${ur ? "عملی قدم" : "Action"}: ${t[4]}`, ...materials.filter(m => m.angleId === a.id).flatMap(m => [m.excerpt.language === "ar" ? (ur ? "اصل عربی عبارت" : "Original Arabic") : (ur ? "فراہم کردہ ترجمہ" : "Supplied translation"), bookExcerptText(m.excerpt, locale)])];
  })].join("\n");
}
export function createPatienceBookDraft(materials: readonly PatienceMaterial[], locale: "ur" | "en", duration: SermonDuration) {
  if (PATIENCE_ANGLES.some(a => !materials.some(m => m.angleId === a.id && m.excerpt.language === "ar") || !materials.some(m => m.angleId === a.id && m.excerpt.language === locale))) throw new Error("incomplete-materials");
  const project = createCustomSermonProject({ kind: "majlis", title: locale === "ur" ? "صبر: درست موقف پر ثابت قدمی" : "Patience: steadfastness in doing right", objective: locale === "ur" ? "اصل مصادر سے صبر، امید، دعا اور انصاف کی عملی وضاحت" : "Explain patience, hope, prayer and justice using original sources", duration });
  const timing = patienceTiming(duration);
  const ur = locale === "ur";
  const texts = [ur ? "آغاز: صبر کا مطلب خاموش رہنا ہے یا صحیح کام پر قائم رہنا؟ قرآنی بنیاد: البقرہ ۲:۱۵۳ اور پوری سورۃ العصر ۱۰۳:۱ تا ۳ ساتھ پڑھیں۔" : "Opening: does patience mean silence, or doing right? Read Quran 2:153 and all of surah 103:1–3.", patienceGuideText([], locale, duration), ur ? "سامعین سے چھ زاویوں کے سوالات پوچھیں۔ مثالوں کو اپنے سامعین کے حالات سے جوڑیں۔ اصل اقتباسات نیچے الگ ہیں؛ نسبت اور نمبر ساتھ پڑھیں۔" : "Ask the questions from the six angles. Adapt examples to your audience. Read quotations below with their attribution and numbering.", ur ? "اختتام: صبر، دعا، امید اور انصاف میں سے آج ایک عملی قدم منتخب کریں۔ کسی مشکل میں مبتلا فرد کی مناسب مدد کریں اور ایک ہفتے بعد اپنا جائزہ لیں۔" : "Closing: choose one step involving patience, prayer, hope or justice. Help someone in difficulty and review your progress after one week."];
  return { ...project, bookExcerpts: materials.map(m => m.excerpt), sections: project.sections.map((section, i) => {
    const minutes = timing[i];
    return { ...section, minutes, provenance: "editorial" as const, userText: (ur ? "تدوینی رہنمائی — اصل روایت نہیں\n" : "Editorial guidance — not a source quotation\n") + texts[i] };
  }) };
}
