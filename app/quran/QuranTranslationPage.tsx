"use client";

import { useEffect, useState } from "react";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import { useLanguage } from "../lib/language-context";
import { easternDigits, surahTitle } from "./reader/metadata";
import {
  QURAN_READER_TRANSLATION_SOURCES,
  translationRowsForAyahs,
} from "./reader/translationCorpus";

export default function QuranTranslationPage({
  ayahs,
  selectedSurah,
  selectedAyah,
  scale,
}: {
  ayahs: readonly QuranAyah[];
  selectedSurah: number;
  selectedAyah: number;
  scale: number;
}) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const [rows, setRows] = useState<readonly { ayah: QuranAyah; text: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    translationRowsForAyahs(ayahs, ur ? "ur" : "en")
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setLoading(false);
        window.requestAnimationFrame(() => {
          document
            .getElementById("translation-ayah-" + selectedSurah + "-" + selectedAyah)
            ?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setLoading(false);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ayahs, selectedAyah, selectedSurah, ur]);

  const source = ur
    ? QURAN_READER_TRANSLATION_SOURCES.ur
    : QURAN_READER_TRANSLATION_SOURCES.en;

  return (
    <>
      {ur ? (
        <style jsx global>{`
          @font-face {
            font-family: "Qalam Quran Jameel";
            src: url("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/jameel-noori-nastaleeq-400.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      ) : null}
    <article
      className="quran-page relative flex w-full flex-col overflow-hidden bg-[#fffef9] px-4 py-5 sm:px-10 sm:py-8 dark:bg-[#151a16]"
      style={{ minHeight: 760 }}
      dir={ur ? "rtl" : "ltr"}
      lang={ur ? "ur" : "en"}
    >
      <header className="border-b border-[#c9b98d]/45 pb-4 text-center">
        <div className={"text-xl font-bold text-[#32422f] dark:text-[#e5eee6] " + (ur ? "font-naskh" : "")}>
          {ur ? "ترجمۂ قرآن" : "Qur'an Translation"}
        </div>
        <div className={"mt-1 text-sm text-[#756a50] dark:text-[#c7b98f] " + (ur ? "font-naskh" : "")}>
          {ur ? "ترجمہ: " + source.translatorUr : "Translation: " + source.translatorEn}
        </div>
      </header>

      <div
        className={"mt-4 flex-1 " + (ur ? "font-naskh" : "")}
        style={{ fontSize: Math.round((ur ? 18 : 17) * scale) + "px" }}
      >
        {loading ? (
          <p className="py-12 text-center text-sm text-[#777d74]">
            {ur ? "ترجمہ لوڈ ہو رہا ہے…" : "Loading translation…"}
          </p>
        ) : failed ? (
          <p className="py-12 text-center text-sm text-[#8b554b]">
            {ur ? "ترجمہ لوڈ نہیں ہو سکا۔" : "The translation could not be loaded."}
          </p>
        ) : (
          <div className="space-y-1">
            {rows.map(({ ayah, text }) => {
              const isActive = ayah.surah === selectedSurah && ayah.ayah === selectedAyah;
              return (
                <section
                  key={ayah.id}
                  id={"translation-ayah-" + ayah.surah + "-" + ayah.ayah}
                  className={
                    "rounded-lg px-3 py-3 leading-[2] transition-colors " +
                    (isActive
                      ? "bg-[#f1ead6] dark:bg-[#293126]"
                      : "hover:bg-[#f7f3e8] dark:hover:bg-[#202720]")
                  }
                >
                  <div className="mb-1 text-[11px] font-bold text-[#8a6838] dark:text-[#d7bc8a]">
                    {ur
                      ? surahTitle(ayah.surah) + "، آیت " + easternDigits(ayah.ayah)
                      : "Surah " + ayah.surah + ", Ayah " + ayah.ayah}
                  </div>
                  <p>{text}</p>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-5 border-t border-[#c9b98d]/40 pt-3 text-center text-[11px] text-[#82775f] dark:text-[#b9ad8e]">
        {ur
          ? "عربی متن اور ترجمہ الگ ماخذی تہوں میں محفوظ ہیں۔"
          : "Qur'anic text and translation are kept as separate source layers."}
      </footer>
    </article>
    </>
  );
}
