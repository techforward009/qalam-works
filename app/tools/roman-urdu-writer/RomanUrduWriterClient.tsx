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
import {
  getActiveUrduText,
  hasExportableUrduText,
  downloadWriterTxt,
  formatActiveTextForWhatsApp,
  writeWriterHandoff,
  DOCUMENT_STUDIO_ROUTE,
} from "./utils/writerExport";

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
    continueEditingUrdu: "Continue editing in Urdu",
    continueEditingUrduLabel: "Continue editing the Urdu result in direct Urdu mode",
    confirmReplaceMsg: "You already have Urdu text here. Replace it with the converted result?",
    confirmReplace: "Replace",
    confirmKeep: "Keep current text",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    copyLabel: "Copy Urdu text",
    downloadTxt: "Download TXT",
    downloadTxtLabel: "Download Urdu text as a TXT file",
    whatsappReady: "WhatsApp Ready",
    whatsappReadyLabel: "Prepare current Urdu text for WhatsApp",
    whatsappPreview: "WhatsApp-ready text",
    copyWhatsApp: "Copy for WhatsApp",
    copiedWhatsApp: "Copied for WhatsApp",
    copyWhatsAppFailed: "Copy failed",
    copyWhatsAppLabel: "Copy WhatsApp-ready text",
    hidePreview: "Hide",
    hidePreviewLabel: "Hide WhatsApp-ready preview",
    continueStudio: "Continue in Document Studio",
    continueStudioLabel: "Open current Urdu text in Document Studio",
    continueStudioFailed: "Could not open Document Studio.",
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
    continueEditingUrdu: "اردو میں ترمیم جاری رکھیں",
    continueEditingUrduLabel: "اردو نتیجے کو براہ راست اردو موڈ میں ترمیم کریں",
    confirmReplaceMsg: "یہاں پہلے سے اردو متن موجود ہے۔ کیا اسے تبدیل کیا جائے؟",
    confirmReplace: "تبدیل کریں",
    confirmKeep: "موجودہ متن رکھیں",
    copy: "کاپی کریں",
    copied: "کاپی ہوگیا",
    copyFailed: "کاپی ناکام",
    copyLabel: "اردو متن کاپی کریں",
    downloadTxt: "TXT ڈاؤنلوڈ کریں",
    downloadTxtLabel: "اردو متن TXT فائل کے طور پر ڈاؤنلوڈ کریں",
    whatsappReady: "واٹس ایپ کے لیے تیار کریں",
    whatsappReadyLabel: "موجودہ اردو متن کو واٹس ایپ کے لیے تیار کریں",
    whatsappPreview: "واٹس ایپ کے لیے تیار متن",
    copyWhatsApp: "واٹس ایپ کے لیے کاپی کریں",
    copiedWhatsApp: "واٹس ایپ کے لیے کاپی ہوگیا",
    copyWhatsAppFailed: "کاپی ناکام",
    copyWhatsAppLabel: "واٹس ایپ کے لیے تیار متن کاپی کریں",
    hidePreview: "چھپائیں",
    hidePreviewLabel: "واٹس ایپ پیش نظارہ چھپائیں",
    continueStudio: "ڈاکومنٹ اسٹوڈیو میں جاری رکھیں",
    continueStudioLabel: "موجودہ اردو متن ڈاکومنٹ اسٹوڈیو میں کھولیں",
    continueStudioFailed: "ڈاکومنٹ اسٹوڈیو نہیں کھولا جا سکا۔",
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

  // Transfer confirmation: null = no confirmation; true = confirm dialog showing
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "failed">("idle");
  const [whatsappPreview, setWhatsappPreview] = useState<string | null>(null);
  const [waCopyFeedback, setWaCopyFeedback] = useState<"idle" | "copied" | "failed">("idle");
  const [handoffError, setHandoffError] = useState(false);

  const romanRef = useRef<HTMLTextAreaElement>(null);
  const urduRef  = useRef<HTMLTextAreaElement>(null);
  const continueEditingRef = useRef<HTMLButtonElement>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waCopyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Cancel any pending transfer confirmation
      setShowTransferConfirm(false);
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

  const activeUrduText = useMemo(
    () => getActiveUrduText(mode, finalOutput, urduInput),
    [mode, finalOutput, urduInput]
  );
  const canExport = hasExportableUrduText(activeUrduText);

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
    setShowTransferConfirm(false); // always dismiss confirm on explicit mode switch
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
  // ── Continue editing in Urdu ─────────────────────────────────────────────

  const handleContinueEditing = useCallback(() => {
    if (!finalOutput.trim()) return; // no output yet — should not be reachable
    setShowTransferConfirm(false);
    // No existing Urdu draft → transfer immediately
    if (!urduInput.trim() || urduInput === finalOutput) {
      setUrduInput(finalOutput);
      setMode("urdu");
      requestAnimationFrame(() => urduRef.current?.focus());
      return;
    }
    // Existing non-identical Urdu draft → ask first
    setShowTransferConfirm(true);
  }, [finalOutput, urduInput]);

  const handleTransferReplace = useCallback(() => {
    setUrduInput(finalOutput);
    setShowTransferConfirm(false);
    setMode("urdu");
    requestAnimationFrame(() => urduRef.current?.focus());
  }, [finalOutput]);

  const handleTransferKeep = useCallback(() => {
    // Keep existing draft — switch to Urdu mode so user sees their existing text
    setShowTransferConfirm(false);
    setMode("urdu");
    requestAnimationFrame(() => urduRef.current?.focus());
  }, []);

  const handleTransferCancel = useCallback(() => {
    setShowTransferConfirm(false);
    // Stay in Roman mode
  }, []);

  const flashCopyFeedback = useCallback((state: "copied" | "failed") => {
    setCopyFeedback(state);
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    copyFeedbackTimer.current = setTimeout(() => setCopyFeedback("idle"), 2000);
  }, []);

  const flashWaCopyFeedback = useCallback((state: "copied" | "failed") => {
    setWaCopyFeedback(state);
    if (waCopyFeedbackTimer.current) clearTimeout(waCopyFeedbackTimer.current);
    waCopyFeedbackTimer.current = setTimeout(() => setWaCopyFeedback("idle"), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
      if (waCopyFeedbackTimer.current) clearTimeout(waCopyFeedbackTimer.current);
    };
  }, []);

  useEffect(() => {
    setCopyFeedback("idle");
  }, [mode, activeUrduText]);

  useEffect(() => {
    setWhatsappPreview(null);
    setWaCopyFeedback("idle");
    setHandoffError(false);
  }, [romanInput, urduInput, mode, choices, activeSentenceIdx]);

  const handleCopy = useCallback(async () => {
    if (!hasExportableUrduText(activeUrduText)) return;
    try {
      await navigator.clipboard.writeText(activeUrduText);
      flashCopyFeedback("copied");
    } catch {
      flashCopyFeedback("failed");
    }
  }, [activeUrduText, flashCopyFeedback]);

  const handleDownloadTxt = useCallback(() => {
    if (!hasExportableUrduText(activeUrduText)) return;
    downloadWriterTxt(activeUrduText);
  }, [activeUrduText]);

  const handleWhatsAppReady = useCallback(() => {
    if (!hasExportableUrduText(activeUrduText)) return;
    setWhatsappPreview(formatActiveTextForWhatsApp(activeUrduText));
    setWaCopyFeedback("idle");
  }, [activeUrduText]);

  const handleCopyWhatsApp = useCallback(async () => {
    if (whatsappPreview === null || !hasExportableUrduText(whatsappPreview)) return;
    try {
      await navigator.clipboard.writeText(whatsappPreview);
      flashWaCopyFeedback("copied");
    } catch {
      flashWaCopyFeedback("failed");
    }
  }, [whatsappPreview, flashWaCopyFeedback]);

  const handleHideWhatsAppPreview = useCallback(() => {
    setWhatsappPreview(null);
    setWaCopyFeedback("idle");
  }, []);

  const handleContinueInDocumentStudio = useCallback(() => {
    if (!hasExportableUrduText(activeUrduText)) return;
    setHandoffError(false);
    const ok = writeWriterHandoff(activeUrduText);
    if (!ok) {
      setHandoffError(true);
      return;
    }
    window.location.href = DOCUMENT_STUDIO_ROUTE;
  }, [activeUrduText]);



  // ── Render ────────────────────────────────────────────────────────────────

  const hasOutput = !!finalOutput;
  const reviewCount = reviewableTokens.length;
  const hasSentenceAlts = result && result.candidates.length > 1;

  const actionBtnClass =
    "text-sm font-medium px-4 py-2 min-h-[40px] rounded-lg border border-[#1A3A2A]/30 text-[#1A3A2A] bg-white hover:bg-[#1A3A2A]/5 transition-colors disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-white";

  const exportBlock = (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-2 items-center"
        dir={isUr ? "rtl" : "ltr"}
        lang={isUr ? "ur" : "en"}
      >
        <button
          type="button"
          data-testid="writer-copy"
          onClick={handleCopy}
          disabled={!canExport}
          aria-label={ui.copyLabel}
          aria-disabled={!canExport}
          className={actionBtnClass}
        >
          {copyFeedback === "copied" ? ui.copied : ui.copy}
        </button>
        <button
          type="button"
          data-testid="writer-download-txt"
          onClick={handleDownloadTxt}
          disabled={!canExport}
          aria-label={ui.downloadTxtLabel}
          aria-disabled={!canExport}
          className={actionBtnClass}
        >
          {ui.downloadTxt}
        </button>
        <button
          type="button"
          data-testid="writer-whatsapp-ready"
          onClick={handleWhatsAppReady}
          disabled={!canExport}
          aria-label={ui.whatsappReadyLabel}
          aria-disabled={!canExport}
          className={actionBtnClass}
        >
          {ui.whatsappReady}
        </button>
        <span className="sr-only" aria-live="polite" data-testid="writer-copy-feedback">
          {copyFeedback === "copied" ? ui.copied : copyFeedback === "failed" ? ui.copyFailed : ""}
        </span>
      </div>
      <div dir={isUr ? "rtl" : "ltr"} lang={isUr ? "ur" : "en"}>
        <button
          type="button"
          data-testid="writer-document-studio"
          onClick={handleContinueInDocumentStudio}
          disabled={!canExport}
          aria-label={ui.continueStudioLabel}
          aria-disabled={!canExport}
          className={actionBtnClass}
        >
          {ui.continueStudio}
        </button>
        <span className="sr-only" aria-live="polite" data-testid="writer-handoff-feedback">
          {handoffError ? ui.continueStudioFailed : ""}
        </span>
        {handoffError && (
          <p className="mt-2 text-sm text-[#9B2C2C]" role="alert">
            {ui.continueStudioFailed}
          </p>
        )}
      </div>

      {whatsappPreview !== null && (
        <section
          data-testid="writer-whatsapp-preview"
          aria-label={ui.whatsappPreview}
          className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3"
        >
          <div
            className="flex items-center justify-between gap-3 flex-wrap"
            dir={isUr ? "rtl" : "ltr"}
            lang={isUr ? "ur" : "en"}
          >
            <h2 className="text-xs font-semibold text-[#4A5568] uppercase tracking-wider">
              {ui.whatsappPreview}
            </h2>
            <button
              type="button"
              data-testid="writer-whatsapp-hide"
              onClick={handleHideWhatsAppPreview}
              className="text-xs text-[#9CA3AF] hover:text-[#4A5568] transition-colors min-h-[32px] px-1"
              aria-label={ui.hidePreviewLabel}
            >
              {ui.hidePreview}
            </button>
          </div>
          <div
            data-testid="writer-whatsapp-preview-text"
            dir="rtl"
            lang="ur"
            className="font-urdu text-lg leading-loose text-[#151B2E] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
          >
            {whatsappPreview}
          </div>
          <div dir={isUr ? "rtl" : "ltr"} lang={isUr ? "ur" : "en"}>
            <button
              type="button"
              data-testid="writer-whatsapp-copy"
              onClick={handleCopyWhatsApp}
              aria-label={ui.copyWhatsAppLabel}
              className="text-sm font-medium px-4 py-2 min-h-[40px] rounded-lg bg-[#151B2E] text-white hover:bg-[#1A2540] transition-colors"
            >
              {waCopyFeedback === "copied" ? ui.copiedWhatsApp : ui.copyWhatsApp}
            </button>
            <span className="sr-only" aria-live="polite" data-testid="writer-whatsapp-copy-feedback">
              {waCopyFeedback === "copied"
                ? ui.copiedWhatsApp
                : waCopyFeedback === "failed"
                  ? ui.copyWhatsAppFailed
                  : ""}
            </span>
          </div>
        </section>
      )}
    </div>
  );

  return (
    // Root always LTR — individual elements set own dir
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-[#151B2E] text-white px-4 py-6 md:px-8">
        <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto space-y-5">

          {/* ════ ROMAN URDU MODE ════ */}
          {mode === "roman" && (
            <>
              {/* Input + output: stacked on mobile, side-by-side from md up */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start"
                data-testid="writer-dual-pane"
              >
                {/* Roman input */}
                <section aria-labelledby="roman-input-label" className="min-w-0">
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
                      rows={6}
                      dir="ltr"
                      lang="ur-Latn"
                      className="w-full min-h-[160px] rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-base text-[#151B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition"
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
                <section aria-labelledby="urdu-output-label" className="min-w-0">
                  <label
                    id="urdu-output-label"
                    className="block text-xs font-semibold text-[#4A5568] uppercase tracking-wider mb-2"
                  >
                    {ui.outputLabel}
                  </label>
                  <div
                    dir="rtl"
                    lang="ur"
                    className={`w-full min-h-[160px] rounded-xl border px-4 py-3 font-urdu text-lg leading-loose transition ${
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
              </div>

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

              {/* ── Continue editing / Transfer confirmation ── */}
              {hasOutput && !showTransferConfirm && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-start">
                    <button
                      ref={continueEditingRef}
                      onClick={handleContinueEditing}
                      className="text-sm font-medium px-4 py-2 rounded-lg border border-[#1A3A2A]/30 text-[#1A3A2A] bg-white hover:bg-[#1A3A2A]/5 transition-colors"
                      aria-label={ui.continueEditingUrduLabel}
                      lang={isUr ? "ur" : "en"}
                    >
                      {ui.continueEditingUrdu}
                    </button>
                  </div>
                  {exportBlock}
                </div>
              )}

              {/* Inline replacement confirmation */}
              {showTransferConfirm && (
                <div
                  className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3"
                  role="alertdialog"
                  aria-modal="false"
                  aria-label={ui.confirmReplaceMsg}
                >
                  <p
                    className="text-sm text-[#374151]"
                    dir={isUr ? "rtl" : "ltr"}
                    lang={isUr ? "ur" : "en"}
                  >
                    {ui.confirmReplaceMsg}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={handleTransferReplace}
                      className="text-sm font-medium px-4 py-2 rounded-lg bg-[#151B2E] text-white hover:bg-[#1A2540] transition-colors min-h-[40px]"
                      lang={isUr ? "ur" : "en"}
                    >
                      {ui.confirmReplace}
                    </button>
                    <button
                      onClick={handleTransferKeep}
                      className="text-sm font-medium px-4 py-2 rounded-lg border border-[#D1D5DB] text-[#374151] hover:bg-[#F9FAFB] transition-colors min-h-[40px]"
                      lang={isUr ? "ur" : "en"}
                    >
                      {ui.confirmKeep}
                    </button>
                    <button
                      onClick={handleTransferCancel}
                      className="text-sm text-[#9CA3AF] hover:text-[#4A5568] px-2 transition-colors"
                      aria-label={isUr ? "منسوخ کریں" : "Cancel"}
                    >
                      ✕
                    </button>
                  </div>
                </div>
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
            <>
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start"
                data-testid="writer-dual-pane"
              >
                {/* Roman draft remains visible for dual-view continuity */}
                <section aria-labelledby="roman-input-label-urdu-mode" className="min-w-0">
                  <label
                    id="roman-input-label-urdu-mode"
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
                      rows={6}
                      dir="ltr"
                      lang="ur-Latn"
                      className="w-full min-h-[160px] rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-base text-[#151B2E] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition"
                      aria-label={ui.inputLabel}
                    />
                  </div>
                </section>

                <section aria-labelledby="urdu-writing-label" className="min-w-0">
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
                      rows={6}
                      dir="rtl"
                      lang="ur"
                      className="w-full min-h-[160px] rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 font-urdu text-lg text-[#151B2E] leading-loose placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#B8935A] focus:border-transparent resize-none shadow-sm transition text-right"
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
              </div>
              <div className="mt-1">
                {exportBlock}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
