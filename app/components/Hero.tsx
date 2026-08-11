"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function Hero() {
  const { language, dir } = useLanguage();
  const t = translations[language].hero;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="relative overflow-hidden bg-[#12172A] text-[#F5F2EA]" dir={dir}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-24 select-none font-nastaliq text-[26rem] leading-none text-[#B8935A]/[0.05]">
        ق
      </div>

      <div className="relative max-w-[1240px] mx-auto px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className={`text-center ${dir === "rtl" ? "md:text-right" : "md:text-left"}`}>
            <div className={`inline-flex items-center gap-2 rounded-full border border-[#B8935A]/30 bg-[#B8935A]/10 px-4 py-1.5 text-xs font-medium tracking-wide text-[#E8C989] mb-7 ${naskh}`}>
              {t.eyebrow}
            </div>

            <h1 className={`text-4xl md:text-[3.4rem] font-bold leading-[1.25] text-white mb-5 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
              {t.headline}
            </h1>

            <p className={`text-[#B9B4A8] text-base md:text-lg leading-relaxed max-w-lg mx-auto md:mx-0 mb-10 ${naskh}`}>
              {t.subheadline}
            </p>

            <div className={`flex flex-col sm:flex-row justify-center gap-3 mb-8 ${dir === "rtl" ? "md:justify-end" : "md:justify-start"}`}>
              <Link href="/tools/document-studio" className={`bg-[#B8935A] hover:bg-[#C9A46B] text-[#12172A] font-semibold px-7 py-3.5 rounded-lg shadow-lg shadow-[#B8935A]/20 transition-all text-sm text-center ${naskh}`}>
                {t.ctaPrimary}
              </Link>
              <Link href="#before-after" className={`border border-white/15 hover:border-white/35 hover:bg-white/5 text-white font-semibold px-7 py-3.5 rounded-lg transition-all text-sm text-center ${naskh}`}>
                {t.ctaSecondary}
              </Link>
            </div>

            <p className={`text-xs text-[#7C8299] tracking-wide ${naskh}`}>{t.trustLine}</p>
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
                <p className="font-nastaliq text-2xl leading-loose text-[#EDEAE1]">
                  <span className="relative">
                    علي
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-red-400/70 rounded-full" />
                  </span>{" "}
                  نے کتاب پڑھی
                  <span className="relative">
                    ،
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-red-400/70 rounded-full" />
                  </span>{" "}
                  اور یہ Document بھی۔
                </p>
              </div>

              <div className="border-t border-white/10 bg-[#151A2C] px-5 py-4 space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs" dir="ltr">
                  <span className="mt-0.5 text-amber-400">●</span>
                  <span className="text-[#C7C2B4]">
                    {t.mockupIssue1} — <span className="font-nastaliq">"علي"</span> {t.mockupIssue1Detail}{" "}
                    <span className="font-nastaliq">"علی"</span>
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs" dir="ltr">
                  <span className="mt-0.5 text-amber-400">●</span>
                  <span className="text-[#C7C2B4]">{t.mockupIssue2}</span>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-white/5" dir="ltr">
                  <span className="text-[11px] text-[#7C8299]">{t.mockupCount}</span>
                  <span className="text-[11px] font-semibold text-emerald-400">{t.mockupStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
