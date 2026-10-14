"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "../lib/language-context";
import { surahTitle } from "./reader/metadata";
import { splitTafsirTypography } from "./reader/tafsirTypography";
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
  if (language === "en") {
    return <div className="whitespace-pre-wrap break-words text-[17px] leading-8 text-[#28362b] dark:text-[#e4eee4]" dir="ltr" lang="en">{text}</div>;
  }
  return (
    <div
      className="whitespace-pre-wrap break-words font-normal text-[#26372c] dark:text-[#e4eee4]"
      data-tafsir-urdu-text="true"
      dir="rtl" lang="ur"
      style={{ fontFamily: '"Alvi Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: "22px", lineHeight: 2.25 }}
    >
      {runs.map((run, index) => run.kind === "arabic" ? (
        <span key={index} dir="rtl" lang="ar" data-tafsir-arabic="true" className="font-arabic"
          style={{ fontFamily: 'var(--font-amiri), "Amiri", "Noto Naskh Arabic", serif', fontSize: "1.06em", lineHeight: 1.9, unicodeBidi: "isolate" }}>
          {run.text}
        </span>
      ) : run.text)}
    </div>
  );
}

export default function QuranTafsirPage({ surah, ayah }: { surah: number; ayah: number }) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const [workId, setWorkId] = useState(TAFSIR_WORKS[0]?.id ?? "");
  const [chosenLanguage, setChosenLanguage] = useState<TafsirLanguage>("ur");
  const [remote, setRemote] = useState<Remote | null>(null);
  const work = tafsirWorkById(workId);
  const entry = work && work.id !== "nemuneh" ? tafsirForAyah(work.id, surah, ayah) : null;

  useEffect(() => {
    const saved = window.localStorage.getItem("qalam-tafsir-language");
    if (saved === "ur" || saved === "en") setChosenLanguage(saved);
  }, []);
  const selectLanguage = (value: TafsirLanguage) => {
    setChosenLanguage(value);
    window.localStorage.setItem("qalam-tafsir-language", value);
  };
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
        <div className={"text-xl font-bold text-[#32422f] dark:text-[#e5eee6] " + (ur ? "font-naskh" : "")}>{ur ? "تفسیر" : "Commentary"}</div>
        <label className={"mt-3 block text-sm text-[#5c5344] dark:text-[#c6cdbd] " + (ur ? "font-naskh" : "")}>
          {ur ? "ماخذ" : "Source"}
          <select className="mt-1 w-full rounded-md border border-[#c6b48a] bg-white px-2 py-2 text-sm text-[#243024] dark:bg-[#202720] dark:text-[#e4eee4]"
            value={workId} aria-label={ur ? "تفسیر کا ماخذ" : "Tafsir source"} onChange={(event) => setWorkId(event.target.value)}>
            {TAFSIR_WORKS.map((item) => <option key={item.id} value={item.id}>
              {(ur ? item.titleUr : item.titleEn) + " — " + (ur ? item.authorUr : item.authorEn)}
            </option>)}
          </select>
        </label>
        {workId === "nemuneh" && (
          <label className={"mt-3 block text-sm text-[#5c5344] dark:text-[#c6cdbd] " + (ur ? "font-naskh" : "")}>
            {ur ? "تفسیر کی زبان" : "Commentary language"}
            <select className="mt-1 w-full rounded-md border border-[#c6b48a] bg-white px-2 py-2 text-sm text-[#243024] dark:bg-[#202720] dark:text-[#e4eee4]"
              value={chosenLanguage} aria-label={ur ? "تفسیر کی زبان" : "Commentary language"}
              onChange={(event) => selectLanguage(event.target.value as TafsirLanguage)}>
              <option value="ur">اردو — صفدر حسین نجفی</option>
              <option value="en">English — Tafsir Namoona</option>
            </select>
          </label>
        )}
      </header>
      {work && <div className="mt-4">
        <p className="text-sm text-[#6d624e] dark:text-[#c6cdbd]">
          {ur ? surahTitle(surah) + "، آیت " + ayah : "Surah " + surah + ", Ayah " + ayah}
          {" · "}{ur ? work.authorUr : work.authorEn}
        </p>
        {remoteTopics.length > 0 && workId === "nemuneh" ? (
          <div className="mt-4 space-y-7" dir={chosenLanguage === "ur" ? "rtl" : "ltr"} lang={chosenLanguage}>
            {remoteTopics.map((topic, i) => (
              <section key={`${i}-${topic.sourceId ?? "x"}`}>
                {topic.title && topic.title !== "تفسیر" && topic.title !== "Tafseer" && topic.title !== "Commentary (Tafseer)" &&
                  !topic.text.trimStart().startsWith(topic.title) ? (
                  <h2 className="mb-2 text-lg font-semibold text-[#32422f] dark:text-[#e5eee6]">{topic.title}</h2>
                ) : null}
                <TafsirText text={topic.text} language={chosenLanguage} />
              </section>
            ))}
            <p className="mt-4 border-t border-[#c9b98d]/30 pt-2 text-xs text-[#82775f] dark:text-[#b9ad8e]">
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