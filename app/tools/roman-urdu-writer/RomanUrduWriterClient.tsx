"use client";
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { useLanguage } from "../../lib/language-context";
import { convertRomanUrdu, applyTokenChoices } from "./utils/writerEngine";
import type {
  WriterConversionResult,
  WriterToken,
  TokenChoice,
} from "./utils/writerTypes";

// ── Writing mode ──────────────────────────────────────────────────────────────

type WritingMode = "roman" | "urdu";

// ── Token is reviewable when the user may benefit from seeing it ──────────────

function isReviewable(tok: WriterToken): boolean {
  // Show only tokens that genuinely need attention:
  //   • has alternative choices the user can pick
  //   • OR was left unchanged because confidence was too low
  // EXCLUDE:
  //   • protected syntax (URL, number, email, hashtag)
  //   • known intentional English (Zoom, meeting, office…)
  //   • high-confidence lexicon conversions with no alternatives
  //   • phrase-head/phrase-part tokens (already combined)
  if (tok.isPhrasePart) return false;
  if (tok.isProtected)  return false;
  if (tok.isEnglish)    return false;
  if (tok.hasAlternatives) return true;
  if (tok.isPassthrough)   return true;
  if (tok.confidence === "low") return true;
  return false;
}

// ── i18n ──────────────────────────────────────────────────────────────────────

const UI = {
  en: {
    heading:    "Qalam Urdu Writer",
    sub:        "Write Urdu easily from Roman Urdu, with control over uncertain words.",
    modeRoman:  "Roman Urdu",
    modeUrdu:   "اردو",
    modeRomanLabel: "Switch to Roman Urdu mode",
    modeUrduLabel:  "Switch to direct Urdu writing mode",
    inputLabel:     "Roman Urdu",
    outputLabel:    "Urdu",
    urduWritingLabel: "Urdu",
    inputPlaceholder: "aaj ka din kaafi acha tha, main khush hoon…",
    urduPlaceholder:  "یہاں اردو لکھیں…",
    outputPlaceholder: "Urdu script will appear here",
    clear:       "Clear",
    charCount:   (n: number) => `${n} chars`,
    reviewNone:  "No words need review.",
    reviewCount: (n: number) => `Review ${n} word${n === 1 ? "" : "s"}`,
    reviewLabel: "Review words",
    chooseAnother: "Choose another form",
    unchanged:  "Left unchanged — Qalam was unsure.",
    resetLabel: "Reset",
    noInput:    "Start typing Roman Urdu above.",
    rtlNote:    "Right-to-left Urdu script",
    altVersions: "Alternative version",
    choiceBtnLabel: (cand: string) => `Select ${cand}`,
    resetBtnLabel:  "Reset to Qalam's suggestion",
    reviewToggleLabel: (n: number, open: boolean) =>
      `${open ? "Hide" : "Show"} ${n} word${n === 1 ? "" : "s"} to review`,
  },
  ur: {
    heading:    "قلم اردو رائٹر",
    sub:        "رومن اردو سے آسانی سے اردو لکھیں، اور جہاں ضرورت ہو لفظ خود منتخب کریں۔",
    modeRoman:  "Roman Urdu",
    modeUrdu:   "اردو",
    modeRomanLabel: "رومن اردو موڈ",
    modeUrduLabel:  "براہ راست اردو لکھیں",
    inputLabel:     "رومن اردو",
    outputLabel:    "اردو",
    urduWritingLabel: "اردو",
    inputPlaceholder: "آج کا دن کافی اچھا تھا، میں خوش ہوں…",
    urduPlaceholder:  "یہاں اردو لکھیں…",
    outputPlaceholder: "اردو رسم الخط یہاں نظر آئے گا",
    clear:       "صاف کریں",
    charCount:   (n: number) => `${n} حروف`,
    reviewNone:  "کسی لفظ کے جائزے کی ضرورت نہیں۔",
    reviewCount: (n: number) => `${n} الفاظ کا جائزہ`,
    reviewLabel: "الفاظ کا جائزہ",
    chooseAnother: "دوسرا لفظ منتخب کریں",
    unchanged:  "یقین نہ ہونے کی وجہ سے یہ لفظ تبدیل نہیں کیا گیا۔",
    resetLabel: "اصل انتخاب",
    noInput:    "اوپر رومن اردو لکھیں۔",
    rtlNote:    "دائیں سے بائیں اردو رسم الخط",
    altVersions: "متبادل",
    choiceBtnLabel: (cand: string) => `${cand}`,
    resetBtnLabel:  "قلم کی تجویز پر واپس",
    reviewToggleLabel: (n: number, open: boolean) =>
      `${open ? "چھپائیں" : "دکھائیں"} — ${n} الفاظ`,
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RomanUrduWriterClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const ui = isUr ? UI.ur : UI.en;

  // Mode — default Roman Urdu
  const [mode, setMode] = useState<WritingMode>("roman");

  // Separate drafts — never destroyed on mode switch
  const [romanInput, setRomanInput] = useState("");
  const [urduInput,  setUrduInput]  = useState("");

  // Conversion state
  const [result, setResult] = useState<WriterConversionResult | null>(null);
  const [choices, setChoices] = useState<TokenChoice[]>([]);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);

  // Review panel open/closed
  const [reviewOpen, setReviewOpen] = useState(false);

  const romanRef = useRef<HTMLTextAreaElement>(null);
  const urduRef  = useRef<HTMLTextAreaElement>(null);

  // ── Conversion (Roman mode only, debounced 120ms) ─────────────────────────

  useEffect(() => {
    if (mode !== "roman") return;
    if (!romanInput.trim()) {
      setResult(null); setChoices([]); setActiveSentenceIdx(0); setReviewOpen(false);
      return;
    }
    const t = setTimeout(() => {
      const r = convertRomanUrdu(romanInput);
      setResult(r);
      setChoices([]);
      setActiveSentenceIdx(0);
      // Auto-close review when text changes so stale choices don't confuse
      setReviewOpen(false);
    }, 120);
    return () => clearTimeout(t);
  }, [romanInput, mode]);

  // ── Derived output ────────────────────────────────────────────────────────

  const finalOutput = useMemo(() => {
    if (!result) return "";
    if (choices.length > 0) return applyTokenChoices(result, choices).output;
    return result.candidates[activeSentenceIdx >= 0 ? activeSentenceIdx : 0]?.output
      ?? result.output;
  }, [result, choices, activeSentenceIdx]);

  // ── Reviewable tokens (memoized) ──────────────────────────────────────────

  const reviewableTokens = useMemo(() => {
    if (!result) return [];
    return result.tokens
      .map((tok, idx) => ({ tok, idx }))
      .filter(({ tok }) => isReviewable(tok));
  }, [result]);

  // Choice map: tokenIndex → candidateIndex
  const activeChoiceMap = useMemo(
    () => Object.fromEntries(choices.map(c => [c.tokenIndex, c.candidateIndex])),
    [choices]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleModeSwitch = useCallback((next: WritingMode) => {
    setMode(next);
    requestAnimationFrame(() => {
      if (next === "roman") romanRef.current?.focus();
      else urduRef.current?.focus();
    });
  }, []);

  const handleClearRoman = useCallback(() => {
    setRomanInput(""); setResult(null); setChoices([]);
    setActiveSentenceIdx(0); setReviewOpen(false);
    romanRef.current?.focus();
  }, []);

  const handleClearUrdu = useCallback(() => {
    setUrduInput(""); urduRef.current?.focus();
  }, []);

  const handleTokenChoice = useCallback((tokenIndex: number, candidateIndex: number) => {
    setActiveSentenceIdx(-1);
    setChoices(prev => {
      const filtered = prev.filter(c => c.tokenIndex !== tokenIndex);
      return candidateIndex === 0 ? filtered : [...filtered, { tokenIndex, candidateIndex }];
    });
  }, []);

  const handleSentenceSelect = useCallback((idx: number) => {
    setActiveSentenceIdx(idx);
    setChoices([]);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const hasOutput = !!finalOutput;
  const reviewCount = reviewableTokens.length;
  const hasSentenceAlts = result && result.candidates.length > 1;

  return (
    // Root always LTR — individual elements set own dir
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-[#151B2E] text-white px-4 py-6 md:px-8">
        <div className="max-w-3xl mx-auto">
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

          {/* Mode tabs */}
          <div className="mt-5 flex gap-1" role="tablist" aria-label="Writing mode">
            {(["roman", "urdu"] as WritingMode[]).map((m, i) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                aria-label={m === "roman" ? ui.modeRomanLabel : ui.modeUrduLabel}
                onClick={() => handleModeSwitch(m)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  m === "urdu" ? "font-urdu" : ""
                } ${
                  mode === m
                    ? "bg-[#F7F6F2] text-[#151B2E]"
                    : "text-[#9CA3AF] hover:text-white"
                }`}
                lang={m === "urdu" ? "ur" : undefined}
              >
                {m === "roman" ? ui.modeRoman : ui.modeUrdu}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* ════ ROMAN URDU MODE ════ */}
          {mode === "roman" && (
            <>
              {/* Roman input */}
              <section aria-labelledby="roman-input-label">
                <label
                  id="roman-input-label"
                  className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
                >
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
              </section>

              {/* Generated Urdu output */}
              <section aria-labelledby="urdu-output-label">
                <label
                  id="urdu-output-label"
                  className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
                >
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
                    <span className="text-sm font-sans" lang={isUr ? "ur" : "en"}>
                      {romanInput ? "…" : ui.outputPlaceholder}
                    </span>
                  )}
                </div>
              </section>

              {/* Sentence alternative (compact, only when >1 and useful) */}
              {hasSentenceAlts && reviewCount === 0 && (
                <section aria-label={ui.altVersions}>
                  <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                    <div
                      className="px-4 py-2 border-b border-[#E5E7EB] text-xs font-semibold text-[#4A5568] uppercase tracking-wider"
                      lang={isUr ? "ur" : "en"}
                    >
                      {ui.altVersions}
                    </div>
                    <ul role="listbox" aria-label={ui.altVersions}>
                      {result!.candidates.map((cand, ci) => {
                        const isSelected = choices.length === 0 && activeSentenceIdx === ci;
                        return (
                          <li key={ci} role="option" aria-selected={isSelected}>
                            <button
                              onClick={() => handleSentenceSelect(ci)}
                              className={`w-full text-right px-4 py-3 font-urdu text-base leading-loose transition-colors ${
                                isSelected
                                  ? "bg-[#B8935A]/10 text-[#151B2E] font-medium"
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

              {/* ── Review words section ── */}
              {hasOutput && (
                <section aria-label={ui.reviewLabel}>
                  {reviewCount === 0 ? (
                    /* No review needed — calm confirmation */
                    <p
                      className="text-sm text-[#6B7280] text-center py-1"
                      lang={isUr ? "ur" : "en"}
                    >
                      {ui.reviewNone}
                    </p>
                  ) : (
                    /* Review toggle + cards */
                    <div>
                      {/* Toggle */}
                      <button
                        onClick={() => setReviewOpen(v => !v)}
                        className={`flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
                          reviewOpen
                            ? "bg-[#B8935A]/10 text-[#7A5C2E]"
                            : "text-[#4A5568] hover:bg-[#E5E7EB]"
                        }`}
                        aria-expanded={reviewOpen}
                        aria-controls="review-panel"
                        aria-label={ui.reviewToggleLabel(reviewCount, reviewOpen)}
                        lang={isUr ? "ur" : "en"}
                      >
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                          reviewOpen ? "bg-[#B8935A] text-white" : "bg-[#E5E7EB] text-[#4A5568]"
                        }`}>
                          {reviewCount}
                        </span>
                        <span>{ui.reviewCount(reviewCount)}</span>
                        <span className="text-xs text-[#9CA3AF] ml-1" aria-hidden="true">
                          {reviewOpen ? "▲" : "▼"}
                        </span>
                      </button>

                      {/* Review cards */}
                      {reviewOpen && (
                        <div
                          id="review-panel"
                          className="mt-3 space-y-3"
                          role="group"
                          aria-label={ui.reviewLabel}
                        >
                          {reviewableTokens.map(({ tok, idx: tokenIndex }) => {
                            const chosenCandIdx = activeChoiceMap[tokenIndex] ?? 0;
                            const chosenText = tok.candidates[chosenCandIdx]?.text ?? tok.roman;
                            const isOverridden = (activeChoiceMap[tokenIndex] ?? 0) !== 0;

                            return (
                              <div
                                key={tokenIndex}
                                className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden"
                              >
                                {/* Card header: Roman token → current Urdu */}
                                <div className="px-4 py-3 flex items-center gap-3 flex-wrap justify-between border-b border-[#F3F4F6]">
                                  {/* Roman source — always LTR */}
                                  <span
                                    className="text-sm font-mono text-[#4A5568] bg-[#F3F4F6] px-2 py-0.5 rounded shrink-0"
                                    dir="ltr"
                                    lang="ur-Latn"
                                  >
                                    {tok.roman}
                                  </span>
                                  <span className="text-[#D1D5DB] text-sm select-none" aria-hidden="true">›</span>
                                  {/* Current Urdu form — always RTL */}
                                  <span
                                    className="font-urdu text-base text-[#151B2E] font-medium"
                                    dir="rtl"
                                    lang="ur"
                                  >
                                    {chosenText}
                                  </span>
                                  {/* Reset if overridden */}
                                  {isOverridden && (
                                    <button
                                      onClick={() => handleTokenChoice(tokenIndex, 0)}
                                      className="text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors ml-auto"
                                      aria-label={ui.resetBtnLabel}
                                      lang={isUr ? "ur" : "en"}
                                    >
                                      {ui.resetLabel}
                                    </button>
                                  )}
                                </div>

                                {/* Passthrough: calm explanation */}
                                {tok.isPassthrough && tok.candidates.length <= 1 && (
                                  <p
                                    className="px-4 py-2 text-xs text-[#9CA3AF]"
                                    lang={isUr ? "ur" : "en"}
                                    dir={isUr ? "rtl" : "ltr"}
                                  >
                                    {ui.unchanged}
                                  </p>
                                )}

                                {/* Alternatives: when hasAlternatives */}
                                {tok.hasAlternatives && tok.candidates.length > 1 && (
                                  <div className="px-4 py-3">
                                    <p
                                      className="text-xs text-[#6B7280] mb-2"
                                      lang={isUr ? "ur" : "en"}
                                    >
                                      {ui.chooseAnother}
                                    </p>
                                    {/* Candidate buttons — flex-wrap for mobile */}
                                    <div
                                      className="flex flex-wrap gap-2"
                                      role="group"
                                      aria-label={ui.chooseAnother}
                                    >
                                      {tok.candidates.map((cand, ci) => {
                                        if (!cand.text) return null;
                                        const isChosen = chosenCandIdx === ci;
                                        return (
                                          <button
                                            key={ci}
                                            onClick={() => handleTokenChoice(tokenIndex, ci)}
                                            className={`font-urdu text-sm px-3 py-1.5 rounded-lg border transition-colors min-w-[44px] min-h-[36px] ${
                                              isChosen
                                                ? "bg-[#151B2E] text-white border-[#151B2E]"
                                                : "bg-white border-[#D1D5DB] text-[#374151] hover:border-[#B8935A] hover:text-[#7A5C2E]"
                                            }`}
                                            dir="rtl"
                                            lang="ur"
                                            aria-pressed={isChosen}
                                            aria-label={ui.choiceBtnLabel(cand.text)}
                                          >
                                            {cand.text}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Empty state */}
              {!romanInput && (
                <div
                  className="text-center py-10 text-[#9CA3AF] text-sm"
                  lang={isUr ? "ur" : "en"}
                >
                  {ui.noInput}
                </div>
              )}
            </>
          )}

          {/* ════ DIRECT URDU MODE ════ */}
          {mode === "urdu" && (
            <section aria-labelledby="urdu-writing-label">
              <label
                id="urdu-writing-label"
                className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
                lang={isUr ? "ur" : "en"}
              >
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
