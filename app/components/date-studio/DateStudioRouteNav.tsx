"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";

const COPY = {
  en: {
    back: "Back to Date Studio",
    previous: "Previous",
    next: "Next",
    explore: "Explore:",
    gregorian: "Gregorian Calendar",
    hijri: "Hijri Calendar",
  },
  ur: {
    back: "ڈیٹ اسٹوڈیو پر واپس",
    previous: "پچھلا",
    next: "اگلا",
    explore: "دیکھیں:",
    gregorian: "عیسوی کیلنڈر",
    hijri: "ہجری کیلنڈر",
  },
};

export type ExplorerPeriodLabel = string | { en: string; ur: string };
export type ExplorerCalendarKind = "gregorian" | "hijri";

export interface DateStudioRouteNavProps {
  previousHref: string;
  nextHref: string;
  periodLabel: ExplorerPeriodLabel;
  currentCalendar: ExplorerCalendarKind;
  counterpartHref: string;
  counterpartLabel?: { en: string; ur: string };
  children?: ReactNode;
}

function periodText(label: ExplorerPeriodLabel, lang: "en" | "ur") {
  return typeof label === "string" ? label : label[lang];
}

export function BackToDateStudioLink({ className = "" }: { className?: string }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];

  return (
    <Link
      href="/tools/date-converter#date-studio"
      dir={dir}
      className={`inline-flex items-center gap-2 rounded-lg border border-[#1A3A2A]/15 bg-white/80 px-3 py-2 text-sm font-semibold text-[#1A3A2A] shadow-sm transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#162a1e] dark:text-[#e8ede9] ${lang === "ur" ? "font-naskh" : ""} ${className}`}
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
  currentCalendar,
  counterpartHref,
  children,
}: DateStudioRouteNavProps) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";
  const title = periodText(periodLabel, lang);

  const activeClass = `inline-flex items-center justify-center rounded-lg border border-[#1A3A2A] bg-[#1A3A2A] px-3 py-2 text-sm font-bold text-white dark:border-[#2a5a3a] dark:bg-[#2a5a3a] ${naskh}`;
  const linkClass = `inline-flex items-center justify-center rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2 text-sm font-semibold text-[#1A3A2A] transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${naskh}`;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-[#1A3A2A]/10 bg-[#F7F5EF] shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]" dir={dir}>
      <nav
        aria-label="Date Studio period navigation"
        className="grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)_minmax(5.5rem,auto)] items-center gap-2 px-3 py-3 sm:px-4"
      >
        <Link href={previousHref} className={`rounded-xl border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#1A3A2A] transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${naskh}`}>
          {t.previous}
        </Link>
        <h1 className={`truncate text-center text-lg font-bold text-[#1A3A2A] sm:text-2xl dark:text-[#e8ede9] ${naskh}`}>
          {title}
        </h1>
        <Link href={nextHref} className={`rounded-xl border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-center text-sm font-semibold text-[#1A3A2A] transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${naskh}`}>
          {t.next}
        </Link>
      </nav>

      <div className="border-t border-[#1A3A2A]/8 px-3 py-3 sm:px-4 dark:border-[#2a3d30]">
        <div className="flex flex-wrap items-center gap-2">
          <BackToDateStudioLink />
          {children}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`text-xs font-bold text-[#68806f] dark:text-[#a8c8b0] ${naskh}`}>{t.explore}</span>

          {currentCalendar === "gregorian" ? (
            <span aria-current="page" data-calendar="gregorian" className={activeClass}>{t.gregorian}</span>
          ) : (
            <Link data-calendar="gregorian" href={counterpartHref} className={linkClass}>{t.gregorian}</Link>
          )}

          {currentCalendar === "hijri" ? (
            <span aria-current="page" data-calendar="hijri" className={activeClass}>{t.hijri}</span>
          ) : (
            <Link data-calendar="hijri" href={counterpartHref} className={linkClass}>{t.hijri}</Link>
          )}
        </div>
      </div>
    </section>
  );
}
