"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../../lib/language-context";
import { convertUrduToRoman, applyStyle, STYLE_OPTIONS } from "./utils/urduToRoman";
import type { UrduRomanStyle } from "./utils/urduToRoman";
import { loadUrDraft, saveUrDraft, clearUrDraft } from "./utils/urDraft";

// ── UI string dictionaries ─────────────────────────────────────────────────

const UI = {
  en: {
    heading:       "Qalam Urdu Writer",
    sub:           "Convert Urdu script to readable Roman Urdu — transliteration, not translation.",
    tabRoman:      "Roman Urdu → Urdu",
    tabUrduRoman:  "Urdu → Roman",
    inputLabel:    "URDU",
    outputLabel:   "ROMAN URDU",
    clear:         "Clear",
    clearLabel:    "Clear Urdu input",
    copy:          "Copy",
    copied:        "✓",
    copyLabel:     "Copy Roman Urdu output",
    placeholder:   "آج کا دن کافی اچھا تھا، میں خوش ہوں",
    emptyState:    "Roman Urdu output will appear here...",
    charCount:     (n: number) => `${n} chars`,
    styleHeading:  "Roman Style",
    examplesHeading: "Quick examples",
    footerNote:    "This tool provides transliteration (script conversion) only — not translation. English words, numbers, URLs, and filenames pass through unchanged.",
  },
  ur: {
    heading:       "قلم اردو رائٹر",
    sub:           "اردو رسم الخط کو رومن اردو میں تبدیل کریں — نقل حرفی، ترجمہ نہیں۔",
    tabRoman:      "رومن اردو → اردو",
    tabUrduRoman:  "اردو → رومن اردو",
    inputLabel:    "اردو",
    outputLabel:   "رومن اردو",
    clear:         "صاف کریں",
    clearLabel:    "اردو متن صاف کریں",
    copy:          "کاپی کریں",
    copied:        "✓",
    copyLabel:     "رومن اردو آؤٹ پٹ کاپی کریں",
    placeholder:   "آج کا دن کافی اچھا تھا، میں خوش ہوں",
    emptyState:    "رومن اردو آؤٹ پٹ یہاں ظاہر ہوگا...",
    charCount:     (n: number) => `${n} حروف`,
    styleHeading:  "رومن انداز",
    examplesHeading: "فوری مثالیں",
    footerNote:    "یہ ٹول صرف نقل حرفی (رسم الخط کی تبدیلی) فراہم کرتا ہے — ترجمہ نہیں۔ انگریزی الفاظ، اعداد، URLs اور فائل نام بغیر تبدیلی کے رہتے ہیں۔",
  },
} as const;

const MAX_INPUT = 3000;

export default function UrduRomanWriterClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const ui = isUr ? UI.ur : UI.en;

  const [urduInput, setUrduInput] = useState("");
  const [style, setStyle] = useState<UrduRomanStyle>("simple");
  const [copied, setCopied] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Draft hydration (runs once on mount, client-side only) ────────────────
  useEffect(() => {
    const draft = loadUrDraft();
    if (draft) {
      setUrduInput(draft.urduInput);
      setStyle(draft.style);
    }
    setDraftHydrated(true);
  }, []);

  // ── Draft persistence (debounced via useEffect) ───────────────────────────
  useEffect(() => {
    if (!draftHydrated) return;
    const timer = setTimeout(() => {
      saveUrDraft({ urduInput, style });
    }, 400);
    return () => clearTimeout(timer);
  }, [urduInput, style, draftHydrated]);

  const romanOutput = useMemo(
    () => urduInput.trim() ? applyStyle(convertUrduToRoman(urduInput), style) : "",
    [urduInput, style]
  );

  const handleCopy = useCallback(async () => {
    if (!romanOutput) return;
    await navigator.clipboard.writeText(romanOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [romanOutput]);

  const handleClear = useCallback(() => {
    setUrduInput("");
    clearUrDraft();
    inputRef.current?.focus();
  }, []);

  const charCount = urduInput.length;
  const hasOutput = romanOutput.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col" lang={isUr ? "ur" : "en"}>
      {/* Header */}
      <header className="bg-[#0F1424] text-white px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className={`text-2xl font-bold tracking-tight ${isUr ? "font-nastaliq font-normal text-right" : ""}`}>
            {ui.heading}
          </h1>
          <p className={`mt-1 text-[#C7D6C7] text-sm ${isUr ? "font-naskh text-right" : ""}`}>
            {ui.sub}
          </p>

          {/* Mode tabs */}
          <div
            className="mt-5 inline-flex p-1 rounded-xl bg-[#0F1424] border border-white/10 shadow-inner"
            role="tablist"
            aria-label="Writing mode"
            dir={isUr ? "rtl" : "ltr"}
          >
            <Link
              href="/tools/roman-urdu-writer"
              role="tab"
              aria-selected={false}
              data-testid="tab-roman"
              className="min-h-[40px] px-4 md:px-5 text-sm font-medium rounded-lg transition-colors text-[#9CA3AF] hover:text-white"
            >
              {ui.tabRoman}
            </Link>
            <button
              role="tab"
              aria-selected={true}
              data-testid="tab-urdu-roman"
              className={`min-h-[40px] px-4 md:px-5 text-sm font-medium rounded-lg transition-colors bg-[#F7F6F2] text-[#151B2E] shadow-sm ${isUr ? "font-nastaliq" : ""}`}
              lang="ur"
            >
              {ui.tabUrduRoman}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Input / Output grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="writer-urdu-roman-pane" dir={isUr ? "rtl" : "ltr"}>

            {/* Urdu input */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="urdu-roman-input"
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]"
                  id="urdu-roman-input-label"
                >
                  {ui.inputLabel}
                </label>
                {urduInput && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
                    aria-label={ui.clearLabel}
                  >
                    {ui.clear}
                  </button>
                )}
              </div>
              <textarea
                id="urdu-roman-input"
                ref={inputRef}
                data-testid="urdu-roman-input"
                value={urduInput}
                onChange={(e) => setUrduInput(e.target.value.slice(0, MAX_INPUT))}
                placeholder={ui.placeholder}
                dir="rtl"
                lang="ur"
                rows={10}
                autoFocus
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-lg font-nastaliq leading-loose text-right text-[#1A1A2E] shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]"
                style={{ fontFamily: "var(--font-nastaliq), 'Noto Nastaliq Urdu', serif" }}
                aria-label={ui.inputLabel}
              />
              <p className="mt-1 text-right text-xs text-[#9CA3AF]">
                {ui.charCount(charCount)}/{MAX_INPUT}
              </p>
            </section>

            {/* Roman output */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]"
                  id="urdu-roman-output-label"
                >
                  {ui.outputLabel}
                </label>
                {hasOutput && (
                  <button
                    onClick={handleCopy}
                    className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
                    aria-label={ui.copyLabel}
                  >
                    {copied ? ui.copied : ui.copy}
                  </button>
                )}
              </div>
              <div
                role="status"
                aria-live="polite"
                data-testid="urdu-roman-output"
                aria-labelledby="urdu-roman-output-label"
                dir="ltr"
                className={`min-h-[220px] rounded-xl border px-4 py-3 text-base leading-relaxed transition-colors ${
                  hasOutput
                    ? "border-[#C9A84C]/30 bg-white text-[#1A1A2E]"
                    : "border-[#E5E7EB] bg-[#F9F9F7] text-[#9CA3AF]"
                }`}
              >
                {hasOutput ? (
                  <span className="whitespace-pre-wrap">{romanOutput}</span>
                ) : (
                  <span className="text-sm italic">{ui.emptyState}</span>
                )}
              </div>
              {hasOutput && (
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {ui.charCount(romanOutput.length)}
                </p>
              )}
            </section>
          </div>

          {/* Style selector */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3" dir={isUr ? "rtl" : "ltr"}>
            <p className={`text-xs font-semibold uppercase tracking-widest text-[#374151] mb-2 ${isUr ? "font-nastaliq font-normal" : ""}`}>
              {ui.styleHeading}
            </p>
            <div className="flex flex-wrap gap-3">
              {STYLE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="roman-style"
                    value={opt.value}
                    checked={style === opt.value}
                    onChange={() => setStyle(opt.value)}
                    className="accent-[#C9A84C]"
                    data-testid={`style-${opt.value}`}
                  />
                  <span className="text-sm text-[#374151] group-hover:text-[#1A1A2E] transition-colors">
                    {isUr ? opt.labelUr : opt.label}
                  </span>
                  <span className="text-xs text-[#9CA3AF] hidden md:inline">
                    — {isUr ? opt.descriptionUr : opt.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick examples */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4" dir={isUr ? "rtl" : "ltr"}>
            <p className={`text-xs font-semibold uppercase tracking-widest text-[#374151] mb-3 ${isUr ? "font-nastaliq font-normal" : ""}`}>
              {ui.examplesHeading}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "السلام علیکم",
                "الحمد للہ",
                "ان شاء اللہ",
                "ماشاء اللہ",
                "جزاک اللہ خیر",
                "کیا حال ہے؟",
                "پاکستان زندہ باد",
                "بہت شکریہ",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setUrduInput(ex)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm font-nastaliq text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                  lang="ur"
                  dir="rtl"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <p className={`text-xs text-[#9CA3AF] text-center ${isUr ? "font-naskh" : ""}`} dir={isUr ? "rtl" : "ltr"}>
            {ui.footerNote}
          </p>
        </div>
      </main>
    </div>
  );
}
