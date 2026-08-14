"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { standardizeUrduText } from "../utils/unicode/standardizeUrduText";

// Demo integrity (2026-08-10): AFTER text is generated LIVE from the
// real production standardizeUrduText() — the same function the actual
// Unicode Standardizer tool uses — never a hand-written/hardcoded
// "after" string. This guarantees the marketing example can never claim
// a transformation the product doesn't actually perform, and stays
// automatically correct if the standardizer's behavior ever changes.
const BEFORE_TEXT =
  "یہ  ایک  digital  document  ہے  جس  میں\nUrdu  اور  English  متن  ایک  ساتھ  موجود  ہے ,\nلیکن  formatting  درست  نہیں  ہے !!";

const AFTER_TEXT = standardizeUrduText(BEFORE_TEXT).output;

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
    <section id="before-after" className="bg-[#EAF0E7] py-14 md:py-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#1A3A2A] mb-8 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-0 max-w-4xl mx-auto">
          <div className="flex-1 text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-wide text-red-600 mb-3" dir="ltr">{t.before}</div>
            <div className="bg-white border border-red-300/50 rounded-2xl p-8 min-h-[150px] flex items-center shadow-sm">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#2A1A1A] w-full">
                <span className="bg-red-100 rounded px-0.5">{BEFORE_TEXT}</span>
              </p>
            </div>
          </div>

          <div className="flex md:flex-col items-center justify-center px-4 py-4 md:py-0 shrink-0">
            <div className="bg-[#B8935A] rounded-full p-3 shadow-lg shadow-[#B8935A]/30 text-white">
              <PenNibIcon />
            </div>
          </div>

          <div className="flex-1 text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-wide text-emerald-700 mb-3" dir="ltr">{t.after}</div>
            <div className="bg-white border border-emerald-300/50 rounded-2xl p-8 min-h-[150px] flex items-center shadow-sm">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#1A2A1A] w-full">{AFTER_TEXT}</p>
            </div>
          </div>
        </div>

        <p className={`text-[15px] text-[#4A6A4A] mt-10 ${naskh}`}>{t.note}</p>
      </div>
    </section>
  );
}
