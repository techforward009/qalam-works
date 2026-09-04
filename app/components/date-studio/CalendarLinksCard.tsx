"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";

const COPY = {
  en: {
    title: "Related calendars",
    gregorianMonth: "View Gregorian month",
    gregorianYear: "View Gregorian year",
    hijriMonth: "View Hijri month",
    hijriYear: "View Hijri year",
  },
  ur: {
    title: "متعلقہ تقاویم",
    gregorianMonth: "عیسوی مہینہ دیکھیں",
    gregorianYear: "عیسوی سال دیکھیں",
    hijriMonth: "ہجری مہینہ دیکھیں",
    hijriYear: "ہجری سال دیکھیں",
  },
};

export function CalendarLinksCard({ profile }: { profile: DateProfile }) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";

  const links = [
    { label: t.gregorianMonth, href: `/calendar/${profile.gregorian.year}/${profile.gregorian.month}` },
    { label: t.gregorianYear, href: `/calendar/${profile.gregorian.year}` },
    { label: t.hijriMonth, href: `/hijri/${profile.hijri.year}/${profile.hijri.month}` },
    { label: t.hijriYear, href: `/hijri/${profile.hijri.year}` },
  ];

  return (
    <section className="rounded-2xl border border-[#1A3A2A]/10 bg-white p-5 shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]" dir={dir}>
      <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{t.title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-between rounded-xl border border-[#1A3A2A]/12 bg-[#F7F5EF] px-4 py-3.5 text-sm font-bold text-[#1A3A2A] transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${naskh}`}
          >
            <span>{link.label}</span>
            <span aria-hidden="true">{lang === "ur" ? "←" : "→"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
