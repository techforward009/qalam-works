"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function WhoItsForSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].whoItsFor;

  return (
    <section className="bg-[#FAF9F6] py-24 md:py-28" dir={dir}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-16">{t.headline}</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.audiences.map((a) => (
            <div key={a.role}>
              <h3 className="text-sm font-bold text-[#151B2E] mb-1">{a.role}</h3>
              <p className="text-sm text-[#5B5748]">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
