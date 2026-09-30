"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { standardizeUrduText } from "../utils/unicode/standardizeUrduText";

// The marketing example is generated from the real production standardizer.
// Keep the example here in sync with actual tool behavior rather than
// hard-coding a fictional AFTER result.
const BEFORE_TEXT =
  "تحقیق :  یہ  ایک  علمی  مضمون  ہے ,جس ميں\nاردو اور English متن  ايك  ساتھ موجود  ہے۔\nمصنف  نے  کہا  : \"یہ مواد اشاعت کے لئے تیار ہے\" !!";

const AFTER_TEXT = standardizeUrduText(BEFORE_TEXT).output;

function PenNibIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4 4L19 7.5" />
    </svg>
  );
}

/**
 * Homepage proof section.
 *
 * Design direction is taken from the approved Qwen concept:
 * BEFORE → QALAM → AFTER, with a restrained editorial treatment.
 * The actual AFTER text is produced by the real production standardizer.
 */
export default function BeforeAfterSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].beforeAfter;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section
      id="before-after"
      className="bg-[#EAF0E7] dark:bg-[#102018] py-14 md:py-20"
      dir={dir}
    >
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-9 md:mb-12">
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-[#B8935A]/35 bg-[#B8935A]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase text-[#8D642F] dark:text-[#C9A46B] mb-4 ${naskh}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#B8935A]" />
            {language === "ur" ? "حقیقی مثال" : "Live example"}
          </span>

          <h2
            className={`text-2xl md:text-3xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${
              language === "ur" ? "font-nastaliq font-normal leading-[1.7]" : ""
            }`}
          >
            {t.headline}
          </h2>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-[1fr_auto_1fr] items-stretch">
            {/* BEFORE */}
            <div className="text-right" dir="rtl">
              <div className="flex items-center gap-2 mb-3 px-1" dir="ltr">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-red-500/80 dark:text-red-400/80">
                  {t.before}
                </span>
              </div>

              <div className="h-full rounded-2xl bg-white/90 dark:bg-[#1b2920] border border-red-300/45 dark:border-red-900/40 p-6 md:p-7 shadow-sm">
                <p className="font-nastaliq text-[22px] md:text-[25px] leading-[2.15] text-[#3a2525] dark:text-[#cfabab] whitespace-pre-line break-words">
                  {BEFORE_TEXT}
                </p>

                <div
                  className="mt-6 flex flex-wrap gap-2"
                  dir="ltr"
                  aria-label="Detected text issues"
                >
                  <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/25 px-2.5 py-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
                    Arabic Yeh
                  </span>
                  <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/25 px-2.5 py-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
                    Wrong punctuation
                  </span>
                  <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/25 px-2.5 py-1 text-[10px] font-semibold text-red-700 dark:text-red-300">
                    Spacing
                  </span>
                </div>
              </div>
            </div>

            {/* CONNECTOR */}
            <div className="flex md:flex-col items-center justify-center px-4 py-5 md:py-0">
              <div className="relative flex items-center md:flex-col">
                <div className="hidden md:block h-12 w-px bg-[#B8935A]/25" />
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#B8935A] text-white shadow-lg shadow-[#B8935A]/25 ring-4 ring-[#EAF0E7] dark:ring-[#102018]">
                  <PenNibIcon />
                </div>
                <div className="hidden md:block h-12 w-px bg-[#B8935A]/25" />
              </div>
            </div>

            {/* AFTER */}
            <div className="text-right" dir="rtl">
              <div className="flex items-center justify-between gap-3 mb-3 px-1" dir="ltr">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-emerald-600 dark:text-emerald-400">
                    {t.after}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/35 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckIcon />
                  {t.afterStatus}
                </span>
              </div>

              <div className="h-full rounded-2xl bg-white dark:bg-[#162a1e] border border-emerald-300/45 dark:border-emerald-900/40 p-6 md:p-7 shadow-lg shadow-[#1A3A2A]/5">
                <p className="font-nastaliq text-[22px] md:text-[25px] leading-[2.15] text-[#1A2A1A] dark:text-[#e8ede9] whitespace-pre-line break-words">
                  {AFTER_TEXT}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#EAF4EC] dark:bg-emerald-900/20 px-3 py-2 text-[11px] font-semibold text-[#28603B] dark:text-emerald-300" dir="ltr">
                  <CheckIcon />
                  <span>Deterministic result · same input, same rules</span>
                </div>
              </div>
            </div>
          </div>

          <p
            className={`max-w-3xl mx-auto text-center text-[14px] md:text-[15px] text-[#4A6A4A] dark:text-[#a8b9ac] leading-relaxed mt-8 ${naskh}`}
          >
            {t.note}
          </p>
        </div>
      </div>
    </section>
  );
}
