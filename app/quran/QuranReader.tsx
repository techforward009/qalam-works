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

function href(
  surah: number,
  ayah: number,
): string {
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

  const current = getReaderAyah(
    surah,
    ayah,
  );

  const page = pageOf(
    surah,
    ayah,
  );

  const [query, setQuery] =
    useState("");

  const [hits, setHits] =
    useState<
      ReturnType<
        typeof searchQuran
      >
    >([]);

  const [searched, setSearched] =
    useState(false);

  const [scale, setScale] =
    useState(1);

  const [copied, setCopied] =
    useState(false);

  const ayahs = useMemo(
    () =>
      page
        ? ayahsOnPage(
            page.page,
          )
        : [],
    [page],
  );

  const juz = juzOf(
    surah,
    ayah,
  );

  const pages = pageCount();

  useEffect(() => {
    document
      .getElementById(
        `ayah-${surah}-${ayah}`,
      )
      ?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
  }, [surah, ayah]);

  useEffect(() => {
    const onKey = (
      event: KeyboardEvent,
    ) => {
      if (!page) {
        return;
      }

      const target =
        event.target as
          | HTMLElement
          | null;

      const tagName =
        target?.tagName;

      if (
        tagName === "INPUT" ||
        tagName ===
          "TEXTAREA" ||
        tagName ===
          "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (
        event.ctrlKey &&
        event.key ===
          "ArrowLeft"
      ) {
        event.preventDefault();

        const next =
          adjacentAyah(
            surah,
            ayah,
            1,
          );

        if (
          next &&
          next.surah !==
            surah
        ) {
          router.push(
            href(
              next.surah,
              next.ayah,
            ),
          );
        }

        return;
      }

      if (
        event.ctrlKey &&
        event.key ===
          "ArrowRight"
      ) {
        event.preventDefault();

        const previous =
          adjacentAyah(
            surah,
            ayah,
            -1,
          );

        if (
          previous &&
          previous.surah !==
            surah
        ) {
          router.push(
            href(
              previous.surah,
              previous.ayah,
            ),
          );
        }

        return;
      }

      if (
        event.key ===
        "ArrowUp"
      ) {
        event.preventDefault();

        const previous =
          adjacentAyah(
            surah,
            ayah,
            -1,
          );

        if (previous) {
          router.push(
            href(
              previous.surah,
              previous.ayah,
            ),
          );
        }

        return;
      }

      if (
        event.key ===
        "ArrowDown"
      ) {
        event.preventDefault();

        const next =
          adjacentAyah(
            surah,
            ayah,
            1,
          );

        if (next) {
          router.push(
            href(
              next.surah,
              next.ayah,
            ),
          );
        }

        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        event.preventDefault();

        const next =
          adjacentPage(
            page.page,
            1,
          );

        if (next) {
          router.push(
            href(
              next.surahStart,
              next.ayahStart,
            ),
          );
        }

        return;
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        event.preventDefault();

        const previous =
          adjacentPage(
            page.page,
            -1,
          );

        if (previous) {
          router.push(
            href(
              previous.surahStart,
              previous.ayahStart,
            ),
          );
        }
      }
    };

    window.addEventListener(
      "keydown",
      onKey,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKey,
      );
    };
  }, [
    ayah,
    page,
    router,
    surah,
  ]);

  if (!current || !page) {
    return null;
  }

  const go = (
    next:
      | {
          surah: number;
          ayah: number;
        }
      | null,
  ) => {
    if (next) {
      router.push(
        href(
          next.surah,
          next.ayah,
        ),
      );
    }
  };

  const runSearch = () => {
    setSearched(true);
    setHits(
      searchQuran(query),
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        copyPageText(
          page.page,
        ),
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        1600,
      );
    } catch {
      setCopied(false);
    }
  };

  return (
    <main
      className="quran-reader min-h-screen bg-[#e5e9df] text-[#292d26]"
      dir="ltr"
    >
      <div className="mx-auto w-full max-w-[1010px] px-3 py-4 sm:px-5 sm:py-6">
        <div
          className="grid items-start gap-4 lg:grid-cols-[175px_minmax(0,770px)]"
          dir="ltr"
        >
          {/* ─────────────────────────────
              Urdu-only navigation panel
             ───────────────────────────── */}
          <aside
            className="tanzil-sidebar"
            dir="rtl"
            lang="ur"
          >
            <SidebarSection title="تلاش">
              <form
                onSubmit={(
                  event,
                ) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <div className="flex gap-1">
                  <input
                    value={query}
                    onChange={(
                      event,
                    ) =>
                      setQuery(
                        event.target
                          .value,
                      )
                    }
                    aria-label="قرآن میں تلاش"
                    className="min-w-0 flex-1 border border-[#b8bdb3] bg-white px-2 py-1 font-naskh text-xs text-[#33372f] outline-none focus:border-[#718067]"
                    dir="rtl"
                  />

                  <button
                    type="submit"
                    className="border border-[#9aa394] bg-white px-2 py-1 font-naskh text-xs text-[#3d4439] hover:bg-[#f3f5f1]"
                  >
                    تلاش
                  </button>
                </div>

                {searched && (
                  <div
                    className="mt-1 max-h-40 overflow-auto border-t border-[#d0d4cc] pt-1"
                    dir="rtl"
                  >
                    {hits.length ===
                    0 ? (
                      <p className="px-1 py-1 font-naskh text-[11px] text-[#777c74]">
                        کوئی نتیجہ نہیں ملا۔
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {hits.map(
                          (
                            hit,
                          ) => (
                            <li
                              key={
                                hit.id
                              }
                            >
                              <Link
                                href={href(
                                  hit.surah,
                                  hit.ayah,
                                )}
                                className="block px-1 py-1 font-naskh text-[11px] text-[#465046] hover:bg-[#f1f4ee]"
                              >
                                {
                                  surahTitle(
                                    hit.surah,
                                  )
                                }{" "}
                                —{" "}
                                {easternDigits(
                                  hit.ayah,
                                )}
                              </Link>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </form>
            </SidebarSection>

            <SidebarSection
              title="براؤز"
              defaultOpen
            >
              <div className="space-y-2">
                <Select
                  label="سورۃ"
                  value={surah}
                  onChange={(
                    value,
                  ) =>
                    go({
                      surah:
                        value,
                      ayah: 1,
                    })
                  }
                >
                  {SURAH_NAMES.map(
                    (
                      name,
                      index,
                    ) => (
                      <option
                        key={name}
                        value={
                          index + 1
                        }
                      >
                        {index + 1}.{" "}
                        {name}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label="آیت"
                  value={ayah}
                  onChange={(
                    value,
                  ) =>
                    go({
                      surah,
                      ayah: value,
                    })
                  }
                >
                  {Array.from(
                    {
                      length:
                        HAFS_AYAH_COUNTS[
                          surah - 1
                        ] ?? 0,
                    },
                    (
                      _,
                      index,
                    ) => (
                      <option
                        key={
                          index + 1
                        }
                        value={
                          index + 1
                        }
                      >
                        {index + 1}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label="پارہ"
                  value={juz}
                  onChange={(
                    value,
                  ) => {
                    const start =
                      juzStart(
                        value,
                      );

                    if (start) {
                      go(start);
                    }
                  }}
                >
                  {Array.from(
                    {
                      length: 30,
                    },
                    (
                      _,
                      index,
                    ) => (
                      <option
                        key={
                          index + 1
                        }
                        value={
                          index + 1
                        }
                      >
                        {index + 1}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label="صفحہ"
                  value={
                    page.page
                  }
                  onChange={(
                    value,
                  ) => {
                    const ref =
                      pageByNumber(
                        value,
                      );

                    if (ref) {
                      go({
                        surah:
                          ref.surahStart,
                        ayah:
                          ref.ayahStart,
                      });
                    }
                  }}
                >
                  {Array.from(
                    {
                      length:
                        pages,
                    },
                    (
                      _,
                      index,
                    ) => (
                      <option
                        key={
                          index + 1
                        }
                        value={
                          index + 1
                        }
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
                className="w-full border border-[#b5bbb1] bg-white px-2 py-1.5 font-naskh text-xs text-[#465046] hover:bg-[#f3f5f1]"
                onClick={copy}
              >
                {copied
                  ? "نقل ہوگئی"
                  : "موجودہ صفحہ نقل کریں"}
              </button>
            </SidebarSection>

            <SidebarSection title="نمایش">
              <label className="block font-naskh text-xs text-[#697067]">
                سائز

                <select
                  className="mt-1 w-full border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#3e453b] outline-none focus:border-[#718067]"
                  value={
                    scale
                  }
                  aria-label="سائز"
                  onChange={(
                    event,
                  ) =>
                    setScale(
                      Number(
                        event.target
                          .value,
                      ),
                    )
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

            <div
              className="border-t border-[#d0d4cc] bg-white px-2 py-2"
              dir="rtl"
            >
              <p className="font-naskh text-[10px] leading-5 text-[#777d74]">
                ↑ ↓ آیات
                <br />
                ← → صفحات
                <br />
                Ctrl + ← →
                سورت
              </p>
            </div>
          </aside>

          {/* ─────────────────────────────
              Main Quran reading area
             ───────────────────────────── */}
          <section className="min-w-0">
            <div className="quran-page-shell">
              <QuranPageMeta
                surah={surah}
                pageNumber={
                  page.page
                }
                juz={juz}
                onPreviousPage={() => {
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
                onNextPage={() => {
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
              />

              <QuranPageSurface
                surah={surah}
                ayah={ayah}
                pageNumber={
                  page.page
                }
                ayahs={ayahs}
                fontFamily={
                  QURAN_FONT_STACK
                }
                scale={scale}
                onPreviousPage={() => {
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
                onNextPage={() => {
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
              />
            </div>

            <div
              className="mt-2 flex items-center justify-between px-1 font-naskh text-xs text-[#70776b]"
              dir="rtl"
            >
              <button
                type="button"
                disabled={
                  !adjacentPage(
                    page.page,
                    1,
                  )
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
                className="px-2 py-1 hover:bg-[#dce3d8] disabled:opacity-25"
              >
                اگلا صفحہ →
              </button>

              <span>
                {
                  easternDigits(
                    page.page,
                  )
                }
              </span>

              <button
                type="button"
                disabled={
                  !adjacentPage(
                    page.page,
                    -1,
                  )
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
                className="px-2 py-1 hover:bg-[#dce3d8] disabled:opacity-25"
              >
                ← پچھلا صفحہ
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function QuranPageMeta({
  surah,
  pageNumber,
  juz,
  onPreviousPage,
  onNextPage,
}: {
  surah: number;
  pageNumber: number;
  juz: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  return (
    <div
      className="quran-page-meta"
      dir="rtl"
      lang="ar"
    >
      <div className="quran-page-meta-item quran-page-meta-surah">
        {surahTitle(surah)}
      </div>

      <div
        className="quran-page-meta-item quran-page-meta-number"
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

        <span>
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

      <div className="quran-page-meta-item quran-page-meta-juz">
        {juzTitle(juz)}
      </div>
    </div>
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
  const blocks =
    blocksFor(ayahs);

  return (
    <article
      className="quran-page flex w-full flex-col overflow-hidden px-4 py-5 sm:px-[58px] sm:py-9"
      style={{
        maxWidth:
          QURAN_LAYOUT_PROFILE.pageWidthPx,
        minHeight:
          QURAN_LAYOUT_PROFILE.pageMinHeightPx,
        fontFamily,
        fontSize: `${Math.round(
          QURAN_LAYOUT_PROFILE.fontSizePx *
            scale,
        )}px`,
      }}
      lang="ar"
      dir="rtl"
      data-qalam-page={
        pageNumber
      }
      data-qalam-face={
        faceLabel
      }
    >
      <QuranCorner position="top-left" />
      <QuranCorner position="top-right" />
      <QuranCorner position="bottom-left" />
      <QuranCorner position="bottom-right" />

      <div className="quran-page-inner flex min-h-0 flex-1 flex-col">
        <div className="quran-content relative flex min-h-0 flex-1 flex-col pt-2">
          {blocks.map(
            (block) => {
              if (
                block.kind ===
                "surah"
              ) {
                return (
                  <SurahBand
                    key={`${idPrefix}s-${block.surah}`}
                    name={surahTitle(
                      block.surah,
                    )}
                  />
                );
              }

              if (
                block.kind ===
                "bismillah"
              ) {
                const active =
                  block.surah ===
                    surah &&
                  block.ayah ===
                    ayah;

                return (
                  <p
                    key={`${idPrefix}b-${block.id}`}
                    id={
                      block.anchor
                        ? `${idPrefix}ayah-${block.surah}-${block.ayah}`
                        : undefined
                    }
                    className={`quran-bismillah shrink-0 ${
                      active &&
                      block.anchor
                        ? "quran-active-ayah"
                        : ""
                    }`}
                  >
                    {
                      block.text
                    }
                  </p>
                );
              }

              return (
                <p
                  key={`${idPrefix}${block.ids}`}
                  dir="rtl"
                  lang="ar"
                  className="quran-flow shrink-0"
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
                    (
                      item,
                      index,
                    ) => (
                      <span
                        key={
                          item.id
                        }
                      >
                        {index >
                        0
                          ? " "
                          : ""}

                        <span
                          id={
                            item.anchor
                              ? `${idPrefix}ayah-${item.surah}-${item.ayah}`
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
                          {
                            item.text
                          }
                        </span>
                      </span>
                    ),
                  )}
                </p>
              );
            },
          )}
        </div>

        <footer className="relative mt-auto shrink-0 pt-1">
          <div
            className="flex items-center justify-center"
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

            <span className="px-3 font-naskh text-xs text-[#776f58]">
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
    if (
      flow.length ===
      0
    ) {
      return;
    }

    blocks.push({
      kind: "flow",
      ids: flow
        .map(
          (item) =>
            item.id,
        )
        .join("-"),
      ayahs: flow,
    });

    flow = [];
  };

  for (const ayah of ayahs) {
    const pieces =
      displayPieces(
        ayah,
      );

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

    if (
      ayah.ayah === 1
    ) {
      flush();

      blocks.push({
        kind: "surah",
        surah:
          ayah.surah,
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
        surah:
          ayah.surah,
        ayah:
          ayah.ayah,
        text:
          pieces[0].text,
        anchor: false,
      });

      flow.push({
        id: ayah.id,
        surah:
          ayah.surah,
        ayah:
          ayah.ayah,
        text:
          pieces[1]?.text ??
          "",
        anchor: true,
      });

      continue;
    }

    flow.push({
      id: ayah.id,
      surah:
        ayah.surah,
      ayah:
        ayah.ayah,
      text:
        pieces[0]?.text ??
        ayah.text,
      anchor: true,
    });
  }

  flush();

  return blocks;
}

function QuranCorner({
  position,
}: {
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
}) {
  return (
    <svg
      className={`quran-corner quran-corner-${position}`}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <path
        d="M7 7H65V12H12V65H7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />

      <path
        d="M15 15H57V18H18V57H15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
      />

      <path
        d="M22 15C22 27 27 32 39 32C27 32 22 37 22 49C22 37 17 32 5 32C17 32 22 27 22 15Z"
        fill="currentColor"
        opacity="0.72"
      />

      <circle
        cx="51"
        cy="51"
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
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
      <summary>
        {title}
      </summary>

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
  onChange: (
    value: number,
  ) => void;
  children: ReactNode;
}) {
  return (
    <label
      className="block font-naskh text-xs text-[#687066]"
      dir="rtl"
    >
      {label}

      <select
        aria-label={label}
        className="mt-1 w-full border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#3f463c] outline-none focus:border-[#718067]"
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target
                .value,
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
      className="quran-page-arrow"
    >
      {direction ===
      "previous"
        ? "◄"
        : "►"}
    </button>
  );
}

function SurahBand({
  name,
}: {
  name: string;
}) {
  return (
    <div className="quran-surah-band shrink-0">
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
