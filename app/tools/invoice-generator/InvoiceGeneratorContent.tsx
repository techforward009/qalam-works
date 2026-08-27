"use client";

import { useLanguage } from "../../lib/language-context";
import { translations } from "../../lib/translations";
import InvoiceGeneratorTool from "./components/InvoiceGeneratorTool";

export default function InvoiceGeneratorContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].invoiceTool;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="py-10 md:py-14" dir={dir}>
      <section className="site-container text-center mb-10">
        <h1
          className={`text-2xl md:text-3xl font-bold text-amber-900 dark:text-white mb-2 ${
            language === "ur" ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.title}
        </h1>
        <p className={`text-sm md:text-base text-gray-600 dark:text-white max-w-xl mx-auto ${naskh}`}>{t.description}</p>
      </section>

      <div className="mb-14">
        <InvoiceGeneratorTool />
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
