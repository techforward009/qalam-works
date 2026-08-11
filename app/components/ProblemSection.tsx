"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function ProblemSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].problem;

  return (
    <section className="bg-[#FAF9F6] py-24 md:py-28" dir={dir}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-3 max-w-2xl mx-auto leading-snug">
          {t.headline}
        </h2>
        <p className="text-[#5B5748] text-sm md:text-base max-w-xl mx-auto mb-16">{t.supporting}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.points.map((point) => (
            <div key={point.title} className="bg-white p-6 rounded-2xl border border-[#151B2E]/[0.07] text-center">
              <h3 className="text-sm font-bold text-[#151B2E] mb-2">{point.title}</h3>
              <p className="font-nastaliq text-lg text-[#8B3A3A] mb-3">{point.example}</p>
              <p className="text-xs text-[#5B5748] leading-relaxed">{point.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
