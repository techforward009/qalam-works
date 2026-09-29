"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HAFS_AYAH_COUNTS } from "../tools/arabic-diacritics/quran/hafsCounts";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import {
  easternDigits,
  juzTitle,
  surahTitle,
  SURAH_NAMES,
} from "./reader/metadata";
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
import {
  QURAN_FONT_STACK,
  QURAN_LAYOUT_PROFILE,
} from "./reader/profile";

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
      ?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
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
          router.push(
            href(next.surahStart, next.ayahStart),
          );
        }

        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        const previous = adjacentPage(page.page, -1);

        if (previous) {
          router.push(
            href(previous.surahStart, previous.ayahStart),
          );
        }
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [ayah, page, router, surah]);

  if (!current || !page) return null;

  const go = (
    next: { surah: number; ayah: number } | null,
  ) => {
    if (next) {
      router.push(href(next.surah, next.ayah));
    }
  };

  const runSearch = () => {
    setSearched(true);
    setHits(searchQuran(query));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        copyPageText(page.page),
      );

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
      className="min-h-screen bg-[#e8e9df] text-[#262b22]"
      dir="ltr"
    >
      <div className="mx-auto w-full max-w-[1040px] px-3 py-4 sm:px-5 sm:py-7">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-sm border border-[#9eaa91] bg-[#e1e6d8] px-3 py-2 shadow-[0_1px_4px_rgba(50,60,40,0.08)]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#69715f]">
              Qalam Works
            </p>

            <h1
              className="font-naskh text-2xl leading-tight text-[#33402f]"
              dir="rtl"
              lang="ar"
            >
              قرآن کریم
            </h1>
          </div>

          <div
            className="font-naskh text-base text-[#59634f]"
            dir="rtl"
          >
            تنزیل طرز مطالعہ
          </div>
        </header>

        <div
          className="grid items-start gap-4 lg:grid-cols-[180px_minmax(0,770px)]"
          dir="ltr"
        >
          <aside className="tanzil-sidebar">
            <SidebarSection title="تلاش">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <div className="mb-2 flex gap-1">
                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    aria-label="Quran search"
                    className="min-w-0 flex-1 border border-[#aab49f] bg-[#fbfcf2] px-2 py-1 font-naskh text-sm text-[#31382b] outline-none focus:border-[#7f906f]"
                    dir="rtl"
                  />

                  <button
                    type="submit"
                    className="border border-[#89987b] bg-[#e5ebdc] px-2 py-1 font-naskh text-sm text-[#394531] hover:bg-[#dce4d2]"
                  >
                    تلاش
                  </button>
                </div>

                {searched && (
                  <div
                    className="max-h-40 overflow-auto border-t border-[#b9c2ad] pt-1"
                    dir="rtl"
                  >
                    {hits.length === 0 ? (
                      <p className="px-1 py-1 font-naskh text-xs text-[#747c6b]">
                        کوئی نتیجہ نہیں ملا۔
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {hits.map((hit) => (
                          <li key={hit.id}>
                            <Link
                              href={href(
                                hit.surah,
                                hit.ayah,
                              )}
                              className="block px-1 py-1 font-naskh text-xs text-[#46523e] hover:bg-[#e7eddc]"
                            >
                              {surahTitle(hit.surah)} —{" "}
                              {easternDigits(hit.ayah)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </form>
            </SidebarSection>

            <SidebarSection title="براؤز" defaultOpen>
              <div className="space-y-2">
                <Select
                  label="سورۃ"
                  value={surah}
                  onChange={(value) =>
                    go({
                      surah: value,
                      ayah: 1,
                    })
                  }
                >
                  {SURAH_NAMES.map((name, index) => (
                    <option
                      key={name}
                      value={index + 1}
                    >
                      {index + 1}. {name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="آیت"
                  value={ayah}
                  onChange={(value) =>
                    go({
                      surah,
                      ayah: value,
                    })
                  }
                >
                  {Array.from(
                    {
                      length:
                        HAFS_AYAH_COUNTS[surah - 1] ?? 0,
                    },
                    (_, index) => (
                      <option
                        key={index + 1}
                        value={index + 1}
                      >
                        {index + 1}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label="پارہ"
                  value={juz}
                  onChange={(value) => {
                    const start = juzStart(value);

                    if (start) {
                      go(start);
                    }
                  }}
                >
                  {Array.from(
                    { length: 30 },
                    (_, index) => (
                      <option
                        key={index + 1}
                        value={index + 1}
                      >
                        {index + 1}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label="صفحہ"
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
                  {Array.from(
                    { length: pages },
                    (_, index) => (
                      <option
                        key={index + 1}
                        value={index + 1}
                      >
                        {index + 1}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            </SidebarSection>

            <SidebarSection title="آیت کی نقل">
              <button
                type="button"
                className="w-full border border-[#9ca98e] bg-[#eef2e7] px-2 py-1.5 font-naskh text-sm text-[#4c5845] hover:bg-[#e3eadb]"
                onClick={copy}
              >
                {copied ? "نقل ہوگئی" : "موجودہ صفحہ نقل کریں"}
              </button>
            </SidebarSection>

            <SidebarSection title="نمایش">
              <label className="block font-naskh text-xs text-[#68715f]">
                سائز

                <select
                  className="mt-1 w-full border border-[#aab49f] bg-[#fbfcf2] px-2 py-1 text-xs text-[#3e4938] outline-none focus:border-[#7f906f]"
                  value={scale}
                  aria-label="Display scale"
                  onChange={(event) =>
                    setScale(Number(event.target.value))
                  }
                >
                  <option value={0.85}>
                    چھوٹا
                  </option>

                  <option value={1}>
                    درمیانہ
                  </option>

                  <option value={1.12}>
                    بڑا
                  </option>
                </select>
              </label>
            </SidebarSection>

            <div className="mt-3 border border-[#b4bdaa] bg-[#f0f2eb] px-2 py-2">
              <p className="font-naskh text-[11px] leading-5 text-[#737b6d]" dir="rtl">
                ↑ ↓ آیات
                <br />
                ← → صفحات
                <br />
                Ctrl + ← → سورت
              </p>
            </div>
          </aside>

          <section className="min-w-0">
            <QuranPageSurface
              surah={surah}
              ayah={ayah}
              pageNumber={page.page}
              ayahs={ayahs}
              fontFamily={QURAN_FONT_STACK}
              scale={scale}
              onPreviousPage={() => {
                const previous = adjacentPage(
                  page.page,
                  -1,
                );

                if (previous) {
                  go({
                    surah: previous.surahStart,
                    ayah: previous.ayahStart,
                  });
                }
              }}
              onNextPage={() => {
                const next = adjacentPage(
                  page.page,
                  1,
                );

                if (next) {
                  go({
                    surah: next.surahStart,
                    ayah: next.ayahStart,
                  });
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between px-2 font-naskh text-sm text-[#69705f]">
              <button
                type="button"
                disabled={
                  !adjacentPage(page.page, -1)
                }
                onClick={() => {
                  const previous =
                    adjacentPage(
                      page.page,
                      -1,
                    );

                  if (previous) {
                    go({
                      surah:
                        previous.surahStart,
                      ayah:
                        previous.ayahStart,
                    });
                  }
                }}
                className="px-2 py-1 hover:bg-[#dde3d5] disabled:opacity-30"
              >
                ← پچھلا صفحہ
              </button>

              <span>
                {easternDigits(page.page)}
              </span>

              <button
                type="button"
                disabled={
                  !adjacentPage(page.page, 1)
                }
                onClick={() => {
                  const next =
                    adjacentPage(
                      page.page,
                      1,
                    );

                  if (next) {
                    go({
                      surah:
                        next.surahStart,
                      ayah:
                        next.ayahStart,
                    });
                  }
                }}
                className="px-2 py-1 hover:bg-[#dde3d5] disabled:opacity-30"
              >
                اگلا صفحہ →
              </button>
            </div>
          </section>
        </div>

        <details
          className="mx-auto mt-4 max-w-[950px] border-t border-[#b2baa9] pt-3 font-naskh text-xs text-[#747b70]"
          dir="ltr"
        >
          <summary className="cursor-pointer select-none">
            Source & reader information
          </summary>

          <p className="mt-2 leading-5">
            Indo-Pak Quran Text, version 1.0. Source:{" "}
            <a
              className="underline"
              href="http://ahmedgraf.com"
              target="_blank"
              rel="noreferrer"
            >
              ahmedgraf.com
            </a>
            . Page count ({pages}) is the Qalam layout
            profile {QURAN_LAYOUT_PROFILE.id}. The
            Quran source text has not been changed.
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
      className="quran-page relative w-full overflow-hidden"
      style={{
        maxWidth:
          QURAN_LAYOUT_PROFILE.pageWidthPx,
        minHeight:
          QURAN_LAYOUT_PROFILE.pageMinHeightPx,
        fontFamily,
        fontSize: `${Math.round(
          QURAN_LAYOUT_PROFILE.fontSizePx * scale,
        )}px`,
      }}
      lang="ar"
      data-qalam-page={pageNumber}
      data-qalam-face={faceLabel}
    >
      <div className="quran-page-inner">
        <header
          className="relative mb-5 border-b border-[#aab892] pb-2 font-naskh text-[#45543d]"
          dir="ltr"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <div className="text-left text-sm sm:text-base">
              {surahTitle(surah)}
            </div>

            <div className="flex items-center gap-1">
              <PageArrow
                direction="previous"
                label="Previous page"
                disabled={
                  !adjacentPage(
                    pageNumber,
                    -1,
                  )
                }
                onClick={
                  onPreviousPage
                }
              />

              <span className="min-w-12 text-center text-lg sm:text-xl">
                {easternDigits(
                  pageNumber,
                )}
              </span>

              <PageArrow
                direction="next"
                label="Next page"
                disabled={
                  !adjacentPage(
                    pageNumber,
                    1,
                  )
                }
                onClick={onNextPage}
              />
            </div>

            <div className="text-right text-sm sm:text-base">
              {juzTitle(
                juzOf(surah, ayah),
              )}
            </div>
          </div>
        </header>

        <div className="relative mx-auto w-full max-w-[650px]">
          {blocks.map((block) => {
            if (block.kind === "surah") {
              return (
                <SurahBand
                  key={`${idPrefix}s-${block.surah}`}
                  name={surahTitle(
                    block.surah,
                  )}
                />
              );
            }

            if (block.kind === "bismillah") {
              const active =
                block.surah === surah &&
                block.ayah === ayah;

              return (
                <p
                  key={`${idPrefix}b-${block.id}`}
                  id={
                    block.anchor
                      ? `ayah-${block.surah}-${block.ayah}`
                      : undefined
                  }
                  className={`mb-5 text-center text-[1.3rem] leading-[2] sm:text-[1.4rem] ${
                    active &&
                    block.anchor
                      ? "rounded-sm bg-[#edf2d9]"
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
                className="quran-flow"
                style={{
                  lineHeight:
                    QURAN_LAYOUT_PROFILE.lineHeight,
                  unicodeBidi:
                    "plaintext",
                  textAlign:
                    "justify",
                  textJustify:
                    "inter-word",
                }}
              >
                {block.ayahs.map(
                  (item, index) => (
                    <span
                      key={item.id}
                    >
                      {index > 0
                        ? " "
                        : ""}

                      <span
                        id={
                          item.anchor
                            ? `ayah-${item.surah}-${item.ayah}`
                            : undefined
                        }
                        className={`quran-ayah inline ${
                          item.anchor &&
                          item.surah ===
                            surah &&
                          item.ayah ===
                            ayah
                            ? "quran-active-ayah"
                            : ""
                        }`}
                        style={{
                          boxDecorationBreak:
                            "clone",
                          WebkitBoxDecorationBreak:
                            "clone",
                        }}
                      >
                        {item.text}
                      </span>
                    </span>
                  ),
                )}
              </p>
            );
          })}
        </div>

        <footer className="relative mt-5 border-t border-[#aab892] pt-2">
          <div
            className="flex items-center justify-center gap-1"
            dir="ltr"
          >
            <PageArrow
              direction="previous"
              label="Previous page"
              disabled={
                !adjacentPage(
                  pageNumber,
                  -1,
                )
              }
              onClick={
                onPreviousPage
              }
            />

            <span className="px-3 font-naskh text-sm text-[#69775d]">
              {easternDigits(
                pageNumber,
              )}
            </span>

            <PageArrow
              direction="next"
              label="Next page"
              disabled={
                !adjacentPage(
                  pageNumber,
                  1,
                )
              }
              onClick={onNextPage}
            />
          </div>
        </footer>
      </div>
    </article>
  );
}

export { QuranPageSurface };

function blocksFor(
  ayahs: readonly QuranAyah[],
) {
  const blocks: Array<
    | {
        kind: "surah";
        surah: number;
      }
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
      ids: flow
        .map((item) => item.id)
        .join("-"),
      ayahs: flow,
    });

    flow = [];
  };

  for (const ayah of ayahs) {
    const pieces = displayPieces(ayah);

    if (
      ayah.surah === 1 &&
      ayah.ayah === 1
    ) {
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

    if (
      pieces[0]?.kind ===
      "bismillah"
    ) {
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
        text:
          pieces[1]?.text ?? "",
        anchor: true,
      });

      continue;
    }

    flow.push({
      id: ayah.id,
      surah: ayah.surah,
      ayah: ayah.ayah,
      text:
        pieces[0]?.text ??
        ayah.text,
      anchor: true,
    });
  }

  flush();

  return blocks;
}

function SidebarSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="tanzil-sidebar-section"
      open={defaultOpen}
    >
      <summary>{title}</summary>

      <div className="px-2 pb-2 pt-1">
        {children}
      </div>
    </details>
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
    <label className="block font-naskh text-xs text-[#69735f]" dir="rtl">
      {label}

      <select
        aria-label={label}
        className="mt-1 w-full border border-[#aab49f] bg-[#fbfcf2] px-2 py-1 text-xs text-[#3d4938] outline-none focus:border-[#7f906f]"
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
      >
        {children}
      </select>
    </label>
  );
}

function PageArrow({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction:
    | "previous"
    | "next";
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
      className="flex h-7 w-7 items-center justify-center border border-transparent font-serif text-lg text-[#667256] hover:border-[#b0bc9d] hover:bg-[#e7eddc] disabled:pointer-events-none disabled:opacity-25"
    >
      {direction ===
      "previous"
        ? "‹"
        : "›"}
    </button>
  );
}

function SurahBand({
  name,
}: {
  name: string;
}) {
  return (
    <div className="quran-surah-band">
      <span
        className="quran-band-rule"
        aria-hidden="true"
      />

      <div className="quran-surah-title">
        {name}
      </div>

      <span
        className="quran-band-rule"
        aria-hidden="true"
      />
    </div>
  );
}
