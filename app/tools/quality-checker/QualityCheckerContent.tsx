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
      <section className="max-w-[1100px] mx-auto px-4 text-center mb-10">
        <h1 className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-4 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.title}
        </h1>
        <p className={`text-base md:text-lg text-gray-600 max-w-xl mx-auto ${naskh}`}>{t.description}</p>
      </section>

      <div className="mb-14">
        <QualityCheckerTool />
      </div>

      <section className="max-w-[1100px] mx-auto px-4">
        <h2 className={`text-[28px] font-bold text-gray-900 mb-5 mt-4 ${naskh}`}>{t.faqHeading}</h2>
        <div className="space-y-4">
          {t.faqs.map((faq) => (
            <div key={faq.question} className="border border-gray-200 rounded-xl p-5">
              <p className={`text-[17px] font-semibold text-[#1A3A2A] mb-2 ${naskh}`}>{faq.question}</p>
              <p className={`text-[15px] text-gray-700 leading-relaxed ${naskh}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
