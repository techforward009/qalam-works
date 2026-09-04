"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useLanguage } from "../lib/language-context";

const COPY = {
  en: {
    title: "Date Studio",
    desc: "Convert, find, explore and print Gregorian, Hijri and Solar Hijri dates.",
    convert: "Convert a Date",
    explore: "Explore Calendars",
    make: "Make a Calendar",
  },
  ur: {
    title: "ڈیٹ اسٹوڈیو",
    desc: "عیسوی، ہجری قمری اور ہجری شمسی تاریخیں تبدیل کریں، تلاش کریں، دیکھیں اور قابلِ طباعت تقویم بنائیں۔",
    convert: "تاریخ تبدیل کریں",
    explore: "تقویم دیکھیں",
    make: "تقویم بنائیں",
  },
};

export default function DateStudioDiscoverySection() {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const naskh = lang === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#F7F5EF] dark:bg-[#162a1e] py-10 md:py-12" dir={dir}>
      <div className="site-container max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#0e1c15] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" aria-hidden="true">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div className="text-start">
              <h2 className={`text-xl sm:text-2xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${lang === "ur" ? "font-nastaliq font-normal" : ""}`}>{t.title}</h2>
              <p className={`mt-1 text-[15px] leading-relaxed text-[#4a6a4a] dark:text-[#a8c8b0] ${naskh}`}>{t.desc}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Link href="/tools/date-converter" className={`rounded-xl bg-[#1A3A2A] dark:bg-[#2a5a3a] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#244E38] dark:hover:bg-[#3a7a4a] transition-colors ${naskh}`}>{t.convert}</Link>
            <Link href="/tools/date-converter#date-studio" className={`rounded-xl border border-[#1A3A2A]/15 dark:border-[#35513d] px-4 py-3 text-center text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#B8935A]/60 transition-colors ${naskh}`}>{t.explore}</Link>
            <Link href="/tools/calendar-maker" className={`rounded-xl border border-[#1A3A2A]/15 dark:border-[#35513d] px-4 py-3 text-center text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#B8935A]/60 transition-colors ${naskh}`}>{t.make}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
