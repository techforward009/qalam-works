"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function ProblemSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].problem;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#F3F7F2] py-16 dark:bg-[#11182A] md:py-20" dir={dir}>
      <div className="mx-auto max-w-[1000px] px-6 text-center">
        <h2 className={`mx-auto mb-3 max-w-2xl text-2xl font-bold leading-snug text-[#11182A] dark:text-[#F7F5EF] md:text-3xl ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <p className={`mx-auto mb-10 max-w-xl text-sm text-[#4d564f] dark:text-[#b7c4bb] md:text-base ${naskh}`}>{t.supporting}</p>

        <div className="mx-auto grid max-w-[900px] gap-5 sm:grid-cols-2">
          {t.points.map((point) => (
            <div key={point.title} className="rounded-2xl border border-[#1A2036]/8 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-[#1A2036]">
              <h3 className={`mb-3 text-base font-bold text-[#1F6C54] dark:text-[#2FA37D] ${naskh}`}>{point.title}</h3>
              <div className="mb-4 rounded-lg border border-[#1A2036]/8 bg-[#F7F5EF] py-4 dark:border-white/10 dark:bg-[#0E1524]">
                {(point.title === "عربی کاف" || point.title === "Arabic kaf") ? (
                  <div className="flex items-center justify-center gap-3 text-2xl text-[#11182A] dark:text-[#F7F5EF]" dir="rtl" lang="ur">
                    <span className="qalam-problem-alvi" lang="ar">ايك</span>
                    <span aria-hidden="true" className="font-sans text-base">←</span>
                    <span className="qalam-problem-jameel">ایک</span>
                  </div>
                ) : <p dir={language === "ur" ? "rtl" : "ltr"} className="font-nastaliq text-xl text-[#11182A] dark:text-[#F7F5EF]">{point.example.split("→").length === 2 ? <span className="inline-flex items-center justify-center gap-2" dir={language === "ur" ? "rtl" : "ltr"}><bdi dir="auto">{point.example.split("→")[0].trim()}</bdi><span className="font-sans" aria-hidden="true">{language === "ur" ? "←" : "→"}</span><bdi dir="auto">{point.example.split("→")[1].trim()}</bdi></span> : point.example}</p>}
              </div>
              <p className={`text-sm leading-relaxed text-[#4d564f] dark:text-[#b7c4bb] ${naskh}`}>{point.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
