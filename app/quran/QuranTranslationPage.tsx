"use client";

import { useEffect, useState } from "react";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import { useLanguage } from "../lib/language-context";
import { easternDigits, surahTitle } from "./reader/metadata";
import { splitLastWord, splitTrailingAyahMark } from "./reader/ayahOptions";
import { AyahMarkerButton, useAyahOptionsMenu } from "./reader/AyahCopyMenu";
import QuranUrduTranslatorPicker from "./QuranUrduTranslatorPicker";
import {
  QURAN_READER_TRANSLATION_SOURCES,
  saveQuranUrduTranslator,
  storedQuranUrduTranslator,
  translationRowsForAyahs,
  type QuranUrduTranslator,
} from "./reader/translationCorpus";

export default function QuranTranslationPage({
  ayahs,
  selectedSurah,
  selectedAyah,
  scale,
  quranFontFamily,
}: {
  ayahs: readonly QuranAyah[];
  selectedSurah: number;
  selectedAyah: number;
  scale: number;
  quranFontFamily?: string;
}) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const urduHeaderFont = ur ? '"Gulzar", "Noto Nastaliq Urdu", serif' : undefined;
  const [rows, setRows] = useState<readonly { ayah: QuranAyah; text: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [urduTranslator, setUrduTranslator] = useState<QuranUrduTranslator>("mohsin-najfi");
  const { openMenu, ayahOptionsMenu } = useAyahOptionsMenu();

  useEffect(() => {
    setUrduTranslator(storedQuranUrduTranslator());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    translationRowsForAyahs(ayahs, ur ? "ur" : "en", urduTranslator)
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
  }, [ayahs, selectedAyah, selectedSurah, ur, urduTranslator]);

  const source = ur
    ? QURAN_READER_TRANSLATION_SOURCES.ur
    : QURAN_READER_TRANSLATION_SOURCES.en;

  return (
    <>
      {ur ? (
        <style jsx global>{`
          @font-face {
            font-family: "Mehr Nastaliq Web";
            src: url("/fonts/MehrNastaliqWeb.woff2") format("woff2");
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      ) : null}
    <article
      className="quran-page quran-reader-paper relative flex w-full flex-col overflow-hidden px-4 py-5 sm:px-10 sm:py-8"
      style={{ minHeight: 760 }}
      dir={ur ? "rtl" : "ltr"}
      lang={ur ? "ur" : "en"}
    >
      <header className="relative z-20 border-b border-[#c9b98d]/45 pb-4 text-center">
        <div className="text-xl font-bold text-[#32422f]" style={{ fontFamily: urduHeaderFont, lineHeight: ur ? 2.1 : undefined }}>
          {ur ? "ترجمۂ قرآن" : "Qur'an Translation"}
        </div>
        <div className="mt-1 text-sm text-[#756a50]" style={{ fontFamily: urduHeaderFont, lineHeight: ur ? 2.1 : undefined }}>
          {ur ? "ترجمہ: " + (urduTranslator === "safdar-najfi" ? "علامہ سید صفدر حسین نجفی (تفسیر نمونہ)" : source.translatorUr) : "Translation: " + source.translatorEn}
        </div>
        {ur ? (
          <QuranUrduTranslatorPicker
            value={urduTranslator}
            onChange={(next) => {
              setUrduTranslator(next);
              saveQuranUrduTranslator(next);
            }}
          />
        ) : null}
      </header>

      <div
        className={"mt-4 flex-1 " + (ur ? "font-naskh" : "")}
        style={{
          fontFamily: ur ? '"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif' : undefined,
          fontSize: Math.round((ur ? 22 : 17) * scale) + "px",
          lineHeight: ur ? 2.3 : 2,
        }}
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
              const marked = splitTrailingAyahMark(ayah.text);
              const words = splitLastWord(marked.body);
              return (
                <section
                  key={ayah.id}
                  id={"translation-ayah-" + ayah.surah + "-" + ayah.ayah}
                  className="quran-translation-card rounded-lg px-3 py-3 transition-colors"
                >
                  <div
                    className={"quran-translation-label mb-1 font-bold " + (ur ? "text-[14px]" : "text-[12px]")}
                    style={ur ? { fontFamily: 'var(--font-amiri), "Amiri", "Noto Naskh Arabic", serif', lineHeight: 1.8 } : undefined}
                  >
                    {ur
                      ? surahTitle(ayah.surah) + "، آیت " + easternDigits(ayah.ayah)
                      : "Surah " + ayah.surah + ", Ayah " + ayah.ayah}
                  </div>
                  {quranFontFamily ? (
                    <p className="mb-3 rounded-md border-b border-[#d9d0b8] pb-2 text-right text-[#252b1a]"
                      dir="rtl" lang="ar" style={{fontFamily:quranFontFamily,fontSize:Math.round(26*scale)+"px",lineHeight:2}}
                      data-quran-copy={ayah.text}
                      data-quran-location={ayah.surah + ":" + ayah.ayah}>
                      {words.prefix}
                      <span className="whitespace-nowrap">
                        {words.last}
                        <AyahMarkerButton
                          ayah={ayah.ayah}
                          marker={marked.marker}
                          onOpen={(anchor) => openMenu(anchor, ayah.surah, ayah.ayah, ayah.text)}
                        />
                      </span>
                    </p>
                  ) : null}
                  <p className="quran-translation-text">{text}</p>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-5 border-t border-[#c9b98d]/40 pt-3 text-center text-[11px] text-[#766b54]">
        {ur
          ? "عربی متن اور ترجمہ الگ ماخذی تہوں میں محفوظ ہیں۔"
          : "Qur'anic text and translation are kept as separate source layers."}
      </footer>
    </article>
    {ayahOptionsMenu}
    </>
  );
}
