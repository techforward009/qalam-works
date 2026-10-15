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

export function pakistanDateStatus(reviewed: ResolvedHijriDate | null, lang: ShareLanguage): string {
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
}): string {
  const { gregorian, hijri, weekday, reviewed, lang } = args;
  const lunar = dateDigits(formatDate(hijri, "hijri", lang), lang);
  const civil = dateDigits(formatDate(gregorian, "gregorian", lang), lang);
  const firstDay = reviewedMonthStart(gregorian, hijri, reviewed);
  const source = reviewed?.sourceUrl;
  const status = pakistanDateStatus(reviewed, lang);
  const permalink = pakistanDatePermalink(gregorian);
  if (lang === "ur") {
    return [
      "پاکستانی ہجری تاریخ",
      `عیسوی: ${weekday}، ${civil}`,
      `اسلامی: ${lunar}`,
      `حیثیت: ${status}`,
      ...(firstDay ? [`یکم قمری مہینہ: ${dateDigits(formatDate(firstDay, "gregorian", "ur"), "ur")}`] : []),
      ...(source ? [`اصل حوالہ: ${source}`] : []),
      `قلم ورکس: ${permalink}`,
    ].join("\n");
  }
  return [
    "Pakistan Hijri Date",
    `Gregorian: ${weekday}, ${civil}`,
    `Hijri: ${lunar}`,
    `Status: ${status}`,
    ...(firstDay ? [`Lunar month began: ${formatDate(firstDay, "gregorian", "en")}`] : []),
    ...(source ? [`Source: ${source}`] : []),
    `Qalam Works: ${permalink}`,
  ].join("\n");
}
