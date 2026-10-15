"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../lib/language-context";
import { surahTitle } from "./reader/metadata";
import { displayTafsirHeading, splitTafsirTypography, tafsirSourceHeading } from "./reader/tafsirTypography";
import { TAFSIR_WORKS, tafsirForAyah, tafsirWorkById } from "./reader/tafsirCatalog";

type TafsirLanguage = "ur" | "en";
type Topic = { title: string; text: string; sourceId: number | null };
type Remote = {
  status: string;
  version?: number;
  language?: TafsirLanguage;
  text?: string | null;
  heading?: string;
  topics?: Topic[];
  referenceAyah?: string;
};

function TafsirText({ text, language }: { text: string; language: TafsirLanguage }) {
  const runs = splitTafsirTypography(text);
  const arabicStyle = {
    fontFamily: '"Digital Khatt Indo-Pak"',
    fontSize: "1.06em",
    lineHeight: 1.9,
    unicodeBidi: "isolate" as const,
  };
  return (
    <div
      className={"whitespace-pre-wrap break-words font-normal " + (language === "ur"
        ? "text-[#26372c]"
        : "text-[17px] leading-8 text-[#28362b]")}
      data-tafsir-urdu-text={language === "ur" ? "true" : undefined}
      dir={language === "ur" ? "rtl" : "ltr"} lang={language}
      style={language === "ur" ? { fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "22px", lineHeight: 2.25 } : undefined}
    >
      {runs.map((run, index) => run.kind === "arabic" ? (
        <span key={index} dir="rtl" lang="ar" data-tafsir-arabic="true"
          style={arabicStyle}>
          {run.text}
        </span>
      ) : run.kind === "arabic-unsupported" ? (
        <span key={index} className="contents">
          <span dir="rtl" lang="ar" data-tafsir-arabic-unsupported="true">{run.text}</span>
          <span role="note" data-tafsir-font-warning="digital-khatt-coverage"
            className={"mx-1 inline-block rounded bg-amber-100 px-1 text-[0.68em] text-amber-900 dark:bg-amber-950 dark:text-amber-200 " + (language === "ur" ? "font-naskh" : "")}
            dir={language === "ur" ? "rtl" : "ltr"} lang={language}>
            {language === "ur"
              ? "　ایک حرف Digital Khatt میں موجود نہیں؛ اصل عربی متن جوں کا توں ہے۔　"
              : " · Digital Khatt lacks a glyph here; the Arabic source text is unchanged. · "}
          </span>
        </span>
      ) : run.kind === "reference" ? (
        <span key={index} dir={language === "ur" ? "rtl" : "ltr"} lang={language} data-tafsir-reference="true"
          className={language === "ur" ? "font-naskh text-[0.78em]" : "text-[0.76em] text-[#6d624e]"}>
          {run.text}
        </span>
      ) : <span key={index}>{run.text}</span>)}
    </div>
  );
}

export default function QuranTafsirPage({ surah, ayah }: { surah: number; ayah: number }) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const [workId, setWorkId] = useState(TAFSIR_WORKS[0]?.id ?? "");
  const chosenLanguage: TafsirLanguage = ur ? "ur" : "en";
  const [remote, setRemote] = useState<Remote | null>(null);
  const work = tafsirWorkById(workId);
  const entry = work && work.id !== "nemuneh" ? tafsirForAyah(work.id, surah, ayah) : null;

  useEffect(() => {
    if (workId !== "nemuneh") return;
    let active = true;
    setRemote({ status: "loading" });
    fetch(`/api/quran/tafsir-namoona?surah=${surah}&ayah=${ayah}&lang=${chosenLanguage}`)
      .then(async (response) => (await response.json()) as Remote)
      .then((result) => { if (active) setRemote(result); })
      .catch(() => { if (active) setRemote({ status: "source_unavailable" }); });
    return () => { active = false; };
  }, [workId, chosenLanguage, surah, ayah]);

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
    <article className="quran-page quran-reader-paper relative flex w-full flex-col overflow-hidden bg-[#fffef9] px-4 py-5 text-[#293a2e] dark:bg-[#151a16] dark:text-[#e4eee4] sm:px-10 sm:py-8"
      dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"}>
      <header className="border-b border-[#c9b98d]/45 pb-4">
        <div className="text-xl font-bold text-[#32422f]"
          style={ur ? { fontFamily: '"Gulzar", serif', fontSize: "27px", lineHeight: 2.15, fontWeight: 400 } : undefined}>
          {ur ? "تفسیر" : "Commentary"}
        </div>
        <label className={"mt-3 block text-sm text-[#5c5344] " + (ur ? "font-naskh" : "")}>
          {ur ? "ماخذ" : "Source"}
          <select className="mt-1 w-full rounded-md border border-[#c6b48a] bg-white px-2 py-2 text-sm text-[#243024]"
            value={workId} aria-label={ur ? "تفسیر کا ماخذ" : "Tafsir source"} onChange={(event) => setWorkId(event.target.value)}>
            {TAFSIR_WORKS.map((item) => <option key={item.id} value={item.id}>
              {(ur ? item.titleUr : item.titleEn) + " — " + (ur ? item.authorUr : item.authorEn)}
            </option>)}
          </select>
        </label>
      </header>
      {work && <div className="mt-4">
        <p className="text-sm text-[#6d624e]">
          {ur ? surahTitle(surah) + "، آیت " + ayah : "Surah " + surah + ", Ayah " + ayah}
          {" · "}{ur ? work.authorUr : work.authorEn}
        </p>
        {remoteTopics.length > 0 && workId === "nemuneh" ? (
          <div className="mt-4 space-y-7" dir={chosenLanguage === "ur" ? "rtl" : "ltr"} lang={chosenLanguage}>
            {remoteTopics.map((topic, i) => (
              <section key={`${i}-${topic.sourceId ?? "x"}`}>
                {topic.title && topic.title !== "تفسیر" && topic.title !== "Tafseer" && topic.title !== "Commentary (Tafseer)" &&
                  !topic.text.trimStart().startsWith(topic.title) ? (
                  <h2 data-tafsir-topic-heading="true"
                    data-tafsir-source-heading={tafsirSourceHeading(topic.title, chosenLanguage) || undefined}
                    className="mb-3 text-[#32422f]"
                    style={chosenLanguage === "ur"
                      ? { fontFamily: '"Gulzar", serif', fontSize: "27px", lineHeight: 2.15, fontWeight: 400, marginBlockEnd: "0.75rem" }
                      : { fontSize: "1.25rem", lineHeight: 1.6, fontWeight: 650 }}>
                    {displayTafsirHeading(topic.title, chosenLanguage)}
                  </h2>
                ) : null}
                <TafsirText text={topic.text} language={chosenLanguage} />
              </section>
            ))}
            <p className="mt-4 border-t border-[#c9b98d]/30 pt-2 text-xs text-[#82775f]">
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
