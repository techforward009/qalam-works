"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { SURAH_NAMES } from "./metadata";
import { SURAH_ENGLISH_NAMES, findSurahNumbers } from "./surahSearch";

type Props = {
  label: string;
  value: number;
  onChange: (surah: number) => void;
  language: "en" | "ur";
  className?: string;
};

const UI_COPY = {
  en: {
    search: "Search Surahs",
    placeholder: "Search by name or number",
    clear: "Clear",
    clearLabel: "Clear search",
    select: "Select a Surah",
    noResults: "No Surah found.",
  },
  ur: {
    search: "سورت تلاش کریں",
    placeholder: "نام یا نمبر لکھیں",
    clear: "صاف کریں",
    clearLabel: "تلاش صاف کریں",
    select: "سورت منتخب کریں",
    noResults: "کوئی سورت نہیں ملی۔",
  },
} as const;

export default function SurahSelector({ label, value, onChange, language, className }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const matches = useMemo(() => findSurahNumbers(query), [query]);
  const selectedMatches = matches.includes(value);
  const rtl = language === "ur";
  const copy = UI_COPY[language];
  const nameFor = (surah: number) =>
    language === "ur" ? SURAH_NAMES[surah - 1] : SURAH_ENGLISH_NAMES[surah - 1];

  const choose = (surah: number) => {
    if (!Number.isInteger(surah) || surah < 1 || surah > SURAH_NAMES.length) return;
    onChange(surah);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < 0 ? 0 : Math.min(current + 1, matches.length - 1));
    } else if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current < 0 ? matches.length - 1 : Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      if (!query.trim() || matches.length === 0) return;
      event.preventDefault();
      choose(matches[activeIndex] ?? matches[0]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (open) {
        setOpen(false);
        setActiveIndex(-1);
      } else if (query) {
        setQuery("");
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div className={`block text-xs text-[#687066] ${rtl ? "font-naskh" : ""}`} lang={language} dir={rtl ? "rtl" : "ltr"}>
      <label className="block" htmlFor={`${id}-search`}>{copy.search}</label>
      <div className="mt-1 flex min-w-0 gap-1">
        <input
          id={`${id}-search`}
          type="search"
          role="combobox"
          aria-label={copy.search}
          aria-autocomplete="list"
          aria-controls={`${id}-results`}
          aria-expanded={open && matches.length > 0}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${matches[activeIndex]}` : undefined}
          dir="auto"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(Boolean(event.target.value.trim()));
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setOpen(false)}
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#33372f] outline-none focus:border-[#718067] font-naskh"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              setActiveIndex(-1);
            }}
            className="shrink-0 border border-[#9aa394] bg-white px-2 py-1 text-xs hover:bg-[#f3f5f1]"
            aria-label={copy.clearLabel}
          >
            {copy.clear}
          </button>
        )}
      </div>

      {query && matches.length > 0 && open && (
        <div id={`${id}-results`} role="listbox" aria-label={copy.search} className="mt-1 max-h-52 overflow-y-auto border border-[#b8bdb3] bg-white">
          {matches.map((surah, index) => (
            <div
              id={`${id}-option-${surah}`}
              key={surah}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(surah)}
              className={`cursor-pointer px-2 py-1.5 text-sm hover:bg-[#f3f5f1] ${activeIndex === index ? "bg-[#f3f5f1]" : ""}`}
              dir={rtl ? "rtl" : "ltr"}
            >
              {surah}. {nameFor(surah)}
            </div>
          ))}
        </div>
      )}
      {query && matches.length === 0 && <p className="mt-1 text-xs text-[#777164]" role="status">{copy.noResults}</p>}

      <label className="mt-2 block" htmlFor={`${id}-select`}>{label}
        <select
          id={`${id}-select`}
          aria-label={label}
          dir={rtl ? "rtl" : "ltr"}
          className={className ?? "mt-1 w-full border border-[#b8bdb3] bg-white px-2 py-1 text-xs text-[#3f463c] outline-none focus:border-[#718067]"}
          value={selectedMatches ? value : ""}
          onChange={(event) => choose(Number(event.target.value))}
        >
          {!selectedMatches && <option value="">{copy.select}</option>}
          {matches.map((surah) => <option key={surah} value={surah}>{surah}. {nameFor(surah)}</option>)}
        </select>
      </label>
    </div>
  );
}
