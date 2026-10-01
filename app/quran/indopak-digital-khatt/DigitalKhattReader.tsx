"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { quranMatchKey } from "../../tools/arabic-diacritics/quran/normalizeQuran";
import { useLanguage } from "../../lib/language-context";
import { easternDigits, juzRunningHead, surahRunningHead, SURAH_NAMES } from "../reader/metadata";
import {
  DIGITAL_KHATT_EDITION,
  buildDigitalKhattPages,
  chapterVerses,
  digitalKhattJuzOf,
  digitalKhattJuzStart,
  digitalKhattPageByNumber,
  digitalKhattPageOf,
  findDigitalKhattAyah,
  flattenDigitalKhatt,
  isDigitalKhattCorpus,
  type DigitalKhattCorpus,
} from "./data";
import styles from "./reader.module.css";

const BASMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ";
const TRAILING_QURAN_MARKS = /[\u0614-\u0617\u06D6-\u06DC\u08D5-\u08DF]+$/u;
const DISPLAY_SCALE_KEY = "qalam-digital-khatt-display-scale";

type Hit = { surah: number; ayah: number };
type RenderText = { body: string; endingMarks: string };

function splitEndingMarks(text: string): RenderText {
  const match = text.match(TRAILING_QURAN_MARKS);
  if (!match || match.index === undefined) {
    return { body: text, endingMarks: "" };
  }

  return {
    body: text.slice(0, match.index).trimEnd(),
    endingMarks: match[0],
  };
}

function readDisplayScale(): number {
  if (typeof window === "undefined") return 1;
  const stored = Number(window.localStorage.getItem(DISPLAY_SCALE_KEY));
  return stored === 0.85 || stored === 1 || stored === 1.12 ? stored : 1;
}

export default function DigitalKhattReader({
  surah,
  ayah,
}: {
  surah: number;
  ayah: number;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const [corpus, setCorpus] = useState<DigitalKhattCorpus | null>(null);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    setScale(readDisplayScale());
  }, []);

  const chooseScale = (value: number) => {
    setScale(value);
    window.localStorage.setItem(DISPLAY_SCALE_KEY, String(value));
  };

  useEffect(() => {
    let cancelled = false;
    fetch(DIGITAL_KHATT_EDITION.corpusPath)
      .then((response) => {
        if (!response.ok) throw new Error("Corpus load failed");
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        if (!cancelled) setCorpus(isDigitalKhattCorpus(value) ? value : {});
      })
      .catch(() => {
        if (!cancelled) setCorpus({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(
    () => (corpus ? findDigitalKhattAyah(corpus, surah, ayah) : null),
    [corpus, surah, ayah],
  );

  const chapterAyahs = useMemo(
    () => (corpus ? chapterVerses(corpus, surah) : []),
    [corpus, surah],
  );

  const flatVerses = useMemo(
    () => (corpus ? flattenDigitalKhatt(corpus) : []),
    [corpus],
  );

  const pages = useMemo(
    () => (corpus ? buildDigitalKhattPages(corpus) : []),
    [corpus],
  );

  const currentPage = useMemo(
    () => digitalKhattPageOf(pages, surah, ayah),
    [pages, surah, ayah],
  );

  const pageVerses = useMemo(
    () =>
      currentPage
        ? flatVerses.slice(currentPage.fromIndex, currentPage.toIndex + 1)
        : [],
    [currentPage, flatVerses],
  );

  const juz = digitalKhattJuzOf(surah, ayah);
  const pageNumber = currentPage?.page ?? 1;
  const pageLabel =
    language === "ur" ? pageNumber.toLocaleString("ur-PK") : String(pageNumber);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  const navigate = (nextSurah: number, nextAyah: number) => {
    router.push("/quran/indopak-digital-khatt/" + nextSurah + "/" + nextAyah);
  };

  const navigatePage = (nextPageNumber: number) => {
    const target = digitalKhattPageByNumber(pages, nextPageNumber);
    if (!target) return;
    navigate(target.startChapter, target.startVerse);
  };

  const runSearch = () => {
    if (!corpus) return;
    const needles = query.split(/\s+/).map(quranMatchKey).filter(Boolean);
    setSearched(true);
    if (!needles.length) {
      setHits([]);
      return;
    }

    const result: Hit[] = [];
    for (const item of flattenDigitalKhatt(corpus)) {
      const words = item.text.split(/\s+/).map(quranMatchKey).filter(Boolean);
      for (let i = 0; i <= words.length - needles.length; i += 1) {
        if (needles.every((needle, offset) => words[i + offset] === needle)) {
          result.push({ surah: item.chapter, ayah: item.verse });
          break;
        }
      }
      if (result.length >= 24) break;
    }
    setHits(result);
  };

  const submitPage = () => {
    const nextPage = Math.max(
      1,
      Math.min(DIGITAL_KHATT_EDITION.pageCount, Number(pageInput) || pageNumber),
    );
    setPageInput(String(nextPage));
    navigatePage(nextPage);
  };

  if (corpus === null) {
    return (
      <main className={styles.reader} dir="ltr">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-[#716c60]">
          Loading IndoPak Digital Khatt…
        </div>
      </main>
    );
  }

  if (!current || !currentPage || pageVerses.length === 0 || chapterAyahs.length === 0) {
    return (
      <main className={styles.reader} dir="ltr">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-red-700">
          This ayah could not be found.
        </div>
      </main>
    );
  }

  return (
    <main className={styles.reader} dir="ltr" lang={language === "ur" ? "ur" : "en"}>
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#d9d2c2] pb-3">
          <div>
            <div className="text-sm font-semibold tracking-wide text-[#2f8f68]">
              {DIGITAL_KHATT_EDITION.name}
            </div>
            <div className="mt-1 text-xs text-[#756f62]">
              Separate edition · DigitalKhatt text and font · not AhmedGraf
            </div>
          </div>
          <Link
            href={"/quran/" + surah + "/" + ayah}
            className="text-sm text-[#2f8f68] hover:underline"
          >
            Existing Qalam edition
          </Link>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="order-2 rounded-xl border border-[#ddd5c5] bg-white/80 p-3 lg:order-1">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                runSearch();
              }}
            >
              <label className="block text-xs font-medium text-[#625d53]">
                Search Quran
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-1 w-full rounded-md border border-[#cfc7b7] bg-white px-2 py-2 text-sm outline-none focus:border-[#2f8f68]"
                  dir="rtl"
                  lang="ar"
                />
              </label>
              <button
                type="submit"
                className="mt-2 w-full rounded-md bg-[#2f8f68] px-3 py-2 text-sm font-medium text-white hover:bg-[#277a59]"
              >
                Search
              </button>
            </form>

            {searched && (
              <div className="mt-3 max-h-64 overflow-auto border-t border-[#e2dccd] pt-2">
                {hits.length ? (
                  <ul className="space-y-1">
                    {hits.map((hit) => (
                      <li key={hit.surah + ":" + hit.ayah}>
                        <button
                          type="button"
                          onClick={() => navigate(hit.surah, hit.ayah)}
                          className="w-full rounded px-2 py-1 text-left text-xs hover:bg-[#f1eee6]"
                        >
                          Surah {SURAH_NAMES[hit.surah - 1] ?? hit.surah} — {easternDigits(hit.ayah)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#777164]">No results.</p>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-[#e2dccd] pt-3">
              <label className="block text-xs text-[#625d53]">
                Surah
                <select
                  value={surah}
                  onChange={(event) => navigate(Number(event.target.value), 1)}
                  className="mt-1 w-full rounded-md border border-[#cfc7b7] bg-white px-2 py-2 text-sm"
                >
                  {SURAH_NAMES.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {index + 1}. {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-2 block text-xs text-[#625d53]">
                Ayah
                <select
                  value={ayah}
                  onChange={(event) => navigate(surah, Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-[#cfc7b7] bg-white px-2 py-2 text-sm"
                >
                  {chapterAyahs.map((item) => (
                    <option key={item.verse} value={item.verse}>
                      {item.verse}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-2 block text-xs text-[#625d53]">
                Juz
                <select
                  value={juz}
                  onChange={(event) => {
                    const start = digitalKhattJuzStart(Number(event.target.value));
                    if (start) navigate(start.surah, start.ayah);
                  }}
                  className="mt-1 w-full rounded-md border border-[#cfc7b7] bg-white px-2 py-2 text-sm"
                >
                  {Array.from({ length: 30 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>

              <form
                className="mt-3 border-t border-[#e2dccd] pt-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitPage();
                }}
              >
                <label className="block text-xs text-[#625d53]">
                  Page
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={DIGITAL_KHATT_EDITION.pageCount}
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-[#cfc7b7] bg-white px-2 py-2 text-sm"
                    />
                    <span className="text-xs text-[#777164]">/ {DIGITAL_KHATT_EDITION.pageCount}</span>
                  </div>
                </label>
                <button
                  type="submit"
                  className="mt-2 w-full rounded-md border border-[#2f8f68]/40 px-3 py-2 text-sm font-medium text-[#2f8f68]"
                >
                  Go to page
                </button>
              </form>

              <label className="mt-3 block border-t border-[#e2dccd] pt-3 text-xs text-[#625d53]">
                {language === "ur" ? "نمایش" : "Display"}
                <select
                  value={scale}
                  aria-label={language === "ur" ? "سائز" : "Size"}
                  onChange={(event) => chooseScale(Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-[#cfc7b7] bg-white px-2 py-2 text-sm"
                >
                  <option value={0.85}>{language === "ur" ? "چھوٹا" : "Small"}</option>
                  <option value={1}>{language === "ur" ? "درمیانہ" : "Medium"}</option>
                  <option value={1.12}>{language === "ur" ? "بڑا" : "Large"}</option>
                </select>
              </label>
            </div>
          </aside>

          <section className="order-1 lg:order-2">
            <div className="quran-page-meta" dir="rtl" lang="ar">
              <div className="quran-page-meta-item quran-page-meta-juz">
                <span className="quran-page-meta-juz-name">{juzRunningHead(juz)}</span>
              </div>
              <div
                className="quran-page-meta-item flex items-center justify-center overflow-visible"
                dir="ltr"
                lang={language === "ur" ? "ur" : "en"}
              >
                <button
                  type="button"
                  className="quran-page-arrow"
                  aria-label="Previous page"
                  disabled={pageNumber <= 1}
                  onClick={() => navigatePage(pageNumber - 1)}
                >
                  ◄
                </button>
                <span className="quran-page-meta-page-number">{pageLabel}</span>
                <button
                  type="button"
                  className="quran-page-arrow"
                  aria-label="Next page"
                  disabled={pageNumber >= DIGITAL_KHATT_EDITION.pageCount}
                  onClick={() => navigatePage(pageNumber + 1)}
                >
                  ►
                </button>
              </div>
              <div className="quran-page-meta-item quran-page-meta-surah">
                <span className="quran-page-meta-surah-name">{surahRunningHead(surah)}</span>
              </div>
            </div>

            <article className={styles.page}>
              <div className={styles.quran} style={{ ["--quran-scale" as string]: String(scale) }}>
                {pageVerses.map((item) => {
                  const { body, endingMarks } = splitEndingMarks(item.text);
                  const digits = easternDigits(item.verse);

                  return (
                    <span key={item.chapter + ":" + item.verse}>
                      {item.verse === 1 && (
                        <>
                          <span className={styles.surahHeader} dir="rtl">
                            <span className={styles.surahMeta}>
                              SURAH {String(item.chapter).padStart(3, "0")}
                            </span>
                            <span className={styles.surahName}>
                              {SURAH_NAMES[item.chapter - 1] ?? ""}
                            </span>
                          </span>

                          {item.chapter !== 9 && (
                            <span className={styles.bismillah}>{BASMILLAH}</span>
                          )}
                        </>
                      )}

                      <span className={styles.ayah}>{body}</span>
                      <span className={styles.ayahMark} aria-label={"Ayah " + item.verse}>
                        <span className={styles.ayahOrb} aria-hidden="true">
                          <span className={styles.ayahRing}>۝</span>
                          <span className={digits.length >= 3 ? styles.ayahDigitTight : styles.ayahDigit}>
                            {digits}
                          </span>
                          {endingMarks ? (
                            <span className={styles.waqf}>{"\u00A0" + endingMarks}</span>
                          ) : null}
                        </span>
                      </span>{" "}
                    </span>
                  );
                })}
              </div>

              <div className={styles.pageBottom}>
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => navigatePage(pageNumber - 1)}
                  className="rounded-md border border-[#cfc7b7] px-4 py-2 text-sm text-[#575247] disabled:opacity-40"
                >
                  ← Previous page
                </button>

                <span className="text-xs text-[#776f61]">
                  {easternDigits(currentPage.startChapter)}:{easternDigits(currentPage.startVerse)}
                  {" — "}
                  {easternDigits(currentPage.endChapter)}:{easternDigits(currentPage.endVerse)}
                </span>

                <button
                  type="button"
                  disabled={pageNumber >= DIGITAL_KHATT_EDITION.pageCount}
                  onClick={() => navigatePage(pageNumber + 1)}
                  className="rounded-md border border-[#2f8f68]/40 px-4 py-2 text-sm font-medium text-[#2f8f68] disabled:opacity-40"
                >
                  Next page →
                </button>
              </div>
            </article>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] leading-relaxed text-[#8a8478]">
              <span>
                Text: DigitalKhatt IndoPak, MIT, via risan/quran-json. Font: DigitalKhatt OFL-1.1.
              </span>
              <a
                href="https://fonts.quran.ws/fonts/indopak/"
                target="_blank"
                rel="noreferrer"
                className="text-[#2f8f68] hover:underline"
              >
                Matching font for Word
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
