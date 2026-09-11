"use client";

import { useLanguage } from "../../lib/language-context";
import { translations } from "../../lib/translations";
import InvoiceGeneratorTool from "./components/InvoiceGeneratorTool";

export default function InvoiceGeneratorContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].invoiceTool;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="py-10 md:py-14" dir={dir} lang={language}>
      <section className="site-container text-center mb-10">
        <h1
          className={`text-2xl md:text-3xl font-bold text-amber-900 dark:text-white mb-2 ${
            language === "ur" ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.title}
        </h1>
        <p className={`text-sm md:text-base text-gray-600 dark:text-white max-w-xl mx-auto ${naskh}`}>{t.description}</p>
        <p className={`text-sm text-gray-600 dark:text-white mt-3 ${naskh}`}>
          {language === "ur" ? "اردو یا انگریزی میں انوائس تیار کریں، پاکستانی طرز منتخب کریں اور PDF محفوظ کریں۔" : (
            <>Also available in Urdu — <span lang="ur" dir="rtl" className="font-naskh">انوائس جنریٹر</span> — with Pakistani invoice formatting and PDF export.</>
          )}
        </p>
      </section>

      <div className="mb-14">
        <InvoiceGeneratorTool />
      </div>

      <div className={`site-container space-y-8 mb-10 text-sm text-gray-700 dark:text-white leading-relaxed ${naskh}`}>
        <section aria-labelledby="invoice-use-cases">
          <h2 id="invoice-use-cases" className="text-lg font-bold mb-3">{t.introHeading}</h2>
          <p>{t.intro}</p>
        </section>
        <section aria-labelledby="invoice-features">
          <h2 id="invoice-features" className="text-lg font-bold mb-3">{t.featuresHeading}</h2>
          <ul className="list-disc ps-5 space-y-2">
            {t.features.map(feature => <li key={feature}>{feature}</li>)}
          </ul>
        </section>
        <section aria-labelledby="invoice-steps">
          <h2 id="invoice-steps" className="text-lg font-bold mb-3">{t.stepsHeading}</h2>
          <ol className="list-decimal ps-5 space-y-2">
            {t.steps.map(step => <li key={step}>{step}</li>)}
          </ol>
        </section>
        <section aria-labelledby="invoice-urdu" lang="ur" dir="rtl" className="font-naskh">
          <h2 id="invoice-urdu" className="text-lg font-bold mb-3">اردو انوائس جنریٹر</h2>
          <p>اپنے کاروبار یا فری لانس کام کی انوائس اردو میں تیار کریں۔ پاکستانی روپے (<bdi dir="ltr">PKR</bdi>) درج کریں، سامان یا خدمات کی تفصیل لکھیں اور گاہک کو بھیجنے سے پہلے رقم اور تاریخیں دیکھ لیں۔ انوائس <bdi dir="ltr">PDF</bdi> میں ڈاؤن لوڈ کر کے محفوظ کر سکتے ہیں۔</p>
        </section>
      </div>

      <section className="site-container" dir={dir}>
        <h2 className={`text-lg font-bold text-gray-900 dark:text-white mb-4 ${language === "ur" ? "text-right font-nastaliq font-normal" : ""}`}>
          {t.faqHeading}
        </h2>
        <div className="space-y-4">
          {t.faqs.map((faq) => (
            <div key={faq.question} className="border border-gray-200 rounded-xl p-4">
              <p className={`font-semibold text-amber-900 dark:text-white mb-1 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>{faq.question}</p>
              <p className={`text-sm text-gray-700 dark:text-white ${naskh}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
