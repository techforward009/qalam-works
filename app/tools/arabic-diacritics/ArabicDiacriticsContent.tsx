"use client";

import SearchIntentToolLayout from "../SearchIntentToolLayout";
import ArabicDiacriticsTool from "./ArabicDiacriticsTool";

export default function ArabicDiacriticsContent() {
  return (
    <SearchIntentToolLayout
      h1={{ en: "Arabic Diacritics", ur: "عربی اعراب" }}
      intro={{
        en: "Turn plain Arabic into the diacritic style used in Pakistani and Indo-Pakistani Islamic books. The original text stays in the input. Words the engine cannot resolve are left unchanged.",
        ur: "سادہ عربی کو اس اعراب میں لاتا ہے جو پاکستانی اور برصغیر کی اسلامی کتابوں میں چلتا ہے۔ اصل متن ان پٹ میں رہتا ہے۔ جو لفظ طے نہ ہو اسے بغیر اعراب کے چھوڑ دیا جاتا ہے۔",
      }}
      note={{
        en: "This is not Urdu diacritization and not modern newspaper tashkeel. Case endings follow the stored Indo-Pakistani publishing form, not a full syntactic parser.",
        ur: "یہ اردو اعراب نہیں اور نہ اخبار والا تشکیل۔ اعراب محفوظ شدہ پاکستانی طرز پر ہے، مکمل نحوی تجزیہ نہیں۔",
      }}
      sections={[
        {
          title: { en: "What is vocalized", ur: "کس چیز پر اعراب آتا ہے" },
          body: {
            en: "Known Arabic words receive fatha, kasra, damma, sukun, shadda, tanwin, dagger alef, and the Indo-Pakistani pronoun mark. Urdu-only letters, English, numbers, and punctuation stay as typed.",
            ur: "جانے پہچانے عربی الفاظ پر زبر، زیر، پیش، جزم، شد، تنوین، الف خنجریہ اور ہٗ والا نشان آتا ہے۔ اردو کے خاص حروف، انگریزی، اعداد اور رموزِ اوقاف نہیں بدلتے۔",
          },
        },
      ]}
      faqs={[
        {
          q: { en: "Will unknown Arabic be guessed?", ur: "نامعلوم عربی پر اندازہ تو نہیں؟" },
          a: {
            en: "No. If a word is not in the reviewed lexicon and no reliable rule applies, it is copied unchanged.",
            ur: "نہیں۔ اگر لفظ فہرست میں نہ ہو اور کوئی قابلِ اعتماد قاعدہ نہ لگے تو وہ جوں کا توں رہتا ہے۔",
          },
        },
        {
          q: { en: "Does already vocalized text get rewritten?", ur: "پہلے سے اعراب شدہ متن دوبارہ بدلے گا؟" },
          a: {
            en: "A word that already has vowel marks is left as it is, unless the whole paragraph is the reviewed passage.",
            ur: "جس لفظ پر پہلے سے حرکات ہوں اسے نہیں چھیڑا جاتا، سوائے اس کے کہ پورا پیراگراف جائزہ شدہ عبارت ہو۔",
          },
        },
      ]}
      related={[
        { href: "/tools/unicode-standardizer", label: { en: "Urdu Unicode Fixer", ur: "اردو یونیکوڈ فکسر" } },
        { href: "/tools/document-cleaner", label: { en: "Urdu Text Cleaner", ur: "اردو ٹیکسٹ کلینر" } },
      ]}
    >
      <ArabicDiacriticsTool />
    </SearchIntentToolLayout>
  );
}
