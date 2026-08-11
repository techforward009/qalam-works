"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function FinalCtaSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].finalCta;

  return (
    <section className="bg-[#12172A] py-28 md:py-32" dir={dir}>
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">{t.headline}</h2>
        <p className="text-[#B9B4A8] text-base md:text-lg mb-10">{t.subline}</p>
        <Link
          href="/tools/document-studio"
          className="inline-block bg-[#B8935A] hover:bg-[#C9A46B] text-[#12172A] font-semibold px-8 py-4 rounded-lg shadow-lg shadow-[#B8935A]/20 transition-all text-sm"
        >
          {t.cta}
        </Link>
      </div>
    </section>
  );
}
