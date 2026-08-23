"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { convertUrduToRoman } from "./utils/urduToRoman";

const MAX_INPUT = 3000;

export default function UrduRomanWriterClient() {
  const [urduInput, setUrduInput] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const romanOutput = useMemo(
    () => (urduInput.trim() ? convertUrduToRoman(urduInput) : ""),
    [urduInput]
  );

  const handleCopy = useCallback(async () => {
    if (!romanOutput) return;
    await navigator.clipboard.writeText(romanOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [romanOutput]);

  const handleClear = useCallback(() => {
    setUrduInput("");
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
            Qalam Urdu → Roman Converter
          </h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            Convert Urdu script to readable Roman Urdu — no translation, only transliteration.
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Input / Output grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Urdu input */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="urdu-input"
                  className="text-xs font-semibold uppercase tracking-widest text-[#374151]"
                >
                  اردو
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
                id="urdu-input"
                ref={inputRef}
                value={urduInput}
                onChange={(e) => setUrduInput(e.target.value.slice(0, MAX_INPUT))}
                placeholder="اردو میں لکھیں..."
                dir="rtl"
                lang="ur"
                rows={10}
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
                <label className="text-xs font-semibold uppercase tracking-widest text-[#374151]">
                  Roman Urdu
                </label>
                {hasOutput && (
                  <button
                    onClick={handleCopy}
                    className="text-xs text-[#6B7280] hover:text-[#374151] transition-colors"
                    aria-label="Copy Roman output"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
              <div
                role="status"
                aria-live="polite"
                aria-label="Roman Urdu output"
                className={`min-h-[220px] rounded-xl border px-4 py-3 text-base leading-relaxed transition-colors ${
                  hasOutput
                    ? "border-[#C9A84C]/30 bg-white text-[#1A1A2E]"
                    : "border-[#E5E7EB] bg-[#F9F9F7] text-[#9CA3AF]"
                }`}
              >
                {hasOutput ? (
                  <span className="whitespace-pre-wrap">{romanOutput}</span>
                ) : (
                  <span className="text-sm italic">
                    Roman Urdu output will appear here...
                  </span>
                )}
              </div>
              {hasOutput && (
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {romanOutput.length} chars
                </p>
              )}
            </section>
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
