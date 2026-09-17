"use client";

import DateConverterContent from "../date-converter/DateConverterContent";
import SearchIntentToolLayout from "../SearchIntentToolLayout";

export default function HijriToGregorianContent() {
  return (
    <SearchIntentToolLayout
      h1={{
        en: "Hijri to Gregorian Date Converter",
        ur: "ہجری سے عیسوی تاریخ تبدیل کریں",
      }}
      intro={{
        en: "Enter a Hijri day, month and year to see the corresponding Gregorian date, weekday and additional date information. Qalam Works keeps calculated conversion separate from regional or official calendar evidence where that evidence is available.",
        ur: "ہجری دن، مہینہ اور سال درج کریں اور اس کے مطابق عیسوی تاریخ، ہفتے کا دن اور متعلقہ تاریخی معلومات دیکھیں۔ جہاں علاقائی یا سرکاری تقویمی حوالہ دستیاب ہو، قلم ورکس اسے حسابی نتیجے سے الگ دکھاتا ہے۔",
      }}
      note={{
        en: "Hijri conversion is a calculated reference. Actual observed Islamic dates can differ because lunar months may begin according to local moon sighting or official authorities.",
        ur: "ہجری تبدیلی ایک حسابی حوالہ ہے۔ اصل مشاہدہ شدہ اسلامی تاریخیں مختلف ہو سکتی ہیں کیونکہ قمری مہینے مقامی رؤیتِ ہلال یا سرکاری فیصلے سے شروع ہو سکتے ہیں۔",
      }}
      sections={[
        {
          title: { en: "Calculated Hijri, not a fatwa", ur: "حسابی ہجری، فتویٰ نہیں" },
          body: {
            en: "This page starts on the Hijri calendar and converts to Gregorian using Qalam’s date engine. Where Pakistan-related official or sighting evidence exists, Date Studio shows it as a separate reference rather than silently replacing the calculated day.",
            ur: "یہ صفحہ ہجری کیلنڈر سے شروع ہوتا ہے اور قلم کے تاریخ انجن سے عیسوی میں تبدیل کرتا ہے۔ جہاں پاکستان سے متعلق سرکاری یا رؤیت کا حوالہ ہو، ڈیٹ اسٹوڈیو اسے حسابی دن کی خاموش تبدیلی کے بجائے الگ حوالہ دکھاتا ہے۔",
          },
        },
      ]}
      faqs={[
        {
          q: {
            en: "How do I convert a Hijri date to Gregorian?",
            ur: "ہجری تاریخ کو عیسوی میں کیسے تبدیل کروں؟",
          },
          a: {
            en: "This page opens with Hijri as the source calendar. Enter the Hijri day, month and year to see the Gregorian equivalent, weekday, and related date details. You can still switch calendars in the same converter.",
            ur: "یہ صفحہ ہجری کو ماخذ کیلنڈر بنا کر کھلتا ہے۔ ہجری دن، مہینہ اور سال درج کریں اور عیسوی مساوی، ہفتے کا دن اور متعلقہ تفصیل دیکھیں۔ اسی کنورٹر میں کیلنڈر بدل بھی سکتے ہیں۔",
          },
        },
        {
          q: {
            en: "Why might this differ from a mosque or diary calendar?",
            ur: "مسجد یا ڈائری کیلنڈر سے یہ کیوں مختلف ہو سکتا ہے؟",
          },
          a: {
            en: "Lunar months can start on different civil dates depending on local crescent sighting or an official announcement. A calculated conversion is a reference, not a ruling for worship or public holidays.",
            ur: "قمری مہینے مقامی رؤیتِ ہلال یا سرکاری اعلان کے مطابق مختلف شہری تاریخوں پر شروع ہو سکتے ہیں۔ حسابی تبدیلی ایک حوالہ ہے، عبادت یا سرکاری چھٹی کا حکم نہیں۔",
          },
        },
        {
          q: {
            en: "Does this use moon sighting?",
            ur: "کیا اس میں رؤیتِ ہلال استعمال ہوتی ہے؟",
          },
          a: {
            en: "The conversion itself is calculated. Crescent visibility and official references, when shown, are labelled separately so they are not mixed into the arithmetic date.",
            ur: "تبدیلی خود حسابی ہے۔ رؤیتِ ہلال اور سرکاری حوالے، جہاں دکھائے جائیں، الگ لیبل ہوتے ہیں تاکہ حسابی تاریخ میں گڈمڈ نہ ہوں۔",
          },
        },
        {
          q: {
            en: "Where can I print a Hijri or Gregorian calendar?",
            ur: "ہجری یا عیسوی تقویم کہاں سے چھاپ سکتا ہوں؟",
          },
          a: {
            en: "Use Calendar Maker for a printable annual calendar, or open the full Date Converter for other calendar directions and date lookup.",
            ur: "قابلِ طباعت سالانہ تقویم کے لیے کیلنڈر میکر استعمال کریں، یا دیگر سمتوں اور تاریخ تلاش کے لیے پورا ڈیٹ کنورٹر کھولیں۔",
          },
        },
      ]}
      related={[
        { href: "/tools/date-converter", label: { en: "Date Converter", ur: "تاریخ کنورٹر" } },
        { href: "/tools/calendar-maker", label: { en: "Calendar Maker", ur: "کیلنڈر میکر" } },
        { href: "/tools/crescent-visibility", label: { en: "Crescent visibility", ur: "رؤیتِ ہلال" } },
      ]}
    >
      <DateConverterContent initialMode="convert" initialCalendar="hijri" hideHeading />
    </SearchIntentToolLayout>
  );
}
