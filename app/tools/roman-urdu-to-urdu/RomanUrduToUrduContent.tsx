"use client";

import RomanUrduWriterClient from "../roman-urdu-writer/RomanUrduWriterClient";
import SearchIntentToolLayout from "../SearchIntentToolLayout";

export default function RomanUrduToUrduContent() {
  return (
    <SearchIntentToolLayout
      h1={{
        en: "Roman Urdu to Urdu Converter",
        ur: "رومن اردو کو اردو میں تبدیل کریں",
      }}
      intro={{
        en: "Type Urdu using English letters and convert it into Urdu script. Qalam Works keeps uncertain words visible instead of silently pretending every spelling is certain, so you can review the result before using it.",
        ur: "اردو کو انگریزی حروف میں لکھیں اور اسے اردو رسم الخط میں تبدیل کریں۔ جہاں کسی لفظ کی صورت یقینی نہ ہو وہاں نتیجے کو خود دیکھ اور درست کر سکتے ہیں۔",
      }}
      sections={[
        {
          title: { en: "Roman Urdu has no single standard spelling", ur: "رومن اردو کی کوئی ایک معیاری ہجّہ نہیں" },
          body: {
            en: "People write the same Urdu word as “mein”, “main”, or “mayn”. A converter that always picks one spelling will hide that uncertainty. This tool marks weak or ambiguous tokens so you can choose the Urdu form that matches what you meant.",
            ur: "ایک ہی اردو لفظ کو لوگ “mein”، “main” یا “mayn” لکھتے ہیں۔ جو کنورٹر ہمیشہ ایک ہجّہ چن لے وہ اس ابہام کو چھپا دیتا ہے۔ یہ ٹول کمزور یا مبہم الفاظ نشان زد کرتا ہے تاکہ آپ وہی اردو شکل چنیں جو آپ کا مطلب ہو۔",
          },
        },
      ]}
      faqs={[
        {
          q: {
            en: "How do I convert Roman Urdu to Urdu script?",
            ur: "رومن اردو کو اردو رسم الخط میں کیسے تبدیل کروں؟",
          },
          a: {
            en: "Type Roman Urdu in the editor on this page and convert it. Review any highlighted words, pick an alternative if needed, then copy the Urdu or continue in Document Studio.",
            ur: "اس صفحے کے ایڈیٹر میں رومن اردو لکھیں اور تبدیل کریں۔ نشان زد الفاظ دیکھیں، ضرورت ہو تو متبادل چنیں، پھر اردو نقل کریں یا ڈاکومنٹ اسٹوڈیو میں جاری رکھیں۔",
          },
        },
        {
          q: {
            en: "Why are some words left in Roman or marked for review?",
            ur: "کچھ الفاظ رومن کیوں رہتے ہیں یا جائزے کے لیے نشان زد ہوتے ہیں؟",
          },
          a: {
            en: "When the engine is not confident, it does not invent a fake “correct” Urdu spelling. Those tokens stay visible so you stay in control. That is slower than a silent guess, and it is intentional.",
            ur: "جب انجن پراعتماد نہ ہو تو وہ جعلی “درست” اردو ہجّہ نہیں گھڑتا۔ وہ الفاظ نظر آتے رہتے ہیں تاکہ فیصلہ آپ کا رہے۔ خاموش اندازے سے یہ سست ہے، اور یہ جان بوجھ کر ہے۔",
          },
        },
        {
          q: {
            en: "Is this a translator from English to Urdu?",
            ur: "کیا یہ انگریزی سے اردو کا مترجم ہے؟",
          },
          a: {
            en: "No. It transliterates Roman Urdu typing into Urdu script. English meaning is not translated. If you wrote “book”, you still get a script conversion, not “کتاب”, unless that Roman token is treated as Urdu.",
            ur: "نہیں۔ یہ رومن اردو ٹائپنگ کو اردو رسم الخط میں نقل حرفی کرتا ہے۔ انگریزی معنی کا ترجمہ نہیں ہوتا۔ اگر آپ نے “book” لکھا تو رسم الخط کی تبدیلی ملے گی، “کتاب” نہیں — جب تک وہ رومن ٹوکن اردو نہ سمجھا جائے۔",
          },
        },
        {
          q: {
            en: "Can I keep editing the Urdu in Document Studio?",
            ur: "کیا اردو کو ڈاکومنٹ اسٹوڈیو میں آگے ایڈٹ کر سکتا ہوں؟",
          },
          a: {
            en: "Yes. After you are satisfied with the conversion, continue in Document Studio to format the page, mix in English, and export PDF or DOCX.",
            ur: "ہاں۔ تبدیلی مطمئن کن ہونے کے بعد ڈاکومنٹ اسٹوڈیو میں صفحہ ترتیب دیں، انگریزی ملائیں، اور PDF یا DOCX نکالیں۔",
          },
        },
      ]}
      related={[
        { href: "/tools/roman-urdu-writer", label: { en: "Qalam Urdu Writer", ur: "قلم اردو رائٹر" } },
        { href: "/tools/document-studio", label: { en: "Continue in Document Studio", ur: "ڈاکومنٹ اسٹوڈیو میں جاری رکھیں" } },
        { href: "/tools/urdu-roman-writer", label: { en: "Urdu to Roman", ur: "اردو سے رومن" } },
        { href: "/tools/urdu-text-to-pdf", label: { en: "Urdu text to PDF", ur: "اردو متن سے PDF" } },
      ]}
    >
      <RomanUrduWriterClient hideHeading />
    </SearchIntentToolLayout>
  );
}
