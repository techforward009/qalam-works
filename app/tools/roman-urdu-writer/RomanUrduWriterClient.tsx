"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "../../lib/language-context";
import { convertRomanUrdu, applyTokenChoices } from "./utils/writerEngine";
import type {
  WriterConversionResult,
  WriterToken,
  TokenChoice,
} from "./utils/writerTypes";

// ── i18n ──────────────────────────────────────────────────────────────────────

const UI = {
  en: {
    heading: "Urdu Writer",
    sub: "Type Roman Urdu — get Urdu script instantly",
    inputLabel: "Roman Urdu input",
    outputLabel: "Urdu script output",
    inputPlaceholder: "aaj ka din kaafi acha tha, main khush hoon…",
    outputPlaceholder: "Urdu script will appear here",
    copy: "Copy",
    copied: "Copied!",
    clear: "Clear",
    charCount: (n: number) => `${n} chars`,
    tokenPanelToggle: "Word-by-word",
    altSentences: "Alternatives",
    alternatives: "Alternatives:",
    resetToken: "Reset",
    noInput: "Start typing above to see the conversion.",
    rtlNote: "Right-to-left Urdu script",
    source: {
      protected: "Protected",
      english: "English",
      phrase: "Phrase",
      context: "Context",
      lexicon: "Lexicon",
      morphology: "Variant",
      passthrough: "Unknown",
      suggestion: "Suggested",
    } as Record<WriterToken["source"], string>,
    confidence: {
      high: "✓",
      medium: "~",
      low: "?",
    } as Record<WriterToken["confidence"], string>,
    confidenceFull: {
      high: "High confidence",
      medium: "Medium confidence",
      low: "Preserved as typed",
    } as Record<WriterToken["confidence"], string>,
    choiceBtnLabel: (cand: string, source: string) => `Select ${cand} (${source})`,
    resetBtnLabel: "Reset to engine default",
  },
  ur: {
    heading: "اردو رائٹر",
    sub: "رومن اردو لکھیں — اردو رسم الخط فوری پائیں",
    inputLabel: "رومن اردو",
    outputLabel: "اردو رسم الخط",
    inputPlaceholder: "آج کا دن کافی اچھا تھا، میں خوش ہوں…",
    outputPlaceholder: "اردو رسم الخط یہاں نظر آئے گا",
    copy: "کاپی کریں",
    copied: "کاپی ہو گیا!",
    clear: "صاف کریں",
    charCount: (n: number) => `${n} حروف`,
    tokenPanelToggle: "لفظ بہ لفظ",
    altSentences: "متبادل جملے",
    alternatives: "متبادل:",
    resetToken: "پہلے جیسا",
    noInput: "اوپر ٹائپ کریں تو اردو تبدیلی نظر آئے گی۔",
    rtlNote: "دائیں سے بائیں اردو رسم الخط",
    source: {
      protected: "محفوظ",
      english: "انگریزی",
      phrase: "فقرہ",
      context: "سیاق",
      lexicon: "لغت",
      morphology: "صرفی",
      passthrough: "نامعلوم",
      suggestion: "تجویز",
    } as Record<WriterToken["source"], string>,
    confidence: {
      high: "✓",
      medium: "~",
      low: "?",
    } as Record<WriterToken["confidence"], string>,
    confidenceFull: {
      high: "اعلی درستگی",
      medium: "متوسط درستگی",
      low: "جیسا ٹائپ کیا",
    } as Record<WriterToken["confidence"], string>,
    choiceBtnLabel: (cand: string, source: string) => `${cand} (${source})`,
    resetBtnLabel: "پہلی ڈیفالٹ",
  },
};

// ── Badge colours (source-neutral — no dir dependency) ────────────────────────

function sourceClass(source: WriterToken["source"]): string {
  const map: Record<WriterToken["source"], string> = {
    protected: "bg-sky-100 text-sky-800",
    english: "bg-violet-100 text-violet-800",
    phrase: "bg-teal-100 text-teal-800",
    context: "bg-emerald-100 text-emerald-800",
    lexicon: "bg-[#1A3A2A]/10 text-[#1A3A2A]",
    morphology: "bg-amber-100 text-amber-800",
    passthrough: "bg-gray-100 text-gray-500",
    suggestion: "bg-pink-100 text-pink-700",
  };
  return map[source] ?? "bg-gray-100 text-gray-500";
}

function confidenceClass(confidence: WriterToken["confidence"]): string {
  const map: Record<WriterToken["confidence"], string> = {
    high: "bg-[#1A3A2A]/10 text-[#1A3A2A]",
    medium: "bg-[#B8935A]/15 text-[#7A5C2E]",
    low: "bg-gray-100 text-gray-400",
  };
  return map[confidence];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RomanUrduWriterClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const ui = isUr ? UI.ur : UI.en;

  const [input, setInput] = useState("");
  const [result, setResult] = useState<WriterConversionResult | null>(null);
  const [choices, setChoices] = useState<TokenChoice[]>([]);
  // activeSentenceIdx: which sentence candidate the user selected (-1 = token-driven)
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Conversion ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      setChoices([]);
      setActiveSentenceIdx(0);
      return;
    }
    const timer = setTimeout(() => {
      const r = convertRomanUrdu(input);
      setResult(r);
      setChoices([]);
      setActiveSentenceIdx(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [input]);

  // ── Final output (derived from result + choices or sentence selection) ───────

  const finalOutput = useMemo(() => {
    if (!result) return "";
    if (choices.length > 0) {
      return applyTokenChoices(result, choices).output;
    }
    return result.candidates[activeSentenceIdx]?.output ?? result.output;
  }, [result, choices, activeSentenceIdx]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!finalOutput) return;
    try { await navigator.clipboard.writeText(finalOutput); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [finalOutput]);

  const handleClear = useCallback(() => {
    setInput("");
    setResult(null);
    setChoices([]);
    setActiveSentenceIdx(0);
    inputRef.current?.focus();
  }, []);

  const handleTokenChoice = useCallback(
    (tokenIndex: number, candidateIndex: number) => {
      // Token choice takes precedence over sentence selection
      setActiveSentenceIdx(-1);
      setChoices((prev) => {
        const filtered = prev.filter((c) => c.tokenIndex !== tokenIndex);
        if (candidateIndex === 0) return filtered; // reset to default
        return [...filtered, { tokenIndex, candidateIndex }];
      });
    },
    []
  );

  const handleSentenceSelect = useCallback((idx: number) => {
    setActiveSentenceIdx(idx);
    setChoices([]); // token choices cleared when picking a sentence candidate
  }, []);

  // ── Token index map — stable across renders ──────────────────────────────────

  // Map token object → its index in result.tokens (computed once per result)
  const tokenIndexMap = useMemo(() => {
    if (!result) return new Map<WriterToken, number>();
    return new Map(result.tokens.map((tok, i) => [tok, i]));
  }, [result]);

  // Choice map: tokenIndex → candidateIndex
  const activeChoiceMap = useMemo(
    () => Object.fromEntries(choices.map((c) => [c.tokenIndex, c.candidateIndex])),
    [choices]
  );

  // Visible tokens for the breakdown panel (skip whitespace + phrase parts)
  const visibleTokens = useMemo(
    () => result?.tokens.filter((tok) => !/^\s+$/.test(tok.roman) && !tok.isPhrasePart) ?? [],
    [result]
  );

  const hasOutput = !!finalOutput;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    // Root: always LTR at the layout level.
    // Individual text elements set their own dir via the dir attribute.
    // This avoids the cascading-dir problem where a single dir="rtl" on the
    // root flips flex row direction, margin-start/end semantics, and text
    // alignment for all child elements simultaneously.
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="bg-[#151B2E] text-white px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight"
              dir={isUr ? "rtl" : "ltr"}
              lang={isUr ? "ur" : "en"}
            >
              {ui.heading}
            </h1>
            <p
              className="mt-1 text-[#C7D6C7] text-sm"
              dir={isUr ? "rtl" : "ltr"}
              lang={isUr ? "ur" : "en"}
            >
              {ui.sub}
            </p>
          </div>
          <button
            onClick={() => setShowTokens((v) => !v)}
            className={`mt-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              showTokens
                ? "bg-[#B8935A] text-white border-[#B8935A]"
                : "border-[#4A5568] text-[#C7D6C7] hover:border-[#B8935A] hover:text-[#B8935A]"
            }`}
            aria-pressed={showTokens}
            lang={isUr ? "ur" : "en"}
          >
            {ui.tokenPanelToggle}
          </button>
        </div>
      </header>

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Input ── */}
          <section>
            <label
              htmlFor="roman-input"
              className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
            >
              {ui.inputLabel}
            </label>
            <div className="relative">
              <textarea
                id="roman-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={ui.inputPlaceholder}
                rows={4}
                dir="ltr"
                lang="ur-Latn"
                className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-base text-[#151B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition"
                aria-label={ui.inputLabel}
                autoFocus
              />
              {input && (
                <button
                  onClick={handleClear}
                  className="absolute top-3 right-3 text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors"
                  aria-label={ui.clear}
                >
                  {ui.clear}
                </button>
              )}
            </div>
            {input && (
              <p className="mt-1 text-xs text-[#9CA3AF] text-right" aria-live="off">
                {ui.charCount(input.length)}
              </p>
            )}
          </section>

          {/* ── Output ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
                {ui.outputLabel}
              </label>
              {hasOutput && (
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1 rounded-lg transition-all font-medium ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[#B8935A]/10 text-[#7A5C2E] hover:bg-[#B8935A]/20"
                  }`}
                  aria-label={copied ? ui.copied : ui.copy}
                >
                  {copied ? ui.copied : ui.copy}
                </button>
              )}
            </div>

            {/* Output text area — always dir="rtl" because Urdu is RTL */}
            <div
              dir="rtl"
              lang="ur"
              className={`w-full rounded-xl border min-h-[120px] px-4 py-3 font-urdu text-lg leading-loose transition ${
                hasOutput
                  ? "bg-white border-[#D1D5DB] text-[#151B2E] shadow-sm"
                  : "bg-[#F0EFEB] border-[#E5E7EB] text-[#9CA3AF]"
              }`}
              role="status"
              aria-live="polite"
              aria-label={ui.outputLabel}
            >
              {hasOutput ? (
                finalOutput
              ) : (
                <span className="text-sm" lang={isUr ? "ur" : "en"}>
                  {input ? "…" : ui.outputPlaceholder}
                </span>
              )}
            </div>

            {hasOutput && (
              <p className="mt-1 text-xs text-[#9CA3AF] text-left" dir="ltr">
                {ui.rtlNote}
              </p>
            )}
          </section>

          {/* ── Sentence candidates ── */}
          {result && result.candidates.length > 1 && (
            <section aria-label={ui.altSentences}>
              <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                <div
                  className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider"
                  lang={isUr ? "ur" : "en"}
                >
                  {ui.altSentences}
                </div>
                <ul role="listbox" aria-label={ui.altSentences}>
                  {result.candidates.map((cand, ci) => {
                    const isSelected = choices.length === 0 && activeSentenceIdx === ci;
                    return (
                      <li key={ci} role="option" aria-selected={isSelected}>
                        <button
                          onClick={() => handleSentenceSelect(ci)}
                          className={`w-full text-right px-4 py-3 font-urdu text-base leading-loose transition-colors ${
                            isSelected
                              ? "bg-[#B8935A]/8 text-[#151B2E] font-medium"
                              : "text-[#374151] hover:bg-[#F9FAFB]"
                          }`}
                          dir="rtl"
                          lang="ur"
                        >
                          {cand.output}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* ── Token breakdown panel ── */}
          {showTokens && result && (
            <section aria-label={ui.tokenPanelToggle}>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div
                  className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider"
                  lang={isUr ? "ur" : "en"}
                >
                  {ui.tokenPanelToggle}
                </div>

                {visibleTokens.length === 0 ? (
                  <p
                    className="px-4 py-6 text-sm text-[#9CA3AF]"
                    lang={isUr ? "ur" : "en"}
                  >
                    {ui.noInput}
                  </p>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {visibleTokens.map((tok, rawIdx) => {
                      const tokenIndex = tokenIndexMap.get(tok) ?? -1;
                      const chosenCandIdx = activeChoiceMap[tokenIndex] ?? 0;
                      const chosenCand = tok.candidates[chosenCandIdx] ?? tok.candidates[0];

                      return (
                        <div
                          key={rawIdx}
                          className={`px-4 py-3 ${tok.isPassthrough ? "opacity-55" : ""}`}
                        >
                          {/*
                            Token row layout uses explicit left/right flex,
                            never inheriting dir from parent.
                            Left side: Roman source + arrow + Urdu output (always in this order)
                            Right side: badges
                          */}
                          <div className="flex items-center gap-3 flex-wrap justify-between">
                            {/* Left cluster: always LTR at the row level */}
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              {/* Roman (always LTR) */}
                              <span
                                className="text-sm font-mono text-[#4A5568] bg-[#F3F4F6] px-2 py-0.5 rounded shrink-0"
                                dir="ltr"
                                lang="ur-Latn"
                              >
                                {tok.roman}
                              </span>

                              {/* Neutral separator (no directional arrow) */}
                              <span className="text-[#D1D5DB] select-none" aria-hidden="true">
                                ›
                              </span>

                              {/* Urdu primary/chosen (always RTL) */}
                              <span
                                className="font-urdu text-base text-[#151B2E]"
                                dir="rtl"
                                lang="ur"
                              >
                                {chosenCand?.text || tok.roman}
                              </span>
                            </div>

                            {/* Right cluster: badges */}
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceClass(tok.source)}`}
                                title={ui.source[tok.source]}
                              >
                                {ui.source[tok.source]}
                              </span>
                              <span
                                className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${confidenceClass(tok.confidence)}`}
                                title={ui.confidenceFull[tok.confidence]}
                                aria-label={ui.confidenceFull[tok.confidence]}
                              >
                                {ui.confidence[tok.confidence]}
                              </span>
                            </div>
                          </div>

                          {/* Alternative candidate picker */}
                          {tok.hasAlternatives && tok.candidates.length > 1 && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap" dir="ltr">
                              <span className="text-xs text-[#9CA3AF]" lang={isUr ? "ur" : "en"}>
                                {ui.alternatives}
                              </span>
                              {tok.candidates.map((cand, ci) => (
                                <button
                                  key={ci}
                                  onClick={() => handleTokenChoice(tokenIndex, ci)}
                                  className={`font-urdu text-sm px-2 py-0.5 rounded-lg border transition-colors ${
                                    chosenCandIdx === ci
                                      ? "bg-[#151B2E] text-white border-[#151B2E]"
                                      : "border-[#D1D5DB] text-[#374151] hover:border-[#B8935A]"
                                  }`}
                                  dir="rtl"
                                  lang="ur"
                                  aria-pressed={chosenCandIdx === ci}
                                  aria-label={ui.choiceBtnLabel(
                                    cand.text,
                                    ui.source[cand.source]
                                  )}
                                >
                                  {cand.text}
                                </button>
                              ))}
                              {chosenCandIdx !== 0 && (
                                <button
                                  onClick={() => handleTokenChoice(tokenIndex, 0)}
                                  className="text-xs text-[#9CA3AF] hover:text-[#4A5568] px-1 transition-colors"
                                  aria-label={ui.resetBtnLabel}
                                  title={ui.resetBtnLabel}
                                >
                                  {ui.resetToken}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Empty state ── */}
          {!input && (
            <div
              className="text-center py-10 text-[#9CA3AF] text-sm"
              lang={isUr ? "ur" : "en"}
            >
              {ui.noInput}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
