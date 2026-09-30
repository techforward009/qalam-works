"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function FinalCtaSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].finalCta;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#0E1524] py-16 md:py-20" dir={dir}>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className={`mb-6 whitespace-pre-line text-3xl font-bold leading-tight text-white md:text-4xl ${language === "ur" ? "font-nastaliq font-normal leading-[1.8]" : ""}`}>
          {t.headline}
        </h2>
        <p className={`mb-8 text-base text-[#c5d0c9] md:text-lg ${naskh}`}>{t.subline}</p>
        <Link href="/tools/document-studio" className={`inline-flex min-h-12 items-center rounded-lg bg-[#2FA37D] px-8 py-3 text-[15px] font-semibold text-white shadow-lg shadow-[#2FA37D]/20 transition-colors hover:bg-[#248565] ${naskh}`}>
          {t.cta}
        </Link>
        <p className="mt-5">
          <Link href="/tools" className={`text-[14px] text-[#C9A46B] underline decoration-[#C9A46B]/40 underline-offset-4 hover:text-[#E0BA85] ${naskh}`}>
            {t.exploreTools}
          </Link>
        </p>
      </div>
    </section>
  );
}
