"use client";

import { useState } from "react";
import { useLanguage } from "../lib/language-context";
import { surahTitle } from "./reader/metadata";
import { TAFSIR_WORKS, tafsirForAyah, tafsirWorkById } from "./reader/tafsirCatalog";

export default function QuranTafsirPage({
  surah,
  ayah,
}: {
  surah: number;
  ayah: number;
}) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const [workId, setWorkId] = useState(TAFSIR_WORKS[0]?.id ?? "");
  const work = tafsirWorkById(workId);
  const entry = work ? tafsirForAyah(work.id, surah, ayah) : null;

  return (
    <article className="quran-page relative flex w-full flex-col overflow-hidden bg-[#fffef9] px-4 py-5 sm:px-10 sm:py-8" dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"}>
      <header className="border-b border-[#c9b98d]/45 pb-4">
        <div className={"text-xl font-bold text-[#32422f] " + (ur ? "font-naskh" : "")}>
          {ur ? "تفسیر" : "Commentary"}
        </div>
        <label className={"mt-3 block text-sm text-[#5c5344] " + (ur ? "font-naskh" : "")}>
          {ur ? "ماخذ" : "Source"}
          <select
            className="mt-1 w-full rounded-md border border-[#c6b48a] bg-white px-2 py-2 text-sm text-[#243024]"
            value={workId}
            aria-label={ur ? "تفسیر کا ماخذ" : "Tafsir source"}
            onChange={(event) => setWorkId(event.target.value)}
          >
            {TAFSIR_WORKS.map((item) => (
              <option key={item.id} value={item.id}>
                {(ur ? item.titleUr : item.titleEn) + " — " + (ur ? item.authorUr : item.authorEn)}
              </option>
            ))}
          </select>
        </label>
      </header>
      {work ? (
        <div className="mt-4">
          <p className={"text-sm text-[#6d624e] " + (ur ? "font-naskh" : "")}>
            {ur
              ? surahTitle(surah) + "، آیت " + ayah
              : "Surah " + surah + ", Ayah " + ayah}
            {" · "}
            {ur ? work.authorUr : work.authorEn}
          </p>
          {entry ? (
            <div className="mt-4" dir={entry.work.direction} lang={entry.work.language}>
              <p className={entry.work.language === "ur" || entry.work.language === "fa" ? "font-naskh text-lg leading-loose" : "font-naskh text-lg leading-9"}>
                {entry.text}
              </p>
              <p className="mt-3 text-xs text-[#82775f]">
                {(entry.volume ? (ur ? "جلد " : "Volume ") + entry.volume : "")}
                {entry.page ? (ur ? " · صفحہ " : " · Page ") + entry.page : ""}
              </p>
            </div>
          ) : (
            <p className={"mt-6 rounded-lg border border-[#e4d3a4] bg-[#fff8ea] px-4 py-5 text-sm leading-7 text-[#6a4e24] " + (ur ? "font-naskh" : "")} data-tafsir-unavailable="true">
              {ur
                ? "اس ماخذ کی تصدیق شدہ عبارت ابھی شامل نہیں۔ کوئی تفسیر خود ساختہ نہیں کی گئی۔"
                : "Verified text for this source is not in the library yet. No commentary has been generated."}
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
