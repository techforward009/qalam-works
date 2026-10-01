"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SURAH_NAMES, JUZ_STARTS, easternDigits, juzTitle, surahTitle } from "../reader/metadata";
import { useLanguage } from "../../lib/language-context";
import { TANZIL_PAGE_STARTS } from "../reader/tanzilPageMap";
import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
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

type Hit = { surah: number; ayah: number; page: number };

const FONT_PREFIX = "QalamMadinahV2";
const FONT_READY = new Set<number>();
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
  if (!FONT_READY.has(page) && typeof FontFace !== "undefined") {
    const font = new FontFace(family, `url(${fontUrl(page)}) format("woff2")`, {
      display: "swap",
    });
    await font.load();
    document.fonts.add(font);
    FONT_READY.add(page);
  }
  return family;
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
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<MadinahPage | null>(null);
  const [fontFamily, setFontFamily] = useState(`${FONT_PREFIX}-1`);
  const [pageInput, setPageInput] = useState("1");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loadError, setLoadError] = useState("");

  const navigate = (nextSurah: number, nextAyah: number) => {
    router.push(`/quran/madinah/${nextSurah}/${nextAyah}`);
  };

  const loadPage = async (targetPage: number) => {
    setLoadError("");
    try {
      let response = await fetch(pageUrl(targetPage), { cache: "force-cache" });
      if (!response.ok) {
        response = await fetch(pageUrl(targetPage, true), { cache: "force-cache" });
      }
      if (!response.ok) throw new Error("Page data unavailable");
      const nextPage = (await response.json()) as MadinahPage;
      const [family] = await Promise.all([ensurePageFont(targetPage), ensureBasmalaFont().catch(() => undefined)]);
      setPage(nextPage);
      setPageNumber(targetPage);
      window.sessionStorage.setItem("qalam-madinah-last-page", String(targetPage));
      setFontFamily(family);
    } catch {
      setLoadError(`Page ${targetPage} could not be loaded.`);
    }
  };

  useEffect(() => {
    const resolvePageForAyah = (targetSurah: number, targetAyah: number): number => {
      let resolved = 1;
      for (const [pageNo, startSurah, startAyah] of TANZIL_PAGE_STARTS) {
        if (targetSurah > startSurah || (targetSurah === startSurah && targetAyah >= startAyah)) {
          resolved = pageNo;
        }
      }
      return resolved;
    };

    const target = resolvePageForAyah(surah, ayah);
    setPageNumber(target);
    setPageInput(String(target));
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

  const runSearch = () => {
    const needles = query.split(/\s+/).map(quranMatchKey).filter(Boolean);
    setSearched(true);
    if (!needles.length) {
      setHits([]);
      return;
    }

    const result: Hit[] = [];
    for (const item of ahmedgrafQuranReference.listAyahs()) {
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
    setPageNumber(bounded);
    window.sessionStorage.setItem("qalam-madinah-last-page", String(bounded));
    const target = pageUrl(bounded);
    fetch(target, { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) {
          const remote = await fetch(pageUrl(bounded, true), { cache: "force-cache" });
          if (!remote.ok) throw new Error();
          return remote.json() as Promise<MadinahPage>;
        }
        return response.json() as Promise<MadinahPage>;
      })
      .then(async (next) => {
        const start = firstAyah(next);
        const [family] = await Promise.all([ensurePageFont(bounded), ensureBasmalaFont().catch(() => undefined)]);
        setPage(next);
        setFontFamily(family);
        if (start) navigate(start.surah, start.ayah);
      })
      .catch(() => setLoadError(`Page ${bounded} could not be loaded.`));
  };

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
    <main className={styles.reader} dir="ltr">
      <div className={styles.container}>
        <header className={styles.toolbar}>
          <div>
            <div className={styles.eyebrow}>{MADINAH_V2_EDITION.name}</div>
            <div className={styles.subtle}>{MADINAH_V2_EDITION.subtitle} · 604 pages · 15 lines</div>
          </div>
          <Link href="/quran" className={styles.link}>
            {language === "ur" ? "قرآن کے تمام ایڈیشنز" : "All Quran Editions"}
          </Link>
        </header>

        <div className={styles.grid}>
          <aside className={styles.sidebar}>
            <form onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
              <label className={styles.label}>
                Search Quran
                <input value={query} onChange={(event) => setQuery(event.target.value)} className={styles.input} dir="rtl" lang="ar" />
              </label>
              <button type="submit" className={styles.primary}>Search</button>
            </form>

            {searched && (
              <div className={styles.results}>
                {hits.length ? hits.map((hit) => (
                  <button key={`${hit.surah}:${hit.ayah}`} type="button" className={styles.result} onClick={() => navigate(hit.surah, hit.ayah)}>
                    {SURAH_NAMES[hit.surah - 1] ?? hit.surah} — {easternDigits(hit.ayah)}
                  </button>
                )) : <div className={styles.subtle}>No results.</div>}
              </div>
            )}

            <label className={styles.labelBlock}>
              Surah
              <select value={surah} onChange={(event) => navigate(Number(event.target.value), 1)} className={styles.input}>
                {SURAH_NAMES.map((name, index) => <option key={name} value={index + 1}>{index + 1}. {name}</option>)}
              </select>
            </label>

            <label className={styles.labelBlock}>
              Ayah
              <input type="number" min={1} max={6236} value={ayah} onChange={(event) => navigate(surah, Number(event.target.value) || 1)} className={styles.input} />
            </label>

            <form className={styles.labelBlock} onSubmit={submitPage}>
              <label className={styles.label}>
                Page
                <div className={styles.pageInputRow}>
                  <input type="number" min={1} max={604} value={pageInput} onChange={(event) => setPageInput(event.target.value)} className={styles.input} />
                  <span className={styles.subtle}>/ 604</span>
                </div>
              </label>
              <button type="submit" className={styles.secondary}>Go to page</button>
            </form>

            <div className={styles.metaBlock}>
              Surah <strong>{SURAH_NAMES[pageSurah - 1] ?? pageSurah}</strong><br />
              Juz <strong>{pageJuz}</strong>
            </div>
          </aside>

          <section>
            <div className={styles.pageMeta}>
              <span>{MADINAH_V2_EDITION.name}</span>
              <span>{easternDigits(pageNumber)} / 604</span>
              <span>Juz {pageJuz}</span>
            </div>

            <article className={styles.page}>
              <div className={styles.mushafHeader} dir="ltr" aria-label="Mushaf running headers">
                <div className={`${styles.mushafHeaderSide} ${styles.mushafHeaderLeft}`} dir="rtl">{displaySurahTitle}</div>
                <div className={styles.mushafHeaderPage} aria-label={`Page ${pageNumber}`}>
                  <button type="button" className={styles.pageArrow} disabled={pageNumber <= 1} onClick={() => navigatePage(pageNumber - 1)} aria-label="Previous page">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.pageArrowIcon}>
                      <path d="M14.8 5.2 8 12l6.8 6.8" />
                    </svg>
                  </button>
                  <span className={styles.mushafHeaderNumber}>{easternDigits(pageNumber)}</span>
                  <button type="button" className={styles.pageArrow} disabled={pageNumber >= 604} onClick={() => navigatePage(pageNumber + 1)} aria-label="Next page">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.pageArrowIcon}>
                      <path d="M9.2 5.2 16 12l-6.8 6.8" />
                    </svg>
                  </button>
                </div>
                <div className={`${styles.mushafHeaderSide} ${styles.mushafHeaderRight}`} dir="rtl">{displayJuzTitle}</div>
              </div>

              <div className={styles.pageLines}>
                {page ? page.lines.map((line) => {
                  if (line.type === "blank") return <div key={line.line} className={styles.line} aria-hidden="true" />;
                  if (line.type === "surah_name") {
                    const name = line.decor?.surah ? surahTitle(line.decor.surah) : "";
                    return <div key={line.line} className={`${styles.line} ${styles.surahLine}`} dir="rtl">{name}</div>;
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
                      {line.words.map((word) => <span key={word.word_id} className={styles.word}>{word.qpcV2}</span>)}
                    </div>
                  );
                }) : <div className={styles.loading}>Loading page…</div>}
              </div>

              <div className={styles.navRow}>
                <button type="button" className={styles.secondary} disabled={pageNumber <= 1} onClick={() => navigatePage(pageNumber - 1)}>← Previous page</button>
                <button type="button" className={styles.secondary} disabled={pageNumber >= 604} onClick={() => navigatePage(pageNumber + 1)}>Next page →</button>
              </div>
            </article>

            <div className={styles.credit}>
              Madinah Mushaf fonts/data: King Fahd Glorious Quran Printing Complex · Layout data via QUL · QCF V2 fonts served from Quran Foundation CDN.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
