"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { quranMatchKey } from "../../tools/arabic-diacritics/quran/normalizeQuran";
import { useLanguage } from "../../lib/language-context";
import { easternDigits, SURAH_NAMES } from "../reader/metadata";
import {
  DIGITAL_KHATT_EDITION,
  chapterVerses,
  digitalKhattJuzOf,
  digitalKhattJuzStart,
  findDigitalKhattAyah,
  flattenDigitalKhatt,
  isDigitalKhattCorpus,
  type DigitalKhattCorpus,
} from "./data";
import styles from "./reader.module.css";

const BASMILLAH = "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ";
type Hit = { surah: number; ayah: number };

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
  const juz = digitalKhattJuzOf(surah, ayah);

  useEffect(() => {
    if (!current) return;
    document.getElementById("current-ayah")?.scrollIntoView({ block: "center" });
  }, [current]);

  const navigate = (nextSurah: number, nextAyah: number) => {
    router.push("/quran/indopak-digital-khatt/" + nextSurah + "/" + nextAyah);
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

  const hasBismillah = surah !== 9;

  if (corpus === null) {
    return (
      <main className={styles.reader} dir="ltr">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-[#716c60]">
          Loading IndoPak Digital Khatt…
        </div>
      </main>
    );
  }

  if (!current || chapterAyahs.length === 0) {
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
            <form onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
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
                    <option key={item.verse} value={item.verse}>{item.verse}</option>
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
                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                  ))}
                </select>
              </label>
            </div>
          </aside>

          <section className="order-1 lg:order-2">
            <article className="rounded-2xl border-8 border-[#eee7d5] bg-[#fcfaf3] px-4 py-6 shadow-[0_14px_36px_rgba(56,45,24,0.10)] sm:px-10 sm:py-9">
              <div className="mb-5 border-b border-[#d9d0bc] pb-4 text-center">
                <div className="text-xs tracking-[0.2em] text-[#777064]">
                  SURAH {String(surah).padStart(3, "0")}
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-[#1e211d]">
                  {SURAH_NAMES[surah - 1] ?? ""}
                </h1>
                {hasBismillah && (
                  <div className={styles.quran + " mt-3 text-[30px] text-[#1d201b] sm:text-[34px]"}>
                    {BASMILLAH}
                  </div>
                )}
              </div>

              <div className={styles.quran + " text-[27px] text-[#171717] sm:text-[32px]"}>
                {chapterAyahs.map((item) => (
                  <span
                    key={item.chapter + ":" + item.verse}
                    id={item.verse === ayah ? "current-ayah" : undefined}
                    className={item.verse === ayah ? "rounded-[0.22em] bg-[#eef5ef] px-[0.08em]" : undefined}
                  >
                    <span className={styles.ayah}>{item.text}</span>
                    <span className={styles.ayahNumber} aria-label={"Ayah " + item.verse}>
                      ۝{easternDigits(item.verse)}
                    </span>{" "}
                  </span>
                ))}
              </div>

              <nav className="mt-8 flex items-center justify-between border-t border-[#ded6c5] pt-4 text-sm">
                <button
                  type="button"
                  disabled={surah === 1 && ayah === 1}
                  onClick={() => {
                    if (ayah > 1) navigate(surah, ayah - 1);
                    else if (surah > 1 && corpus) {
                      const previous = chapterVerses(corpus, surah - 1);
                      if (previous.length) navigate(surah - 1, previous.length);
                    }
                  }}
                  className="rounded-md border border-[#cfc7b7] px-3 py-2 text-[#575247] disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-xs text-[#776f61]">
                  {easternDigits(surah)} : {easternDigits(ayah)}
                </span>
                <button
                  type="button"
                  disabled={surah === 114 && ayah === chapterAyahs.length}
                  onClick={() => {
                    if (ayah < chapterAyahs.length) navigate(surah, ayah + 1);
                    else if (surah < 114) navigate(surah + 1, 1);
                  }}
                  className="rounded-md border border-[#2f8f68]/40 px-3 py-2 text-[#2f8f68] disabled:opacity-40"
                >
                  Next →
                </button>
              </nav>
            </article>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8a8478]">
              Text: DigitalKhatt IndoPak, MIT, via risan/quran-json. Font: DigitalKhatt OFL-1.1.
              Not Taj Company and not the AhmedGraf edition. The ۝ marker is display-only.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
