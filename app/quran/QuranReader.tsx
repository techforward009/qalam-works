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

function href(surah: number, ayah: number): string {
  return `/quran/${surah}/${ayah}`;
}

export default function QuranReader({
  surah,
  ayah,
}: {
  surah: number;
  ayah: number;
}) {
  const router = useRouter();
  const current = getReaderAyah(surah, ayah);
  const page = pageOf(surah, ayah);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ReturnType<typeof searchQuran>>([]);
  const [searched, setSearched] = useState(false);
  const [panel, setPanel] = useState<"browse" | "search" | null>(null);
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  const ayahs = useMemo(
    () => (page ? ayahsOnPage(page.page) : []),
    [page],
  );

  const juz = juzOf(surah, ayah);
  const pages = pageCount();

  useEffect(() => {
    document
      .getElementById(`ayah-${surah}-${ayah}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [surah, ayah]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!page) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;

      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.ctrlKey && event.key === "ArrowLeft") {
        event.preventDefault();

        const next = adjacentAyah(surah, ayah, 1);

        if (next && next.surah !== surah) {
          router.push(href(next.surah, next.ayah));
        }

        return;
      }

      if (event.ctrlKey && event.key === "ArrowRight") {
        event.preventDefault();

        const previous = adjacentAyah(surah, ayah, -1);

        if (previous && previous.surah !== surah) {
          router.push(href(previous.surah, previous.ayah));
        }

        return;
      }

      if (event.altKey) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();

          const next = adjacentPage(page.page, 1);

          if (next) {
            router.push(href(next.surahStart, next.ayahStart));
          }

          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();

          const previous = adjacentPage(page.page, -1);

          if (previous) {
            router.push(href(previous.surahStart, previous.ayahStart));
          }

          return;
        }
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        const previous = adjacentAyah(surah, ayah, -1);

        if (previous) {
          router.push(href(previous.surah, previous.ayah));
        }

        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        const next = adjacentAyah(surah, ayah, 1);

        if (next) {
          router.push(href(next.surah, next.ayah));
        }

        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();

        const next = adjacentPage(page.page, 1);

        if (next) {
          router.push(href(next.surahStart, next.ayahStart));
        }

        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        const previous = adjacentPage(page.page, -1);

        if (previous) {
          router.push(href(previous.surahStart, previous.ayahStart));
        }
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [ayah, page, router, surah]);

  if (!current || !page) return null;

  const go = (next: { surah: number; ayah: number } | null) => {
    if (next) {
      router.push(href(next.surah, next.ayah));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyPageText(page.page));
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main
      className="min-h-screen bg-[#eee8dc] text-[#241910]"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-[860px] px-3 py-4 sm:px-5 sm:py-7">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-naskh text-xs tracking-[0.08em] text-[#7f6b50]">
              Qalam Works
            </p>

            <h1
              className="font-naskh text-[1.45rem] leading-tight text-[#382a1b] sm:text-[1.7rem]"
              lang="ar"
            >
              قرآن کریم
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarButton
              active={panel === "browse"}
              label={panel === "browse" ? "Close browse" : "Browse"}
              onClick={() =>
                setPanel((currentPanel) =>
                  currentPanel === "browse" ? null : "browse",
                )
              }
            >
              براؤز
            </ToolbarButton>

            <ToolbarButton
              active={panel === "search"}
              label={panel === "search" ? "Close search" : "Search"}
              onClick={() =>
                setPanel((currentPanel) =>
                  currentPanel === "search" ? null : "search",
                )
              }
            >
              تلاش
            </ToolbarButton>
          </div>
        </header>

        {panel === "search" && (
          <section className="mb-4 border-y border-[#b99a61]/40 bg-[#f7f2e8]/70 px-3 py-3 sm:px-4">
            <form
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
                  className="min-w-0 flex-1 border border-[#b99a61]/45 bg-[#fffdf8] px-3 py-2 font-naskh text-lg text-[#2f2418] outline-none transition focus:border-[#8c6d35] focus:ring-1 focus:ring-[#8c6d35]/20"
                />

                <button
                  type="submit"
                  className="border border-[#8c6d35]/55 bg-[#f8f2e5] px-4 py-2 font-naskh text-base text-[#3b2b19] transition hover:bg-[#eee2cb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c6d35]"
                >
                  تلاش
                </button>
              </label>
            </form>

            <ul className="mt-3 max-h-52 space-y-1 overflow-auto">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={href(hit.surah, hit.ayah)}
                    className="block rounded px-2 py-1.5 font-naskh text-base text-[#4b3925] transition hover:bg-[#eee2cb]"
                  >
                    {surahTitle(hit.surah)} — {easternDigits(hit.ayah)}
                  </Link>
                </li>
              ))}

              {searched && hits.length === 0 && (
                <li className="px-2 py-1 font-naskh text-sm text-[#7c6950]">
                  کوئی نتیجہ نہیں ملا۔
                </li>
              )}
            </ul>
          </section>
        )}

        {panel === "browse" && (
          <section
            className="mb-5 border-y border-[#b99a61]/40 bg-[#f7f2e8]/70 px-3 py-3 sm:px-4"
            dir="ltr"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

                  if (start) {
                    go(start);
                  }
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
          </section>
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
          className="mx-auto mt-3 flex w-full max-w-[770px] flex-wrap items-center justify-between gap-3 px-1"
          dir="ltr"
        >
          <div className="flex items-center gap-1">
            <NavButton
              label="Previous page"
              disabled={!adjacentPage(page.page, -1)}
              onClick={() => {
                const previous = adjacentPage(page.page, -1);

                if (previous) {
                  go({
                    surah: previous.surahStart,
                    ayah: previous.ayahStart,
                  });
                }
              }}
            >
              ‹
            </NavButton>

            <span className="px-2 text-sm text-[#756248]">
              {easternDigits(page.page)}
            </span>

            <NavButton
              label="Next page"
              disabled={!adjacentPage(page.page, 1)}
              onClick={() => {
                const next = adjacentPage(page.page, 1);

                if (next) {
                  go({
                    surah: next.surahStart,
                    ayah: next.ayahStart,
                  });
                }
              }}
            >
              ›
            </NavButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <label className="flex items-center text-sm text-[#6b5940]">
              <span>Scale</span>

              <select
                className="ms-2 border border-[#b99a61]/45 bg-[#f7f2e8] px-2 py-1 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c6d35]"
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
              className="border border-[#b99a61]/45 bg-[#f7f2e8] px-3 py-1.5 text-sm text-[#4e3c27] transition hover:bg-[#eee2cb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c6d35]"
              onClick={copy}
            >
              {copied ? "Copied" : "Copy page"}
            </button>
          </div>
        </div>

        <details
          className="mx-auto mt-5 max-w-[770px] border-t border-[#b99a61]/30 pt-3 font-naskh text-sm text-[#78664e]"
          dir="ltr"
        >
          <summary className="cursor-pointer select-none">
            Source & reader information
          </summary>

          <p className="mt-2 leading-6">
            Indo-Pak Quran Text, version 1.0. Source:{" "}
            <a
              className="underline underline-offset-2"
              href="http://ahmedgraf.com"
              target="_blank"
              rel="noreferrer"
            >
              ahmedgraf.com
            </a>
            . Page count ({pages}) is the Qalam layout profile{" "}
            {QURAN_LAYOUT_PROFILE.id}, not a 604-page or Taj page count. PDMS
            Saleem is not bundled. The production face is{" "}
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
      className="quran-page relative w-full overflow-hidden rounded-[2px] border border-[#b49661] bg-[#fcf8ef] px-4 py-5 shadow-[0_10px_30px_rgba(91,67,31,0.12),inset_0_0_0_1px_#fffdf8,inset_0_0_0_5px_#eee0c4] sm:px-[58px] sm:py-9"
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
      <div
        className="pointer-events-none absolute inset-[8px] border border-[#c4a36a]/35"
        aria-hidden="true"
      />

      <header
        className="relative mb-7 border-b border-[#b99a61]/55 pb-3 font-naskh text-[#4a3822]"
        dir="ltr"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="text-left text-base leading-tight sm:text-lg">
            {surahTitle(surah)}
          </div>

          <div className="flex items-center gap-1">
            <PageArrow
              direction="previous"
              label="Previous page"
              disabled={!adjacentPage(pageNumber, -1)}
              onClick={onPreviousPage}
            />

            <span className="min-w-12 px-1 text-center text-lg text-[#4a3822] sm:text-xl">
              {easternDigits(pageNumber)}
            </span>

            <PageArrow
              direction="next"
              label="Next page"
              disabled={!adjacentPage(pageNumber, 1)}
              onClick={onNextPage}
            />
          </div>

          <div className="text-right text-base leading-tight sm:text-lg">
            {juzTitle(juzOf(surah, ayah))}
          </div>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-[650px]">
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
            const active = block.surah === surah && block.ayah === ayah;

            return (
              <p
                key={`${idPrefix}b-${block.id}`}
                id={
                  block.anchor
                    ? `${idPrefix}ayah-${block.surah}-${block.ayah}`
                    : undefined
                }
                className={`mb-6 text-center text-[1.3rem] leading-[2.05] sm:text-[1.4rem] ${
                  active && block.anchor
                    ? "rounded-sm bg-[#f5ecd9] ring-1 ring-[#c4a36a]/20"
                    : ""
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
              className="mb-2 text-right"
              style={{
                lineHeight: QURAN_LAYOUT_PROFILE.lineHeight,
                unicodeBidi: "plaintext",
                textAlign: "justify",
                textJustify: "inter-word",
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
                    className={`quran-ayah inline rounded-sm ${
                      item.anchor &&
                      item.surah === surah &&
                      item.ayah === ayah
                        ? "bg-[#f5ecd9] ring-1 ring-[#c4a36a]/25"
                        : ""
                    }`}
                    style={{
                      boxDecorationBreak: "clone",
                      WebkitBoxDecorationBreak: "clone",
                    }}
                  >
                    {item.text}
                  </span>
                </span>
              ))}
            </p>
          );
        })}
      </div>

      <footer className="mt-8 border-t border-[#b99a61]/40 pt-3">
        <div className="flex items-center justify-center gap-2" dir="ltr">
          <PageArrow
            direction="previous"
            label="Previous page"
            disabled={!adjacentPage(pageNumber, -1)}
            onClick={onPreviousPage}
          />

          <span className="px-3 font-naskh text-sm text-[#6f5b40]">
            {easternDigits(pageNumber)}
          </span>

          <PageArrow
            direction="next"
            label="Next page"
            disabled={!adjacentPage(pageNumber, 1)}
            onClick={onNextPage}
          />
        </div>
      </footer>
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

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`border px-3 py-1.5 font-naskh text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c6d35] ${
        active
          ? "border-[#8c6d35]/65 bg-[#e9ddc5] text-[#352718]"
          : "border-transparent text-[#6f5c43] hover:border-[#b99a61]/35 hover:bg-[#f5efe3]"
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
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border border-transparent px-2.5 py-1.5 font-naskh text-sm text-[#5c4a32] transition hover:border-[#b99a61]/35 hover:bg-[#f5efe3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c6d35] disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function PageArrow({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center border border-transparent text-xl leading-none text-[#6a5638] transition hover:border-[#b99a61]/35 hover:bg-[#f5efe3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c6d35] disabled:pointer-events-none disabled:opacity-30"
    >
      {direction === "previous" ? "‹" : "›"}
    </button>
  );
}

function SurahBand({ name }: { name: string }) {
  return (
    <div className="mx-auto my-7 flex max-w-[560px] items-center gap-3 px-1">
      <BandRule />

      <div className="shrink-0 border-y border-[#a78445]/80 px-5 py-1 font-naskh text-[1.28rem] leading-normal text-[#49361f] sm:text-[1.38rem]">
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
      <span className="h-px flex-1 bg-[#a78445]/75" />

      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5 shrink-0"
        fill="currentColor"
      >
        <path d="M6 0 L12 6 L6 12 L0 6 Z" />
      </svg>

      <span className="h-px flex-1 bg-[#a78445]/75" />
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
        className="mt-1 w-full border border-[#b99a61]/45 bg-[#fffdf8] px-2 py-1.5 text-sm text-[#463621] outline-none focus-visible:border-[#8c6d35] focus-visible:ring-1 focus-visible:ring-[#8c6d35]/20"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {children}
      </select>
    </label>
  );
}
