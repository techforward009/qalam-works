import type { Metadata } from "next";
import InvoiceGeneratorTool from "./components/InvoiceGeneratorTool";

export const metadata: Metadata = {
  title: "Free Invoice Generator | Qalam Works",
  description:
    "Create a clean, professional invoice in your browser and save it as a PDF — free, no sign-up required.",
  alternates: {
    canonical: "/tools/invoice-generator",
  },
};

const faqs = [
  {
    questionUrdu: "یہ ٹول کیا کرتا ہے؟",
    questionEn: "What does this tool do?",
    answer: "یہ آپ کو براؤزر میں ہی ایک صاف، پروفیشنل انوائس بنانے دیتا ہے اور آپ اسے پرنٹ/Save as PDF کر سکتے ہیں۔",
  },
  {
    questionUrdu: "کیا میرا ڈیٹا محفوظ ہوتا ہے؟",
    questionEn: "Is my data saved anywhere?",
    answer: "نہیں، فی الحال یہ صرف آپ کے موجودہ سیشن میں کام کرتا ہے — صفحہ بند کرنے پر ڈیٹا محفوظ نہیں رہتا۔",
  },
];

export default function InvoiceGeneratorPage() {
  return (
    <main className="py-10 md:py-14">
      <section className="max-w-3xl mx-auto px-4 text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-900 mb-2">Invoice Generator</h1>
        <p className="text-sm md:text-base text-gray-600">
          Create a professional invoice and save it as a PDF — free, no sign-up required.
        </p>
      </section>

      <div className="mb-14">
        <InvoiceGeneratorTool />
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
