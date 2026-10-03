"use client";

import { useMemo } from "react";
import { ahmedgrafQuranReference } from "../arabic-diacritics/quran/ahmedgrafProvider";
import KhateebScriptText from "./KhateebScriptText";
import { toQalamArabicPresentation } from "./qalamArabicPresentation";

export type KhateebPrimaryArabicProps = {
  kind: "quran" | "hadith";
  quranLocation?: { surah: number; ayah: number };
  sourceArabic?: string;
  sourceArabicMarked?: string;
};

export default function KhateebPrimaryArabic({
  kind,
  quranLocation,
  sourceArabic = "",
  sourceArabicMarked = "",
}: KhateebPrimaryArabicProps) {
  const quranText = useMemo(() => {
    if (kind !== "quran" || !quranLocation) return "";
    return (
      ahmedgrafQuranReference.getAyah(
        quranLocation.surah,
        quranLocation.ayah,
      )?.text ?? ""
    );
  }, [kind, quranLocation]);

  const hadithText = useMemo(
    () => toQalamArabicPresentation(sourceArabicMarked || sourceArabic),
    [sourceArabic, sourceArabicMarked],
  );

  const text = kind === "quran" ? quranText : hadithText;

  return (
    <div className="khateeb-muhammadi-quranic text-lg leading-[2.1] text-[#1A3A2A] dark:text-[#e7eee9]">
      <KhateebScriptText text={text} forceArabic />
    </div>
  );
}
