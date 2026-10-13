"use client";

import { useEffect, useState } from "react";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import { useLanguage } from "../lib/language-context";
import { easternDigits, surahTitle } from "./reader/metadata";
import {
  QURAN_TRANSLITERATION_SOURCE,
  transliterationRowsForAyahs,
} from "./reader/transliterationCorpus";

export default function QuranTransliterationPage({
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
  const [rows, setRows] = useState<readonly { ayah: QuranAyah; text: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    transliterationRowsForAyahs(ayahs)
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setLoading(false);
        window.requestAnimationFrame(() => {
          document
            .getElementById("transliteration-ayah-" + selectedSurah + "-" + selectedAyah)
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
  }, [ayahs, selectedAyah, selectedSurah]);

  return (
    <article
      className="quran-page relative flex w-full flex-col overflow-hidden bg-[#fffef9] px-4 py-5 sm:px-10 sm:py-8"
      dir="ltr"
      lang="en"
    >
      <header className="border-b border-[#c9b98d]/45 pb-4 text-center" dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"}>
        <div className={"text-xl font-bold text-[#32422f] " + (ur ? "font-naskh" : "")}>
          {ur ? "تلفظ" : "Transliteration"}
        </div>
        <div className={"mt-1 text-sm text-[#756a50] " + (ur ? "font-naskh" : "")}>
          {QURAN_TRANSLITERATION_SOURCE.nameEn}
          {" · "}
          {QURAN_TRANSLITERATION_SOURCE.copyright}
        </div>
      </header>
      <div className="mt-4 flex-1" style={{ fontSize: Math.round(17 * scale) + "px", lineHeight: 1.85 }}>
        {loading ? (
          <p className="py-12 text-center text-sm text-[#777d74]" dir={ur ? "rtl" : "ltr"}>
            {ur ? "تلفظ لوڈ ہو رہا ہے…" : "Loading transliteration…"}
          </p>
        ) : failed ? (
          <p className="py-12 text-center text-sm text-[#8b554b]" dir={ur ? "rtl" : "ltr"}>
            {ur ? "تلفظ لوڈ نہیں ہو سکا۔" : "The transliteration could not be loaded."}
          </p>
        ) : (
          <div className="space-y-1">
            {rows.map(({ ayah, text }) => {
              const active = ayah.surah === selectedSurah && ayah.ayah === selectedAyah;
              return (
                <section
                  key={ayah.id}
                  id={"transliteration-ayah-" + ayah.surah + "-" + ayah.ayah}
                  className={"rounded-lg px-3 py-3 " + (active ? "bg-[#f1ead6]" : "")}
                >
                  <div className="mb-1 text-[11px] font-bold text-[#8a6838]" dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"}>
                    {ur
                      ? surahTitle(ayah.surah) + "، آیت " + easternDigits(ayah.ayah)
                      : "Surah " + ayah.surah + ", Ayah " + ayah.ayah}
                  </div>
                  {text ? (
                    <p dir="ltr" lang="en">{text}</p>
                  ) : (
                    <p className="text-sm text-[#8b554b]" dir={ur ? "rtl" : "ltr"}>
                      {ur
                        ? "اس آیت کا تلفظ فراہم کردہ مجموعے میں موجود نہیں۔"
                        : "This verse has no entry in the supplied transliteration dataset."}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
