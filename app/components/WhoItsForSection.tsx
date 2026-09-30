"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section id="who-its-for" className="bg-[#1A2036] py-16 md:py-20" dir={dir}>
      <div className="mx-auto max-w-[1100px] px-6 text-center">
        <h2 className={`mb-8 text-2xl font-bold text-[#F7F5EF] md:text-3xl ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {t.audiences.map((a) => (
            <div key={a.role} className="rounded-2xl border border-white/10 bg-[#11182A] p-6 text-start">
              <h3 className={`mb-2 text-[19px] font-bold text-[#2FA37D] ${naskh}`}>{a.role}</h3>
              <p className={`text-[16px] leading-relaxed text-[#c5d0c9] ${naskh}`}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
