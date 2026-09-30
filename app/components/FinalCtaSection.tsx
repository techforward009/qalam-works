"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function FinalCtaSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].finalCta;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-gradient-to-br from-[#1F6C54] to-[#115E59] py-20 md:py-24" dir={dir}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className={`mb-6 whitespace-pre-line text-4xl font-bold leading-tight text-white md:text-5xl ${language === "ur" ? "font-nastaliq font-normal leading-[1.8]" : ""}`}>
          {t.headline}
        </h2>
        <p className={`mb-10 text-lg text-[#E7F6F0] md:text-xl ${naskh}`}>{t.subline}</p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/tools/document-studio" className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-8 py-3 text-[16px] font-bold text-[#1F6C54] shadow-xl transition-transform hover:-translate-y-0.5 hover:bg-[#F3F7F2] ${naskh}`}>
            {t.cta}
          </Link>
          <Link href="/tools" className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-[#164638]/40 px-8 py-3 text-[16px] font-bold text-white backdrop-blur transition-colors hover:bg-[#164638]/70 ${naskh}`}>
            {t.exploreTools}
          </Link>
        </div>
      </div>
    </section>
  );
}
