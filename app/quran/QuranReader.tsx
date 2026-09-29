"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

// ─── Constants ───────────────────────────────────────────────────────────────

const LAST_READ_KEY = "qalam-quran-last-read";
const SCALE_MIN = 0.7;
const SCALE_MAX = 2.0;
const SCALE_STEP = 0.05;

// ─── Waqf-mark render repair (Al Majeed negative side-bearing fix) ──────────
// Visual-only. Underlying text is never modified. copyPageText() is unaffected.
const WAQF_OFFSETS: Record<string, string> = {
  "\u06D6": "translateX(0.51em)", // ۖ
  "\u06D7": "translateX(0.43em)", // ۗ
  "\u06D8": "translateX(0.44em)", // ۘ
  "\u06D9": "translateX(0.46em)", // ۙ
  "\u06DA": "translateX(0.43em)", // ۚ
  "\u06DB": "translateX(0.43em)", // ۛ
  "\u06E5": "translateX(0.53em)", // ۥ
  "\u06E7": "translateX(0.56em)", // ۧ
};

const WAQF_RE = /[\u06D6-\u06DB\u06E5\u06E7]/g;

function renderQuranText(text: string): ReactNode {
  const parts = text.split(WAQF_RE);
  const matches = [...text.matchAll(WAQF_RE)];

  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) nodes.push(parts[i]);

    if (i < matches.length) {
      const ch = matches[i][0];

      nodes.push(
        <span
          key={`w-${i}`}
          className="quran-waqf-mark"
          style={{ transform: WAQF_OFFSETS[ch] }}
          aria-hidden="true"
        >
          {ch}
        </span>,
      );
    }
  }

  return <>{nodes}</>;
}

function href(surah: number, ayah: number): string {
  return `/quran/${surah}/${ayah}`;
}

function loadLastRead(): { surah: number; ayah: number } | null {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.surah === "number" && typeof parsed.ayah === "number") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveLastRead(surah: number, ayah: number): void {
  try {
    localStorage.setItem(LAST_READ_KEY, JSON.stringify({ surah, ayah }));
  } catch {
    /* ignore */
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

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
  const lastSavedRef = useRef("");

  // Save last read position
  useEffect(() => {
    const key = `${surah}:${ayah}`;
    if (key !== lastSavedRef.current) {
      lastSavedRef.current = key;
      saveLastRead(surah, ayah);
    }
  }, [surah, ayah]);

  // Scroll active ayah into view
  useEffect(() => {
    document.getElementById(`ayah-${surah}-${ayah}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [surah, ayah]);

  // Keyboard navigation
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

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3" dir="ltr">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#7a6852]">Qalam Works</p>
            <h1 className="font-naskh text-2xl text-[#3d2e1a]" dir="rtl" lang="ar">قرآن کریم</h1>
          </div>

          <div className="flex gap-1">
            <TabButton active={panel === "browse"} onClick={() => setPanel(panel === "browse" ? null : "browse")}>
              Browse
            </TabButton>
            <TabButton active={panel === "search"} onClick={() => setPanel(panel === "search" ? null : "search")}>
              Search
            </TabButton>
          </div>
        </div>

        {/* ── Search Panel ────────────────────────────────────────────── */}
        {panel === "search" && (
          <form
            className="mb-4 rounded-lg border border-[#c4a36a]/30 bg-[#fbf6ea]/60 p-3"
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
                placeholder="ابحث في القرآن…"
                className="min-w-0 flex-1 rounded border border-[#c4a36a]/40 bg-white px-3 py-2 font-naskh text-lg outline-none focus:border-[#a78445]"
              />

              <button
                type="submit"
                className="rounded border border-[#3d2e1a]/30 bg-[#3d2e1a]/5 px-4 py-2 text-sm font-medium text-[#3d2e1a] hover:bg-[#3d2e1a]/10"
              >
                ابحث
              </button>
            </label>

            <ul className="mt-3 max-h-48 space-y-0.5 overflow-auto rounded">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={href(hit.surah, hit.ayah)}
                    className="block rounded px-3 py-1.5 font-naskh text-sm hover:bg-[#f3e2b8]"
                  >
                    {surahTitle(hit.surah)} — {easternDigits(hit.ayah)}
                  </Link>
                </li>
              ))}

              {searched && hits.length === 0 && (
                <li className="px-3 py-2 text-sm text-[#6d5a3c]">لا نتيجة</li>
              )}
            </ul>
          </form>
        )}

        {/* ── Browse Panel ────────────────────────────────────────────── */}
        {panel === "browse" && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-[#c4a36a]/30 bg-[#fbf6ea]/60 p-3 sm:grid-cols-4" dir="ltr">
            <Select label="Surah" value={surah} onChange={(value) => go({ surah: value, ayah: 1 })}>
              {SURAH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {index + 1}. {name}
                </option>
              ))}
            </Select>

            <Select label="Ayah" value={ayah} onChange={(value) => go({ surah, ayah: value })}>
              {Array.from({ length: HAFS_AYAH_COUNTS[surah - 1] ?? 0 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
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
                if (ref) go({ surah: ref.surahStart, ayah: ref.ayahStart });
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

        {/* ── Quran Page ──────────────────────────────────────────────── */}
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
              if (previous) go({ surah: previous.surahStart, ayah: previous.ayahStart });
            }}
            onNextPage={() => {
              const next = adjacentPage(page.page, 1);
              if (next) go({ surah: next.surahStart, ayah: next.ayahStart });
            }}
          />
        </div>

        {/* ── Controls Toolbar ────────────────────────────────────────── */}
        <div className="mx-auto mt-4 flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-lg border border-[#c4a36a]/30 bg-[#fbf6ea]/60 px-4 py-2.5 text-[#5c4a32]" dir="ltr">
          <div className="flex items-center gap-1">
            <NavButton
              label="Previous ayah"
              disabled={!adjacentAyah(surah, ayah, -1)}
              onClick={() => go(adjacentAyah(surah, ayah, -1))}
            >
              ﴿ الآية السابقة ﴾
            </NavButton>

            <NavButton
              label="Next ayah"
              disabled={!adjacentAyah(surah, ayah, 1)}
              onClick={() => go(adjacentAyah(surah, ayah, 1))}
            >
              ﴿ الآية التالية ﴾
            </NavButton>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#7a6852]">A</span>

              <input
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={SCALE_STEP}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                aria-label="Font size"
                className="h-1.5 w-24 cursor-pointer accent-[#a78445] sm:w-32"
              />

              <span className="text-sm text-[#7a6852]">A</span>
              <span className="min-w-[3ch] text-xs tabular-nums text-[#7a6852]">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <button
              type="button"
              className="rounded border border-[#c4a36a]/50 px-3 py-1.5 text-xs font-medium hover:bg-[#f3e2b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2e1a]"
              onClick={copy}
            >
              {copied ? "✓ Copied" : "Copy page"}
            </button>
          </div>
        </div>

        {/* ── Source Info ─────────────────────────────────────────────── */}
        <details className="mt-6 text-sm text-[#6d5a3c]" dir="ltr">
          <summary className="cursor-pointer select-none hover:text-[#3d2e1a]">
            Source & Layout Info
          </summary>

          <p className="mt-2 leading-relaxed">
            Indo-Pak Quran Text, version 1.0. Source:{" "}
            <a className="underline hover:text-[#3d2e1a]" href="http://ahmedgraf.com">
              ahmedgraf.com
            </a>.
            Page count ({pages}) uses the Qalam layout profile{" "}
            <code className="text-xs">{QURAN_LAYOUT_PROFILE.id}</code>.
            Production font: {QURAN_LAYOUT_PROFILE.productionFont}.
          </p>
        </details>
      </div>
    </main>
  );
}

// ─── Quran Page Surface ──────────────────────────────────────────────────────

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
      className="quran-page w-full bg-[#fbf6ea] px-4 py-6 sm:px-12 sm:py-8"
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
      {/* Mushaf-style double border via CSS (see globals.css .quran-page) */}

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <header
        className="mb-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 border-b-2 border-[#c4a36a]/60 pb-3 font-naskh text-[#3d2e1a]"
        dir="ltr"
      >
        <div className="text-left text-base leading-tight sm:text-xl">
          {surahTitle(surah)}
        </div>

        <div className="flex items-center gap-2">
          <NavButton
            label="Previous page"
            disabled={!adjacentPage(pageNumber, -1)}
            onClick={onPreviousPage}
          >
            ‹
          </NavButton>

          <span className="min-w-14 text-center text-xl font-bold sm:text-2xl">
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

      {/* ── Content Blocks ──────────────────────────────────────────── */}
      {blocks.map((block) => {
        if (block.kind === "surah") {
          return <SurahBand key={`${idPrefix}s-${block.surah}`} name={surahTitle(block.surah)} />;
        }

        if (block.kind === "bismillah") {
          const active = block.surah === surah && block.ayah === ayah;

          return (
            <div key={`${idPrefix}b-${block.id}`} className="my-6">
              <p
                id={block.anchor ? `${idPrefix}ayah-${block.surah}-${block.ayah}` : undefined}
                className={`text-center text-[1.4em] leading-relaxed transition-colors duration-300 ${
                  active && block.anchor ? "rounded bg-[#f3ead4] py-1" : ""
                }`}
              >
                {block.text}
              </p>

              <div
                className="mx-auto mt-3 flex max-w-xs items-center gap-2 text-[#c4a36a]"
                aria-hidden="true"
              >
                <span className="h-px flex-1 bg-[#c4a36a]/50" />
                <svg viewBox="0 0 8 8" className="h-2 w-2">
                  <circle cx="4" cy="4" r="3" fill="currentColor" />
                </svg>
                <span className="h-px flex-1 bg-[#c4a36a]/50" />
              </div>
            </div>
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
                  id={item.anchor ? `${idPrefix}ayah-${item.surah}-${item.ayah}` : undefined}
                  className={`quran-ayah inline rounded-sm transition-colors duration-300 ${
                    item.anchor && item.surah === surah && item.ayah === ayah
                      ? "bg-[#f3ead4] shadow-[inset_0_-2px_0_#c4a36a]"
                      : ""
                  }`}
                  style={{
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                  }}
                >
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

// ─── Block Builder ───────────────────────────────────────────────────────────

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

// ─── UI Primitives ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2e1a] ${
        active
          ? "bg-[#3d2e1a] text-[#fbf6ea]"
          : "text-[#7a6852] hover:bg-[#3d2e1a]/10"
      }`}
    >
      {children}
    </button>
  );
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-2 py-1 text-sm text-[#5c4a32] transition-colors hover:bg-[#f3e2b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d2e1a] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function SurahBand({ name }: { name: string }) {
  return (
    <div
      className="mx-auto my-6 flex max-w-lg items-center gap-3"
      role="heading"
      aria-level={2}
    >
      <OrnamentalRule />

      <div className="shrink-0 border-y-2 border-[#a78445] px-6 py-1.5 text-center text-[1.4rem] leading-normal text-[#3d2e1a]">
        {name}
      </div>

      <OrnamentalRule />
    </div>
  );
}

function OrnamentalRule() {
  return (
    <span
      className="flex min-w-12 flex-1 items-center gap-1.5 text-[#a78445]"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-[#a78445]" />

      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3 shrink-0"
        fill="currentColor"
      >
        <path d="M8 0 L16 8 L8 16 L0 8 Z" />
      </svg>

      <span className="h-px flex-1 bg-[#a78445]" />

      <svg
        viewBox="0 0 8 8"
        className="h-1.5 w-1.5 shrink-0"
        fill="currentColor"
      >
        <circle cx="4" cy="4" r="3" />
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
    <label className="text-xs font-medium text-[#6d5a3c]">
      {label}

      <select
        aria-label={label}
        className="mt-1 w-full rounded border border-[#c4a36a]/40 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#a78445]"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {children}
      </select>
    </label>
  );
}
