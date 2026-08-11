"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

const BEFORE_TEXT = "علي نے كتاب پڑھی  ، اور یہ Document بھی۔۔";
const AFTER_TEXT = "علی نے کتاب پڑھی، اور یہ دستاویز بھی۔";

function PenNibIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

// Signature visual: BEFORE -> Qalam Works pen -> AFTER, one continuous
// flow rather than two independent boxes.
export default function BeforeAfterSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].beforeAfter;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section id="before-after" className="bg-[#1A3A2A] py-28 md:py-36" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-white mb-16 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-0 max-w-4xl mx-auto">
          <div className="flex-1 text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-wide text-red-300 mb-3" dir="ltr">{t.before}</div>
            <div className="bg-white/[0.04] border border-red-400/20 rounded-2xl p-8 min-h-[150px] flex items-center">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#F5F2EA] w-full">
                <span className="bg-red-500/15 rounded px-0.5">{BEFORE_TEXT}</span>
              </p>
            </div>
          </div>

          <div className="flex md:flex-col items-center justify-center px-4 py-4 md:py-0 shrink-0">
            <div className="bg-[#B8935A] rounded-full p-3 shadow-lg shadow-[#B8935A]/30 text-[#12172A]">
              <PenNibIcon />
            </div>
          </div>

          <div className="flex-1 text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-wide text-emerald-300 mb-3" dir="ltr">{t.after}</div>
            <div className="bg-white/[0.04] border border-emerald-400/20 rounded-2xl p-8 min-h-[150px] flex items-center">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#F5F2EA] w-full">{AFTER_TEXT}</p>
            </div>
          </div>
        </div>

        <p className={`text-sm text-[#8AAA8A] mt-10 ${naskh}`}>{t.note}</p>
      </div>
    </section>
  );
}
