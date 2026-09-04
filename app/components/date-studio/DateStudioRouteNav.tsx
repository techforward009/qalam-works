"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";

const COPY = {
  en: {
    back: "Back to Date Studio",
    previous: "Previous",
    next: "Next",
    counterpart: "Switch calendar",
  },
  ur: {
    back: "ڈیٹ اسٹوڈیو پر واپس",
    previous: "پچھلا",
    next: "اگلا",
    counterpart: "دوسری تقویم دیکھیں",
  },
};

export function BackToDateStudioLink({ className = "" }: { className?: string }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  return (
    <Link
      href="/tools/date-converter#date-studio"
      dir={dir}
      className={`inline-flex items-center gap-2 rounded-lg border border-[#1A3A2A]/15 px-3 py-2 text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#B8935A]/60 ${lang === "ur" ? "font-naskh" : ""} ${className}`}
    >
      <span aria-hidden="true">{lang === "ur" ? "→" : "←"}</span>
      <span>{t.back}</span>
    </Link>
  );
}

export function DateStudioRouteNav({
  previousHref,
  nextHref,
  periodLabel,
  counterpartHref,
  counterpartLabel,
}: {
  previousHref: string;
  nextHref: string;
  periodLabel?: string;
  counterpartHref?: string;
  counterpartLabel?: { en: string; ur: string };
}) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";

  return (
    <div className="mb-6 space-y-3" dir={dir}>
      <BackToDateStudioLink />
      <nav aria-label="Date Studio period navigation" className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Link href={previousHref} className={`rounded-lg border px-3 py-2 text-sm font-semibold text-center ${naskh}`}>{t.previous}</Link>
        <div className={`text-center text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{periodLabel}</div>
        <Link href={nextHref} className={`rounded-lg border px-3 py-2 text-sm font-semibold text-center ${naskh}`}>{t.next}</Link>
      </nav>
      {counterpartHref && (
        <Link href={counterpartHref} className={`inline-flex rounded-lg border border-[#B8935A]/45 px-3 py-2 text-sm font-semibold text-[#7A5528] dark:text-[#D3B274] ${naskh}`}>
          {counterpartLabel ? counterpartLabel[lang] : t.counterpart}
        </Link>
      )}
    </div>
  );
}
