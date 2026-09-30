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
    <section className="bg-[#F7F5EF] py-10 dark:bg-[#0E1524] md:py-12" dir={dir}>
      <div className="site-container mx-auto max-w-3xl">
        <div className="rounded-2xl border border-[#1A2036]/10 bg-white p-5 dark:border-white/10 dark:bg-[#1A2036] sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2FA37D]/10 text-[#1F6C54] dark:bg-[#2FA37D]/15 dark:text-[#7DDCB8]" aria-hidden="true">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div className="text-start">
              <h2 className={`text-xl font-bold text-[#11182A] dark:text-[#F7F5EF] sm:text-2xl ${lang === "ur" ? "font-nastaliq font-normal" : ""}`}>{t.title}</h2>
              <p className={`mt-1 text-[15px] leading-relaxed text-[#4d564f] dark:text-[#b7c4bb] ${naskh}`}>{t.desc}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/tools/date-converter" className={`inline-flex min-h-11 items-center rounded-lg bg-[#2FA37D] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#248565] ${naskh}`}>{t.convert}</Link>
            <Link href="/tools/date-converter#date-studio" className={`text-sm font-semibold text-[#1F6C54] underline decoration-[#2FA37D]/40 underline-offset-4 hover:text-[#248565] dark:text-[#7DDCB8] ${naskh}`}>{t.explore}</Link>
            <Link href="/tools/calendar-maker" className={`text-sm font-semibold text-[#1F6C54] underline decoration-[#2FA37D]/40 underline-offset-4 hover:text-[#248565] dark:text-[#7DDCB8] ${naskh}`}>{t.make}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
