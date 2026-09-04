"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";

const COPY = {
  en: { title: "Related Calendars", gregorianMonth: "Gregorian month", gregorianYear: "Gregorian year", hijriMonth: "Hijri month", hijriYear: "Hijri year" },
  ur: { title: "متعلقہ تقاویم", gregorianMonth: "عیسوی مہینہ", gregorianYear: "عیسوی سال", hijriMonth: "ہجری مہینہ", hijriYear: "ہجری سال" },
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
    <section className="rounded-xl border p-5" dir={dir}>
      <h2 className={`font-semibold ${naskh}`}>{t.title}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={`rounded-lg border px-3 py-2 text-sm font-semibold hover:border-[#B8935A]/60 transition-colors ${naskh}`}>
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
