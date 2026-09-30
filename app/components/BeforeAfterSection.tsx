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
      className="bg-[#F3F7F2] py-16 dark:bg-[#0E1524] md:py-20"
      dir={dir}
    >
      <div className="mx-auto max-w-[1100px] px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#1F6C54] dark:text-[#2FA37D]">
            Deterministic First. AI Later.
          </p>
          <h2
            className={`mt-3 text-2xl font-bold text-[#11182A] dark:text-[#F7F5EF] md:text-3xl ${
              language === "ur" ? "font-nastaliq font-normal leading-[1.7]" : ""
            }`}
          >
            {t.headline}
          </h2>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-0">
          <div dir="rtl" className="rounded-2xl bg-[#1A2036] p-6 text-right shadow-xl shadow-[#0E1524]/20 md:rounded-r-none">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E7C7C0]" dir="ltr">
              {t.before}
            </p>
            <p className="whitespace-pre-line break-words font-nastaliq text-[22px] leading-[2.15] text-[#f3e4df] md:text-[24px]">
              {BEFORE_TEXT}
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-center md:-mx-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2FA37D] text-white shadow-[0_0_0_8px_rgba(47,163,125,0.18),0_12px_30px_rgba(47,163,125,0.35)]">
              <PenNibIcon />
            </div>
          </div>

          <div dir="rtl" className="rounded-2xl bg-[#11182A] p-6 text-right shadow-xl shadow-[#0E1524]/25 ring-1 ring-[#2FA37D]/25 md:rounded-l-none">
            <div className="mb-4 flex items-center justify-between gap-3" dir="ltr">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2FA37D]">{t.after}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9BE0C8]">
                <CheckIcon />
                {t.afterStatus}
              </span>
            </div>
            <p className="whitespace-pre-line break-words font-nastaliq text-[22px] leading-[2.15] text-[#F7F5EF] md:text-[24px]">
              {AFTER_TEXT}
            </p>
          </div>
        </div>

        <p className={`mx-auto mt-8 max-w-2xl text-center text-[14px] leading-relaxed text-[#3d5648] dark:text-[#b7c4bb] ${naskh}`}>
          {t.note}
        </p>
      </div>
    </section>
  );
}
