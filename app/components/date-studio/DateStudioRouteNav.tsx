"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";

const COPY = {
  en: { previous: "Previous", next: "Next", counterpart: "Switch calendar" },
  ur: { previous: "پچھلا", next: "اگلا", counterpart: "دوسری تقویم دیکھیں" },
};

export function DateStudioRouteNav({ previousHref, nextHref, counterpartHref, counterpartLabel }: { previousHref: string; nextHref: string; counterpartHref?: string; counterpartLabel?: { en: string; ur: string } }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";
  return (
    <nav aria-label="Date Studio" dir={dir} className="mb-5 flex flex-wrap gap-2">
      <Link href={previousHref} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${naskh}`}>{t.previous}</Link>
      <Link href={nextHref} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${naskh}`}>{t.next}</Link>
      {counterpartHref && <Link href={counterpartHref} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${naskh}`}>{counterpartLabel ? counterpartLabel[lang] : t.counterpart}</Link>}
    </nav>
  );
}
