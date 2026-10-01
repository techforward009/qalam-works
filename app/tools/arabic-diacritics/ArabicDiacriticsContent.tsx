"use client";

import SearchIntentToolLayout from "../SearchIntentToolLayout";
import ArabicDiacriticsTool from "./ArabicDiacriticsTool";

export default function ArabicDiacriticsContent() {
  return (
    <SearchIntentToolLayout
      centerHeader
      h1={{ en: "Arabic Diacritics", ur: "عربی اعراب" }}
      intro={{
        en: "Turn plain Arabic into fully vocalized Arabic in the style used by Pakistani and Indo-Pakistani Islamic publishing, including contextual word-final case endings.",
        ur: "سادہ عربی کو پاکستانی اور برصغیر کی اسلامی اشاعت کے انداز میں مکمل اعراب شدہ عربی میں بدلیں، جس میں جہاں ممکن ہو الفاظ کے آخری نحوی اعراب بھی شامل ہیں۔",
      }}
      note={{
        en: "The General mode uses a browser-side Arabic diacritization model. Your text is processed on your device; Qalam's publishing layer then applies high-confidence Indo-Pakistani forms. Quran mode remains reference-based.",
        ur: "جنرل موڈ میں عربی اعراب کے لیے براؤزر پر ماڈل چلتا ہے۔ متن آپ کے آلے پر ہی پراسیس ہوتا ہے، پھر قلم کی اشاعتی تہہ مستند پاکستانی و برصغیری صورتوں کو برقرار رکھتی ہے۔ قرآن موڈ بدستور اصل ماخذ سے ملان پر قائم ہے۔",
      }}
      sections={[
        {
          title: { en: "What is vocalized", ur: "کس چیز پر اعراب آتا ہے" },
          body: {
            en: "The General mode adds fatha, kasra, damma, sukun, shadda, tanwin, and contextual final case endings. Indo-Pakistani publishing conventions are preserved where Qalam has a high-confidence rule.",
            ur: "جنرل موڈ زبر، زیر، پیش، جزم، تشدید، تنوین اور سیاق کے مطابق آخری نحوی اعراب دیتا ہے۔ جہاں قلم کے پاس قابلِ اعتماد قاعدہ موجود ہو وہاں پاکستانی و برصغیری کتابی انداز برقرار رکھا جاتا ہے۔",
          },
        },
      ]}
      faqs={[
        {
          q: { en: "Is this just a word list?", ur: "کیا یہ صرف الفاظ کی فہرست ہے؟" },
          a: {
            en: "No. General mode uses a trained Arabic diacritization model, with Qalam's deterministic publishing rules around it. The older reviewed lexicon remains useful as a fallback and regression layer.",
            ur: "نہیں۔ جنرل موڈ تربیت یافتہ عربی اعراب ماڈل استعمال کرتا ہے اور اس کے گرد قلم کے متعین اشاعتی قواعد کام کرتے ہیں۔ سابقہ جائزہ شدہ فہرست بطور fallback اور regression layer برقرار رہتی ہے۔",
          },
        },
        {
          q: { en: "What happens to already-vocalized text?", ur: "پہلے سے اعراب شدہ متن کا کیا ہوگا؟" },
          a: {
            en: "The model normalizes the existing marks and produces a fresh canonical vocalization. Reviewed Qalam passages remain protected by exact fixtures.",
            ur: "ماڈل موجودہ اعراب کو معمول کے مطابق دیکھ کر نئی مکمل اعراب شدہ صورت بناتا ہے۔ قلم کی جائزہ شدہ مخصوص عبارتیں اپنے مقررہ نتائج کے ساتھ محفوظ رہتی ہیں۔",
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
