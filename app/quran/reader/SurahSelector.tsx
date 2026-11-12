"use client";

import { useMemo, useState } from "react";
import { SURAH_NAMES } from "./metadata";
import { findSurahNumbers } from "./surahSearch";

type Props = {
  label: string;
  value: number;
  onChange: (surah: number) => void;
  language: "en" | "ur";
  className?: string;
};

export default function SurahSelector({ label, value, onChange, language, className }: Props) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => findSurahNumbers(query), [query]);
  const selectedMatches = matches.includes(value);
  const rtl = language === "ur";
  const searchLabel = rtl ? "سورت تلاش کریں / Search Surahs" : "Search Surahs / سورت تلاش کریں";

  return (
    <div className={`block text-xs text-[#687066] ${rtl ? "font-naskh" : ""}`} lang={language} dir={rtl ? "rtl" : "ltr"}>
      <label className="block" htmlFor="quran-surah-search">{searchLabel}</label>
      <div className="mt-1 flex min-w-0 gap-1">
        <input
          id="quran-surah-search"
          type="search"
          dir="auto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={rtl ? "اردو یا English نام یا نمبر" : "Urdu or English name or number"}
          className="min-w-0 flex-1 border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#33372f] outline-none focus:border-[#718067] font-naskh"
          aria-label={searchLabel}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="shrink-0 border border-[#9aa394] bg-white px-2 py-1 text-xs hover:bg-[#f3f5f1]" aria-label={rtl ? "تلاش صاف کریں / Clear search" : "Clear search / تلاش صاف کریں"}>
            {rtl ? "صاف" : "Clear"}
          </button>
        )}
      </div>
      <label className="mt-2 block" htmlFor="quran-surah-select">{label}
        <select
          id="quran-surah-select"
          aria-label={label}
          dir={rtl ? "rtl" : "ltr"}
          className={className ?? "mt-1 w-full border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#3f463c] outline-none focus:border-[#718067]"}
          value={selectedMatches ? value : ""}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (next) {
              onChange(next);
              setQuery("");
            }
          }}
        >
          {!selectedMatches && <option value="">{rtl ? "متعلقہ سورت منتخب کریں" : "Choose a matching Surah"}</option>}
          {matches.map((surah) => <option key={surah} value={surah}>{surah}. {SURAH_NAMES[surah - 1]}</option>)}
        </select>
      </label>
      {query && matches.length === 0 && <p className="mt-1 text-xs text-[#777164]" role="status">{rtl ? "کوئی سورت نہیں ملی — No Surah found" : "No Surah found — کوئی سورت نہیں ملی"}</p>}
    </div>
  );
}
