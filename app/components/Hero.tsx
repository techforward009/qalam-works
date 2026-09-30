"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function Hero() {
  const { language, dir } = useLanguage();
  const t = translations[language].hero;
  const naskh = language === "ur" ? "font-naskh" : "";
  const headlineClass =
    language === "ur" ? "font-nastaliq font-normal leading-[1.75]" : "leading-[1.08] tracking-tight";

  return (
    <section className="relative overflow-hidden bg-[#F7F5EF] dark:bg-[#0E1524]" dir={dir}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#2FA37D]/15 blur-3xl dark:bg-[#2FA37D]/10"
      />
      <div className="relative site-container px-6 pb-20 pt-16 text-center md:pb-28 md:pt-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#2FA37D]/25 bg-white/80 px-4 py-2 shadow-sm dark:border-[#2FA37D]/30 dark:bg-[#1A2036]/80">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2FA37D] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#248565]" />
          </span>
          <span className={`text-[11px] font-bold uppercase tracking-[0.16em] text-[#1F6C54] dark:text-[#7DDCB8] ${naskh}`}>
            {language === "ur" ? "اردو اشاعتی اوزار" : "Urdu publishing tools"}
          </span>
        </div>

        <h1 className={`mx-auto mt-8 max-w-4xl text-5xl font-extrabold text-[#11182A] dark:text-white md:text-7xl ${headlineClass}`}>
          {language === "ur" ? (
            t.headline
          ) : (
            <>
              Write. Refine.{" "}
              <span className="text-[#1F6C54] dark:text-[#2FA37D]">Publish.</span>
            </>
          )}
        </h1>

        <p className={`mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-[#243028] dark:text-[#d7e3dc] md:text-2xl ${language === "ur" ? "font-nastaliq leading-[2.4]" : ""}`} dir={language === "ur" ? "rtl" : "ltr"}>
          {language === "ur"
            ? "اردو، عربی اور فارسی متن کے لیے سنجیدہ اشاعتی اوزار"
            : "Serious publishing tools for Urdu, Arabic, and Persian text."}
        </p>

        <p className={`mx-auto mt-3 max-w-2xl text-lg font-bold text-[#1F6C54] dark:text-[#2FA37D] ${language === "ur" ? "font-nastaliq font-normal leading-[2.2]" : ""}`}>
          {language === "ur" ? "پہلے قواعد۔ مصنوعی ذہانت بعد میں۔" : "Deterministic First. AI Later."}
        </p>

        <p className={`mx-auto mt-6 max-w-3xl text-[16px] leading-7 text-[#4d564f] dark:text-[#b7c4bb] ${naskh}`}>
          {language === "ur"
            ? "پہلے متن معیاری ہوتا ہے، پھر اشاعت کے قابل بنتا ہے۔ صفائی، ترجمہ اور ہجری تاریخ ایک ہی پلیٹ فارم پر۔"
            : "Text that is standardized before it is enhanced. From raw input to publication-ready output — normalization, cleanup, translation, and Hijri dates in one platform."}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/tools/document-studio"
            className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2FA37D] px-8 text-[16px] font-bold text-white shadow-lg shadow-[#2FA37D]/25 transition-colors hover:bg-[#248565] ${naskh}`}
          >
            {t.ctaPrimary}
          </Link>
          <Link
            href="#before-after"
            className={`inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#1A2036]/12 bg-white px-8 text-[16px] font-bold text-[#11182A] hover:border-[#2FA37D]/40 dark:border-white/15 dark:bg-[#1A2036] dark:text-white ${naskh}`}
          >
            {t.ctaSecondary}
            <span aria-hidden="true" className="ms-2">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
