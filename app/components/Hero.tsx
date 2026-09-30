"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { standardizeUrduText } from "../utils/unicode/standardizeUrduText";

const PREVIEW_BEFORE = "يہ  ايك  مضمون ہے ,جس ميں English بھی ہے۔";
const PREVIEW_AFTER = standardizeUrduText(PREVIEW_BEFORE).output;

function PenNibIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

export default function Hero() {
  const { language, dir } = useLanguage();
  const t = translations[language].hero;
  const urduLine = translations.ur.hero.subheadline;
  const naskh = language === "ur" ? "font-naskh" : "";
  const headlineClass = language === "ur" ? "font-nastaliq font-normal leading-[1.7]" : "leading-[1.08] tracking-tight";

  return (
    <section className="relative overflow-hidden border-b border-[#1A2036]/10 bg-[#F7F5EF] dark:border-white/5 dark:bg-[#0E1524]" dir={dir}>
      <div className="site-container grid items-center gap-10 px-6 py-14 md:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className={language === "ur" ? "text-right" : "text-left"}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#B8935A]">
            Deterministic First. AI Later.
          </p>
          <h1 className={`mt-4 max-w-xl text-[2.5rem] font-extrabold text-[#11182A] dark:text-[#F7F5EF] sm:text-5xl lg:text-[3.4rem] ${headlineClass}`}>
            {language === "ur" ? t.headline : <>Write. Refine. <span className="text-[#1F6C54] dark:text-[#2FA37D]">Publish.</span></>}
          </h1>
          <p dir="rtl" lang="ur" className="mt-5 max-w-xl font-nastaliq text-[1.35rem] leading-[2.2] text-[#3d4a42] dark:text-[#d5e0d8]">
            {urduLine}
          </p>
          <p className={`mt-4 max-w-xl text-[15px] leading-7 text-[#4d564f] dark:text-[#b7c4bb] ${naskh}`}>
            {language === "ur"
              ? "پہلے معیاری صفائی، پھر وہی متن اشاعت کے لیے تیار۔ نتیجہ قواعد سے آتا ہے، اندازے سے نہیں۔"
              : "Text is standardized and cleaned before it is published. The same input follows the same rules."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/tools/document-studio"
              className={`inline-flex min-h-12 items-center justify-center rounded-lg bg-[#2FA37D] px-6 text-[15px] font-bold text-white shadow-lg shadow-[#2FA37D]/20 transition-colors hover:bg-[#248565] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0E1524] ${naskh}`}
            >
              {t.ctaPrimary}
            </Link>
            <Link
              href="#before-after"
              className={`inline-flex min-h-12 items-center justify-center rounded-lg border border-[#1A2036]/15 bg-white/70 px-6 text-[15px] font-semibold text-[#11182A] hover:bg-white dark:border-white/15 dark:bg-[#1A2036] dark:text-[#F7F5EF] dark:hover:bg-[#243049] ${naskh}`}
            >
              {t.ctaSecondary}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#1A2036] p-5 text-white shadow-[0_24px_50px_rgba(14,21,36,0.28)] sm:p-6" dir="ltr">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#F7F5EF]">
              <span className="text-[#C9A46B]"><PenNibIcon /></span>
              {translations[language].hero.mockupLabel}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#2FA37D]">RTL</span>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl bg-[#0E1524] px-4 py-3" dir="rtl">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40" dir="ltr">Before</p>
              <p className="font-nastaliq text-[20px] leading-[2] text-[#e7d7d2]">{PREVIEW_BEFORE}</p>
            </div>
            <div className="rounded-xl bg-[#12261f] px-4 py-3 ring-1 ring-[#2FA37D]/30" dir="rtl">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#2FA37D]" dir="ltr">Standardized</p>
              <p className="font-nastaliq text-[20px] leading-[2] text-[#F7F5EF]">{PREVIEW_AFTER}</p>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-5 text-white/60">
            {language === "ur"
              ? "یونیکوڈ، فاصلہ اور رموزِ اوقاف ایک ہی قواعد سے درست ہوتے ہیں۔"
              : "Unicode, spacing, and punctuation follow one deterministic cleanup."}
          </p>
        </div>
      </div>
    </section>
  );
}
