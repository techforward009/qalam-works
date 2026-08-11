"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

const BEFORE_TEXT = "علي نے كتاب پڑھی  ، اور یہ Document بھی۔۔";
const AFTER_TEXT = "علی نے کتاب پڑھی، اور یہ دستاویز بھی۔";

export default function BeforeAfterSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].beforeAfter;

  return (
    <section id="before-after" className="bg-[#F1ECE0] py-28 md:py-36" dir={dir}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-16">{t.headline}</h2>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-wide text-red-600 mb-3" dir="ltr">
              {t.before}
            </div>
            <div className="bg-white rounded-2xl border-2 border-red-200 p-8 min-h-[160px] flex items-center shadow-sm">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#151B2E] w-full">
                <span className="bg-red-100 rounded px-0.5">{BEFORE_TEXT}</span>
              </p>
            </div>
          </div>

          <div className="text-right" dir="rtl">
            <div className="text-xs font-semibold tracking-wide text-emerald-600 mb-3" dir="ltr">
              {t.after}
            </div>
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-8 min-h-[160px] flex items-center shadow-sm">
              <p className="font-nastaliq text-2xl md:text-3xl leading-loose text-[#151B2E] w-full">
                {AFTER_TEXT}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-[#5B5748] mt-8">{t.note}</p>
      </div>
    </section>
  );
}
