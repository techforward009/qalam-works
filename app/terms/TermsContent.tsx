"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function TermsContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].termsPage;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="bg-white min-h-screen" dir={dir}>
      <div className="max-w-[820px] mx-auto px-6 py-16 md:py-24">
        <h1
          className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-2 ${
            language === "ur" ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.heading}
        </h1>
        <p className={`text-sm text-[#8A8070] mb-10 ${naskh}`}>{t.lastUpdated}</p>

        <div className="space-y-8">
          {t.sections.map((s) => (
            <div key={s.title}>
              <h2 className={`text-lg font-bold text-[#1A3A2A] mb-2 ${naskh}`}>{s.title}</h2>
              <p className={`text-[16px] leading-relaxed text-[#3A3530] ${naskh}`}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
