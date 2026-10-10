"use client";

import { useState } from "react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { standardizeUrduText } from "../utils/unicode/standardizeUrduText";

const BROKEN_TEXT = "يہ  ,  ايك  غلط  كلمات  والا  متن  ہے";
const FIXED_TEXT = standardizeUrduText(BROKEN_TEXT).output;

export default function BeforeAfterSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].beforeAfter;
  const naskh = language === "ur" ? "font-naskh" : "";
  const [fixed, setFixed] = useState(false);

  return (
    <section id="before-after" className="bg-white py-16 dark:bg-[#11182A] md:py-20" dir={dir}>
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <h2 className={`text-3xl font-bold text-[#11182A] dark:text-white ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
            {t.headline}
          </h2>
          <p className={`mt-4 text-lg text-[#4d564f] dark:text-[#b7c4bb] ${naskh}`}>{t.watch}</p>
        </div>

        <div className="grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]" dir="ltr">
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#1A2036]/10 bg-[#F7F5EF] p-8 shadow-inner dark:border-white/10 dark:bg-[#0E1524]">
            <div className="absolute left-0 top-0 rounded-br-lg bg-[#1A2036] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white dark:bg-[#243049]" dir="ltr">
              {t.inputLabel}
            </div>
            <p dir="rtl" lang="ur" className="mt-6 break-words text-center font-nastaliq text-2xl leading-[2.4] text-[#263742] dark:text-[#e3e8e5]">
              {BROKEN_TEXT}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2" dir={language === "ur" ? "rtl" : "ltr"}>
              {[t.tagYeh, t.tagComma, t.tagSpacing].map((tag) => (
                <span key={tag} className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#2FA37D]/15 text-[#1F6C54] shadow-lg dark:border-[#11182A] dark:bg-[#2FA37D]/20 dark:text-[#7DDCB8]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-[#2FA37D]/40 bg-white p-8 shadow-xl dark:border-[#2FA37D]/35 dark:bg-[#1A2036]">
            <div className="absolute left-0 top-0 rounded-br-lg bg-[#2FA37D] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white" dir="ltr">
              {t.outputLabel}
            </div>
            <div className="mt-6 flex min-h-[120px] flex-col justify-center">
              {fixed ? (
                <>
                  <p dir="rtl" lang="ur" className="break-words font-nastaliq text-2xl font-bold leading-[2.4] text-[#11182A] dark:text-white">
                    {FIXED_TEXT}
                  </p>
                </>
              ) : (
                <p className={`text-right text-sm not-italic text-[#6b645c] dark:text-[#b7c4bb] ${language === "ur" ? "qalam-jameel-prompt" : ""}`} dir={language === "ur" ? "rtl" : "ltr"}>{t.prompt}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFixed(true)}
              className={`mt-6 flex w-full items-center justify-center rounded-lg bg-[#11182A] px-4 py-3 font-bold text-white transition-colors hover:bg-[#1F6C54] dark:bg-[#2FA37D] dark:hover:bg-[#248565] ${naskh}`}
            >
              {t.fixButton}
            </button>
          </div>
        </div>

        <div className="mt-12 flex items-start gap-4 rounded-xl border border-[#2FA37D]/20 bg-[#F3F7F2] p-6 dark:border-white/10 dark:bg-[#0E1524]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2FA37D]/20 text-[#1F6C54] dark:text-[#7DDCB8]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className={`text-lg font-bold text-[#11182A] dark:text-white ${naskh}`}>{t.principle}</h3>
            <p className={`mt-2 leading-relaxed text-[#4d564f] dark:text-[#b7c4bb] ${naskh}`}>{t.principleBody}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
