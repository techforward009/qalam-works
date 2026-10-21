"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section id="who-its-for" className="bg-[#F7F5EF] py-8 dark:bg-[#11182A] md:py-10" dir={dir}>
      <div className="mx-auto max-w-[1100px] px-6 text-center">
        <h2 className={`mb-6 text-2xl font-bold text-[#11182A] dark:text-white md:text-3xl ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <ul className="flex flex-wrap justify-center gap-3">
          {t.audiences.map(a => <li key={a.role} className={`rounded-full border border-[#1A2036]/10 bg-white px-5 py-3 text-[#1F6C54] dark:border-white/10 dark:bg-[#1A2036] dark:text-[#7DDCB8] ${naskh}`}>{a.role}</li>)}
        </ul>
      </div>
    </section>
  );
}
