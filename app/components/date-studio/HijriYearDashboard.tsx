"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";
import {
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  type DateParts,
} from "@/app/tools/date-converter/utils/dateEngine";

export interface HijriYearMonthSummary {
  month: number;
  days: number;
  start: DateParts;
  end: DateParts;
}

const COPY = {
  en: { days: "days", explore: "Explore month", ah: "AH" },
  ur: { days: "دن", explore: "مہینہ دیکھیں", ah: "ھ" },
};

function formatGregorian(date: DateParts, lang: "en" | "ur") {
  const months = lang === "ur" ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
  return `${date.day} ${months[date.month - 1]} ${date.year}`;
}

export function HijriYearDashboard({
  year,
  months,
}: {
  year: number;
  months: HijriYearMonthSummary[];
}) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const names = lang === "ur" ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN;
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" dir={dir}>
      {months.map((month) => (
        <article key={month.month} className="overflow-hidden rounded-2xl border border-[#1A3A2A]/10 bg-white shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]">
          <div className="border-b-2 border-[#B8935A] bg-[#1A3A2A] px-5 py-4 text-white">
            <h2 className={`text-xl font-bold ${naskh}`}>{names[month.month - 1]}</h2>
            <p className={`mt-1 text-sm text-white/75 ${naskh}`}>{year} {t.ah}</p>
          </div>
          <div className={`space-y-4 p-5 ${naskh}`}>
            <div className="text-sm text-[#4a6a4a] dark:text-[#b8d4bc]">
              <p className="font-semibold text-[#1A3A2A] dark:text-[#e8ede9]">{formatGregorian(month.start, lang)}</p>
              <p className="my-1 text-[#B8935A]" aria-hidden="true">↓</p>
              <p className="font-semibold text-[#1A3A2A] dark:text-[#e8ede9]">{formatGregorian(month.end, lang)}</p>
            </div>
            <div className="inline-flex rounded-full bg-[#F1ECE0] px-3 py-1 text-xs font-bold text-[#6F4E25] dark:bg-[#2b2419] dark:text-[#D3B274]">
              {month.days} {t.days}
            </div>
            <Link
              href={`/hijri/${year}/${month.month}`}
              className="flex items-center justify-between rounded-xl border border-[#1A3A2A]/12 px-4 py-3 text-sm font-bold text-[#1A3A2A] transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:text-[#e8ede9]"
            >
              <span>{t.explore}</span>
              <span aria-hidden="true">{lang === "ur" ? "←" : "→"}</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
