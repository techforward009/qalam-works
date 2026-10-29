import { formatDate, gregorianToJDN, isoDate, jdnToGregorian, type DateParts } from "./dateEngine";
import type { ResolvedHijriDate } from "./hijri-authority/types";

export type ShareLanguage = "en" | "ur";

export function dateDigits(value: string, lang: ShareLanguage): string {
  return lang === "ur" ? value.replace(/[0-9]/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]) : value;
}

export function pakistanDatePermalink(gregorian: DateParts): string {
  return `https://www.qalamworks.com/date/${isoDate(gregorian)}`;
}

export function reviewedMonthStart(
  gregorian: DateParts,
  hijri: DateParts,
  reviewed: ResolvedHijriDate | null,
): DateParts | null {
  return reviewed ? jdnToGregorian(gregorianToJDN(gregorian.year, gregorian.month, gregorian.day) - hijri.day + 1) : null;
}

export function pakistanDateStatus(reviewed: ResolvedHijriDate | null, lang: ShareLanguage, source: "tabular" | "scientific" = "tabular"): string {
  if (!reviewed && source === "scientific") return lang === "ur"
    ? "پاکستانی رؤیتِ ہلال کے سائنسی معیار کے مطابق پیش گوئی؛ سرکاری اعلان نہیں"
    : "Prediction using Pakistan crescent-visibility criteria; not an official declaration";
  if (!reviewed) return lang === "ur"
    ? "پاکستان میں اس ماہ کا مصدقہ اعلان دستیاب نہیں؛ حسابی ہجری تاریخ"
    : "Calculated Hijri date — no reviewed Pakistan declaration for this month";
  if (reviewed.authority === "reported-official") return lang === "ur"
    ? "پاکستان کے شائع شدہ تاریخی قمری ریکارڈ کی بنیاد پر"
    : "Based on a published Pakistan historical lunar calendar";
  return lang === "ur" ? "پاکستان کی مرکزی رؤیتِ ہلال کمیٹی کے اعلان کی بنیاد پر"
    : "Based on Pakistan Central Ruet-e-Hilal Committee's month announcement";
}

export function buildPakistanDateShareText(args: {
  gregorian: DateParts;
  hijri: DateParts;
  weekday: string;
  reviewed: ResolvedHijriDate | null;
  lang: ShareLanguage;
  source?: "tabular" | "scientific";
}): string {
  const { gregorian, hijri, weekday, reviewed, lang, source = "tabular" } = args;
  const lunar = dateDigits(formatDate(hijri, "hijri", lang), lang);
  const civil = dateDigits(formatDate(gregorian, "gregorian", lang), lang);
  const permalink = pakistanDatePermalink(gregorian);
  const provenance = reviewed?.authority === "official"
    ? (lang === "ur" ? "بمطابق: مرکزی رؤیتِ ہلال کمیٹی پاکستان" : "According to: Pakistan Central Ruet-e-Hilal Committee")
    : reviewed
      ? (lang === "ur" ? "بمطابق: پاکستان کا شائع شدہ تاریخی قمری ریکارڈ" : "According to: Published Pakistan historical lunar calendar")
      : source === "scientific"
        ? (lang === "ur" ? "سائنسی پیش گوئی؛ پاکستان کا مصدقہ اعلان دستیاب نہیں" : "Scientific prediction; no verified Pakistan declaration available")
        : (lang === "ur" ? "حسابی تاریخ؛ پاکستان کا مصدقہ اعلان دستیاب نہیں" : "Calculated date; no verified Pakistan announcement available");
  return lang === "ur"
    ? ["پاکستانی ہجری تاریخ", lunar, `${weekday}، ${civil}`, provenance, "مزید تفصیلات:", permalink].join("\n")
    : ["Pakistan Hijri Date", lunar, `${weekday}, ${civil}`, provenance, "More details:", permalink].join("\n");
}
