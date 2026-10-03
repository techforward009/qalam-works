"use client";

import type { ReactNode } from "react";

const URDU_PERSIAN_EXCLUSIVE = /[پچژگکںھہےٹڈڑ]/u;
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/u;
const ARABIC_LETTERS = /[\u0621-\u063A\u0641-\u064A]/u;
const GUILLEMETS = /(«[^»]+»)/gu;

export function looksLikeArabicReligiousText(text: string): boolean {
  const value = text.replace(/[«»]/g, "").trim();
  if (!value || !ARABIC_LETTERS.test(value)) return false;
  if (URDU_PERSIAN_EXCLUSIVE.test(value)) return false;
  if (ARABIC_DIACRITICS.test(value)) return true;

  const words = value.split(/\s+/u).filter(Boolean);
  return words.length >= 2 && /[ةثذظضصطحعغفق]/u.test(value);
}

function ArabicSpan({ children }: { children: string }) {
  return (
    <span
      dir="rtl"
      lang="ar"
      className="khateeb-muhammadi-quranic"
    >
      {children}
    </span>
  );
}

export default function KhateebScriptText({
  text,
  forceArabic = false,
}: {
  text: string;
  forceArabic?: boolean;
}) {
  if (forceArabic) return <ArabicSpan>{text}</ArabicSpan>;

  const parts = text.split(GUILLEMETS);
  if (parts.length === 1) return <>{text}</>;

  const output: ReactNode[] = parts.map((part, index) =>
    part.startsWith("«") &&
    part.endsWith("»") &&
    looksLikeArabicReligiousText(part)
      ? <ArabicSpan key={`${index}-${part}`}>{part}</ArabicSpan>
      : part,
  );

  return <>{output}</>;
}
