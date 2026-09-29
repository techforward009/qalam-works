"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HAFS_AYAH_COUNTS } from "../tools/arabic-diacritics/quran/hafsCounts";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import { easternDigits, juzTitle, surahTitle, SURAH_NAMES } from "./reader/metadata";
import {
  adjacentAyah,
  adjacentPage,
  ayahsOnPage,
  copyPageText,
  displayPieces,
  getReaderAyah,
  juzOf,
  juzStart,
  pageByNumber,
  pageCount,
  pageOf,
  searchQuran,
} from "./reader/model";
import { QURAN_FONT_STACK, QURAN_LAYOUT_PROFILE } from "./reader/profile";

// ── Surgical Fix for Specific Glyph Collisions ─────────────────────────────
// Isolates critical marks to prevent font ligature errors (e.g., Madda vs Small Qaf)
const CRITICAL_MARKS = /([\u06D6-\u06DC\u06DF-\u06ED])/g; 
// Range includes: ۗۘۙۚۛۜ۝۞ۣ۟۠ۡۢۤۥۦۧۨ۩ۭ۫۬

function renderQuranText(text: string): React.ReactNode {
  const parts = text.split(CRITICAL_MARKS);
  
  // Fast path: if no critical marks found, return original string
  if (parts.length === 1) {
    return text;
  }

  const nodes: React.ReactNode[] = [];
  parts.forEach((part, index) => {
    if (!part) return;
    
    // If this part matches a critical mark
    if (CRITICAL_MARKS.test(part)) {
      nodes.push(
        <span 
          key={`m-${index}`} 
          className="quran-isolated-mark"
          aria-hidden="true"
        >
          {part}
        </span>
      );
    } else {
      // Normal text chunk
      nodes.push(part);
    }
  });

  return <>{nodes}</>;
}

function href(surah: number, ayah: number): string {
  return `/quran/${surah}/${ayah}`;
}

export default function QuranReader({ surah, ayah }: { surah: number; ayah: number }) {
  const router = useRouter();
  const current = getReaderAyah(surah, ayah);
  const page = pageOf(surah, ayah);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ReturnType<typeof searchQuran>>([]);
  const [searched, setSearched] = useState(false);
  const [panel, setPanel] = useState<"browse" | "search" | null>("browse");
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const ayahs = useMemo(() => (page ? ayahsOnPage(page.page) : []), [page]);
  const juz = juzOf(surah, ayah);
  const pages = pageCount();

  useEffect(() => {
    document
      .getElementById(`ayah-${surah}-${ayah}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [surah, ayah]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.key === "ArrowLeft" && page) {
        const next = adjacentPage(page.page, 1);
        if (next) router.push(href(next.surahStart, next.ayahStart));
      }

      if (event.altKey && event.key === "ArrowRight" && page) {
        const previous = adjacentPage(page.page, -1);
        if (previous) router.push(href(previous.surahStart, previous.ayahStart));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, router]);

  if (!current || !page) return null;

  const go = (next: { surah: number; ayah: number } | null) => {
    if (next) router.push(href(next.surah, next.ayah));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyPageText(page.page));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="bg-[#e6dece] text-[#241910]" dir="rtl">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3" dir="ltr">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#7a6852]">
              Qalam Works
            </p>
            <h1 className="font-naskh text-2xl text-[#3d2e1a]" dir="rtl" lang="ar">
              قرآن کریم
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className={tabClass(panel === "browse")}
              onClick={() => setPanel(panel === "browse" ? null : "browse")}
            >
              Browse
            </button>

            <button
              type="button"
              className={tabClass(panel === "search")}
              onClick={() => setPanel(panel === "search" ? null : "search")}
            >
              Search
            </button>
          </div>
        </div>

        {panel === "search" && (
          <form
            className="mb-3 border-b border-[#c4a36a]/40 pb-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSearched(true);
              setHits(searchQuran(query));
            }}
          >
            <label className="flex gap-2" dir="rtl">
              <span className="sr-only">Search the Quran</span>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 border border-[#c4a36a]/40 bg-[#fbf6ea] px-3 py-2 font-naskh text-lg"
              />

              <button
                type="submit"
                className="border border-[#3d2e1a]/30 px-4 py-2 text-sm text-[#3d2e1a]"
              >
                ابحث
              </button>
            </label>

            <ul className="mt-3 max-h-48 space-y-1 overflow-auto">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={href(hit.surah, hit.ayah)}
                    className="block rounded px-2 py-1 font-naskh hover:bg-[#f3e2b8]"
                  >
                    {surahTitle(hit.surah)} — {easternDigits(hit.ayah)}
                  </Link>
                </li>
              ))}

              {searched && hits.length === 0 && (
                <li className="px-2 text-sm text-[#6d5a3c]">لا نتيجة</li>
              )}
            </ul>
          </form>
        )}

        {panel === "browse" && (
          <div
            className="mb-4 grid grid-cols-2 gap-2 border-b border-[#c4a36a]/40 pb-3 sm:grid-cols-4"
            dir="ltr"
          >
            <Select
              label="Surah"
              value={surah}
              onChange={(value) => go({ surah: value, ayah: 1 })}
            >
              {SURAH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {index + 1}. {name}
                </option>
              ))}
            </Select>

            <Select
              label="Ayah"
              value={ayah}
              onChange={(value) => go({ surah, ayah: value })}
            >
              {Array.from(
                { length: HAFS_AYAH_COUNTS[surah - 1] ?? 0 },
                (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1}
                  </option>
                ),
              )}
            </Select>

            <Select
              label="Juz"
              value={juz}
              onChange={(value) => {
                const start = juzStart(value);
                if (start) go(start);
              }}
            >
              {Array.from({ length: 30 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </Select>

            <Select
              label="Page"
              value={page.page}
              onChange={(value) => {
                const ref = pageByNumber(value);
                if (ref) {
                  go({
                    surah: ref.surahStart,
                    ayah: ref.ayahStart,
                  });
                }
              }}
            >
              {Array.from({ length: pages }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex justify-center">
          <QuranPageSurface
            surah={surah}
            ayah={ayah}
            pageNumber={page.page}
            ayahs={ayahs}
            fontFamily={QURAN_FONT_STACK}
            scale={scale}
            onPreviousPage={() => {
              const previous = adjacentPage(page.page, -1);
              if (previous) {
                go({
                  surah: previous.surahStart,
                  ayah: previous.ayahStart,
                });
              }
            }}
            onNextPage={() => {
              const next = adjacentPage(page.page, 1);
              if (next) {
                go({
                  surah: next.surahStart,
                  ayah: next.ayahStart,
                });
              }
            }}
          />
        </div>

        <div
          className="mx-auto mt-3 flex max-w-[760px] flex-wrap items-center justify-between gap-2 text-[#5c4a32]"
          dir="ltr"
        >
          <div className="flex gap-2">
            <NavButton
              label="Previous ayah"
              disabled={!adjacentAyah(surah, ayah, -1)}
              onClick={() => go(adjacentAyah(surah, ayah, -1))}
            >
              الآية السابقة
            </NavButton>

            <NavButton
              label="Next ayah"
              disabled={!adjacentAyah(surah, ayah, 1)}
              onClick={() => go(adjacentAyah(surah, ayah, 1))}
            >
              الآية التالية
            </NavButton>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm">
              Scale
              <select
                className="ms-2 border border-[#c4a36a]/50 bg-transparent px-2 py-1"
                value={scale}
                aria-label="Display scale"
                onChange={(event) => setScale(Number(event.target.value))}
              >
                <option value={0.85}>Small</option>
                <option value={1}>Medium</option>
                <option value={1.12}>Large</option>
              </select>
            </label>

            <button
              type="button"
              className="border border-[#c4a36a]/50 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2e1a]"
              onClick={copy}
            >
              {copied ? "Copied" : "Copy page"}
            </button>
          </div>
        </div>

        <details className="mt-6 text-sm text-[#6d5a3c]" dir="ltr">
          <summary>Source</summary>

          <p className="mt-2">
            Indo-Pak Quran Text, version 1.0. Source:{" "}
            <a className="underline" href="http://ahmedgraf.com">
              ahmedgraf.com
            </a>.
            Page count ({pages}) is the Qalam layout profile{" "}
            {QURAN_LAYOUT_PROFILE.id}, not a 604-page or Taj page count.
            PDMS Saleem is not bundled. The production face is{" "}
            {QURAN_LAYOUT_PROFILE.productionFont}.
          </p>
        </details>
      </div>
    </main>
  );
}

function QuranPageSurface({
  surah,
  ayah,
  pageNumber,
  ayahs,
  fontFamily,
  scale,
  idPrefix = "",
  faceLabel,
  onPreviousPage,
  onNextPage,
}: {
  surah: number;
  ayah: number;
  pageNumber: number;
  ayahs: readonly QuranAyah[];
  fontFamily: string;
  scale: number;
  idPrefix?: string;
  faceLabel?: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  const blocks = blocksFor(ayahs);

  return (
    <article
      className="w-full border border-[#c4a36a] bg-[#fbf6ea] px-4 py-6 shadow-[inset_0_0_0_1px_#fbf6ea,inset_0_0_0_4px_#e7d3ae] sm:px-12 sm:py-8"
      style={{
        maxWidth: QURAN_LAYOUT_PROFILE.pageWidthPx,
        minHeight: QURAN_LAYOUT_PROFILE.pageMinHeightPx,
        fontFamily,
        fontSize: `${Math.round(QURAN_LAYOUT_PROFILE.fontSizePx * scale)}px`,
      }}
      lang="ar"
      data-qalam-page={pageNumber}
      data-qalam-face={faceLabel}
    >
      <header
        className="mb-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 border-b border-[#c4a36a]/80 pb-3 font-naskh text-[#3d2e1a]"
        dir="ltr"
      >
        <div className="text-left text-base leading-tight sm:text-xl">
          {surahTitle(surah)}
        </div>

        <div className="flex items-center gap-1">
          <NavButton
            label="Previous page"
            disabled={!adjacentPage(pageNumber, -1)}
            onClick={onPreviousPage}
          >
            ‹
          </NavButton>

          <span className="min-w-12 text-center text-xl sm:text-2xl">
            {easternDigits(pageNumber)}
          </span>

          <NavButton
            label="Next page"
            disabled={!adjacentPage(pageNumber, 1)}
            onClick={onNextPage}
          >
            ›
          </NavButton>
        </div>

        <div className="text-right text-base leading-tight sm:text-xl">
          {juzTitle(juzOf(surah, ayah))}
        </div>
      </header>

      {blocks.map((block) => {
        if (block.kind === "surah") {
          return (
            <SurahBand
              key={`${idPrefix}s-${block.surah}`}
              name={surahTitle(block.surah)}
            />
          );
        }

        if (block.kind === "bismillah") {
          const active =
            block.surah === surah && block.ayah === ayah;

          return (
            <p
              key={`${idPrefix}b-${block.id}`}
              id={
                block.anchor
                  ? `${idPrefix}ayah-${block.surah}-${block.ayah}`
                  : undefined
              }
              className={`mb-6 text-center text-[1.35rem] leading-relaxed ${
                active && block.anchor ? "bg-[#f3ead4]" : ""
              }`}
            >
              {block.text}
            </p>
          );
        }

        return (
          <p
            key={`${idPrefix}${block.ids}`}
            dir="rtl"
            lang="ar"
            className="mb-2 text-justify"
            style={{
              lineHeight: QURAN_LAYOUT_PROFILE.lineHeight,
              unicodeBidi: "plaintext",
            }}
          >
            {block.ayahs.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? " " : ""}

                <span
                  id={
                    item.anchor
                      ? `${idPrefix}ayah-${item.surah}-${item.ayah}`
                      : undefined
                  }
                  className={`quran-ayah inline ${
                    item.anchor &&
                    item.surah === surah &&
                    item.ayah === ayah
                      ? "bg-[#f3ead4]"
                      : ""
                  }`}
                  style={{
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                  }}
                >
                  {/* --- CHANGE HERE: Use renderQuranText helper --- */}
                  {renderQuranText(item.text)}
                </span>
              </span>
            ))}
          </p>
        );
      })}
    </article>
  );
}

export { QuranPageSurface };

function blocksFor(ayahs: readonly QuranAyah[]) {
  const blocks: Array<
    | { kind: "surah"; surah: number }
    | {
        kind: "bismillah";
        id: string;
        surah: number;
        ayah: number;
        text: string;
        anchor: boolean;
      }
    | {
        kind: "flow";
        ids: string;
        ayahs: {
          id: string;
          surah: number;
          ayah: number;
          text: string;
          anchor: boolean;
        }[];
      }
  > = [];

  let flow: {
    id: string;
    surah: number;
    ayah: number;
    text: string;
    anchor: boolean;
  }[] = [];

  const flush = () => {
    if (flow.length === 0) return;

    blocks.push({
      kind: "flow",
      ids: flow.map((item) => item.id).join("-"),
      ayahs: flow,
    });

    flow = [];
  };

  for (const ayah of ayahs) {
    const pieces = displayPieces(ayah);

    if (ayah.surah === 1 && ayah.ayah === 1) {
      flush();

      blocks.push({
        kind: "surah",
        surah: 1,
      });

      blocks.push({
        kind: "bismillah",
        id: ayah.id,
        surah: 1,
        ayah: 1,
        text: ayah.text,
        anchor: true,
      });

      continue;
    }

    if (ayah.ayah === 1) {
      flush();

      blocks.push({
        kind: "surah",
        surah: ayah.surah,
      });
    }

    if (pieces[0]?.kind === "bismillah") {
      flush();

      blocks.push({
        kind: "bismillah",
        id: ayah.id,
        surah: ayah.surah,
        ayah: ayah.ayah,
        text: pieces[0].text,
        anchor: false,
      });

      flow.push({
        id: ayah.id,
        surah: ayah.surah,
        ayah: ayah.ayah,
        text: pieces[1]?.text ?? "",
        anchor: true,
      });

      continue;
    }

    flow.push({
      id: ayah.id,
      surah: ayah.surah,
      ayah: ayah.ayah,
      text: pieces[0]?.text ?? ayah.text,
      anchor: true,
    });
  }

  flush();

  return blocks;
}

function tabClass(active: boolean): string {
  return `px-3 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2e1a] ${
    active
      ? "border-b border-[#3d2e1a] text-[#241910]"
      : "text-[#7a6852]"
  }`;
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="px-2 py-1 text-sm text-[#5c4a32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2e1a] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SurahBand({ name }: { name: string }) {
  return (
    <div className="mx-auto my-4 flex max-w-md items-center gap-3">
      <BandRule />

      <div className="shrink-0 border-y border-[#a78445] px-5 py-1 text-center text-[1.35rem] leading-normal">
        {name}
      </div>

      <BandRule />
    </div>
  );
}

function BandRule() {
  return (
    <span
      className="flex min-w-8 flex-1 items-center gap-1 text-[#a78445]"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-[#a78445]" />

      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5 shrink-0"
        fill="currentColor"
      >
        <path d="M6 0 L12 6 L6 12 L0 6 Z" />
      </svg>

      <span className="h-px flex-1 bg-[#a78445]" />
    </span>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-xs text-[#6d5a3c]">
      {label}

      <select
        aria-label={label}
        className="mt-1 w-full border border-[#c4a36a]/40 bg-transparent px-2 py-1 text-sm"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {children}
      </select>
    </label>
  );
}
