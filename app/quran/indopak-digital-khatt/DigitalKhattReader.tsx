"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { quranMatchKey } from "../../tools/arabic-diacritics/quran/normalizeQuran";
import { useLanguage } from "../../lib/language-context";
import EditionTopBar from "../reader/EditionTopBar";
import { QURAN_READER_COPY } from "../reader/copy";
import { useQuranKeyboardNavigation } from "../reader/keyboard";
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
import { surahBanner } from "./surahBanner";

const BASMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ";
const TRAILING_QURAN_MARKS = /[\u0614-\u0617\u06D6-\u06DC\u08D5-\u08DF]+$/u;
const DISPLAY_SCALE_KEY = "qalam-digital-khatt-display-scale";
let DIGITAL_KHATT_CORPUS_CACHE: DigitalKhattCorpus | null = null;
let DIGITAL_KHATT_CORPUS_PROMISE: Promise<DigitalKhattCorpus> | null = null;

function loadDigitalKhattCorpus(): Promise<DigitalKhattCorpus> {
  if (DIGITAL_KHATT_CORPUS_CACHE) return Promise.resolve(DIGITAL_KHATT_CORPUS_CACHE);
  if (DIGITAL_KHATT_CORPUS_PROMISE) return DIGITAL_KHATT_CORPUS_PROMISE;

  DIGITAL_KHATT_CORPUS_PROMISE = fetch(DIGITAL_KHATT_EDITION.corpusPath, {
    cache: "force-cache",
  })
    .then((response) => {
      if (!response.ok) throw new Error("Corpus load failed");
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      const corpus = isDigitalKhattCorpus(value) ? value : {};
      DIGITAL_KHATT_CORPUS_CACHE = corpus;
      return corpus;
    })
    .catch(() => {
      const corpus: DigitalKhattCorpus = {};
      DIGITAL_KHATT_CORPUS_CACHE = corpus;
      return corpus;
    })
    .finally(() => {
      DIGITAL_KHATT_CORPUS_PROMISE = null;
    });

  return DIGITAL_KHATT_CORPUS_PROMISE;
}
/** Ink width of each DigitalKhatt waqf glyph, in em. They are zero-advance marks. */
const WAQF_EM: Record<string, number> = {
  "\u0614": 0.52,
  "\u0615": 0.28,
  "\u0617": 0.22,
  "\u06D6": 0.4,
  "\u06D8": 0.36,
  "\u06D9": 0.34,
  "\u06DA": 0.34,
  "\u06DB": 0.28,
  "\u06DC": 0.4,
  "\u08D5": 0.36,
  "\u08D6": 0.28,
  "\u08D7": 0.26,
  "\u08DB": 0.84,
  "\u08DD": 0.7,
  "\u08DE": 0.5,
  "\u08DF": 0.66,
};

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
  const copy = QURAN_READER_COPY[language];
  const [corpus, setCorpus] = useState<DigitalKhattCorpus | null>(() => DIGITAL_KHATT_CORPUS_CACHE);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  useLayoutEffect(() => {
    setScale(readDisplayScale());
  }, []);

  const chooseScale = (value: number) => {
    setScale(value);
    window.localStorage.setItem(DISPLAY_SCALE_KEY, String(value));
  };

  useEffect(() => {
    let cancelled = false;
    loadDigitalKhattCorpus().then((value) => {
      if (!cancelled) setCorpus(value);
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

  useEffect(() => {
    if (!pages.length || !currentPage) return;
    for (const candidate of [currentPage.page - 1, currentPage.page + 1]) {
      const target = digitalKhattPageByNumber(pages, candidate);
      if (!target) continue;
      router.prefetch(
        "/quran/indopak-digital-khatt/" + target.startChapter + "/" + target.startVerse,
      );
    }
  }, [currentPage, pages, router]);

  const navigate = (nextSurah: number, nextAyah: number) => {
    router.push("/quran/indopak-digital-khatt/" + nextSurah + "/" + nextAyah);
  };

  const navigatePage = (nextPageNumber: number) => {
    const target = digitalKhattPageByNumber(pages, nextPageNumber);
    if (!target) return;
    navigate(target.startChapter, target.startVerse);
  };

  const copyCurrentPage = async () => {
    try {
      await navigator.clipboard.writeText(pageVerses.map((item) => item.text).join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  useQuranKeyboardNavigation({
    onPreviousAyah: () => {
      const index = flatVerses.findIndex((item) => item.chapter === surah && item.verse === ayah);
      const target = index > 0 ? flatVerses[index - 1] : null;
      if (target) navigate(target.chapter, target.verse);
    },
    onNextAyah: () => {
      const index = flatVerses.findIndex((item) => item.chapter === surah && item.verse === ayah);
      const target = index >= 0 ? flatVerses[index + 1] : null;
      if (target) navigate(target.chapter, target.verse);
    },
    onPreviousPage: () => navigatePage(pageNumber - 1),
    onNextPage: () => navigatePage(pageNumber + 1),
    onPreviousSurah: () => {
      const target = flatVerses.find((item) => item.chapter === surah - 1);
      if (target) navigate(target.chapter, target.verse);
    },
    onNextSurah: () => {
      const target = flatVerses.find((item) => item.chapter === surah + 1);
      if (target) navigate(target.chapter, target.verse);
    },
  });

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
          {copy.loading}
        </div>
      </main>
    );
  }

  if (!current || !currentPage || pageVerses.length === 0 || chapterAyahs.length === 0) {
    return (
      <main className={styles.reader} dir="ltr">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-red-700">
          {copy.notFound}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.reader} dir="ltr" lang={language === "ur" ? "ur" : "en"}>
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        <EditionTopBar editionId="digital-khatt" />

        <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="order-2 rounded-xl border border-[#ddd5c5] bg-white/80 p-3 lg:order-1">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                runSearch();
              }}
            >
              <label className="block text-xs font-medium text-[#625d53]">
                {copy.search}
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
                {copy.search}
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
                          {copy.surah} {SURAH_NAMES[hit.surah - 1] ?? hit.surah} — {easternDigits(hit.ayah)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#777164]">{copy.noResults}</p>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-[#e2dccd] pt-3">
              <label className="block text-xs text-[#625d53]">
                {copy.surah}
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
                {copy.ayah}
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
                {copy.juz}
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
                  {copy.page}
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
                  {copy.goToPage}
                </button>
              </form>

              <button
                type="button"
                onClick={() => void copyCurrentPage()}
                className="mt-3 w-full rounded-md border border-[#cfc7b7] px-3 py-2 text-sm text-[#575247] hover:bg-[#f4f2ec]"
              >
                {copied ? copy.copyDone : copy.copy}
              </button>

              <label className="mt-3 block border-t border-[#e2dccd] pt-3 text-xs text-[#625d53]">
                {copy.display}
                <select
                  value={scale}
                  aria-label={copy.size}
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
                  const banner = item.verse === 1 ? surahBanner(item.chapter) : null;

                  return (
                    <span key={item.chapter + ":" + item.verse}>
                      {item.verse === 1 && (
                        <>
                          <span className={styles.surahHeader} dir="rtl">
                            <span className={styles.surahPlace}>{banner?.place}</span>
                            <span className={styles.surahName}>
                              <span className={styles.bannerDigit}>{banner?.surahNumber}</span>
                              <span>{banner?.name}</span>
                              <span className={styles.bannerDigit}>{banner?.revealed}</span>
                            </span>
                            <span className={styles.surahCount}>
                              <span>آیات</span>
                              <span className={styles.bannerDigit}>{banner?.ayatCount}</span>
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
                            <span className={styles.waqf}>
                              {Array.from(endingMarks).map((mark, index) => (
                                <span key={index} className={styles.waqfMark} style={{ width: `${WAQF_EM[mark] ?? 0.36}em` }}>
                                  <span className={styles.waqfGlyph}>{mark}</span>
                                </span>
                              ))}
                            </span>
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
                  {copy.previousPage}
                </button>

                <button
                  type="button"
                  disabled={pageNumber >= DIGITAL_KHATT_EDITION.pageCount}
                  onClick={() => navigatePage(pageNumber + 1)}
                  className="rounded-md border border-[#2f8f68]/40 px-4 py-2 text-sm font-medium text-[#2f8f68] disabled:opacity-40"
                >
                  {copy.nextPage}
                </button>
              </div>
            </article>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] leading-relaxed text-[#8a8478]">
              <span>
                {copy.digitalCredit}
              </span>
              <a
                href="https://fonts.quran.ws/fonts/indopak/"
                target="_blank"
                rel="noreferrer"
                className="text-[#2f8f68] hover:underline"
              >
                {copy.matchingFontForWord}
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
