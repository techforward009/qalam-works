"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function AboutContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].about;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="bg-white min-h-screen" dir={dir}>
      <div className="max-w-[820px] mx-auto px-6 py-16 md:py-24">
        <h1
          className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-4 ${
            language === "ur" ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.heading}
        </h1>
        <p className={`text-lg md:text-xl text-[#5B5748] mb-10 leading-relaxed ${naskh}`}>
          {t.tagline}
        </p>

        <div className={`space-y-5 text-[17px] leading-relaxed text-[#3A3530] ${naskh}`}>
          <p>{t.body1}</p>
          <p>{t.body2}</p>
        </div>

        <div className="mt-12 pt-10 border-t border-gray-100">
          <h2
            className={`text-xl md:text-2xl font-bold text-[#1A3A2A] mb-4 ${
              language === "ur" ? "font-nastaliq font-normal" : ""
            }`}
          >
            {t.servicesHeading}
          </h2>
          <p className={`text-[17px] leading-relaxed text-[#3A3530] mb-6 ${naskh}`}>
            {t.servicesBody}
          </p>
          <Link
            href="/contact"
            className={`inline-block bg-[#1A3A2A] hover:bg-[#244D38] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm ${naskh}`}
          >
            {t.ctaLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
