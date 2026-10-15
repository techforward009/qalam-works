"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/language-context";
import type { QuranAyah } from "../tools/arabic-diacritics/quran/types";
import { easternDigits, surahTitle } from "./reader/metadata";
import { tafsirCoverageRanges, tafsirDisplayTopicBody, tafsirDisplayTopicHeading, type TafsirCoverageGroup } from "./reader/tafsirVerseCoverage";
import { publicBlobFontUrl } from "../tools/document-studio/utils/publicBlobFontCatalog";
import { displayTafsirHeading, splitTafsirTypography, tafsirSourceHeading } from "./reader/tafsirTypography";
import { TAFSIR_WORKS, tafsirForAyah, tafsirWorkById } from "./reader/tafsirCatalog";

const TAFSIR_SCHEHERAZADE_CSS = `@font-face {
  font-family: "Qalam Tafsir Scheherazade";
  src: url("${publicBlobFontUrl("ScheherazadeNew-Medium.woff2")}") format("woff2");
  font-style: normal;
  font-weight: 500;
  font-display: swap;
}`;

const TAFSIR_READING_SURFACE_CSS = `
  .qalam-tafsir-page { border-width: 10px; }
  .qalam-tafsir-page::before { inset: 6px; }
  .qalam-tafsir-page::after { inset: 12px; }
  @media (max-width: 639px) {
    .qalam-tafsir-page { border-width: 7px; }
    .qalam-tafsir-page::before { inset: 4px; }
    .qalam-tafsir-page::after { inset: 9px; }
  }
`;

type TafsirLanguage = "ur" | "en";
type Topic = { title: string; text: string; sourceId: number | null };
type TafsirPageSection = {
  sourceKey: string;
  verseKeysOnPage: string[];
  coverage: string[];
  topics: Topic[];
};
type Remote = {
  status: string;
  version?: number;
  language?: TafsirLanguage;
  text?: string | null;
  heading?: string;
  topics?: Topic[];
  sections?: TafsirPageSection[];
  pageVerseKeys?: string[];
  coverage?: TafsirCoverageGroup[];
  referenceAyah?: string;
};

function commentaryScopeLabel(group: TafsirCoverageGroup, lang: TafsirLanguage): string {
  const ranges = tafsirCoverageRanges(group.verses);
  return ranges.map(({ surah, first, last }) => {
    if (lang === "ur") {
      const verses = first === last
        ? "آیت " + easternDigits(first)
        : "آیات " + easternDigits(first) + " تا " + easternDigits(last);
      return surahTitle(surah) + "، " + verses;
    }
    return "Surah " + surah + ", " + (first === last ? "verse " : "verses ") +
      first + (first === last ? "" : "–" + last);
  }).join(lang === "ur" ? "؛ " : "; ");
}

function TafsirText({ text, language }: { text: string; language: TafsirLanguage }) {
  const runs = splitTafsirTypography(text, language);
  const arabicStyle = {
    fontFamily: '"Qalam Tafsir Scheherazade", serif',
    fontSize: language === "ur" ? "20px" : "1.12em",
    fontWeight: 500,
    fontSynthesis: "none" as const,
    lineHeight: 2.05,
    unicodeBidi: "isolate" as const,
  };
  return (
    <div
      className={"whitespace-pre-wrap break-words font-normal " + (language === "ur"
        ? "text-[#26372c]"
        : "text-[17px] leading-8 text-[#28362b]")}
      data-tafsir-urdu-text={language === "ur" ? "true" : undefined}
      dir={language === "ur" ? "rtl" : "ltr"} lang={language}
      style={language === "ur" ? { fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "clamp(19px, 3.6vw, 22px)", lineHeight: 2.3 } : undefined}
    >
      {runs.map((run, index) => run.kind === "arabic" ? (
        <span key={index} dir="rtl" lang="ar" data-tafsir-arabic="true"
          data-tafsir-font="scheherazade-new" style={arabicStyle}>
          {run.text}
        </span>
      ) : run.kind === "reference" ? (
        <span key={index} dir={language === "ur" ? "rtl" : "ltr"} lang={language} data-tafsir-reference="true"
          className={language === "ur" ? "text-[0.78em] text-[#756b56]" : "text-[0.76em] text-[#6d624e]"}>
          {run.text}
        </span>
      ) : <span key={index}>{run.text}</span>)}
    </div>
  );
}

/** Full Quran-page mode: show every source article linked to any ayah on the printed Quran page.
 * Source articles and their topic text remain complete and unmodified.
 */
function TafsirPageSections({ sections, surah, ayah, language }: {
  sections: readonly TafsirPageSection[];
  surah: number;
  ayah: number;
  language: TafsirLanguage;
}) {
  const ur = language === "ur";
  const selectedKey = surah + ":" + ayah;
  return (
    <div className="mt-4 space-y-7" data-tafsir-page-sections="true"
      dir={ur ? "rtl" : "ltr"} lang={language}>
      <header className="rounded-xl border border-[#dbc99f] bg-[#f9f5ea] px-4 py-3 text-center">
        <h2 className="text-[#31503c]" style={ur
          ? { fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "22px", lineHeight: 2.1 }
          : { fontSize: "18px", fontWeight: 650 }}>
          {ur ? "اس قرآنی صفحے کی تفسیریں" : "Commentary for this Quran page"}
        </h2>
        <p className="text-[#645d4d]" style={ur
          ? { fontFamily: '"Alvi Nastaleeq", serif', fontSize: "16px", lineHeight: 1.95 }
          : { fontSize: "14px", lineHeight: 1.8 }}>
          {ur ? "مکمل تفسیری مضامین: " + easternDigits(sections.length) : sections.length + " complete commentary sections"}
        </p>
        {sections.length > 1 && (
          <details className="group mt-2 border-t border-[#ddcda9] pt-1">
            <summary className="cursor-pointer list-none text-[#30513e] [&::-webkit-details-marker]:hidden"
              style={ur ? { fontFamily: '"Alvi Nastaleeq", serif', fontSize: "17px", lineHeight: 2 } : { fontSize: "14px" }}>
              {ur ? "تمام تفسیری مضامین کی فہرست" : "Browse all commentaries"} <span aria-hidden="true">⌄</span>
            </summary>
            <ol className="space-y-1 pt-2" dir={ur ? "rtl" : "ltr"}>
              {sections.map((section, index) => (
                <li key={section.sourceKey}>
                  <a href={"#tafsir-page-source-" + index} className="block rounded px-2 py-1 text-[#315541] hover:bg-[#eae6d8]"
                    style={ur ? { fontFamily: '"Alvi Nastaleeq", serif', fontSize: "16px", lineHeight: 2 } : { fontSize: "14px", lineHeight: 1.8 }}>
                    {ur ? easternDigits(index + 1) + "۔ " : index + 1 + ". "}
                    {commentaryScopeLabel({ sourceKey: section.sourceKey, verses: section.coverage }, language)}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        )}
      </header>
      {sections.map((section, index) => (
        <section key={section.sourceKey} id={"tafsir-page-source-" + index}
          data-tafsir-source-section={section.sourceKey} className="scroll-mt-20 border-b border-[#decda7] pb-6 last:border-b-0">
          <header className="mb-5 rounded-lg border border-[#e1d4b7] bg-[#fdfaf2] px-3 py-3 text-center">
            <h3 className="text-[#31523e]" style={ur
              ? { fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "21px", lineHeight: 2.1 }
              : { fontSize: "17px", fontWeight: 650 }}>
              {commentaryScopeLabel({ sourceKey: section.sourceKey, verses: section.coverage }, language)}
            </h3>
            {section.verseKeysOnPage.includes(selectedKey) && (
              <p className="mt-1 text-[#8a7347]" style={ur
                ? { fontFamily: '"Alvi Nastaleeq", serif', fontSize: "15px", lineHeight: 1.9 }
                : { fontSize: "12px" }}>
                {ur ? "منتخب آیت اس تفسیری مضمون میں شامل ہے" : "Includes the selected verse"}
              </p>
            )}
          </header>
          {section.topics.length > 1 && (
            <nav aria-label={ur ? "اس تفسیری مضمون کے موضوعات" : "Topics in this commentary"}
              className="mb-5 rounded-lg bg-[#f7f3e8] px-3 py-2">
              <details className="group">
                <summary className="cursor-pointer list-none text-center text-[#36523f] [&::-webkit-details-marker]:hidden"
                  style={ur ? { fontFamily: '"Gulzar", serif', fontSize: "18px", lineHeight: 2 } : { fontSize: "15px", fontWeight: 600 }}>
                  {ur ? "اس تفسیری مضمون کے موضوعات" : "Topics in this commentary"} ({section.topics.length}) <span aria-hidden="true">⌄</span>
                </summary>
                <ol className="mt-2 space-y-1" dir={ur ? "rtl" : "ltr"}>
                  {section.topics.map((topic, i) => (
                    <li key={i}>
                      <a href={"#tafsir-source-topic-" + index + "-" + i}
                        className="block rounded px-2 py-1 text-[#315541] hover:bg-[#eae6d8]"
                        style={ur ? { fontFamily: '"Alvi Nastaleeq", serif', fontSize: "16px", lineHeight: 2 } : { fontSize: "14px" }}>
                        {ur ? easternDigits(i + 1) + "۔ " : i + 1 + ". "}
                        {displayTafsirHeading(tafsirDisplayTopicHeading(topic.title, topic.text), language)}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            </nav>
          )}
          <div className="space-y-7">
            {section.topics.map((topic, i) => {
              const heading = tafsirDisplayTopicHeading(topic.title, topic.text);
              const visibleHeading = heading && heading !== "تفسیر" && heading !== "Tafseer" &&
                heading !== "Commentary (Tafseer)";
              return (
                <section key={i + "-" + (topic.sourceId ?? "unknown")}
                  id={"tafsir-source-topic-" + index + "-" + i} className="scroll-mt-20">
                  {visibleHeading && (
                    <h4 data-tafsir-topic-heading="true" className="mb-3 text-center text-[#304631]"
                      style={ur
                        ? { fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "clamp(23px, 4vw, 27px)", lineHeight: 2.05 }
                        : { fontSize: "19px", fontWeight: 650, lineHeight: 1.6 }}>
                      {displayTafsirHeading(heading, language)}
                    </h4>
                  )}
                  <TafsirText text={tafsirDisplayTopicBody(topic.title, topic.text)} language={language} />
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function QuranTafsirPage({ surah, ayah, ayahs }: {
  surah: number;
  ayah: number;
  ayahs?: readonly QuranAyah[];
}) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const sourceMenuRef = useRef<HTMLDetailsElement>(null);
  const [workId, setWorkId] = useState(TAFSIR_WORKS[0]?.id ?? "");
  const chosenLanguage: TafsirLanguage = ur ? "ur" : "en";
  const pageVerseKeys = ayahs?.map((item) => item.surah + ":" + item.ayah).join(",") ?? "";
  const pageFirst = ayahs?.[0];
  const pageLast = ayahs?.[ayahs.length - 1];
  const pageRangeLabel = pageFirst && pageLast && ayahs && ayahs.length > 1
    ? pageFirst.surah === pageLast.surah
      ? surahTitle(pageFirst.surah) + "، آیات " + easternDigits(pageFirst.ayah) + " تا " + easternDigits(pageLast.ayah)
      : surahTitle(pageFirst.surah) + "، آیت " + easternDigits(pageFirst.ayah) + " — " +
        surahTitle(pageLast.surah) + "، آیت " + easternDigits(pageLast.ayah)
    : surahTitle(surah) + "، آیت " + easternDigits(ayah);
  const englishPageRangeLabel = pageFirst && pageLast && ayahs && ayahs.length > 1
    ? pageFirst.surah === pageLast.surah
      ? "Surah " + pageFirst.surah + ", verses " + pageFirst.ayah + "–" + pageLast.ayah
      : "Surah " + pageFirst.surah + ":" + pageFirst.ayah + " – " + pageLast.surah + ":" + pageLast.ayah
    : "Surah " + surah + ", verse " + ayah;
  const [remote, setRemote] = useState<Remote | null>(null);
  const work = tafsirWorkById(workId);
  const entry = work && work.id !== "nemuneh" ? tafsirForAyah(work.id, surah, ayah) : null;

  useEffect(() => {
    if (workId !== "nemuneh") return;
    let active = true;
    setRemote({ status: "loading" });
    fetch(`/api/quran/tafsir-namoona?surah=${surah}&ayah=${ayah}&lang=${chosenLanguage}${pageVerseKeys ? "&verses=" + encodeURIComponent(pageVerseKeys) : ""}`)
      .then(async (response) => (await response.json()) as Remote)
      .then((result) => { if (active) setRemote(result); })
      .catch(() => { if (active) setRemote({ status: "source_unavailable" }); });
    return () => { active = false; };
  }, [workId, chosenLanguage, surah, ayah, pageVerseKeys]);

  const pageSections = remote?.status === "unicode_apk" ? remote.sections ?? [] : [];
  const coverageGroups = remote?.status === "unicode_apk" ? remote.coverage ?? [] : [];
  const remoteTopics = remote?.status === "unicode_apk"
    ? (remote.topics?.length
      ? remote.topics
      : remote.text ? [{ title: remote.heading ?? "", text: remote.text, sourceId: null }] : [])
    : [];
  const statusMessage = remote?.status === "loading"
    ? (ur ? "تفسیر کھولی جا رہی ہے…" : "Loading commentary…")
    : remote?.status === "print_scan_only"
    ? (ur ? "اصل مطبوعہ حوالہ موجود ہے، لیکن قابلِ تلاش متن ابھی شامل نہیں۔" : "A print reference exists, but searchable text is unavailable.")
    : remote?.status === "publication_pending" || remote?.status === "corpus_not_uploaded"
    ? (ur ? "اس زبان کی تفسیر ابھی ویب سائٹ پر فعال نہیں ہوئی۔" : "Commentary in this language is not active yet.")
    : (ur ? "اس آیت کی اصل تفسیری عبارت ابھی دستیاب نہیں۔" : "Source commentary for this verse is not available yet.");

  return (
    <article className="quran-page qalam-tafsir-page quran-reader-paper relative flex w-full flex-col overflow-hidden bg-[#fffef9] px-3 py-5 text-[#293a2e] dark:bg-[#151a16] dark:text-[#e4eee4] sm:px-10 sm:py-8"
      dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"}
      style={ur ? { fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif' } : undefined}>
      <style>{TAFSIR_SCHEHERAZADE_CSS + TAFSIR_READING_SURFACE_CSS}</style>
      {ur ? (
        <header className="border-b border-[#c9b98d]/45 pb-5 text-center" data-tafsir-urdu-header="true">
          <h1 className="mx-auto text-center text-[#254936]"
            style={{ fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "clamp(28px, 5vw, 34px)", lineHeight: 2.1 }}>
            تفسیر
          </h1>
          <div className="mx-auto mb-3 h-[2px] w-20 rounded-full bg-[#bfa168]/75" aria-hidden="true" />
          <p className="text-center text-[#665e49]" style={{ fontSize: "17px", lineHeight: 2 }}>
            {pageRangeLabel}
          </p>
          <div className="mx-auto mt-4 flex w-full max-w-xl items-center gap-3 text-right" dir="rtl" data-tafsir-source-row="true">
            <span className="shrink-0 text-[#35523d]"
              style={{ fontFamily: '"Gulzar", serif', fontSize: "19px", lineHeight: 1.9 }}>ماخذ</span>
            <details ref={sourceMenuRef} className="group relative min-w-0 flex-1" dir="rtl">
              <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-[#c2ac78] bg-[#fffdf6] px-3 text-[#254634] shadow-sm marker:hidden focus-visible:outline-2 focus-visible:outline-[#577f60] [&::-webkit-details-marker]:hidden"
                style={{ fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "18px", lineHeight: 2.1 }}
                aria-label="تفسیر کا ماخذ منتخب کریں">
                <span className="min-w-0 truncate">{work?.titleUr ?? "تفسیر منتخب کریں"}</span>
                <span aria-hidden="true" className="shrink-0 text-[#927b45] group-open:rotate-180">⌄</span>
              </summary>
              <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#cab994] bg-[#fffdf5] p-1.5 text-right shadow-xl"
                role="group" aria-label="دستیاب تفاسیر">
                {TAFSIR_WORKS.map((item) => {
                  const available = item.id === "nemuneh";
                  return (
                    <button key={item.id} type="button" disabled={!available}
                      onClick={() => { setWorkId(item.id); if (sourceMenuRef.current) sourceMenuRef.current.open = false; }}
                      aria-current={item.id === workId ? "true" : undefined}
                      className={"flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-right " +
                        (item.id === workId ? "bg-[#eaf0e4] text-[#254b34] " : "text-[#3a4a3d] ") +
                        (available ? "hover:bg-[#f0eee4] focus-visible:outline-2 focus-visible:outline-[#577f60]" : "cursor-not-allowed opacity-60")}
                      style={{ fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "17px", lineHeight: 2 }}>
                      <span>{item.titleUr}</span>
                      <span className="shrink-0 text-[0.75em] text-[#7b765e]">{available ? (item.id === workId ? "منتخب" : "") : "زیرِ تکمیل"}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          </div>
          <p className="mt-3 text-center text-[#655f4c]" style={{ fontSize: "17px", lineHeight: 2 }}>
            {work?.authorUr}
          </p>
        </header>
      ) : (
        <header className="border-b border-[#c9b98d]/45 pb-4">
          <div className="text-xl font-bold text-[#32422f]">Commentary</div>
          <label className="mt-3 block text-sm text-[#5c5344]">
            Source
            <select className="mt-1 w-full rounded-md border border-[#c6b48a] bg-white px-2 py-2 text-sm text-[#243024]"
              value={workId} aria-label="Tafsir source" onChange={(event) => setWorkId(event.target.value)}>
              {TAFSIR_WORKS.map((item) => <option key={item.id} value={item.id}>
                {item.titleEn + " — " + item.authorEn}
              </option>)}
            </select>
          </label>
        </header>
      )}
      {work && <div className="mt-4">
        {workId === "nemuneh" && remoteTopics.length > 0 && coverageGroups.some(group => group.verses.length > 0) ? (
          <section aria-label={ur ? "تفسیری آیات کا مجموعہ" : "Verses covered by this commentary"}
            data-tafsir-verse-coverage="true"
            className="rounded-xl border border-[#d6c5a0] bg-[#f8f4e8] px-4 py-3 text-[#304d37]">
            <p className="text-center" style={ur
              ? { fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "20px", lineHeight: 2.1 }
              : { fontSize: "16px", fontWeight: 650 }}>
              {ur ? "اس تفسیر میں شامل آیات" : "Verses covered by this commentary"}
            </p>
            <div className="mt-1 space-y-1 text-center" data-tafsir-source-ranges="true">
              {coverageGroups.filter(group => group.verses.length > 0).map(group => (
                <p key={group.sourceKey} style={ur
                  ? { fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "18px", lineHeight: 2.1 }
                  : { fontSize: "15px", lineHeight: 1.8 }}>
                  {commentaryScopeLabel(group, chosenLanguage)}
                </p>
              ))}
            </div>
            <p className="mt-1 text-center text-[#766950]" style={ur
              ? { fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "15px", lineHeight: 2 }
              : { fontSize: "12px", lineHeight: 1.8 }}>
              {ur ? "منتخب آیت: " + surahTitle(surah) + "، " + easternDigits(ayah)
                : "Selected verse: " + surah + ":" + ayah}
            </p>
          </section>
        ) : null}
        {!ur ? <p className="text-sm text-[#6d624e]">
          {englishPageRangeLabel + " · " + work.authorEn}
        </p> : null}
        {workId === "nemuneh" && pageVerseKeys && pageSections.length > 0 ? (
          <TafsirPageSections sections={pageSections} surah={surah} ayah={ayah} language={chosenLanguage} />
        ) : remoteTopics.length > 0 && workId === "nemuneh" ? (
          <div className="mt-4 space-y-7" dir={chosenLanguage === "ur" ? "rtl" : "ltr"} lang={chosenLanguage}>
            {remoteTopics.length > 1 ? (
              <nav aria-label={ur ? "اس تفسیری مضمون کے موضوعات" : "Topics in this commentary"} className="mb-7 rounded-xl border border-[#dfd0ad] bg-[#f9f5e9] px-4 py-2" data-tafsir-topics-index={chosenLanguage}>
                <details className="group">
                  <summary className="cursor-pointer list-none text-center text-[#335440] marker:hidden [&::-webkit-details-marker]:hidden"
                    style={ur ? { fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "19px", lineHeight: 2.1 } : { fontSize: "16px", fontWeight: 650, lineHeight: 2.1 }}>
                    {ur ? "اس تفسیری مضمون کے موضوعات" : "Topics in this commentary"} ({remoteTopics.length}) <span className="inline-block text-sm group-open:rotate-180" aria-hidden="true">⌄</span>
                  </summary>
                  <ol className="mt-2 space-y-1 border-t border-[#ded0aa] pt-2" dir={ur ? "rtl" : "ltr"}>
                    {remoteTopics.map((topic, i) => (
                      <li key={i}>
                        <a href={"#tafsir-topic-" + i} className={"block rounded-md px-2 py-1.5 text-[#32533e] hover:bg-[#ece9d9] focus-visible:outline-2 focus-visible:outline-[#577f60] " + (ur ? "text-right" : "text-left")}
                          style={ur ? { fontFamily: '"Alvi Nastaleeq", serif', fontSize: "17px", lineHeight: 2.1 } : { fontSize: "15px", lineHeight: 1.8 }}>
                          {i + 1}{ur ? "۔ " : ". "}{ur && i === 0 && topic.title === "تفسیر بسم اللہ الرحمن الرحیم"
                            ? "بسم اللہ الرحمن الرحیم"
                            : displayTafsirHeading(tafsirDisplayTopicHeading(topic.title, topic.text), chosenLanguage)}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              </nav>
            ) : null}
            {remoteTopics.map((topic, i) => (
              <section key={`${i}-${topic.sourceId ?? "x"}`} id={"tafsir-topic-" + i} className="scroll-mt-20">
                {topic.title && topic.title !== "تفسیر" && topic.title !== "Tafseer" && topic.title !== "Commentary (Tafseer)" ? (
                  <h2 data-tafsir-topic-heading="true"
                    data-tafsir-source-heading={tafsirSourceHeading(topic.title, chosenLanguage) || undefined}
                    className={"mb-4 text-[#32422f] " + (ur ? "text-center" : "")}
                    style={chosenLanguage === "ur"
                      ? { fontFamily: '"Gulzar", "Noto Nastaliq Urdu", serif', fontSize: "clamp(24px, 4.4vw, 29px)", lineHeight: 2.05, fontWeight: 400, marginBlockEnd: "0.8rem" }
                      : { fontSize: "1.25rem", lineHeight: 1.6, fontWeight: 650 }}>
                    {ur && i === 0 && topic.title === "تفسیر بسم اللہ الرحمن الرحیم"
                      ? "بسم اللہ الرحمن الرحیم"
                      : displayTafsirHeading(tafsirDisplayTopicHeading(topic.title, topic.text), chosenLanguage)}
                  </h2>
                ) : null}
                <TafsirText text={tafsirDisplayTopicBody(topic.title, topic.text)} language={chosenLanguage} />
              </section>
            ))}
            <p className="mt-7 border-t border-[#c9b98d]/30 pt-3 text-center text-xs text-[#82775f]">
              {ur ? "تفسیر نمونہ — اصل موضوعاتی متن، مطبوعہ نسخے سے مکمل مقابلہ ابھی باقی ہے۔" : "Tafsir Namoona — source text; full print collation remains pending."}
            </p>
          </div>
        ) : entry ? (
          <div className="mt-4" dir={entry.work.direction} lang={entry.work.language}>
            <p className="whitespace-pre-line text-lg leading-loose">{entry.text}</p>
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-[#e4d3a4] bg-[#fff8ea] px-4 py-5 text-sm leading-7 text-[#6a4e24] dark:border-[#8f754a] dark:bg-[#26251c] dark:text-[#e4d1a9]"
            data-tafsir-unavailable="true">
            {workId === "nemuneh" ? statusMessage : ur ? "اس ماخذ کی تصدیق شدہ عبارت ابھی شامل نہیں۔" : "Verified text for this source is not available yet."}
          </p>
        )}
      </div>}
    </article>
  );
}
