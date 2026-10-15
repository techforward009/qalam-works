"use client";

import { useState } from "react";
import { CalendarDays, Check, Copy, ExternalLink, Link2, MessageCircle, Moon } from "lucide-react";
import { formatDate, type DateParts } from "../utils/dateEngine";
import type { ResolvedHijriDate } from "../utils/hijri-authority/types";
import {
  buildPakistanDateShareText, dateDigits, pakistanDatePermalink, pakistanDateStatus, reviewedMonthStart,
  type ShareLanguage,
} from "../utils/pakistanDateShare";

export function PakistanDateResult({
  gregorian, hijri, reviewed, weekday, lang,
}: {
  gregorian: DateParts;
  hijri: DateParts;
  reviewed: ResolvedHijriDate | null;
  weekday: string;
  lang: ShareLanguage;
}) {
  const [copied, setCopied] = useState<"message" | "link" | null>(null);
  const [copyError, setCopyError] = useState(false);
  const isUr = lang === "ur";
  const naskh = isUr ? "font-naskh" : "";
  const detailDate = dateDigits(formatDate(gregorian, "gregorian", lang), lang);
  const hijriDate = dateDigits(formatDate(hijri, "hijri", lang), lang);
  const status = pakistanDateStatus(reviewed, lang);
  const firstDay = reviewedMonthStart(gregorian, hijri, reviewed);
  const url = pakistanDatePermalink(gregorian);
  const text = buildPakistanDateShareText({ gregorian, hijri, reviewed, weekday, lang });

  async function copy(content: string, kind: "message" | "link") {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(kind);
      setCopyError(false);
    } catch {
      setCopied(null);
      setCopyError(true);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-[#B8935A]/30 bg-white shadow-sm dark:border-[#35513d] dark:bg-[#162a1e]" dir={isUr ? "rtl" : "ltr"} data-testid="pakistan-primary-result">
      <div className="border-b border-[#1A3A2A]/10 bg-[#F7F5EF] px-5 py-5 sm:px-8 sm:py-7 dark:border-[#35513d] dark:bg-[#1b2c20]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`inline-flex items-center gap-2 text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
            <Moon className="h-5 w-5 text-[#99773f]" aria-hidden="true" />
            {isUr ? "پاکستانی ہجری تاریخ" : "Pakistan Hijri Date"}
          </p>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${reviewed ? "border-emerald-600/20 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-amber-600/20 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"} ${naskh}`}>
            {reviewed?.authority === "official"
              ? (isUr ? "پاکستان کی سرکاری ہجری تاریخ" : "Pakistan official Hijri date")
              : reviewed ? (isUr ? "تاریخی پاکستانی ریکارڈ" : "Pakistan historical record")
                : (isUr ? "حسابی تاریخ" : "Calculated date")}
          </span>
        </div>
        <h3 className={`mt-4 text-center text-2xl font-bold leading-[2] text-[#1A3A2A] sm:text-3xl dark:text-[#e8ede9] ${naskh}`} data-testid="pakistan-hijri-date">
          {hijriDate}
        </h3>
        <p className={`mt-1 flex items-center justify-center gap-2 text-center text-sm font-semibold text-[#4a6a4a] sm:text-base dark:text-[#b8d4bc] ${naskh}`}>
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          {weekday}{isUr ? "، " : ", "}{detailDate}
        </p>
        <p className={`mt-3 text-center text-xs leading-relaxed text-[#4a6a4a] dark:text-[#b8d4bc] ${naskh}`} data-testid="pakistan-hijri-status">
          {status}
        </p>
        {reviewed?.sourceUrl && (
          <p className="mt-2 text-center">
            <a href={reviewed.sourceUrl} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#31533d] underline underline-offset-2 dark:text-[#b8d4bc] ${naskh}`}>
              {isUr ? "اصل پاکستانی اعلان یا تاریخی حوالہ" : "View Pakistan source"} <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        )}
      </div>

      <div className="space-y-3 px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void copy(text, "message")}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1A3A2A] px-4 py-2 text-sm font-bold text-white hover:bg-[#28513a] sm:flex-none dark:bg-[#326044] ${naskh}`}
            data-testid="copy-pakistan-date">
            {copied === "message" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "message" ? (isUr ? "مکمل نتیجہ کاپی ہوگیا" : "Copied full result") : (isUr ? "حوالے سمیت کاپی کریں" : "Copy full result")}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1A3A2A]/20 px-3 text-sm font-semibold text-[#1A3A2A] hover:bg-[#F7F5EF] dark:border-[#35513d] dark:text-[#e8ede9] dark:hover:bg-[#263d2c] ${naskh}`}>
            <MessageCircle className="h-4 w-4" />
            {isUr ? "واٹس ایپ پر بھیجیں" : "Share on WhatsApp"}
          </a>
          <button type="button" onClick={() => void copy(url, "link")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#1A3A2A]/20 px-3 text-sm font-semibold text-[#1A3A2A] hover:bg-[#F7F5EF] dark:border-[#35513d] dark:text-[#e8ede9] ${naskh}`}>
            {copied === "link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied === "link" ? (isUr ? "لنک کاپی ہوگیا" : "Link copied") : (isUr ? "صرف لنک" : "Copy link")}
          </button>
        </div>
        {copyError && <p role="alert" className={`text-xs text-red-700 dark:text-red-300 ${naskh}`}>
          {isUr ? "کاپی نہیں ہوسکا۔ نیچے سے اصل تاریخ یا لنک منتخب کرکے کاپی کریں۔" : "Copy failed. Please select and copy the date or link manually."}
        </p>}
        <details className="rounded-xl border border-[#1A3A2A]/10 px-4 py-3 text-sm dark:border-[#35513d]">
          <summary className={`cursor-pointer font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
            {isUr ? "تاریخ کا اصل ماخذ اور مزید تفصیل" : "Source and date details"}
          </summary>
          <div className={`mt-3 space-y-2 break-words text-xs leading-relaxed text-[#4a6a4a] dark:text-[#b8d4bc] ${naskh}`}>
            <p>{status}</p>
            {firstDay && <p>{isUr ? "اس قمری مہینے کی پہلی تاریخ:" : "Start of this lunar month:"} {dateDigits(formatDate(firstDay, "gregorian", lang), lang)}</p>}
            {reviewed?.sourceUrl ? (
              <a href={reviewed.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="pakistan-source-link"
                className="inline-flex items-center gap-1 font-semibold text-[#1A3A2A] underline underline-offset-2 dark:text-[#c8e1cf]">
                {isUr ? "اصل اعلان یا تاریخی ماخذ دیکھیں" : "View original announcement or historical source"} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p>{isUr ? "اس مہینے کا تصدیق شدہ پاکستانی ماخذ فی الحال موجود نہیں۔" : "No reviewed Pakistan month source is available yet."}</p>
            )}
            <p className="break-all" dir="ltr">{url}</p>
          </div>
        </details>
      </div>
    </article>
  );
}
