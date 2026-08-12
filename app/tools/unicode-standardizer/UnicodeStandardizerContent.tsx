"use client";

import { useLanguage } from "../../lib/language-context";
import { translations } from "../../lib/translations";
import UnicodeStandardizerTool from "./components/UnicodeStandardizerTool";

export default function UnicodeStandardizerContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].unicodeTool;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="py-10 md:py-14" dir={dir}>
      <section className="site-container text-center mb-10">
        <h1 className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-4 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.title}
        </h1>
        <p className={`text-base md:text-lg text-gray-600 max-w-xl mx-auto ${naskh}`}>{t.description}</p>
      </section>

      <div className="mb-14">
        <UnicodeStandardizerTool />
      </div>

      <section className="site-container mb-14">
        <h2 className={`text-[28px] font-bold text-gray-900 mb-5 mt-4 ${naskh}`}>{t.examplesHeading}</h2>
        <div className="space-y-3">
          {t.examples.map((ex) => (
            <div key={ex.label} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <p className={`text-[17px] font-semibold text-gray-700 mb-3 ${naskh}`}>{ex.label}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="block text-[13px] font-semibold text-gray-400 mb-1" dir="ltr">Before</span>
                  <div dir="rtl" className="bg-white border border-gray-200 rounded-lg p-3 text-right font-nastaliq text-[20px]">
                    {ex.before}
                  </div>
                </div>
                <div>
                  <span className="block text-[13px] font-semibold text-emerald-600 mb-1" dir="ltr">After</span>
                  <div dir="rtl" className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-right font-nastaliq text-[20px]">
                    {ex.after}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="site-container">
        <h2 className={`text-[28px] font-bold text-gray-900 mb-5 mt-4 ${naskh}`}>{t.faqHeading}</h2>
        <div className="space-y-4">
          {t.faqs.map((faq) => (
            <div key={faq.question} className="border border-gray-200 rounded-xl p-5">
              <p className={`text-[18px] font-semibold text-[#1A3A2A] mb-2 leading-snug ${naskh}`}>{faq.question}</p>
              <p className={`text-[16px] text-gray-700 leading-[1.7] ${naskh}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
