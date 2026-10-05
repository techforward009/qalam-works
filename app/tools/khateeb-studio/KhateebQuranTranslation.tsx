"use client";

import { useMemo } from "react";
import { useLanguage } from "../../lib/language-context";
import {
  quranLocationsFromReference,
  quranTranslationFor,
  QURAN_TRANSLATION_SOURCES,
  type QuranLocation,
} from "./engine/quranTranslationProvider";

export default function KhateebQuranTranslation({
  location,
  locations,
  reference,
}: {
  location?: QuranLocation;
  locations?: readonly QuranLocation[];
  reference?: string;
}) {
  const { language } = useLanguage();
  const ur = language === "ur";

  const resolvedLocations = useMemo(() => {
    if (locations?.length) return [...locations];
    if (location) return [location];
    return reference ? quranLocationsFromReference(reference) : [];
  }, [location, locations, reference]);

  const rows = resolvedLocations.flatMap((item) => {
    const text = quranTranslationFor(item.surah, item.ayah, ur ? "ur" : "en");
    return text ? [{ ...item, text }] : [];
  });

  if (!rows.length) return null;

  const source = ur ? QURAN_TRANSLATION_SOURCES.ur : QURAN_TRANSLATION_SOURCES.en;

  return (
    <div
      className="mt-3 rounded-lg border border-[#B8935A]/20 bg-[#fffdf8] px-3 py-3 text-sm leading-8 text-[#445247] dark:border-[#6f5b35] dark:bg-[#201d15] dark:text-[#d7e1d9]"
      dir={ur ? "rtl" : "ltr"}
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <p key={`${row.surah}:${row.ayah}`}>
            {rows.length > 1 ? (
              <span className="me-2 text-xs font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                {row.surah}:{row.ayah}
              </span>
            ) : null}
            {row.text}
          </p>
        ))}
      </div>
      <div className="mt-2 text-[11px] font-semibold text-[#8a6838] dark:text-[#d7bc8a]">
        {ur
          ? `ترجمہ: ${source.translatorUr}`
          : `Translation: ${source.translatorEn}`}
      </div>
    </div>
  );
}
