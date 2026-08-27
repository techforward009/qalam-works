"use client";

import { useLanguage } from "../../lib/language-context";
import { translations } from "../../lib/translations";
import DocumentCleanerTool from "./components/DocumentCleanerTool";

export default function DocumentCleanerContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].cleanerTool;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="py-10 md:py-14" dir={dir}>
      <section className="site-container text-center mb-10">
        <h1 className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] dark:text-white mb-4 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.title}
        </h1>
        <p className={`text-base md:text-lg text-gray-600 dark:text-white max-w-xl mx-auto ${naskh}`}>{t.description}</p>
      </section>

      <div className="mb-14">
        <DocumentCleanerTool />
      </div>

      <section className="site-container">
        <h2 className={`text-[28px] font-bold text-gray-900 dark:text-white mb-5 mt-4 ${naskh}`}>{t.faqHeading}</h2>
        <div className="space-y-4">
          {t.faqs.map((faq) => (
            <div key={faq.question} className="border border-gray-200 rounded-xl p-5">
              <p className={`text-[18px] font-semibold text-[#1A3A2A] dark:text-white mb-2 leading-snug ${naskh}`}>{faq.question}</p>
              <p className={`text-[16px] text-gray-700 dark:text-white leading-[1.7] ${naskh}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
