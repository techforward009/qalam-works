"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function FinalCtaSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].finalCta;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#1A3A2A] dark:bg-[#102018] py-14 md:py-16" dir={dir}>
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-4xl font-bold text-white dark:text-[#e8ede9] mb-4 leading-tight ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>
        <p className={`text-[#b8d4bc] dark:text-[#a8b9ac] text-base md:text-lg mb-6 ${naskh}`}>{t.subline}</p>
        <Link href="/tools/document-studio" className={`inline-block bg-[#B8935A] hover:bg-[#C9A46B] text-white font-semibold px-8 py-4 rounded-lg shadow-lg shadow-black/20 transition-all text-[15px] ${naskh}`}>
          {t.cta}
        </Link>
        <p className="mt-4">
          <Link href="/tools" className={`text-[14px] text-[#b8d4bc] hover:text-white underline underline-offset-2 decoration-white/30 transition-colors ${naskh}`}>
            {t.exploreTools}
          </Link>
        </p>
      </div>
    </section>
  );
}
