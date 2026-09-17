"use client";

import DocumentStudioContent from "../document-studio/DocumentStudioContent";
import SearchIntentToolLayout from "../SearchIntentToolLayout";

export default function UrduTextToPdfContent() {
  return (
    <SearchIntentToolLayout
      h1={{
        en: "Urdu Text to PDF Converter",
        ur: "اردو متن سے PDF بنائیں",
      }}
      intro={{
        en: "Write or paste Urdu text directly in Qalam Works, format it in a multilingual editor, and export it as PDF. The editor is designed for right-to-left Urdu as well as mixed Urdu and English documents.",
        ur: "اردو متن لکھیں یا پیسٹ کریں، اس کی ترتیب اور خط درست کریں، اور تیار دستاویز کو PDF میں محفوظ کریں۔ قلم ورکس اردو، دائیں سے بائیں متن اور اردو و انگریزی کے مخلوط مواد کے لیے بنایا گیا ہے۔",
      }}
      sections={[
        {
          title: { en: "Unicode Urdu PDF", ur: "یونیکوڈ اردو PDF" },
          body: {
            en: "The workspace keeps Urdu as Unicode, including Nastaliq-friendly letter forms, so exported PDFs carry the same characters you typed rather than images of text. That means the file stays searchable and the script does not fall back to broken Arabic presentation forms.",
            ur: "یہ ماحول اردو کو یونیکوڈ میں رکھتا ہے، بشمول نستعلیق کے موافق حروف، تاکہ برآمد کردہ PDF میں وہی حروف ہوں جو آپ نے لکھے ہوں، متن کی تصویر نہیں۔ فائل تلاش کے قابل رہتی ہے اور رسم الخط ٹوٹی ہوئی عربی اشکال میں نہیں بدل جاتا۔",
          },
        },
        {
          title: { en: "RTL and mixed-language documents", ur: "دائیں سے بائیں اور مخلوط زبان کے دستاویز" },
          body: {
            en: "Paragraphs can run right-to-left for Urdu and still hold English words, numbers, or headings in the same document. Direction is handled in the editor before you download the PDF, which is the usual failure point for copy-pasted Urdu in generic word processors.",
            ur: "پیراگراف اردو کے لیے دائیں سے بائیں چل سکتے ہیں اور اسی دستاویز میں انگریزی الفاظ، اعداد یا سرخیاں بھی رکھ سکتے ہیں۔ سمت ایڈیٹر میں PDF ڈاؤن لوڈ سے پہلے سنبھالی جاتی ہے — عام ورڈ پروسیسر میں کاپی پیسٹ اردو یہیں بگڑتی ہے۔",
          },
        },
        {
          title: { en: "PDF vs DOCX", ur: "PDF اور DOCX" },
          body: {
            en: "Use PDF when you need a fixed page you can send or print. Use DOCX when someone else still needs to edit the file in Word. Both exports come from the same Document Studio draft, so you can format once and choose the file type at the end.",
            ur: "جب ایک مقرر صفحہ بھیجنا یا چھاپنا ہو تو PDF استعمال کریں۔ جب دوسرا شخص ابھی فائل میں ترمیم کرے گا تو DOCX لیں۔ دونوں ایکسپورٹ ایک ہی ڈاکومنٹ اسٹوڈیو مسودے سے بنتے ہیں، اس لیے ایک بار ترتیب دیں اور آخر میں فائل کی قسم چنیں۔",
          },
        },
      ]}
      faqs={[
        {
          q: {
            en: "Can I convert Urdu text to PDF in the browser?",
            ur: "کیا براؤزر میں اردو متن کو PDF بنایا جا سکتا ہے؟",
          },
          a: {
            en: "Yes. Type or paste Urdu in the editor on this page, check RTL and fonts, then use Document Studio’s PDF download. The file is generated from the document you see — there is no separate upload form.",
            ur: "ہاں۔ اس صفحے کے ایڈیٹر میں اردو لکھیں یا پیسٹ کریں، دائیں سے بائیں سمت اور فونٹ چیک کریں، پھر ڈاکومنٹ اسٹوڈیو سے PDF ڈاؤن لوڈ کریں۔ فائل اسی دستاویز سے بنتی ہے جو آپ دیکھ رہے ہیں — الگ اپلوڈ فارم نہیں۔",
          },
        },
        {
          q: {
            en: "Will the PDF keep Nastaliq and right-to-left layout?",
            ur: "کیا PDF میں نستعلیق اور دائیں سے بائیں ترتیب باقی رہتی ہے؟",
          },
          a: {
            en: "The export is built for Urdu RTL and bundled Nastaliq faces. Always preview the pages before sending a final copy, especially if the document mixes English and Urdu in one paragraph.",
            ur: "ایکسپورٹ اردو RTL اور شامل نستعلیق چہروں کے لیے بنایا گیا ہے۔ حتمی کاپی بھیجنے سے پہلے صفحات دیکھ لیں، خاص طور پر جب ایک پیراگراف میں اردو اور انگریزی ملی ہوں۔",
          },
        },
        {
          q: {
            en: "Can I mix Urdu and English in the same PDF?",
            ur: "کیا ایک ہی PDF میں اردو اور انگریزی ملا سکتا ہوں؟",
          },
          a: {
            en: "Yes. Document Studio is a multilingual editor. Keep Urdu paragraphs RTL and leave English runs as they are; the PDF follows the editor layout rather than forcing a single direction on the whole file.",
            ur: "ہاں۔ ڈاکومنٹ اسٹوڈیو کثیر لسانی ایڈیٹر ہے۔ اردو پیراگراف RTL رکھیں اور انگریزی جوں کی توں رہنے دیں؛ PDF پوری فائل پر ایک سمت مسلط کرنے کے بجائے ایڈیٹر کی ترتیب پر چلتا ہے۔",
          },
        },
        {
          q: {
            en: "When should I download DOCX instead of PDF?",
            ur: "PDF کے بجائے DOCX کب ڈاؤن لوڈ کروں؟",
          },
          a: {
            en: "Choose DOCX if the next person needs to revise wording or comments in Word. Choose PDF for a page-faithful copy, print, or a file that should not reflow. You can keep the same draft and export both.",
            ur: "اگر اگلا شخص ورڈ میں الفاظ یا تبصرے بدلے گا تو DOCX چنیں۔ صفحہ کے مطابق کاپی، پرنٹ، یا ایسی فائل جو دوبارہ نہ بہے، اس کے لیے PDF چنیں۔ ایک ہی مسودہ رکھ کر دونوں نکال سکتے ہیں۔",
          },
        },
      ]}
      related={[
        { href: "/tools/document-studio", label: { en: "Document Studio", ur: "ڈاکومنٹ اسٹوڈیو" } },
        { href: "/tools/unicode-standardizer", label: { en: "Urdu Unicode Fixer", ur: "اردو یونیکوڈ فکسر" } },
        { href: "/tools/roman-urdu-to-urdu", label: { en: "Roman Urdu to Urdu", ur: "رومن اردو سے اردو" } },
        { href: "/services", label: { en: "Professional document formatting", ur: "پیشہ ورانہ دستاویز کی ترتیب" } },
      ]}
    >
      <DocumentStudioContent hideHeading />
    </SearchIntentToolLayout>
  );
}
