"use client";

import { useEffect, useMemo, useState } from "react";
import { ahmedgrafQuranReference } from "../arabic-diacritics/quran/ahmedgrafProvider";
import { diacritizeArabicWithModel } from "../arabic-diacritics/engine/rawiBrowser";
import KhateebScriptText from "./KhateebScriptText";

export type KhateebPrimaryArabicProps = {
  kind: "quran" | "hadith";
  quranLocation?: { surah: number; ayah: number };
  sourceArabic?: string;
};

export default function KhateebPrimaryArabic({
  kind,
  quranLocation,
  sourceArabic = "",
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

  const [hadithText, setHadithText] = useState(sourceArabic);
  const [hadithState, setHadithState] = useState<
    "idle" | "loading" | "ready" | "fallback"
  >("idle");

  useEffect(() => {
    if (kind !== "hadith" || !sourceArabic.trim()) return;
    let cancelled = false;
    setHadithState("loading");
    diacritizeArabicWithModel(sourceArabic)
      .then((text) => {
        if (cancelled) return;
        setHadithText(text);
        setHadithState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setHadithText(sourceArabic);
        setHadithState("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [kind, sourceArabic]);

  const text = kind === "quran" ? quranText : hadithText;

  return (
    <div>
      <div className="khateeb-muhammadi-quranic text-lg leading-[2.1] text-[#1A3A2A] dark:text-[#e7eee9]">
        <KhateebScriptText text={text} forceArabic />
      </div>
      {kind === "quran" ? (
        <p className="mt-2 text-xs text-[#687469] dark:text-[#9fb0a2]">
          قرآن متن: قلم ورکس کا Indo-Pak Quran Text v1.0 — ahmedgraf.com
        </p>
      ) : (
        <p className="mt-2 text-xs text-[#687469] dark:text-[#9fb0a2]">
          {hadithState === "fallback"
            ? "اصل ماخذی متن دکھایا جا رہا ہے؛ اعراب کا ماڈل دستیاب نہیں ہوا۔"
            : "اعراب: قلم ورکس عربی اعراب کے موجودہ کتابی اصولوں کے مطابق۔"}
        </p>
      )}
    </div>
  );
}
