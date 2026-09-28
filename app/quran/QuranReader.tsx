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
    document.getElementById(`ayah-${surah}-${ayah}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
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

  const blocks = blocksFor(ayahs);

  return (
    <main className="bg-[#efe8da] text-[#1c140c]" dir="rtl">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3" dir="ltr">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#6d5a3c]">Qalam Works</p>
            <h1 className="font-naskh text-3xl text-[#1A3A2A]" dir="rtl" lang="ar">قرآن کریم</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" className={tabClass(panel === "browse")} onClick={() => setPanel(panel === "browse" ? null : "browse")}>
              Browse
            </button>
            <button type="button" className={tabClass(panel === "search")} onClick={() => setPanel(panel === "search" ? null : "search")}>
              Search
            </button>
          </div>
        </div>

        {panel === "search" && (
          <form
            className="mb-4 rounded-xl bg-white/80 p-3"
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
                className="min-w-0 flex-1 rounded-lg border border-[#c4a36a]/50 bg-[#fbf6ea] px-3 py-2 font-naskh text-lg"
              />
              <button type="submit" className="rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm text-white">
                ابحث
              </button>
            </label>
            <ul className="mt-3 max-h-48 space-y-1 overflow-auto">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link href={href(hit.surah, hit.ayah)} className="block rounded px-2 py-1 font-naskh hover:bg-[#f3e2b8]">
                    {surahTitle(hit.surah)} — {easternDigits(hit.ayah)}
                  </Link>
                </li>
              ))}
              {searched && hits.length === 0 && <li className="px-2 text-sm text-[#6d5a3c]">لا نتيجة</li>}
            </ul>
          </form>
        )}

        {panel === "browse" && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-white/80 p-3 sm:grid-cols-4" dir="ltr">
            <Select label="Surah" value={surah} onChange={(value) => go({ surah: value, ayah: 1 })}>
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

        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-naskh text-[#3d2e1a]" dir="ltr">
          <div className="text-left text-lg sm:text-2xl">{surahTitle(surah)}</div>
          <div className="flex items-center gap-2">
            <NavButton label="Previous page" disabled={!adjacentPage(page.page, -1)} onClick={() => {
              const previous = adjacentPage(page.page, -1);
              if (previous) go({ surah: previous.surahStart, ayah: previous.ayahStart });
            }}>
              ◀
            </NavButton>
            <span className="min-w-16 text-center text-2xl">{easternDigits(page.page)}</span>
            <NavButton label="Next page" disabled={!adjacentPage(page.page, 1)} onClick={() => {
              const next = adjacentPage(page.page, 1);
              if (next) go({ surah: next.surahStart, ayah: next.ayahStart });
            }}>
              ▶
            </NavButton>
          </div>
          <div className="text-right text-lg sm:text-2xl">{juzTitle(juz)}</div>
        </div>

        <div className="flex justify-center">
          <article
            className="w-full border-[10px] border-[#e7d3ae] bg-[#fbf6ea] px-5 py-8 shadow-[inset_0_0_0_1px_#b8905a,inset_0_0_0_8px_#fbf6ea,inset_0_0_0_9px_#b8905a] sm:px-10"
            style={{
              maxWidth: QURAN_LAYOUT_PROFILE.pageWidthPx,
              minHeight: QURAN_LAYOUT_PROFILE.pageMinHeightPx,
              fontFamily: QURAN_FONT_STACK,
              fontSize: `${Math.round(28 * scale)}px`,
            }}
            lang="ar"
          >
            {blocks.map((block) => {
              if (block.kind === "surah") {
                return (
                  <div key={`s-${block.surah}`} className="mx-auto my-6 max-w-md px-6 py-3 text-center">
                    <div className="border-y-2 border-[#b8905a] py-2">
                      <div className="border-y border-[#b8905a]/70 py-1 text-[1.65rem] leading-normal">{surahTitle(block.surah)}</div>
                    </div>
                  </div>
                );
              }
              if (block.kind === "bismillah") {
                const active = block.surah === surah && block.ayah === ayah;
                return (
                  <p
                    key={`b-${block.id}`}
                    id={block.anchor ? `ayah-${block.surah}-${block.ayah}` : undefined}
                    className={`mb-5 text-center text-[1.55rem] leading-loose ${active && block.anchor ? "bg-[#f3e2b8]" : ""}`}
                  >
                    {block.text}
                  </p>
                );
              }
              return (
                <p
                  key={block.ids}
                  dir="rtl"
                  lang="ar"
                  className="mb-2 text-justify text-[1.65rem]"
                  style={{ lineHeight: QURAN_LAYOUT_PROFILE.lineHeight, unicodeBidi: "plaintext" }}
                >
                  {block.ayahs.map((item, index) => (
                    <span key={item.id}>
                      {index > 0 ? " " : ""}
                      <span
                        id={item.anchor ? `ayah-${item.surah}-${item.ayah}` : undefined}
                        className={`quran-ayah inline rounded-sm ${item.anchor && item.surah === surah && item.ayah === ayah ? "bg-[#f3e2b8]" : ""}`}
                        style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
                      >
                        {item.text}
                      </span>
                    </span>
                  ))}
                </p>
              );
            })}
          </article>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2" dir="ltr">
          <div className="flex gap-2">
            <NavButton label="Previous ayah" disabled={!adjacentAyah(surah, ayah, -1)} onClick={() => go(adjacentAyah(surah, ayah, -1))}>
              Previous ayah
            </NavButton>
            <NavButton label="Next ayah" disabled={!adjacentAyah(surah, ayah, 1)} onClick={() => go(adjacentAyah(surah, ayah, 1))}>
              Next ayah
            </NavButton>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#6d5a3c]">
              Scale
              <select className="ms-2 rounded border border-[#c4a36a]/60 bg-white px-2 py-1" value={scale} aria-label="Display scale" onChange={(event) => setScale(Number(event.target.value))}>
                <option value={0.85}>Small</option>
                <option value={1}>Medium</option>
                <option value={1.12}>Large</option>
              </select>
            </label>
            <button type="button" className="rounded-lg border border-[#1A3A2A]/20 px-3 py-1.5 text-sm" onClick={copy}>
              {copied ? "Copied" : "Copy page"}
            </button>
          </div>
        </div>

        <details className="mt-6 text-sm text-[#6d5a3c]" dir="ltr">
          <summary>Source</summary>
          <p className="mt-2">
            Indo-Pak Quran Text, version 1.0. Source:{" "}
            <a className="underline" href="http://ahmedgraf.com">ahmedgraf.com</a>.
            Page count ({pages}) is the Qalam layout profile {QURAN_LAYOUT_PROFILE.id}, not a 604-page or Taj page count.
            PDMS Saleem is not bundled. The production face is {QURAN_LAYOUT_PROFILE.productionFont}.
          </p>
        </details>
      </div>
    </main>
  );
}

function blocksFor(ayahs: readonly QuranAyah[]) {
  const blocks: Array<
    | { kind: "surah"; surah: number }
    | { kind: "bismillah"; id: string; surah: number; ayah: number; text: string; anchor: boolean }
    | { kind: "flow"; ids: string; ayahs: { id: string; surah: number; ayah: number; text: string; anchor: boolean }[] }
  > = [];
  let flow: { id: string; surah: number; ayah: number; text: string; anchor: boolean }[] = [];
  const flush = () => {
    if (flow.length === 0) return;
    blocks.push({ kind: "flow", ids: flow.map((item) => item.id).join("-"), ayahs: flow });
    flow = [];
  };
  for (const ayah of ayahs) {
    const pieces = displayPieces(ayah);
    if (ayah.surah === 1 && ayah.ayah === 1) {
      flush();
      blocks.push({ kind: "surah", surah: 1 });
      blocks.push({ kind: "bismillah", id: ayah.id, surah: 1, ayah: 1, text: ayah.text, anchor: true });
      continue;
    }
    if (ayah.ayah === 1) {
      flush();
      blocks.push({ kind: "surah", surah: ayah.surah });
    }
    if (pieces[0]?.kind === "bismillah") {
      flush();
      blocks.push({ kind: "bismillah", id: ayah.id, surah: ayah.surah, ayah: ayah.ayah, text: pieces[0].text, anchor: false });
      flow.push({ id: ayah.id, surah: ayah.surah, ayah: ayah.ayah, text: pieces[1]?.text ?? "", anchor: true });
      continue;
    }
    flow.push({ id: ayah.id, surah: ayah.surah, ayah: ayah.ayah, text: pieces[0]?.text ?? ayah.text, anchor: true });
  }
  flush();
  return blocks;
}

function tabClass(active: boolean): string {
  return `rounded-lg px-3 py-1.5 text-sm ${active ? "bg-[#1A3A2A] text-white" : "bg-white text-[#1A3A2A]"}`;
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="rounded-lg border border-[#1A3A2A]/20 bg-white px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A] disabled:opacity-40">
      {children}
    </button>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: number; onChange: (value: number) => void; children: ReactNode }) {
  return (
    <label className="text-xs text-[#6d5a3c]">
      {label}
      <select aria-label={label} className="mt-1 w-full rounded border border-[#c4a36a]/50 bg-[#fbf6ea] px-2 py-1 text-sm" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {children}
      </select>
    </label>
  );
}
