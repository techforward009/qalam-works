"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { SURAH_NAMES, JUZ_STARTS, easternDigits, juzTitle, surahTitle } from "../reader/metadata";
import { useLanguage } from "../../lib/language-context";
import EditionTopBar from "../reader/EditionTopBar";
import {QuranSidebarSection,QuranPageMeta,QuranPageButtons,QuranCorner,SurahBand} from "../reader/SharedReaderControls";
import { initialQuranDisplayScale } from "../reader/readerPresentation";
import { QURAN_READER_COPY } from "../reader/copy";
import { useQuranKeyboardNavigation } from "../reader/keyboard";
import { adjacentAyah } from "../reader/model";
import { TANZIL_PAGE_STARTS } from "../reader/tanzilPageMap";
import { publicDigitalKhattQuranReference } from "../../tools/arabic-diacritics/quran/publicDigitalKhattProvider";
import {
  cachedQpcHafsPage,
  loadQpcHafsPage,
  qpcHafsTextForPage,
  qpcHafsTextForVerseKeys,
  verseKeyFromLocation,
} from "./qpcHafsCopy";
import { quranMatchKey } from "../../tools/arabic-diacritics/quran/normalizeQuran";
import {
  MADINAH_BASMALA_FAMILY,
  MADINAH_BASMALA_GLYPH,
  MADINAH_V2_EDITION,
  fontUrl,
  pageUrl,
  type MadinahPage,
} from "./data";
import styles from "./reader.module.css";
import {HAFS_AYAH_COUNTS} from "../../tools/arabic-diacritics/quran/hafsCounts";

type Hit = { surah: number; ayah: number; page: number };

const FONT_PREFIX = "QalamMadinahV2";
const FONT_READY = new Set<number>();
const FONT_PROMISES = new Map<number, Promise<string>>();
const PAGE_CACHE = new Map<number, MadinahPage>();
const PAGE_PROMISES = new Map<number, Promise<MadinahPage>>();
let basmalaReady: Promise<void> | null = null;

function ensureBasmalaFont(): Promise<void> {
  if (basmalaReady) return basmalaReady;
  if (typeof FontFace === "undefined") return Promise.resolve();
  const font = new FontFace(
    MADINAH_BASMALA_FAMILY,
    `url(${MADINAH_V2_EDITION.basmalaFont}) format("truetype")`,
    { display: "block" },
  );
  basmalaReady = font.load().then((loaded) => {
    document.fonts.add(loaded);
  }).catch((error) => {
    basmalaReady = null;
    throw error;
  });
  return basmalaReady;
}

async function ensurePageFont(page: number): Promise<string> {
  const family = `${FONT_PREFIX}-${page}`;
  if (FONT_READY.has(page) || typeof FontFace === "undefined") return family;

  const pending = FONT_PROMISES.get(page);
  if (pending) return pending;

  const promise = new FontFace(family, `url(${fontUrl(page)}) format("woff2")`, {
    display: "swap",
  })
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      FONT_READY.add(page);
      return family;
    })
    .finally(() => {
      FONT_PROMISES.delete(page);
    });

  FONT_PROMISES.set(page, promise);
  return promise;
}

function resolveMadinahPageForAyah(targetSurah: number, targetAyah: number): number {
  let resolved = 1;
  for (const [pageNo, startSurah, startAyah] of TANZIL_PAGE_STARTS) {
    if (
      targetSurah > startSurah ||
      (targetSurah === startSurah && targetAyah >= startAyah)
    ) {
      resolved = pageNo;
    }
  }
  return resolved;
}

function fetchMadinahPage(targetPage: number): Promise<MadinahPage> {
  const cached = PAGE_CACHE.get(targetPage);
  if (cached) return Promise.resolve(cached);

  const pending = PAGE_PROMISES.get(targetPage);
  if (pending) return pending;

  const promise = fetch(pageUrl(targetPage), { cache: "force-cache" })
    .then(async (response) => {
      if (response.ok) return response;
      return fetch(pageUrl(targetPage, true), { cache: "force-cache" });
    })
    .then(async (response) => {
      if (!response.ok) throw new Error("Page could not load");
      const value = (await response.json()) as MadinahPage;
      PAGE_CACHE.set(targetPage, value);
      return value;
    })
    .finally(() => {
      PAGE_PROMISES.delete(targetPage);
    });

  PAGE_PROMISES.set(targetPage, promise);
  return promise;
}

async function prepareMadinahPage(targetPage: number): Promise<{
  page: MadinahPage;
  family: string;
}> {
  const [nextPage, family] = await Promise.all([
    fetchMadinahPage(targetPage),
    ensurePageFont(targetPage),
    ensureBasmalaFont().catch(() => undefined),
  ]);
  return { page: nextPage, family };
}

function parseLocation(value: string): { surah: number; ayah: number } | null {
  const match = value.match(/^(\d+):(\d+):\d+$/);
  return match ? { surah: Number(match[1]), ayah: Number(match[2]) } : null;
}

function firstAyah(page: MadinahPage): { surah: number; ayah: number } | null {
  for (const line of page.lines) {
    for (const word of line.words) {
      const parsed = parseLocation(word.location);
      if (parsed) return parsed;
    }
  }
  return null;
}

function pageHasAyah(page: MadinahPage, surah: number, ayah: number): boolean {
  return page.lines.some((line) =>
    line.words.some((word) => word.location.startsWith(`${surah}:${ayah}:`)),
  );
}

function juzForLocation(surah: number, ayah: number): number {
  let current = 1;
  for (const item of JUZ_STARTS) {
    if (surah > item.surah || (surah === item.surah && ayah >= item.ayah)) current = item.juz;
  }
  return current;
}

export default function MadinahReader({
  surah,
  ayah,
}: {
  surah: number;
  ayah: number;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const copy = QURAN_READER_COPY[language];
  const initialPageNumber = resolveMadinahPageForAyah(surah, ayah);
  const [pageNumber, setPageNumber] = useState(initialPageNumber);
  const [page, setPage] = useState<MadinahPage | null>(
    () => PAGE_CACHE.get(initialPageNumber) ?? null,
  );
  const [fontFamily, setFontFamily] = useState(`${FONT_PREFIX}-${initialPageNumber}`);
  const [pageInput, setPageInput] = useState("1");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loadError, setLoadError] = useState("");
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  const navigate = (nextSurah: number, nextAyah: number) => {
    router.push(`/quran/madinah/${nextSurah}/${nextAyah}`);
  };

  const loadPage = async (targetPage: number) => {
    setLoadError("");
    try {
      const prepared = await prepareMadinahPage(targetPage);
      setPage(prepared.page);
      setPageNumber(targetPage);
      window.sessionStorage.setItem("qalam-madinah-last-page", String(targetPage));
      setFontFamily(prepared.family);
    } catch {
      setLoadError(`${copy.pageCouldNotLoad} ${targetPage}`);
    }
  };

  useEffect(() => {
    const target = resolveMadinahPageForAyah(surah, ayah);
    setPageNumber(target);
    setPageInput(String(target));

    const cached = PAGE_CACHE.get(target);
    if (cached) {
      setPage(cached);
      setFontFamily(`${FONT_PREFIX}-${target}`);
      ensurePageFont(target).catch(() => undefined);
      return;
    }

    loadPage(target).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, ayah]);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  useEffect(() => {
    if (!page) return;
    const contains = pageHasAyah(page, surah, ayah);
    if (!contains) return;
    setPageNumber(page.page);
    window.sessionStorage.setItem("qalam-madinah-last-page", String(page.page));
  }, [page, surah, ayah]);

  useEffect(() => {
    if (!page) return;

    for (const candidate of [page.page - 1, page.page + 1]) {
      if (candidate < 1 || candidate > MADINAH_V2_EDITION.pageCount) continue;
      prepareMadinahPage(candidate)
        .then(({ page: adjacent }) => {
          const start = firstAyah(adjacent);
          if (start) router.prefetch(`/quran/madinah/${start.surah}/${start.ayah}`);
        })
        .catch(() => undefined);
    }
  }, [page, router]);

  const runSearch = () => {
    const needles = query.split(/\s+/).map(quranMatchKey).filter(Boolean);
    setSearched(true);
    if (!needles.length) {
      setHits([]);
      return;
    }

    const result: Hit[] = [];
    for (const item of publicDigitalKhattQuranReference.listAyahs()) {
      const words = item.text.split(/\s+/).map(quranMatchKey).filter(Boolean);
      const matched = needles.length <= words.length && Array.from({ length: words.length - needles.length + 1 }, (_, i) => i)
        .some((i) => needles.every((needle, offset) => words[i + offset] === needle));
      if (matched) {
        result.push({ surah: item.surah, ayah: item.ayah, page: 0 });
        if (result.length >= 24) break;
      }
    }
    setHits(result);
  };

  const navigatePage = (nextPage: number) => {
    const bounded = Math.max(1, Math.min(MADINAH_V2_EDITION.pageCount, nextPage));
    setLoadError("");

    prepareMadinahPage(bounded)
      .then(({ page: next, family }) => {
        const start = firstAyah(next);
        setPage(next);
        setPageNumber(bounded);
        setFontFamily(family);
        window.sessionStorage.setItem("qalam-madinah-last-page", String(bounded));
        if (start) navigate(start.surah, start.ayah);
      })
      .catch(() => setLoadError(`${copy.pageCouldNotLoad} ${bounded}`));
  };

  const chooseScale = (value: number) => {
    setScale(value);
    window.localStorage.setItem("qalam-madinah-display-scale", String(value));
  };

  const handlePageCopy = (event: React.ClipboardEvent<HTMLElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !page) return;

    const range = selection.getRangeAt(0);
    const locations = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-quran-location]"),
    )
      .filter((element) => {
        try {
          return range.intersectsNode(element);
        } catch {
          return false;
        }
      })
      .map((element) => element.dataset.quranLocation ?? "")
      .map(verseKeyFromLocation)
      .filter((key): key is string => Boolean(key));

    const verseKeys = new Set(locations);
    if (!verseKeys.size) return;

    event.preventDefault();
    const qpcPage = cachedQpcHafsPage(page.page);
    const text = qpcPage ? qpcHafsTextForVerseKeys(qpcPage, verseKeys) : "";
    if (!text) {
      event.clipboardData.clearData();
      return;
    }
    event.clipboardData.setData("text/plain", text);
  };

  const copyCurrentPage = async () => {
    if (!page) return;
    try {
      const qpcPage = await loadQpcHafsPage(page.page);
      const text = qpcHafsTextForPage(qpcPage);
      if (!text) throw new Error("No QPC Hafs text was found for this page.");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const copySelectedVerse = async () => {
    try {
      const qpc = await loadQpcHafsPage(resolveMadinahPageForAyah(surah, ayah));
      const text = qpcHafsTextForVerseKeys(qpc, new Set([surah + ":" + ayah]));
      if (!text) throw new Error("Madinah verse text unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch { setCopied(false); }
  };

  const copyWholeSurah = async () => {
    // Use the Madinah QPC Unicode source, not AhmedGraf / DigitalKhatt.
    const start = resolveMadinahPageForAyah(surah, 1);
    const last = surah < 114 ? resolveMadinahPageForAyah(surah + 1, 1) : 604;
    const seen = new Set<string>();
    const result: string[] = [];
    try {
      for (let pageNo = start; pageNo <= last; pageNo++) {
        const verses = await loadQpcHafsPage(pageNo);
        for (const verse of verses) {
          if (!verse.verse_key.startsWith(surah + ":") || seen.has(verse.verse_key)) continue;
          if (typeof verse.text_qpc_hafs !== "string" || !verse.text_qpc_hafs.trim()) continue;
          seen.add(verse.verse_key);
          result.push(verse.text_qpc_hafs.trim());
        }
      }
      if (!result.length) throw new Error("Madinah surah text unavailable");
      await navigator.clipboard.writeText(result.join("\n"));
      setCopied(true);
    } catch { setCopied(false); }
  };

  useEffect(() => {
    if (!page) return;
    loadQpcHafsPage(page.page).catch(() => undefined);
  }, [page]);

  useLayoutEffect(() => {
    setScale(initialQuranDisplayScale(
      window.localStorage.getItem("qalam-madinah-display-scale"),
      window.matchMedia("(max-width: 639px)").matches,
    ));
  }, []);

  useQuranKeyboardNavigation({
    onPreviousAyah: () => {
      const next = adjacentAyah(surah, ayah, -1);
      if (next) navigate(next.surah, next.ayah);
    },
    onNextAyah: () => {
      const next = adjacentAyah(surah, ayah, 1);
      if (next) navigate(next.surah, next.ayah);
    },
    onPreviousPage: () => navigatePage(pageNumber - 1),
    onNextPage: () => navigatePage(pageNumber + 1),
    onPreviousSurah: () => {
      if (surah > 1) navigate(surah - 1, 1);
    },
    onNextSurah: () => {
      if (surah < 114) navigate(surah + 1, 1);
    },
  });

  const submitPage = (event: React.FormEvent) => {
    event.preventDefault();
    navigatePage(Number(pageInput) || pageNumber);
  };

  const pageStart = page ? firstAyah(page) : null;
  const pageSurah = pageStart?.surah ?? surah;
  const pageJuz = pageStart ? juzForLocation(pageStart.surah, pageStart.ayah) : 1;
  const displaySurahTitle = surahTitle(pageSurah) || SURAH_NAMES[pageSurah - 1] || String(pageSurah);
  const displayJuzTitle = juzTitle(pageJuz) || `Juz ${pageJuz}`;

  if (loadError && !page) {
    return <main className={styles.reader}><div className={styles.error}>{loadError}</div></main>;
  }

  return (
    <main className={`${styles.reader} quran-reader`} dir="ltr">
      <div className={`${styles.container} quran-reader-container`}>
        <EditionTopBar editionId="madinah-v2" surah={surah} ayah={ayah} />

        <div className={`${styles.grid} quran-reader-layout`}>
          <aside className={`${styles.sidebar} tanzil-sidebar quran-reader-sidebar order-2 w-full min-w-0 lg:order-1 lg:w-[200px] lg:self-start`} lang={language} dir={language === "ur" ? "rtl" : "ltr"}>
            <QuranSidebarSection title={copy.search} defaultOpen><form onSubmit={event => {event.preventDefault();runSearch();}}><div className="flex gap-1"><input className="min-w-0 flex-1 border px-2 py-1 text-xs" aria-label={copy.search} value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" className="border bg-white px-2 py-1 text-xs">{copy.search}</button></div>{searched && <div className={styles.results}>{hits.length ? hits.map(hit => <button key={`${hit.surah}:${hit.ayah}`} type="button" className={styles.result} onClick={() => navigate(hit.surah,hit.ayah)}>{SURAH_NAMES[hit.surah-1]} — {easternDigits(hit.ayah)}</button>) : copy.noResults}</div>}</form></QuranSidebarSection>
            <QuranSidebarSection title={copy.browse} defaultOpen><div className="space-y-2">
              <label className={styles.label}>{copy.surah}<select className={styles.input} value={surah} onChange={e => navigate(Number(e.target.value),1)}>{SURAH_NAMES.map((name,i)=><option key={i} value={i+1}>{i+1}. {name}</option>)}</select></label>
              <label className={styles.label}>{copy.ayah}<select className={styles.input} value={ayah} onChange={e => navigate(surah,Number(e.target.value))}>{Array.from({length:HAFS_AYAH_COUNTS[surah-1] ?? 7},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
              <label className={styles.label}>{copy.juz}<select className={styles.input} value={pageJuz} onChange={e => {const ref=JUZ_STARTS[Number(e.target.value)-1];if(ref)navigate(ref.surah,ref.ayah);}}>{Array.from({length:30},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
              <label className={styles.label}>{copy.page}<select className={styles.input} value={pageNumber} onChange={e => navigatePage(Number(e.target.value))}>{Array.from({length:604},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
            </div></QuranSidebarSection>
            <QuranSidebarSection title={copy.copy}><button type="button" className={styles.secondary} onClick={() => void copyCurrentPage()}>{copied ? copy.copyDone : copy.copy}</button></QuranSidebarSection>
            <QuranSidebarSection title={copy.display}><label className={styles.label}>{copy.size}<select className={styles.input} aria-label={copy.size} value={scale} onChange={e => chooseScale(Number(e.target.value))}><option value={0.85}>{copy.small}</option><option value={1}>{copy.medium}</option><option value={1.12}>{copy.large}</option></select></label></QuranSidebarSection>
            <div className="border-t border-[#d0d4cc] bg-white px-2 py-2 text-xs">{language === "ur" ? "صفحہ بدلنے کے لیے دائیں اور بائیں تیر استعمال کریں۔" : "Use left and right arrow keys to turn pages."}</div>
          </aside>

          <section className="quran-reader-main order-1 min-w-0 lg:order-2">
            <div className="quran-page-shell">
              <QuranPageMeta surah={pageSurah} juz={pageJuz} pageNumber={pageNumber}
                previousDisabled={pageNumber <= 1} nextDisabled={pageNumber >= 604}
                onPreviousPage={() => navigatePage(pageNumber - 1)}
                onNextPage={() => navigatePage(pageNumber + 1)} />
              <article className={`${styles.page} quran-page`} onCopyCapture={handlePageCopy}>
                <QuranCorner position="top-left" />
                <QuranCorner position="top-right" />
                <QuranCorner position="bottom-left" />
                <QuranCorner position="bottom-right" />
              <div className={styles.pageLines} style={{ ["--mushaf-scale" as string]: String(scale) }}>
                {page ? page.lines.map((line) => {
                  if (line.type === "blank") return null;
                  if (line.type === "surah_name") {
                    return line.decor?.surah ? <SurahBand key={line.line} surah={line.decor.surah} /> : null;
                  }
                  if (line.type === "basmallah") {
                    return <div key={line.line} className={`${styles.line} ${styles.centeredLine}`} dir="rtl"><span className={styles.basmala}>{MADINAH_BASMALA_GLYPH}</span></div>;
                  }
                  return (
                    <div
                      key={line.line}
                      className={`${styles.line} ${line.centered ? styles.centeredLine : ""}`}
                      style={{ fontFamily }}
                      dir="rtl"
                    >
                      {line.words.map((word) => (
                        <span key={word.word_id} className={styles.word} data-quran-location={word.location}>
                          {word.qpcV2}
                        </span>
                      ))}
                    </div>
                  );
                }) : <div className={styles.loading}>Loading page…</div>}
              </div>

            </article>
              <QuranPageButtons previous={copy.previousPage} next={copy.nextPage} disablePrevious={pageNumber <= 1} disableNext={pageNumber >= 604} onPrevious={() => navigatePage(pageNumber - 1)} onNext={() => navigatePage(pageNumber + 1)} />

            </div>
            <div className={styles.credit}>
              {copy.madinahCredit}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
