import type { Metadata } from "next";
import UnicodeStandardizerTool from "./components/UnicodeStandardizerTool";

export const metadata: Metadata = {
  title: "Urdu & Arabic Unicode Standardizer | Qalam Works",
  description:
    "Free tool to normalize Urdu text: fix mixed character variants (ي/ی, ك/ک), clean up spacing, and correct punctuation for publication-ready Unicode text.",
  alternates: {
    canonical: "/tools/unicode-standardizer",
  },
};

const faqs = [
  {
    questionUrdu: "یہ ٹول کیا کرتا ہے؟",
    questionEn: "What does this tool do?",
    answer:
      "یہ آپ کے اردو متن میں مختلف Unicode variants (جیسے ي بجائے ی، ك بجائے ک) کو معیاری بناتا ہے، اضافی خالی جگہیں ہٹاتا ہے، اور انگریزی punctuation کو اردو کے مطابق درست کرتا ہے۔",
  },
  {
    questionUrdu: "کیا میرا متن کہیں محفوظ ہوتا ہے؟",
    questionEn: "Is my text stored anywhere?",
    answer: "نہیں۔ یہ processing آپ کے براؤزر میں ہی ہوتی ہے — متن کسی سرور پر نہیں بھیجا جاتا۔",
  },
  {
    questionUrdu: "کن فائل فارمیٹس کے ساتھ کام کرتا ہے؟",
    questionEn: "What formats does it support?",
    answer:
      "فی الحال یہ plain text کے ساتھ کام کرتا ہے۔ DOCX اور PDF فائلوں کے لیے ہمارا Document Cleaner ٹول استعمال کریں۔",
  },
];

const examples = [
  {
    label: "Mixed Arabic/Persian Yeh",
    before: "علي عليه السلام",
    after: "علی علیہ السلام",
  },
  {
    label: "English-style punctuation",
    before: "العلم نور , والجهل ظلام",
    after: "العلم نور، والجهل ظلام",
  },
];

export default function UnicodeStandardizerPage() {
  return (
    <main className="py-10 md:py-14">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-900 font-nastaliq mb-2">
          یونیکوڈ سٹینڈرڈائزر
        </h1>
        <p className="text-lg md:text-xl font-semibold text-gray-800 mb-3">
          Urdu Unicode Standardizer
        </p>
        <p className="text-sm md:text-base text-gray-600" dir="ltr">
          Paste any Urdu text below to instantly normalize mixed character
          variants, fix spacing, and correct punctuation — free, and
          processed entirely in your browser.
        </p>
      </section>

      {/* Tool */}
      <div className="mb-14">
        <UnicodeStandardizerTool />
      </div>

      {/* Examples */}
      <section className="max-w-3xl mx-auto px-4 mb-14" dir="ltr">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Examples</h2>
        <div className="space-y-3">
          {examples.map((ex) => (
            <div
              key={ex.label}
              className="border border-gray-200 rounded-xl p-4 bg-gray-50"
            >
              <p className="text-xs font-semibold text-gray-500 mb-2">{ex.label}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-mono">
                <div dir="rtl" className="bg-white border border-gray-200 rounded-lg p-2 text-right">
                  {ex.before}
                </div>
                <div dir="rtl" className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-right">
                  {ex.after}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4" dir="rtl">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">
          اکثر پوچھے گئے سوالات
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.questionUrdu} className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-amber-900 mb-0.5" dir="rtl">{faq.questionUrdu}</p>
              <p className="font-semibold text-amber-700 text-sm mb-2" dir="ltr">{faq.questionEn}</p>
              <p className="text-sm text-gray-700" dir="rtl">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
