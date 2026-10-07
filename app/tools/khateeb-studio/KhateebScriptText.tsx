"use client";

import type { ReactNode } from "react";

const URDU_PERSIAN_EXCLUSIVE = /[پچژگکںھہےٹڈڑ]/u;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/u;
const ARABIC_LETTERS = /[\u0621-\u063A\u0641-\u064A]/u;
const GUILLEMETS = /(«[^»]+»)/gu;
const PERSIAN_EXCLUSIVE = /[پچژگک]/u;

export function renderKhateebSalawat(text: string): ReactNode {
  if (!text.includes("ﷺ")) return text;
  return text.split("ﷺ").map((part, index) => (
    <span key={index}>
      {index > 0 ? <span className="khateeb-salawat" lang="ar">ﷺ</span> : null}
      {part}
    </span>
  ));
}

export function looksLikePersianText(text: string): boolean {
  return PERSIAN_EXCLUSIVE.test(text) && !/[ںھہےٹڈڑ]/u.test(text);
}

export function looksLikeArabicReligiousText(text: string): boolean {
  const value = text.replace(/[«»]/g, "").trim();
  if (!value || !ARABIC_LETTERS.test(value)) return false;
  if (URDU_PERSIAN_EXCLUSIVE.test(value)) return false;
  if (ARABIC_DIACRITICS.test(value)) return true;

  const words = value.split(/\s+/u).filter(Boolean);
  return words.length >= 2 && /[ةثذظضصطحعغفق]/u.test(value);
}

function PersianSpan({ children }: { children: string }) {
  return (
    <span dir="rtl" lang="fa" className="font-vazirmatn">
      {renderKhateebSalawat(children)}
    </span>
  );
}

function ArabicSpan({ children, nonQuran = false }: { children: string; nonQuran?: boolean }) {
  return (
    <span
      dir="rtl"
      lang="ar"
      className={nonQuran ? "qalam-book-arabic" : "khateeb-muhammadi-quranic"}
    >
      {renderKhateebSalawat(children)}
    </span>
  );
}

export default function KhateebScriptText({
  text,
  forceArabic = false,
  forcePersian = false,
  forceUrdu = false,
  nonQuran = false,
}: {
  text: string;
  forceArabic?: boolean;
  forcePersian?: boolean;
  forceUrdu?: boolean;
  nonQuran?: boolean;
}) {
  if (!forceUrdu && forcePersian && looksLikePersianText(text)) {
    return <PersianSpan>{text}</PersianSpan>;
  }
  if (forceArabic) return <ArabicSpan nonQuran={nonQuran}>{text}</ArabicSpan>;

  const parts = text.split(GUILLEMETS);
  if (parts.length === 1) return <>{renderKhateebSalawat(text)}</>;

  const output: ReactNode[] = parts.map((part, index) =>
    part.startsWith("«") &&
    part.endsWith("»") &&
    looksLikeArabicReligiousText(part)
      ? <ArabicSpan key={`${index}-${part}`} nonQuran={nonQuran}>{part}</ArabicSpan>
      : <span key={index}>{renderKhateebSalawat(part)}</span>,
  );

  return <>{output}</>;
}
