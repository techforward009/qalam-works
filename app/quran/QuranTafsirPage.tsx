"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../lib/language-context";
import { surahTitle } from "./reader/metadata";
import { splitTafsirTypography } from "./reader/tafsirTypography";
import { TAFSIR_WORKS, tafsirForAyah, tafsirWorkById } from "./reader/tafsirCatalog";

type Remote = {
  status: string;
  text?: string | null;
  heading?: string;
  sourceEntryId?: number;
};

export default function QuranTafsirPage({ surah, ayah }: { surah: number; ayah: number }) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const [workId, setWorkId] = useState(TAFSIR_WORKS[0]?.id ?? "");
  const [remote, setRemote] = useState<Remote | null>(null);
  const work = tafsirWorkById(workId);
  const entry = work && work.id !== "nemuneh" ? tafsirForAyah(work.id, surah, ayah) : null;

  useEffect(() => {
    if (workId !== "nemuneh") return;
    let active = true;
    setRemote({ status: "loading" });
    fetch(`/api/quran/tafsir-namoona?surah=${surah}&ayah=${ayah}`)
      .then(async (response) => (await response.json()) as Remote)
      .then((result) => { if (active) setRemote(result); })
      .catch(() => { if (active) setRemote({ status: "source_unavailable" }); });
    return () => { active = false; };
  }, [workId, surah, ayah]);

  const nemunehText = workId === "nemuneh" && remote?.status === "unicode_apk" && remote.text;
  const typographyRuns = useMemo(() => splitTafsirTypography(nemunehText || ""), [nemunehText]);
  const message = remote?.status === "loading"
    ? (ur ? "تفسیر کھولی جا رہی ہے…" : "Loading commentary…")
    : remote?.status === "print_scan_only"
    ? (ur ? "اس آیت کا اصل مطبوعہ حوالہ مل گیا ہے، مگر قابلِ تلاش اردو عبارت ابھی شامل نہیں۔" : "A verified print reference exists, but searchable Urdu text is not available yet.")
    : remote?.status === "missing_unicode_and_scan"
    ? (ur ? "اس آیت کا اصل اردو ماخذ ابھی دستیاب نہیں۔" : "The original Urdu source for this verse is not available yet.")
    : remote?.status === "publication_pending"
    ? (ur ? "تفسیر نمونہ کی اشاعت ناشر کی اجازت کی تصدیق تک مؤخر ہے۔" : "Publication awaits verification of the publisher's permission.")
    : (ur ? "اس ماخذ کی قابلِ اشاعت عبارت ابھی دستیاب نہیں۔ کوئی تفسیر خود سے نہیں لکھی گئی۔" : "Publishable text for this source is not available yet. No commentary has been generated.");

  return (
    <article className="quran-page relative flex w-full flex-col overflow-hidden bg-[#fffef9] px-4 py-5 sm:px-10 sm:py-8" dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"}>
      <header className="border-b border-[#c9b98d]/45 pb-4">
        <div className={"text-xl font-bold text-[#32422f] " + (ur ? "font-naskh" : "")}>{ur ? "تفسیر" : "Commentary"}</div>
        <label className={"mt-3 block text-sm text-[#5c5344] " + (ur ? "font-naskh" : "")}>
          {ur ? "ماخذ" : "Source"}
          <select className="mt-1 w-full rounded-md border border-[#c6b48a] bg-white px-2 py-2 text-sm text-[#243024]" value={workId}
            aria-label={ur ? "تفسیر کا ماخذ" : "Tafsir source"} onChange={(event) => setWorkId(event.target.value)}>
            {TAFSIR_WORKS.map((item) => <option key={item.id} value={item.id}>
              {(ur ? item.titleUr : item.titleEn) + " — " + (ur ? item.authorUr : item.authorEn)}
            </option>)}
          </select>
        </label>
      </header>
      {work ? <div className="mt-4">
        <p className={"text-sm text-[#6d624e] " + (ur ? "font-naskh" : "")}>
          {ur ? surahTitle(surah) + "، آیت " + ayah : "Surah " + surah + ", Ayah " + ayah}
          {" · "}{ur ? work.authorUr : work.authorEn}
        </p>
        {nemunehText ? <div className="mt-4" dir="rtl" lang="ur">
          {remote?.heading ? <h2 className="mb-3 text-[25px] font-normal" style={{ fontFamily: '"Qalam Tafsir Nafees", "Noto Nastaliq Urdu", serif', lineHeight: 2.25 }}>{remote.heading}</h2> : null}
          <div
            className="whitespace-pre-wrap break-words font-normal"
            data-tafsir-urdu-text="true"
            style={{
              fontFamily: '"Qalam Tafsir Nafees", "Noto Nastaliq Urdu", serif',
              fontSize: "22px",
              lineHeight: 2.3,
            }}
          >
            {typographyRuns.map((run, index) =>
              run.kind === "arabic" ? (
                <span
                  key={index}
                  lang="ar"
                  dir="rtl"
                  data-tafsir-arabic="true"
                  className="font-arabic"
                  style={{
                    fontFamily: 'var(--font-amiri), "Amiri", "Noto Naskh Arabic", serif',
                    fontSize: "1.06em",
                    lineHeight: 1.9,
                    unicodeBidi: "isolate",
                  }}
                >
                  {run.text}
                </span>
              ) : run.text
            )}
          </div>
          <p className="mt-3 text-xs text-[#82775f]">
            {ur ? "تفسیر نمونہ، اردو برقی متن — اصل مطبوعہ نسخے سے مکمل مقابلہ باقی ہے۔" : "Tafsir Namoona, Urdu electronic text — full print collation pending."}
          </p>
          <p className="mt-1 text-xs text-[#82775f]">
            {ur ? "آزمائشی اردو فونٹ: نفیس نستعلیق" : "Preview Urdu font: Nafees Nastaleeq"}
          </p>
        </div> : entry ? <div className="mt-4" dir={entry.work.direction} lang={entry.work.language}>
          <p className="font-naskh whitespace-pre-line text-lg leading-loose">{entry.text}</p>
          <p className="mt-3 text-xs text-[#82775f]">
            {(entry.volume ? (ur ? "جلد " : "Volume ") + entry.volume : "")}
            {entry.page ? (ur ? " · صفحہ " : " · Page ") + entry.page : ""}
          </p>
        </div> : <p className={"mt-6 rounded-lg border border-[#e4d3a4] bg-[#fff8ea] px-4 py-5 text-sm leading-7 text-[#6a4e24] " + (ur ? "font-naskh" : "")} data-tafsir-unavailable="true">
          {workId === "nemuneh" ? message : ur ? "اس ماخذ کی تصدیق شدہ عبارت ابھی شامل نہیں۔ کوئی تفسیر خود ساختہ نہیں کی گئی۔" : "Verified text for this source is not in the library yet. No commentary has been generated."}
        </p>}
      </div> : null}
    </article>
  );
}
