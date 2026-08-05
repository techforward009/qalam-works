import type { Metadata } from "next";
import QualityCheckerTool from "./components/QualityCheckerTool";

export const metadata: Metadata = {
  title: "Publication Quality Checker for Urdu & Arabic | Qalam Works",
  description:
    "Free tool to audit Urdu, Arabic, and Persian text before publication: detect extra spacing, mixed punctuation, repeated words, and mixed scripts.",
  alternates: {
    canonical: "/tools/quality-checker",
  },
};

const faqs = [
  {
    question: "یہ ٹول کیا کرتا ہے؟ / What does this tool do?",
    answer:
      "یہ آپ کے متن کو پبلیکیشن سے پہلے جانچتا ہے — اضافی خالی جگہیں، رموز اوقاف کی خرابیاں، دہرائے گئے الفاظ، اور رسم الخط کا غیر ضروری اختلاط پکڑتا ہے۔ یہ صرف نشاندہی کرتا ہے، خود کوئی تبدیلی نہیں کرتا۔",
  },
  {
    question: "کیا یہ خود متن درست کر دیتا ہے؟ / Does it fix the text automatically?",
    answer:
      "نہیں، یہ صرف آڈٹ (جائزہ) کرتا ہے۔ اگر آپ چاہیں تو 'متن معیاری بنائیں اور دوبارہ جانچیں' بٹن سے Unicode Standardizer چلا کر پہلے اور بعد کا تقابل دیکھ سکتے ہیں۔",
  },
  {
    question: "کیا میرا متن کہیں محفوظ ہوتا ہے؟ / Is my text stored anywhere?",
    answer: "نہیں۔ یہ processing آپ کے براؤزر میں ہی ہوتی ہے — متن کسی سرور پر نہیں بھیجا جاتا۔",
  },
];

export default function QualityCheckerPage() {
  return (
    <main className="py-10 md:py-14">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-900 font-nastaliq mb-2">
          پبلیکیشن کوالٹی چیکر
        </h1>
        <p className="text-lg md:text-xl font-semibold text-gray-800 mb-3">
          Publication Quality Checker
        </p>
        <p className="text-sm md:text-base text-gray-600" dir="ltr">
          Paste your Urdu, Arabic, or Persian text — or upload a .txt/.docx file — to audit
          it for spacing, punctuation, and text-quality issues before publication.
        </p>
      </section>

      {/* Tool */}
      <div className="mb-14">
        <QualityCheckerTool />
      </div>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4" dir="rtl">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">اکثر پوچھے گئے سوالات</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-amber-900 mb-1">{faq.question}</p>
              <p className="text-sm text-gray-700">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
