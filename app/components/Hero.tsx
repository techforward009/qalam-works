"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function Hero() {
  const { language, dir } = useLanguage();
  const t = translations[language].hero;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="relative overflow-hidden bg-[#F7F5EF] dark:bg-[#0e1c15]" dir={dir}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-24 select-none font-nastaliq text-[26rem] leading-none text-[#B8935A]/[0.06]">
        ق
      </div>

      <div className="relative site-container pt-14 pb-16 md:pt-20 md:pb-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <div className={`text-center ${dir === "rtl" ? "md:text-right" : "md:text-left"}`}>
            <div className={`inline-flex items-center gap-2 rounded-full border border-[#B8935A]/40 bg-[#B8935A]/10 dark:bg-[#B8935A]/15 px-4 py-1.5 text-xs font-medium tracking-wide text-[#9A6A30] dark:text-[#C9A46B] mb-4 ${naskh}`}>
              {t.eyebrow}
            </div>

            <h1 className={`text-4xl md:text-[3.4rem] font-bold leading-[1.25] text-[#1A3A2A] dark:text-[#e8ede9] mb-5 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
              {t.headline}
            </h1>

            <p className={`text-[#4A4840] dark:text-[#a8b9ac] text-base md:text-lg leading-relaxed max-w-lg mx-auto md:mx-0 mb-3 ${naskh}`}>
              {t.subheadline}
            </p>
            <p className={`text-[#5B5748] dark:text-[#a8b9ac] text-sm md:text-[15px] leading-relaxed max-w-lg mx-auto md:mx-0 mb-6 ${naskh}`}>
              {t.multilingualLine}
            </p>

            <div className={`flex flex-col sm:flex-row justify-center gap-3 mb-4 ${dir === "rtl" ? "md:justify-end" : "md:justify-start"}`}>
              <Link href="/tools/document-studio" className={`bg-[#B8935A] hover:bg-[#C9A46B] text-white font-semibold px-7 py-3.5 rounded-lg shadow-lg shadow-[#B8935A]/20 transition-all text-[15px] text-center ${naskh}`}>
                {t.ctaPrimary}
              </Link>
              <Link href="#before-after" className={`border border-[#1A3A2A]/25 dark:border-white/20 hover:border-[#1A3A2A]/50 dark:hover:border-white/40 hover:bg-[#1A3A2A]/5 dark:hover:bg-white/5 text-[#1A3A2A] dark:text-[#e8ede9] font-semibold px-7 py-3.5 rounded-lg transition-all text-[15px] text-center ${naskh}`}>
                {t.ctaSecondary}
              </Link>
            </div>

            <p className={`text-[14px] text-[#5B5748] dark:text-[#a8b9ac] mb-5 text-center ${dir === "rtl" ? "md:text-right" : "md:text-left"} ${naskh}`}>
              {t.quickCleanupPrompt}{" "}
              <Link
                href="/tools/document-cleaner"
                className="font-semibold text-[#1A3A2A] dark:text-[#e8ede9] underline decoration-[#B8935A]/60 underline-offset-2 hover:text-[#B8935A] dark:hover:text-[#C9A46B]"
              >
                {t.quickCleanupLink}
              </Link>
            </p>

            <p className={`text-[16px] font-medium text-[#7A7268] dark:text-[#a8b9ac] tracking-wide text-center mt-4 ${language === "ur" ? "font-naskh leading-loose" : ""}`}>{t.trustLine}</p>
          </div>

          <div dir="ltr">
            <div className="rounded-xl border border-white/10 bg-[#1A2036] shadow-2xl shadow-black/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-[11px] text-[#7C8299] tracking-wide">{t.mockupLabel}</span>
              </div>

              <div className="p-6" dir="rtl">
                <p className="font-nastaliq text-base md:text-lg leading-loose text-[#EDEAE1]">
                  اردو{"   "}متن{"   "}کو{"   "}مختلف{"   "}ویب{"   "}سائٹس{"   "}اور
                  {" "}فائلوں{"   "}سے{"   "}نقل{"   "}کرتے{"   "}وقت{"   "}اکثر{"   "}اضافی
                  {" "}خالی{"   "}جگہیں{"   "}اور{"   "}غیرضروری{"   "}رموز{"   "}شامل
                  {" "}ہو{"   "}جاتے{"   "}ہیں
                  <span className="relative">
                    !!
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-red-400/70 rounded-full" />
                  </span>
                </p>
              </div>

            <div className="border-t border-white/10 bg-[#0e1520] px-5 py-4 space-y-2">
                <div className="flex items-center gap-2.5 text-xs" dir="ltr">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-[#C7C2B4]">{t.mockupFixed1}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs" dir="ltr">
                  <span className="text-amber-400">●</span>
                  <span className="text-[#C7C2B4]">{t.mockupFixed2}</span>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-white/5" dir="ltr">
                  <span className="text-[11px] text-[#7C8299]">{t.mockupCount}</span>
                  <span className="text-[11px] font-semibold tracking-wide bg-[#B8935A]/20 text-[#C9A46B] px-2 py-0.5 rounded-full">{t.mockupReady}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
