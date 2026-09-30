"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section id="who-its-for" className="bg-[#F7F5EF] py-16 dark:bg-[#11182A] md:py-20" dir={dir}>
      <div className="mx-auto max-w-[1100px] px-6 text-center">
        <h2 className={`mb-10 text-3xl font-bold text-[#11182A] dark:text-white md:text-4xl ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {t.audiences.map((a, index) => (
            <div
              key={a.role}
              className={`rounded-2xl border border-[#1A2036]/8 bg-white p-6 text-start shadow-sm dark:border-white/10 dark:bg-[#1A2036] ${
                index < 3 ? "lg:col-span-2" : "sm:col-span-1 lg:col-span-3"
              }`}
            >
              <h3 className={`mb-2 text-[19px] font-bold text-[#1F6C54] dark:text-[#2FA37D] ${naskh}`}>{a.role}</h3>
              <p className={`text-[16px] leading-relaxed text-[#4d564f] dark:text-[#c5d0c9] ${naskh}`}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
