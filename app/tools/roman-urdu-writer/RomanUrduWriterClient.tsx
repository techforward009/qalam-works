"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../../lib/language-context";
import { convertRomanUrdu, applyTokenChoices } from "./utils/writerEngine";
import type {
  WriterConversionResult,
  WriterToken,
  TokenChoice,
} from "./utils/writerTypes";

// ── i18n strings ──────────────────────────────────────────────────────────────

const UI = {
  en: {
    heading: "Urdu Writer",
    sub: "Type Roman Urdu — get Urdu script instantly",
    inputLabel: "Roman Urdu",
    outputLabel: "Urdu Script",
    inputPlaceholder:
      "aaj ka din kaafi acha hai, main khush hoon…",
    outputPlaceholder: "Urdu script appears here",
    copy: "Copy",
    copied: "Copied!",
    clear: "Clear",
    charCount: (n: number) => `${n} characters`,
    tokenLabel: "Word-by-word",
    source: {
      protected: "Protected",
      english: "English",
      phrase: "Phrase",
      context: "Resolved",
      lexicon: "Lexicon",
      morphology: "Variant",
      passthrough: "Unknown",
      suggestion: "Suggested",
    } as Record<WriterToken["source"], string>,
    confidence: {
      high: "High confidence",
      medium: "Medium confidence",
      low: "Preserved as typed",
    } as Record<WriterToken["confidence"], string>,
    resetToken: "Reset to engine default",
    noInput: "Start typing above to see the Urdu conversion.",
    rtlNote: "Output is right-to-left Urdu script",
  },
  ur: {
    heading: "اردو رائٹر",
    sub: "رومن اردو ٹائپ کریں — اردو رسم الخط فوری پائیں",
    inputLabel: "رومن اردو",
    outputLabel: "اردو رسم الخط",
    inputPlaceholder: "آج کا دن کافی اچھا ہے، میں خوش ہوں…",
    outputPlaceholder: "اردو رسم الخط یہاں نظر آئے گا",
    copy: "کاپی کریں",
    copied: "کاپی ہو گیا!",
    clear: "صاف کریں",
    charCount: (n: number) => `${n} حروف`,
    tokenLabel: "لفظ بہ لفظ",
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
      high: "اعلی درستگی",
      medium: "متوسط درستگی",
      low: "جیسا ٹائپ کیا",
    } as Record<WriterToken["confidence"], string>,
    resetToken: "انجن کی ڈیفالٹ پر واپس",
    noInput: "اوپر ٹائپ کریں تو اردو تبدیلی نظر آئے گی۔",
    rtlNote: "آؤٹ پٹ دائیں سے بائیں اردو رسم الخط میں ہے",
  },
};

// ── Confidence badge colour ───────────────────────────────────────────────────

function confidenceClass(confidence: WriterToken["confidence"]): string {
  return {
    high: "bg-[#1A3A2A]/10 text-[#1A3A2A]",
    medium: "bg-[#B8935A]/15 text-[#7A5C2E]",
    low: "bg-[#6B7280]/10 text-[#6B7280]",
  }[confidence];
}

function sourceClass(source: WriterToken["source"]): string {
  return {
    protected: "bg-sky-100 text-sky-800",
    english: "bg-violet-100 text-violet-800",
    phrase: "bg-teal-100 text-teal-800",
    context: "bg-emerald-100 text-emerald-800",
    lexicon: "bg-[#1A3A2A]/10 text-[#1A3A2A]",
    morphology: "bg-amber-100 text-amber-800",
    passthrough: "bg-gray-100 text-gray-500",
    suggestion: "bg-pink-100 text-pink-700",
  }[source] ?? "bg-gray-100 text-gray-500";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RomanUrduWriterClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const t = isUr ? UI.ur : UI.en;

  const [input, setInput] = useState("");
  const [result, setResult] = useState<WriterConversionResult | null>(null);
  const [choices, setChoices] = useState<TokenChoice[]>([]);
  const [finalOutput, setFinalOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Convert on input change (debounced 120ms to keep it snappy)
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      setChoices([]);
      setFinalOutput("");
      return;
    }
    const timer = setTimeout(() => {
      const r = convertRomanUrdu(input);
      setResult(r);
      setChoices([]);
      setFinalOutput(r.output);
    }, 120);
    return () => clearTimeout(timer);
  }, [input]);

  // Rebuild output when choices change
  useEffect(() => {
    if (!result || choices.length === 0) {
      setFinalOutput(result?.output ?? "");
      return;
    }
    const applied = applyTokenChoices(result, choices);
    setFinalOutput(applied.output);
  }, [result, choices]);

  const handleCopy = useCallback(async () => {
    if (!finalOutput) return;
    await navigator.clipboard.writeText(finalOutput).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [finalOutput]);

  const handleClear = useCallback(() => {
    setInput("");
    setResult(null);
    setChoices([]);
    setFinalOutput("");
    inputRef.current?.focus();
  }, []);

  const handleTokenChoice = useCallback(
    (tokenIndex: number, candidateIndex: number) => {
      setChoices((prev) => {
        const filtered = prev.filter((c) => c.tokenIndex !== tokenIndex);
        if (candidateIndex === 0) return filtered; // reset to default
        return [...filtered, { tokenIndex, candidateIndex }];
      });
    },
    []
  );

  const activeChoiceMap = Object.fromEntries(choices.map((c) => [c.tokenIndex, c.candidateIndex]));

  // Visible (non-whitespace, non-phrase-part) tokens for the token panel
  const visibleTokens =
    result?.tokens.filter((t) => !/^\s+$/.test(t.roman) && !t.isPhrasePart) ?? [];

  return (
    <div
      className={`min-h-screen bg-[#F7F6F2] flex flex-col ${isUr ? "font-urdu" : ""}`}
      dir={isUr ? "rtl" : "ltr"}
    >
      {/* ── Page header ── */}
      <header className="bg-[#151B2E] text-white px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {t.heading}
              </h1>
              <p className="mt-1 text-[#C7D6C7] text-sm">{t.sub}</p>
            </div>
            <button
              onClick={() => setShowTokens((v) => !v)}
              className={`mt-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                showTokens
                  ? "bg-[#B8935A] text-white border-[#B8935A]"
                  : "border-[#4A5568] text-[#C7D6C7] hover:border-[#B8935A] hover:text-[#B8935A]"
              }`}
              aria-pressed={showTokens}
            >
              {t.tokenLabel}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main workspace ── */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ── Input ── */}
          <section>
            <label
              htmlFor="roman-input"
              className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
            >
              {t.inputLabel}
            </label>
            <div className="relative">
              <textarea
                id="roman-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.inputPlaceholder}
                rows={4}
                dir="ltr"
                className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-base text-[#151B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition"
                aria-label={t.inputLabel}
                autoFocus
              />
              {input && (
                <button
                  onClick={handleClear}
                  className="absolute top-3 end-3 text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors"
                  aria-label={t.clear}
                >
                  {t.clear}
                </button>
              )}
            </div>
            {input && (
              <p className="mt-1 text-xs text-[#9CA3AF] text-right">
                {t.charCount(input.length)}
              </p>
            )}
          </section>

          {/* ── Output ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
                {t.outputLabel}
              </label>
              {finalOutput && (
                <button
                  onClick={handleCopy}
                  className={`text-xs px-3 py-1 rounded-lg transition-all font-medium ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[#B8935A]/10 text-[#7A5C2E] hover:bg-[#B8935A]/20"
                  }`}
                  aria-live="polite"
                >
                  {copied ? t.copied : t.copy}
                </button>
              )}
            </div>

            <div
              ref={outputRef}
              dir="rtl"
              className={`w-full rounded-xl border min-h-[120px] px-4 py-3 font-urdu text-lg leading-loose transition ${
                finalOutput
                  ? "bg-white border-[#D1D5DB] text-[#151B2E] shadow-sm"
                  : "bg-[#F0EFEB] border-[#E5E7EB] text-[#9CA3AF]"
              }`}
              aria-label={t.outputLabel}
              role="region"
              aria-live="polite"
            >
              {finalOutput || (
                <span className="text-sm" dir={isUr ? "rtl" : "ltr"}>
                  {input ? "…" : t.outputPlaceholder}
                </span>
              )}
            </div>

            {finalOutput && (
              <p className="mt-1 text-xs text-[#9CA3AF]" dir="ltr">
                {t.rtlNote}
              </p>
            )}
          </section>

          {/* ── Sentence candidates (if >1) ── */}
          {result && result.candidates.length > 1 && (
            <section
              className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm"
              aria-label="Alternative sentences"
            >
              <div className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
                {isUr ? "متبادل جملے" : "Alternatives"}
              </div>
              <ul className="divide-y divide-[#F3F4F6]">
                {result.candidates.map((cand, ci) => (
                  <li key={ci}>
                    <button
                      onClick={() => {
                        setFinalOutput(cand.output);
                        // Sentence candidate selection clears token choices
                        setChoices([]);
                      }}
                      className={`w-full text-right px-4 py-3 font-urdu text-base leading-loose transition-colors ${
                        cand.output === finalOutput && choices.length === 0
                          ? "bg-[#B8935A]/8 text-[#151B2E]"
                          : "text-[#374151] hover:bg-[#F9FAFB]"
                      }`}
                      dir="rtl"
                    >
                      {cand.output}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Token breakdown panel ── */}
          {showTokens && result && (
            <section
              className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden"
              aria-label={t.tokenLabel}
            >
              <div className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
                {t.tokenLabel}
              </div>

              {visibleTokens.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[#9CA3AF]">{t.noInput}</p>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {visibleTokens.map((tok, rawIdx) => {
                    // Find true token index in full tokens array
                    const tokenIndex = result.tokens.findIndex(
                      (t) => t === tok
                    );
                    const chosenCandIdx = activeChoiceMap[tokenIndex] ?? 0;
                    const chosenCand =
                      tok.candidates[chosenCandIdx] ?? tok.candidates[0];

                    return (
                      <div
                        key={rawIdx}
                        className={`px-4 py-3 ${
                          tok.isPassthrough ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-wrap">
                          {/* Roman source */}
                          <div className="shrink-0">
                            <span
                              className="text-sm font-mono text-[#4A5568] bg-[#F3F4F6] px-2 py-0.5 rounded"
                              dir="ltr"
                            >
                              {tok.roman}
                            </span>
                          </div>

                          {/* Arrow */}
                          <span className="text-[#9CA3AF] text-sm pt-0.5">→</span>

                          {/* Primary / chosen Urdu */}
                          <div
                            className="font-urdu text-base text-[#151B2E]"
                            dir="rtl"
                          >
                            {chosenCand?.text || tok.roman}
                          </div>

                          {/* Badges */}
                          <div className="flex gap-1.5 flex-wrap ms-auto">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceClass(tok.source)}`}
                              title={t.source[tok.source]}
                            >
                              {t.source[tok.source]}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${confidenceClass(tok.confidence)}`}
                              title={t.confidence[tok.confidence]}
                            >
                              {tok.confidence === "high"
                                ? "✓"
                                : tok.confidence === "medium"
                                ? "~"
                                : "?"}
                            </span>
                          </div>
                        </div>

                        {/* Alternatives picker */}
                        {tok.hasAlternatives && tok.candidates.length > 1 && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#9CA3AF]">
                              {isUr ? "متبادل:" : "Alternatives:"}
                            </span>
                            {tok.candidates.map((cand, ci) => (
                              <button
                                key={ci}
                                onClick={() =>
                                  handleTokenChoice(tokenIndex, ci)
                                }
                                className={`text-sm font-urdu px-2 py-0.5 rounded-lg border transition-colors ${
                                  chosenCandIdx === ci
                                    ? "bg-[#151B2E] text-white border-[#151B2E]"
                                    : "border-[#D1D5DB] text-[#374151] hover:border-[#B8935A]"
                                }`}
                                dir="rtl"
                                title={`${cand.source} — ${t.source[cand.source]}`}
                                aria-pressed={chosenCandIdx === ci}
                              >
                                {cand.text}
                              </button>
                            ))}
                            {chosenCandIdx !== 0 && (
                              <button
                                onClick={() =>
                                  handleTokenChoice(tokenIndex, 0)
                                }
                                className="text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors"
                                title={t.resetToken}
                              >
                                ↩
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Empty state ── */}
          {!input && (
            <div className="text-center py-10 text-[#9CA3AF] text-sm">
              {t.noInput}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
