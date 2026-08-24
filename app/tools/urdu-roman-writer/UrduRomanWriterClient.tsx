"use client";

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { convertUrduToRoman, applyStyle, STYLE_OPTIONS } from "./utils/urduToRoman";
import type { UrduRomanStyle } from "./utils/urduToRoman";
import { loadUrDraft, saveUrDraft, clearUrDraft } from "./utils/urDraft";

const MAX_INPUT = 3000;

export default function UrduRomanWriterClient() {
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
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      {/* Header */}
      <header className="bg-[#0F1424] text-white px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">
            Qalam Urdu Writer
          </h1>
          <p className="mt-1 text-[#C7D6C7] text-sm">
            Write Urdu easily from Roman Urdu, with control over uncertain words.
          </p>

          {/* Mode tabs — tab 1 links back to Roman Urdu Writer, tab 2 is this page */}
          <div
            className="mt-5 inline-flex p-1 rounded-xl bg-[#0F1424] border border-white/10 shadow-inner"
            role="tablist"
            aria-label="Writing mode"
          >
            <Link
              href="/tools/roman-urdu-writer"
              role="tab"
              aria-selected={false}
              data-testid="tab-roman"
              className="min-h-[40px] px-4 md:px-5 text-sm font-medium rounded-lg transition-colors text-[#9CA3AF] hover:text-white"
            >
              Roman Urdu → اردو
            </Link>
            <button
              role="tab"
              aria-selected={true}
              data-testid="tab-urdu-roman"
              className="min-h-[40px] px-4 md:px-5 text-sm font-medium rounded-lg transition-colors bg-[#F7F6F2] text-[#151B2E] shadow-sm font-nastaliq"
              lang="ur"
            >
              اردو → Roman
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Input / Output grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="writer-urdu-roman-pane">

            {/* Urdu input */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="urdu-roman-input"
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]"
                  id="urdu-roman-input-label"
                >
                  URDU
                </label>
                {urduInput && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
                    aria-label="Clear input"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                id="urdu-roman-input"
                ref={inputRef}
                data-testid="urdu-roman-input"
                value={urduInput}
                onChange={(e) => setUrduInput(e.target.value.slice(0, MAX_INPUT))}
                placeholder="آج کا دن کافی اچھا تھا، میں خوش ہوں"
                dir="rtl"
                lang="ur"
                rows={10}
                autoFocus
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-lg font-nastaliq leading-loose text-right text-[#1A1A2E] shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C]"
                style={{ fontFamily: "var(--font-nastaliq), 'Noto Nastaliq Urdu', serif" }}
                aria-label="Urdu script input"
              />
              <p className="mt-1 text-right text-xs text-[#9CA3AF]">
                {charCount}/{MAX_INPUT} chars
              </p>
            </section>

            {/* Roman output */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]"
                  id="urdu-roman-output-label"
                >
                  ROMAN URDU
                </label>
                {hasOutput && (
                  <button
                    onClick={handleCopy}
                    className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
                    aria-label="Copy Roman output"
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                )}
              </div>
              <div
                role="status"
                aria-live="polite"
                data-testid="urdu-roman-output"
                aria-labelledby="urdu-roman-output-label"
                className={`min-h-[220px] rounded-xl border px-4 py-3 text-base leading-relaxed transition-colors ${
                  hasOutput
                    ? "border-[#C9A84C]/30 bg-white text-[#1A1A2E]"
                    : "border-[#E5E7EB] bg-[#F9F9F7] text-[#9CA3AF]"
                }`}
              >
                {hasOutput ? (
                  <span className="whitespace-pre-wrap">{romanOutput}</span>
                ) : (
                  <span className="text-sm italic">Roman Urdu output will appear here...</span>
                )}
              </div>
              {hasOutput && (
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {romanOutput.length} chars
                </p>
              )}
            </section>
          </div>

          {/* Style selector */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#374151] mb-2">
              Roman Style
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
                    {opt.label}
                  </span>
                  <span className="text-xs text-[#9CA3AF] hidden md:inline">
                    — {opt.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick examples */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#374151] mb-3">
              Quick examples
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
          <p className="text-xs text-[#9CA3AF] text-center">
            This tool provides transliteration (script conversion) only — not translation.
            English words, numbers, URLs, and filenames pass through unchanged.
          </p>
        </div>
      </main>
    </div>
  );
}
