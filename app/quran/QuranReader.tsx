"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { HAFS_AYAH_COUNTS } from "../tools/arabic-diacritics/quran/hafsCounts";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import { useLanguage } from "../lib/language-context";
import EditionTopBar from "./reader/EditionTopBar";
import QuranTranslationPage from "./QuranTranslationPage";
import { translationTextForAyahs } from "./reader/translationCorpus";
import { surahBanner } from "./indopak-digital-khatt/surahBanner";
import {
  easternDigits,
  juzRunningHead,
  surahRunningHead,
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

type ReaderLanguage = "en" | "ur";

type SidebarCopy = {
  search: string;
  browse: string;
  copy: string;
  copyDone: string;
  display: string;
  size: string;
  small: string;
  medium: string;
  large: string;
  surah: string;
  ayah: string;
  juz: string;
  page: string;
  noResults: string;
  keysAyah: string;
  keysPage: string;
  keysSura: string;
  nextPage: string;
  previousPage: string;
  quranTab: string;
  translationTab: string;
};

const SIDEBAR_COPY: Record<
  ReaderLanguage,
  SidebarCopy
> = {
  en: {
    search: "Search",
    browse: "Browse",
    copy: "Copy current page",
    copyDone: "Copied",
    display: "Display",
    size: "Size",
    small: "Small",
    medium: "Medium",
    large: "Large",
    surah: "Surah",
    ayah: "Ayah",
    juz: "Juz",
    page: "Page",
    noResults: "No results found.",
    keysAyah: "↑ ↓ Ayahs",
    keysPage: "← → Pages",
    keysSura: "Ctrl + ← → Surah",
    nextPage: "Next Page →",
    previousPage: "← Previous Page",
    quranTab: "Quran",
    translationTab: "Translation",
  },

  ur: {
    search: "تلاش",
    browse: "براؤز",
    copy: "موجودہ صفحہ نقل کریں",
    copyDone: "نقل ہوگئی",
    display: "نمایش",
    size: "سائز",
    small: "چھوٹا",
    medium: "درمیانہ",
    large: "بڑا",
    surah: "سورۃ",
    ayah: "آیت",
    juz: "پارہ",
    page: "صفحہ",
    noResults: "کوئی نتیجہ نہیں ملا۔",
    keysAyah: "↑ ↓ آیات",
    keysPage: "← → صفحات",
    keysSura: "Ctrl + ← → سورت",
    nextPage: "اگلا صفحہ →",
    previousPage: "← پچھلا صفحہ",
    quranTab: "قرآن",
    translationTab: "ترجمہ",
  },
};

export default function QuranReader({
  surah,
  ayah,
}: {
  surah: number;
  ayah: number;
}) {
  const router = useRouter();
  const { language } = useLanguage();

  const current = getReaderAyah(
    surah,
    ayah,
  );

  const page = pageOf(
    surah,
    ayah,
  );

  const copy =
    SIDEBAR_COPY[
      language === "ur"
        ? "ur"
        : "en"
    ];

  const interfaceDir =
    language === "ur"
      ? "rtl"
      : "ltr";

  const interfaceLang =
    language === "ur"
      ? "ur"
      : "en";

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

  const [scale, setScale] = useState(1);
  const [readerView, setReaderView] = useState<"quran" | "translation">("quran");

  useLayoutEffect(() => {
    const stored = Number(window.localStorage.getItem("qalam-quran-display-scale"));
    if (stored === 0.85 || stored === 1 || stored === 1.12) setScale(stored);
    const storedView = window.localStorage.getItem("qalam-quran-reader-view");
    if (storedView === "quran" || storedView === "translation") setReaderView(storedView);
  }, []);

  const chooseScale = (value: number) => {
    setScale(value);
    window.localStorage.setItem("qalam-quran-display-scale", String(value));
  };

  const chooseReaderView = (value: "quran" | "translation") => {
    setReaderView(value);
    window.localStorage.setItem("qalam-quran-reader-view", value);
  };

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

  const copyPage = async () => {
    try {
      const text =
        readerView === "translation"
          ? await translationTextForAyahs(ayahs, language === "ur" ? "ur" : "en")
          : copyPageText(page.page);
      await navigator.clipboard.writeText(text);

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
      className="quran-reader min-h-screen"
      dir="ltr"
    >
      <div className="quran-reader-container mx-auto w-full max-w-[1010px] px-3 py-4 sm:px-5 sm:py-6">
        <EditionTopBar editionId="qalam-indopak" />
        <div
          className="quran-reader-layout grid items-start gap-4 lg:grid-cols-[175px_minmax(0,770px)]"
          dir="ltr"
        >
          {/* ─────────────────────────────
              TANZIL-LIKE SIDEBAR
             ───────────────────────────── */}

          <aside
            className="tanzil-sidebar quran-reader-sidebar"
            dir={interfaceDir}
            lang={interfaceLang}
          >
            <SidebarSection
              title={
                copy.search
              }
            >
              <form
                onSubmit={(
                  event,
                ) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <div
                  className="flex gap-1"
                  dir={interfaceDir}
                >
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
                    aria-label={
                      copy.search
                    }
                    className="min-w-0 flex-1 border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#33372f] outline-none focus:border-[#718067]"
                    dir={
                      interfaceDir
                    }
                    lang={
                      interfaceLang
                    }
                  />

                  <button
                    type="submit"
                    className="border border-[#9aa394] bg-white px-2 py-1 text-xs text-[#3d4439] hover:bg-[#f3f5f1]"
                  >
                    {
                      copy.search
                    }
                  </button>
                </div>

                {searched && (
                  <div
                    className="mt-1 max-h-40 overflow-auto border-t border-[#d0d4cc] pt-1"
                    dir="rtl"
                    lang="ar"
                  >
                    {hits.length ===
                    0 ? (
                      <p
                        className={`px-1 py-1 text-[11px] text-[#777c74] ${
                          language ===
                          "ur"
                            ? "font-naskh"
                            : ""
                        }`}
                        dir={
                          interfaceDir
                        }
                        lang={
                          interfaceLang
                        }
                      >
                        {
                          copy.noResults
                        }
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
                                dir="rtl"
                                lang="ar"
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
              title={
                copy.browse
              }
              defaultOpen
            >
              <div className="space-y-2">
                <Select
                  label={
                    copy.surah
                  }
                  value={
                    surah
                  }
                  onChange={(
                    value,
                  ) =>
                    go({
                      surah:
                        value,
                      ayah: 1,
                    })
                  }
                  language={
                    language
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
                          index +
                          1
                        }
                      >
                        {index +
                          1}
                        .{" "}
                        {name}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label={
                    copy.ayah
                  }
                  value={
                    ayah
                  }
                  onChange={(
                    value,
                  ) =>
                    go({
                      surah,
                      ayah:
                        value,
                    })
                  }
                  language={
                    language
                  }
                >
                  {Array.from(
                    {
                      length:
                        HAFS_AYAH_COUNTS[
                          surah -
                            1
                        ] ??
                        0,
                    },
                    (
                      _,
                      index,
                    ) => (
                      <option
                        key={
                          index +
                          1
                        }
                        value={
                          index +
                          1
                        }
                      >
                        {index +
                          1}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label={
                    copy.juz
                  }
                  value={
                    juz
                  }
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
                  language={
                    language
                  }
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
                          index +
                          1
                        }
                        value={
                          index +
                          1
                        }
                      >
                        {index +
                          1}
                      </option>
                    ),
                  )}
                </Select>

                <Select
                  label={
                    copy.page
                  }
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
                  language={
                    language
                  }
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
                          index +
                          1
                        }
                        value={
                          index +
                          1
                        }
                      >
                        {index +
                          1}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            </SidebarSection>

            <SidebarSection
              title={
                copy.copy
              }
            >
              <button
                type="button"
                className="w-full border border-[#b5bbb1] bg-white px-2 py-1.5 text-xs text-[#465046] hover:bg-[#f3f5f1]"
                onClick={
                  copyPage
                }
              >
                {copied
                  ? copy.copyDone
                  : copy.copy}
              </button>
            </SidebarSection>

            <SidebarSection
              title={
                copy.display
              }
            >
              <label
                className="block text-xs text-[#697067]"
                dir={
                  interfaceDir
                }
              >
                {
                  copy.size
                }

                <select
                  className="mt-1 w-full border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#3e453b] outline-none focus:border-[#718067]"
                  value={
                    scale
                  }
                  aria-label={
                    copy.size
                  }
                  onChange={(
                    event,
                  ) =>
                    chooseScale(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                  dir={
                    interfaceDir
                  }
                  lang={
                    interfaceLang
                  }
                >
                  <option value={0.85}>
                    {
                      copy.small
                    }
                  </option>

                  <option value={1}>
                    {
                      copy.medium
                    }
                  </option>

                  <option value={1.12}>
                    {
                      copy.large
                    }
                  </option>
                </select>
              </label>
            </SidebarSection>

            <div
              className="border-t border-[#d0d4cc] bg-white px-2 py-2"
              dir={
                interfaceDir
              }
              lang={
                interfaceLang
              }
            >
              <p
                className={`text-[10px] leading-5 text-[#777d74] ${
                  language ===
                  "ur"
                    ? "font-naskh"
                    : ""
                }`}
              >
                {
                  copy.keysAyah
                }
                <br />
                {
                  copy.keysPage
                }
                <br />
                {
                  copy.keysSura
                }
              </p>
            </div>
          </aside>

          {/* ─────────────────────────────
              MAIN QURAN READER
             ───────────────────────────── */}

          <section className="quran-reader-main min-w-0">
            <div
              className="mb-2 flex items-center justify-center border-b border-[#c7cec2]"
              dir={interfaceDir}
              lang={interfaceLang}
              role="tablist"
              aria-label={language === "ur" ? "قرآن اور ترجمہ" : "Quran and translation"}
            >
              {([
                ["quran", copy.quranTab],
                ["translation", copy.translationTab],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={readerView === value}
                  onClick={() => chooseReaderView(value)}
                  className={
                    "min-w-28 border-b-2 px-5 py-2 text-sm font-semibold transition-colors " +
                    (readerView === value
                      ? "border-[#5f7257] text-[#31412f] dark:border-[#aabea3] dark:text-[#e4ede4]"
                      : "border-transparent text-[#747b71] hover:text-[#465044] dark:text-[#9eaa9e]") +
                    (language === "ur" ? " font-naskh" : "")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="quran-page-shell">
              <QuranPageMeta
                surah={
                  surah
                }
                pageNumber={
                  page.page
                }
                juz={
                  juz
                }
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

              {readerView === "quran" ? (
                <QuranPageSurface
                  surah={
                    surah
                  }
                  ayah={
                    ayah
                  }
                  pageNumber={
                    page.page
                  }
                  ayahs={
                    ayahs
                  }
                  fontFamily={
                    QURAN_FONT_STACK
                  }
                  scale={
                    scale
                  }
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
              ) : (
                <QuranTranslationPage
                  ayahs={ayahs}
                  selectedSurah={surah}
                  selectedAyah={ayah}
                  scale={scale}
                />
              )}
            </div>

            <div
              className={`quran-outer-page-nav mt-2 flex items-center justify-between px-1 text-xs text-[#70776b] ${
                language ===
                "ur"
                  ? "font-naskh"
                  : ""
              }`}
              dir="rtl"
              lang={
                interfaceLang
              }
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
                {
                  copy.nextPage
                }
              </button>

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
                {
                  copy.previousPage
                }
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
  const { language } = useLanguage();
  const pageLabel =
    language === "ur"
      ? pageNumber.toLocaleString("ur-PK")
      : String(pageNumber);

  return (
    <div
      className="quran-page-meta"
      dir="rtl"
      lang="ar"
    >
      <div className="quran-page-meta-item quran-page-meta-juz">
        <span className="quran-page-meta-juz-name">
          {juzRunningHead(juz)}
        </span>
      </div>

      <div
        className="quran-page-meta-item flex items-center justify-center overflow-visible"
        dir="ltr"
        lang={language === "ur" ? "ur" : "en"}
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

        <span className="quran-page-meta-page-number">
          {pageLabel}
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
          onClick={
            onNextPage
          }
        />
      </div>

      <div className="quran-page-meta-item quran-page-meta-surah">
        <span className="quran-page-meta-surah-name">
          {surahRunningHead(surah)}
        </span>
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
    blocksFor(
      ayahs,
    );

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
            (
              block,
            ) => {
              if (
                block.kind ===
                "surah"
              ) {
                return (
                  <SurahBand
                    key={`${idPrefix}s-${block.surah}`}
                    surah={block.surah}
                  />
                );
              }

              if (
                block.kind ===
                "bismillah"
              ) {
                return (
                  <p
                    key={`${idPrefix}b-${block.id}`}
                    id={
                      block.anchor
                        ? `ayah-${block.surah}-${block.ayah}`
                        : undefined
                    }
                    className="quran-bismillah shrink-0"
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
                              ? `ayah-${item.surah}-${item.ayah}`
                              : undefined
                          }
                          className="quran-ayah inline"
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
              {
                easternDigits(
                  pageNumber,
                )
              }
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
              onClick={
                onNextPage
              }
            />
          </div>
        </footer>
      </div>
    </article>
  );
}

export {
  QuranPageSurface,
};

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
      ayahs:
        flow,
    });

    flow = [];
  };

  for (
    const ayah of ayahs
  ) {
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
        surah:
          ayah.surah,
        ayah:
          ayah.ayah,
        text:
          ayah.text,
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
      open={
        defaultOpen
      }
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
  language,
}: {
  label: string;
  value: number;
  onChange: (
    value: number,
  ) => void;
  children: ReactNode;
  language: ReaderLanguage;
}) {
  return (
    <label
      className={`block text-xs text-[#687066] ${
        language ===
        "ur"
          ? "font-naskh"
          : ""
      }`}
      dir={
        language ===
        "ur"
          ? "rtl"
          : "ltr"
      }
    >
      {label}

      <select
        aria-label={label}
        className="mt-1 w-full border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#3f463c] outline-none focus:border-[#718067]"
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            Number(
              event.target
                .value,
            ),
          )
        }
        dir={
          language ===
          "ur"
            ? "rtl"
            : "ltr"
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
  surah,
}: {
  surah: number;
}) {
  const banner = surahBanner(surah);

  return (
    <div
      className="quran-surah-header shrink-0"
      dir="rtl"
      lang="ar"
    >
      <span className="quran-surah-place">{banner.place}</span>
      <span className="quran-banner-name">
        <span className="quran-banner-digit">{banner.surahNumber}</span>
        <span>{banner.name}</span>
        <span className="quran-banner-digit">{banner.revealed}</span>
      </span>
      <span className="quran-surah-count">
        <span>آیات</span>
        <span className="quran-banner-digit">{banner.ayatCount}</span>
      </span>
    </div>
  );
}
