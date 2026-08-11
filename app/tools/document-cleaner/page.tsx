import type { Metadata } from "next";
import DocumentCleanerTool from "./components/DocumentCleanerTool";

export const metadata: Metadata = {
  title: "Document Cleaner for Urdu Files | Qalam Works",
  description:
    "Upload .txt or .docx files for automated Unicode normalization and publication quality audit — free document cleaning for Urdu text.",
  alternates: {
    canonical: "/tools/document-cleaner",
  },
};

const faqs = [
  {
    questionUrdu: "یہ ٹول کیا کرتا ہے؟",
    questionEn: "What does this tool do?",
    answer:
      "یہ آپ کی .txt یا .docx فائل سے متن نکال کر خود بخود Unicode معیاری کاری کرتا ہے اور ایک مکمل Quality Report دیتا ہے، پھر آپ درست شدہ فائل ڈاؤن لوڈ کر سکتے ہیں۔",
  },
  {
    questionUrdu: "کیا میری فائل کہیں محفوظ ہوتی ہے؟",
    questionEn: "Is my file stored anywhere?",
    answer: "نہیں۔ فائل صرف پروسیسنگ کے لیے استعمال ہوتی ہے، کہیں محفوظ نہیں کی جاتی۔",
  },
  {
    questionUrdu: "زیادہ سے زیادہ فائل سائز کیا ہے؟",
    questionEn: "What's the maximum file size?",
    answer: "فی الحال .txt اور .docx فائلیں 5MB تک سپورٹ کرتی ہیں۔",
  },
];

export default function DocumentCleanerPage() {
  return (
    <main className="py-10 md:py-14">
      <section className="max-w-3xl mx-auto px-4 text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-900 font-nastaliq mb-2">
          ڈاکومنٹ کلینر
        </h1>
        <p className="text-lg md:text-xl font-semibold text-gray-800 mb-3">
          Document Cleaner
        </p>
        <p className="text-sm md:text-base text-gray-600" dir="ltr">
          Upload a .txt or .docx file to automatically extract, normalize, and audit your
          Urdu text — then download the cleaned result.
        </p>
      </section>

      <div className="mb-14">
        <DocumentCleanerTool />
      </div>

      <section className="max-w-3xl mx-auto px-4" dir="rtl">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">اکثر پوچھے گئے سوالات</h2>
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
