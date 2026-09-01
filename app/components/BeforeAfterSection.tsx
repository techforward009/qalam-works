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
  "تحقیق :  یہ  ایک  علمی  مضمون  ہے ,جس ميں\nاردو اور English متن  ايك  ساتھ موجود  ہے۔\nمصنف  نے  کہا  : \"یہ مواد اشاعت کے لئے تیار ہے\" !!";

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
    <section id="before-after" className="bg-[#EAF0E7] dark:bg-[#102018] py-14 md:py-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-8 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-0 max-w-4xl mx-auto">
          {/* BEFORE */}
          <div className="flex-1 text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-widest uppercase text-red-500/80 dark:text-red-400/80 mb-3" dir="ltr">{t.before}</div>
            <div className="bg-white dark:bg-[#1e2a20] border border-red-300/50 dark:border-red-900/40 rounded-2xl p-8 min-h-[150px] flex items-center shadow-sm ring-1 ring-red-200/30 dark:ring-red-900/20">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#2A1A1A] dark:text-[#c8a0a0] w-full">
                {BEFORE_TEXT}
              </p>
            </div>
          </div>

          {/* Connector — pen icon */}
          <div className="flex md:flex-col items-center justify-center px-4 py-4 md:py-0 shrink-0">
            <div className="bg-[#B8935A] rounded-full p-3 shadow-lg shadow-[#B8935A]/30 text-white">
              <PenNibIcon />
            </div>
          </div>

          {/* AFTER */}
          <div className="flex-1 text-right" dir="rtl">
            <div className="flex items-center justify-between mb-3" dir="ltr">
              <span className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">{t.after}</span>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full tracking-wide">{t.afterStatus}</span>
            </div>
            <div className="bg-white dark:bg-[#162a1e] border border-emerald-300/50 dark:border-emerald-900/40 rounded-2xl p-8 min-h-[150px] flex items-center shadow-sm ring-1 ring-emerald-200/30 dark:ring-emerald-900/20">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#1A2A1A] dark:text-[#e8ede9] w-full">{AFTER_TEXT}</p>
            </div>
          </div>
        </div>

        <p className={`text-[15px] text-[#4A6A4A] dark:text-[#a8b9ac] mt-10 ${naskh}`}>{t.note}</p>
      </div>
    </section>
  );
}
