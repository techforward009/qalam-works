"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function ProblemSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].problem;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#FAF7F0] dark:bg-[#0e1c15] py-14 md:py-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#151B2E] dark:text-[#e8ede9] mb-3 max-w-2xl mx-auto leading-snug ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <p className={`text-[#5B5748] dark:text-[#a8b9ac] text-sm md:text-base max-w-xl mx-auto mb-8 ${naskh}`}>{t.supporting}</p>

        <div className="grid sm:grid-cols-2 gap-6 max-w-[900px] mx-auto">
          {t.points.map((point) => (
            <div key={point.title} className="bg-white dark:bg-[#162a1e] p-7 rounded-2xl border border-[#151B2E]/[0.07] dark:border-white/[0.08] text-center shadow-sm">
              <h3 className={`text-base font-bold text-[#151B2E] dark:text-[#e8ede9] mb-3 ${naskh}`}>{point.title}</h3>
              <div className="bg-[#FAF7F0] dark:bg-[#0e1c15] rounded-lg py-4 mb-4 border border-[#151B2E]/[0.05] dark:border-white/[0.05]">
                <p dir="rtl" className="font-nastaliq text-xl text-[#8B3A3A]">{point.example}</p>
              </div>
              <p className={`text-sm text-[#5B5748] dark:text-[#a8b9ac] leading-relaxed ${naskh}`}>{point.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
