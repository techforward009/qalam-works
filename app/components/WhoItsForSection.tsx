"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#FAF7F0] py-24 md:py-28" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#151B2E] mb-16 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {t.audiences.map((a) => (
            <div key={a.role} className="bg-white rounded-xl p-6 border border-[#151B2E]/[0.06] shadow-sm">
              <h3 className={`text-[19px] font-bold text-[#1A3A2A] mb-2 ${naskh}`}>{a.role}</h3>
              <p className={`text-[16px] text-[#5B5748] leading-relaxed ${naskh}`}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
