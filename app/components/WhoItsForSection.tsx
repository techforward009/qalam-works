"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section id="who-its-for" className="bg-[#0F172A] py-20 dark:bg-black" dir={dir}>
      <div className="mx-auto max-w-[1100px] px-6 text-center">
        <h2 className={`mb-12 text-3xl font-bold text-white md:text-4xl ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {t.audiences.map((a) => (
            <div key={a.role} className="rounded-xl border border-white/10 bg-[#1E293B]/70 p-6 text-start backdrop-blur-sm">
              <h3 className={`mb-2 text-xl font-bold text-[#2FA37D] ${naskh}`}>{a.role}</h3>
              <p className={`text-sm leading-relaxed text-[#CBD5E1] ${naskh}`}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
