"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

/**
 * Homepage Hero — Qwen visual direction, production-native Qalam implementation.
 *
 * Keeps the approved Qalam copy and existing local font system, while adopting
 * the Qwen revision's stronger centered hierarchy, restrained green palette,
 * subtle geometric identity, and clearer CTA flow.
 */
export default function Hero() {
  const { language, dir } = useLanguage();
  const t = translations[language].hero;

  const naskh = language === "ur" ? "font-naskh" : "";
  const headlineClass =
    language === "ur"
      ? "font-nastaliq font-normal leading-[1.7]"
      : "leading-[1.08] tracking-tight";

  return (
    <section
      className="relative overflow-hidden bg-[#F7F5EF] dark:bg-[#0e1c15] border-b border-[#1A3A2A]/[0.06] dark:border-white/[0.06]"
      dir={dir}
    >
      {/* Subtle geometric identity — intentionally decorative, never dominant. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.42] dark:opacity-[0.22]"
      >
        <svg
          className="absolute -left-24 top-8 h-[420px] w-[420px] text-[#2FA37D]/[0.10] dark:text-[#5BC2A0]/[0.08]"
          viewBox="0 0 240 240"
          fill="none"
        >
          <path
            d="M120 8 232 74v92L120 232 8 166V74L120 8Z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="m120 36 84 48v72l-84 48-84-48V84l84-48Z"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path d="m60 60 120 120M180 60 60 180" stroke="currentColor" strokeWidth="0.9" />
        </svg>

        <svg
          className="absolute -right-28 bottom-0 h-[360px] w-[360px] text-[#B8935A]/[0.10] dark:text-[#C9A46B]/[0.08]"
          viewBox="0 0 240 240"
          fill="none"
        >
          <circle cx="120" cy="120" r="92" stroke="currentColor" strokeWidth="1" />
          <path d="M28 120h184M120 28v184" stroke="currentColor" strokeWidth="0.9" />
          <path d="m55 55 130 130M185 55 55 185" stroke="currentColor" strokeWidth="0.9" />
        </svg>
      </div>

      {/* Soft depth without the heavy marketing-template glow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#C3EDE0]/40 dark:bg-[#1F6C54]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#E8DDCA]/45 dark:bg-[#25362A]/30 blur-3xl"
      />

      <div className="relative site-container px-6 pt-20 pb-16 md:pt-24 md:pb-20 lg:pt-28 lg:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border border-[#B8935A]/35 bg-white/75 dark:bg-[#162a1e]/80 px-4 py-2 shadow-sm backdrop-blur-sm ${naskh}`}
          >
            <span
              aria-hidden="true"
              className="relative flex h-2.5 w-2.5 shrink-0"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5BC2A0] opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2FA37D]" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.16em] text-[#1F6C54] dark:text-[#94DDC5] uppercase">
              Arabic · Persian · Urdu Publishing
            </span>
          </div>

          <h1
            className={`mx-auto mt-7 max-w-4xl text-[2.8rem] font-extrabold text-[#183328] dark:text-[#E8EDE9] sm:text-5xl md:text-6xl lg:text-[4.6rem] ${headlineClass}`}
          >
            <span>Write. Refine. </span>
            <span className="text-[#1F6C54] dark:text-[#5BC2A0]">Publish.</span>
          </h1>

          <p
            className={`mx-auto mt-6 max-w-2xl text-[1.3rem] text-[#4A4840] dark:text-[#C4D0C6] md:text-[1.45rem] ${naskh} ${
              language === "ur" ? "leading-[2.35]" : "leading-relaxed"
            }`}
          >
            {t.subheadline}
          </p>

          <p
            className={`mx-auto mt-3 max-w-xl text-base font-semibold tracking-wide text-[#5B5748] dark:text-[#A8B9AC] md:text-lg ${naskh}`}
          >
            Deterministic First. AI Later.
          </p>

          <p
            className={`mx-auto mt-6 max-w-3xl text-[15px] leading-7 text-[#635F57] dark:text-[#A8B9AC] md:text-base ${naskh}`}
          >
            Text that is standardized <em>before</em> it is enhanced. From raw
            input to publication-ready output — normalization, cleanup,
            translation, and Hijri dates in one platform.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/tools/document-studio"
              className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2F7E62] px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#2F7E62]/20 transition-all hover:-translate-y-0.5 hover:bg-[#24674F] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0e1c15] ${naskh}`}
            >
              {t.ctaPrimary}
            </Link>

            <Link
              href="#before-after"
              className={`inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#1A3A2A]/15 bg-white/70 px-7 py-3.5 text-[15px] font-semibold text-[#1A3A2A] transition-all hover:border-[#1A3A2A]/30 hover:bg-white dark:border-white/15 dark:bg-[#162a1e]/75 dark:text-[#E8EDE9] dark:hover:border-white/25 dark:hover:bg-[#1E3527] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0e1c15] ${naskh}`}
            >
              {t.ctaSecondary}
              <span aria-hidden="true" className="ml-2 text-lg leading-none">
                →
              </span>
            </Link>
          </div>

          <p
            className={`mx-auto mt-5 max-w-xl text-[14px] text-[#6B675E] dark:text-[#98A99C] ${naskh}`}
          >
            {t.quickCleanupPrompt}{" "}
            <Link
              href="/tools/document-cleaner"
              className="font-semibold text-[#1F6C54] underline decoration-[#B8935A]/60 underline-offset-2 hover:text-[#B8935A] dark:text-[#94DDC5] dark:hover:text-[#C9A46B]"
            >
              {t.quickCleanupLink}
            </Link>
          </p>

          <p
            className={`mt-6 text-[14px] font-medium tracking-wide text-[#80786C] dark:text-[#91A496] ${
              language === "ur" ? "font-naskh leading-loose" : ""
            }`}
          >
            {t.trustLine}
          </p>
        </div>
      </div>
    </section>
  );
}
