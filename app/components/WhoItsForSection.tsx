"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#F8FAF8] dark:bg-[#0e1c15] py-14 md:py-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#151B2E] dark:text-[#e8ede9] mb-8 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {t.audiences.map((a) => (
            <div key={a.role} className="bg-white dark:bg-[#162a1e] rounded-xl p-6 border border-[#151B2E]/[0.06] dark:border-white/[0.08] shadow-sm">
              <h3 className={`text-[19px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-2 ${naskh}`}>{a.role}</h3>
              <p className={`text-[16px] text-[#5B5748] dark:text-[#e8ede9] leading-relaxed ${naskh}`}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
