"use client";

import Link from "next/link";
import { useLanguage } from "@/app/lib/language-context";

const LABELS = {
  ur: {
    eyebrow: "قلم ورکس · ڈیٹ اسٹوڈیو",
    description: "یہ منتخب تاریخ کی تفصیل ہے۔ دوسری تاریخ تلاش کریں، تاریخیں تبدیل کریں یا نتیجہ شیئر کریں۔",
    action: "ڈیٹ اسٹوڈیو پر جائیں",
  },
  en: {
    eyebrow: "Qalam Works · Date Studio",
    description: "You're viewing details for a selected date. Look up another date, convert calendars, or share the result.",
    action: "Open Date Studio",
  },
};

export function DateStudioNav() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const copy = LABELS[isUr ? "ur" : "en"];

  return (
    <nav aria-label={isUr ? "ڈیٹ اسٹوڈیو تک رسائی" : "Date Studio navigation"} dir={isUr ? "rtl" : "ltr"}
      className="mb-4 rounded-xl border border-[#b58e4d]/20 bg-[#fbfaf6] px-4 py-3 dark:border-[#536446]/50 dark:bg-[#1b2c20] sm:px-5">
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5 ${isUr ? "text-right" : "text-left"}`}>
        <div className="min-w-0">
          <p className={`text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{copy.eyebrow}</p>
          <p className={`mt-0.5 text-sm text-[#526954] dark:text-[#bfd1c1] ${isUr ? "font-naskh leading-[1.9]" : "leading-relaxed"}`}>
            {copy.description}
          </p>
        </div>
        <Link href="/tools/date-converter"
          className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#1A3A2A]/25 px-4 py-2 text-sm font-semibold text-[#1A3A2A] hover:bg-[#edf1e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b58e4d] dark:border-[#78917a] dark:text-[#e8ede9] dark:hover:bg-[#294332] sm:self-auto ${isUr ? "font-naskh" : ""}`}>
          {copy.action}
          <span aria-hidden="true">{isUr ? "←" : "→"}</span>
        </Link>
      </div>
    </nav>
  );
}
