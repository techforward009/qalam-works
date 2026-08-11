"use client";

import { useLanguage } from "../../lib/language-context";
import { translations } from "../../lib/translations";
import QualityCheckerTool from "./components/QualityCheckerTool";

export default function QualityCheckerContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].qualityTool;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="py-10 md:py-14" dir={dir}>
      <section className="max-w-[900px] mx-auto px-4 text-center mb-10">
        <h1 className={`text-2xl md:text-3xl font-bold text-[#1A3A2A] mb-3 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.title}
        </h1>
        <p className={`text-sm md:text-base text-gray-600 max-w-xl mx-auto ${naskh}`}>{t.description}</p>
      </section>

      <div className="mb-14">
        <QualityCheckerTool />
      </div>

      <section className="max-w-[900px] mx-auto px-4">
        <h2 className={`text-lg font-bold text-gray-900 mb-4 ${naskh}`}>{t.faqHeading}</h2>
        <div className="space-y-4">
          {t.faqs.map((faq) => (
            <div key={faq.question} className="border border-gray-200 rounded-xl p-4">
              <p className={`font-semibold text-[#1A3A2A] mb-1 ${naskh}`}>{faq.question}</p>
              <p className={`text-sm text-gray-700 ${naskh}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
