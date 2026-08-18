"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLanguage } from "../../lib/language-context";
import { convertRomanUrdu, applyTokenChoices } from "./utils/writerEngine";
import type {
  WriterConversionResult,
  WriterToken,
  TokenChoice,
} from "./utils/writerTypes";

// ── Writing mode ──────────────────────────────────────────────────────────────

type WritingMode = "roman" | "urdu";

// ── i18n ──────────────────────────────────────────────────────────────────────

const UI = {
  en: {
    heading: "Urdu Writer",
    sub: "Write Roman Urdu and see Urdu script instantly — or write Urdu directly.",
    modeRoman: "Roman Urdu",
    modeUrdu: "اردو",
    modeRomanLabel: "Switch to Roman Urdu mode",
    modeUrduLabel: "Switch to direct Urdu writing mode",
    inputLabel: "Roman Urdu input",
    outputLabel: "Urdu script output",
    urduWritingLabel: "Direct Urdu writing",
    inputPlaceholder: "aaj ka din kaafi acha tha, main khush hoon…",
    urduPlaceholder: "یہاں اردو لکھیں…",
    outputPlaceholder: "Urdu script will appear here",
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
    sub: "رومن اردو لکھیں — اردو رسم الخط فوری پائیں، یا براہ راست اردو لکھیں۔",
    modeRoman: "Roman Urdu",
    modeUrdu: "اردو",
    modeRomanLabel: "رومن اردو موڈ",
    modeUrduLabel: "براہ راست اردو لکھیں",
    inputLabel: "رومن اردو",
    outputLabel: "اردو رسم الخط",
    urduWritingLabel: "اردو",
    inputPlaceholder: "آج کا دن کافی اچھا تھا، میں خوش ہوں…",
    urduPlaceholder: "یہاں اردو لکھیں…",
    outputPlaceholder: "اردو رسم الخط یہاں نظر آئے گا",
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

// ── Styling helpers (direction-neutral) ───────────────────────────────────────

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

function confidenceClass(c: WriterToken["confidence"]): string {
  return { high: "bg-[#1A3A2A]/10 text-[#1A3A2A]", medium: "bg-amber-100 text-amber-700", low: "bg-gray-100 text-gray-400" }[c];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RomanUrduWriterClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const ui = isUr ? UI.ur : UI.en;

  // Mode state — default: Roman Urdu
  const [mode, setMode] = useState<WritingMode>("roman");

  // Separate drafts — never destroyed on mode switch
  const [romanInput, setRomanInput] = useState("");
  const [urduInput, setUrduInput]   = useState("");

  // Roman-mode conversion state
  const [result, setResult]               = useState<WriterConversionResult | null>(null);
  const [choices, setChoices]             = useState<TokenChoice[]>([]);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);

  // UI state
  const [showTokens, setShowTokens] = useState(false);

  const romanRef = useRef<HTMLTextAreaElement>(null);
  const urduRef  = useRef<HTMLTextAreaElement>(null);

  // ── Conversion (Roman mode only) ──────────────────────────────────────────

  useEffect(() => {
    if (mode !== "roman") return;
    if (!romanInput.trim()) {
      setResult(null); setChoices([]); setActiveSentenceIdx(0); return;
    }
    const timer = setTimeout(() => {
      const r = convertRomanUrdu(romanInput);
      setResult(r); setChoices([]); setActiveSentenceIdx(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [romanInput, mode]);

  // ── Derived final output ──────────────────────────────────────────────────

  const finalOutput = useMemo(() => {
    if (!result) return "";
    if (choices.length > 0) return applyTokenChoices(result, choices).output;
    return result.candidates[activeSentenceIdx]?.output ?? result.output;
  }, [result, choices, activeSentenceIdx]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClearRoman = useCallback(() => {
    setRomanInput(""); setResult(null); setChoices([]); setActiveSentenceIdx(0);
    romanRef.current?.focus();
  }, []);

  const handleClearUrdu = useCallback(() => {
    setUrduInput(""); urduRef.current?.focus();
  }, []);

  const handleModeSwitch = useCallback((next: WritingMode) => {
    setMode(next);
    // Focus the relevant textarea on next tick
    requestAnimationFrame(() => {
      if (next === "roman") romanRef.current?.focus();
      else urduRef.current?.focus();
    });
  }, []);

  const handleTokenChoice = useCallback((tokenIndex: number, candidateIndex: number) => {
    setActiveSentenceIdx(-1);
    setChoices(prev => {
      const filtered = prev.filter(c => c.tokenIndex !== tokenIndex);
      return candidateIndex === 0 ? filtered : [...filtered, { tokenIndex, candidateIndex }];
    });
  }, []);

  const handleSentenceSelect = useCallback((idx: number) => {
    setActiveSentenceIdx(idx); setChoices([]);
  }, []);

  // ── Stable token helpers ──────────────────────────────────────────────────

  const tokenIndexMap = useMemo(() => {
    if (!result) return new Map<WriterToken, number>();
    return new Map(result.tokens.map((tok, i) => [tok, i]));
  }, [result]);

  const activeChoiceMap = useMemo(
    () => Object.fromEntries(choices.map(c => [c.tokenIndex, c.candidateIndex])),
    [choices]
  );

  const visibleTokens = useMemo(
    () => result?.tokens.filter(tok => !/^\s+$/.test(tok.roman) && !tok.isPhrasePart) ?? [],
    [result]
  );

  const hasOutput = !!finalOutput;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Root is always LTR at layout level — individual elements set their own dir.
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-[#151B2E] text-white px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight"
                  dir={isUr ? "rtl" : "ltr"} lang={isUr ? "ur" : "en"}>
                {ui.heading}
              </h1>
              <p className="mt-1 text-[#C7D6C7] text-sm"
                 dir={isUr ? "rtl" : "ltr"} lang={isUr ? "ur" : "en"}>
                {ui.sub}
              </p>
            </div>

            {/* Mode selector — only visible in Roman mode */}
            {mode === "roman" && (
              <button
                onClick={() => setShowTokens(v => !v)}
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
            )}
          </div>

          {/* ── Mode tabs ── */}
          <div className="mt-5 flex gap-1" role="tablist" aria-label="Writing mode">
            <button
              role="tab"
              aria-selected={mode === "roman"}
              aria-label={ui.modeRomanLabel}
              onClick={() => handleModeSwitch("roman")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mode === "roman"
                  ? "bg-[#F7F6F2] text-[#151B2E]"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
            >
              {ui.modeRoman}
            </button>
            <button
              role="tab"
              aria-selected={mode === "urdu"}
              aria-label={ui.modeUrduLabel}
              onClick={() => handleModeSwitch("urdu")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors font-urdu ${
                mode === "urdu"
                  ? "bg-[#F7F6F2] text-[#151B2E]"
                  : "text-[#9CA3AF] hover:text-white"
              }`}
              lang="ur"
            >
              {ui.modeUrdu}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main workspace ── */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* ════ ROMAN URDU MODE ════ */}
          {mode === "roman" && (
            <>
              {/* Roman input */}
              <section aria-labelledby="roman-input-label">
                <label id="roman-input-label"
                  className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2">
                  {ui.inputLabel}
                </label>
                <div className="relative">
                  <textarea
                    id="roman-input"
                    ref={romanRef}
                    value={romanInput}
                    onChange={e => setRomanInput(e.target.value)}
                    placeholder={ui.inputPlaceholder}
                    rows={4}
                    dir="ltr"
                    lang="ur-Latn"
                    className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-base text-[#151B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition"
                    aria-label={ui.inputLabel}
                    autoFocus
                  />
                  {romanInput && (
                    <button
                      onClick={handleClearRoman}
                      className="absolute top-3 right-3 text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors"
                      aria-label={ui.clear}
                    >
                      {ui.clear}
                    </button>
                  )}
                </div>
                {romanInput && (
                  <p className="mt-1 text-xs text-[#9CA3AF] text-right" aria-live="off">
                    {ui.charCount(romanInput.length)}
                  </p>
                )}
              </section>

              {/* Generated Urdu output */}
              <section aria-labelledby="urdu-output-label">
                <label id="urdu-output-label"
                  className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2">
                  {ui.outputLabel}
                </label>
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
                      {romanInput ? "…" : ui.outputPlaceholder}
                    </span>
                  )}
                </div>
                {hasOutput && (
                  <p className="mt-1 text-xs text-[#9CA3AF] text-left" dir="ltr">
                    {ui.rtlNote}
                  </p>
                )}
              </section>

              {/* Sentence candidates */}
              {result && result.candidates.length > 1 && (
                <section aria-label={ui.altSentences}>
                  <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                    <div className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider"
                         lang={isUr ? "ur" : "en"}>
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
                                isSelected ? "bg-[#B8935A]/8 text-[#151B2E] font-medium" : "text-[#374151] hover:bg-[#F9FAFB]"
                              }`}
                              dir="rtl" lang="ur"
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

              {/* Token breakdown panel */}
              {showTokens && result && (
                <section aria-label={ui.tokenPanelToggle}>
                  <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider"
                         lang={isUr ? "ur" : "en"}>
                      {ui.tokenPanelToggle}
                    </div>
                    {visibleTokens.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-[#9CA3AF]" lang={isUr ? "ur" : "en"}>{ui.noInput}</p>
                    ) : (
                      <div className="divide-y divide-[#F3F4F6]">
                        {visibleTokens.map((tok, rawIdx) => {
                          const tokenIndex = tokenIndexMap.get(tok) ?? -1;
                          const chosenCandIdx = activeChoiceMap[tokenIndex] ?? 0;
                          const chosenCand = tok.candidates[chosenCandIdx] ?? tok.candidates[0];
                          return (
                            <div key={rawIdx} className={`px-4 py-3 ${tok.isPassthrough ? "opacity-55" : ""}`}>
                              {/* Token row — explicit LTR layout, never inheriting dir */}
                              <div className="flex items-center gap-3 flex-wrap justify-between">
                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                  <span className="text-sm font-mono text-[#4A5568] bg-[#F3F4F6] px-2 py-0.5 rounded shrink-0"
                                        dir="ltr" lang="ur-Latn">
                                    {tok.roman}
                                  </span>
                                  <span className="text-[#D1D5DB] select-none" aria-hidden="true">›</span>
                                  <span className="font-urdu text-base text-[#151B2E]" dir="rtl" lang="ur">
                                    {chosenCand?.text || tok.roman}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceClass(tok.source)}`}
                                        title={ui.source[tok.source]}>
                                    {ui.source[tok.source]}
                                  </span>
                                  <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${confidenceClass(tok.confidence)}`}
                                        title={ui.confidenceFull[tok.confidence]}
                                        aria-label={ui.confidenceFull[tok.confidence]}>
                                    {ui.confidence[tok.confidence]}
                                  </span>
                                </div>
                              </div>
                              {/* Alternative picker */}
                              {tok.hasAlternatives && tok.candidates.length > 1 && (
                                <div className="mt-2 flex items-center gap-2 flex-wrap" dir="ltr">
                                  <span className="text-xs text-[#9CA3AF]" lang={isUr ? "ur" : "en"}>{ui.alternatives}</span>
                                  {tok.candidates.map((cand, ci) => (
                                    <button
                                      key={ci}
                                      onClick={() => handleTokenChoice(tokenIndex, ci)}
                                      className={`font-urdu text-sm px-2 py-0.5 rounded-lg border transition-colors ${
                                        chosenCandIdx === ci
                                          ? "bg-[#151B2E] text-white border-[#151B2E]"
                                          : "border-[#D1D5DB] text-[#374151] hover:border-[#B8935A]"
                                      }`}
                                      dir="rtl" lang="ur"
                                      aria-pressed={chosenCandIdx === ci}
                                      aria-label={ui.choiceBtnLabel(cand.text, ui.source[cand.source])}
                                    >
                                      {cand.text}
                                    </button>
                                  ))}
                                  {chosenCandIdx !== 0 && (
                                    <button
                                      onClick={() => handleTokenChoice(tokenIndex, 0)}
                                      className="text-xs text-[#9CA3AF] hover:text-[#4A5568] px-1 transition-colors"
                                      aria-label={ui.resetBtnLabel}
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

              {/* Roman empty state */}
              {!romanInput && (
                <div className="text-center py-10 text-[#9CA3AF] text-sm" lang={isUr ? "ur" : "en"}>
                  {ui.noInput}
                </div>
              )}
            </>
          )}

          {/* ════ DIRECT URDU MODE ════ */}
          {mode === "urdu" && (
            <section aria-labelledby="urdu-writing-label">
              <label id="urdu-writing-label"
                className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
                lang={isUr ? "ur" : "en"}>
                {ui.urduWritingLabel}
              </label>
              <div className="relative">
                <textarea
                  id="urdu-input"
                  ref={urduRef}
                  value={urduInput}
                  onChange={e => setUrduInput(e.target.value)}
                  placeholder={ui.urduPlaceholder}
                  rows={8}
                  dir="rtl"
                  lang="ur"
                  className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 font-urdu text-lg text-[#151B2E] leading-loose placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition text-right"
                  aria-label={ui.urduWritingLabel}
                  autoFocus
                />
                {urduInput && (
                  <button
                    onClick={handleClearUrdu}
                    className="absolute top-3 left-3 text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors"
                    aria-label={ui.clear}
                  >
                    {ui.clear}
                  </button>
                )}
              </div>
              {urduInput && (
                <p className="mt-1 text-xs text-[#9CA3AF] text-right" aria-live="off">
                  {ui.charCount(urduInput.length)}
                </p>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
