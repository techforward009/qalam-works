"use client";

import React, { useState, useCallback } from "react";
import { formatForWhatsAppRTL } from "../../../utils/whatsappRtlFormatter";

export type FormatterLanguage = "en" | "ur";

export interface WhatsAppRtlFormatterProps {
  /**
   * UI language. English mode shows English-only labels;
   * Urdu mode shows Urdu-only labels.
   * In Qalam Works, pass the value from the existing language / i18n context.
   */
  language?: FormatterLanguage;
  /** Optional class name for the root element so the host can style it. */
  className?: string;
  /**
   * When true (default), shows a Before/After preview once both
   * input and formatted output are available.
   */
  showPreview?: boolean;
}

const LABELS = {
  en: {
    title: "WhatsApp RTL Formatter",
    description:
      "Prepare mixed Urdu / English text so it stays visually stable when pasted into WhatsApp.",
    inputLabel: "Input",
    outputLabel: "WhatsApp-ready output",
    format: "Format for WhatsApp",
    copy: "Copy for WhatsApp",
    copied: "Copied!",
    clear: "Clear",
    example: "Example",
    workflow: "Paste text → Format → Copy for WhatsApp",
    note: "Invisible Unicode isolation controls (LRI / PDI) are added only around meaningful LTR runs inside RTL text. Always verify on WhatsApp Web, Android, and iOS.",
    placeholder: "Paste your Urdu + English text here…",
    errorFormat: "Formatting failed. Please try again.",
    errorClipboard: "Clipboard access denied. Please copy manually.",
    previewTitle: "Before / After",
    previewOriginal: "Original",
    previewReady: "WhatsApp-ready",
  },
  ur: {
    title: "واٹس ایپ آر ٹی ایل فارمیٹر",
    description:
      "مخلوط اردو / انگریزی متن کو اس طرح تیار کریں کہ واٹس ایپ میں پیسٹ کرنے پر بصری ترتیب درست رہے۔",
    inputLabel: "ان پٹ",
    outputLabel: "واٹس ایپ کے لیے تیار متن",
    format: "واٹس ایپ کے لیے درست کریں",
    copy: "واٹس ایپ کے لیے نقل کریں",
    copied: "کاپی ہو گیا!",
    clear: "صاف کریں",
    example: "مثال",
    workflow: "پیسٹ، فارمیٹ، کاپی، واٹس ایپ",
    note: "صرف معنی خیز LTR حصوں کے ارد گرد LRI / PDI کنٹرولز لگائے جاتے ہیں۔ نتیجہ ہمیشہ واٹس ایپ ویب، اینڈرائیڈ اور iOS پر چیک کریں۔",
    placeholder: "اپنا اردو + انگریزی متن یہاں پیسٹ کریں…",
    errorFormat: "فارمیٹنگ ناکام۔ دوبارہ کوشش کریں۔",
    errorClipboard: "کلپ بورڈ تک رسائی نہیں ملی۔ براہ کرم دستی طور پر کاپی کریں۔",
    previewTitle: "پہلے / بعد",
    previewOriginal: "اصل متن",
    previewReady: "واٹس ایپ کے لیے تیار",
  },
} as const;

/**
 * Realistic Qalam Works example: documents, PDF/DOCX, URLs, email, numbers, lists.
 */
const EXAMPLE_TEXT = `دستاویز PDF اور DOCX فارمیٹ میں محفوظ کریں۔
فائل https://qalamworks.com/upload پر اپلوڈ کریں۔
قیمت 1500-2500 PKR ہے۔
ای میل support@qalamworks.com پر بھیجیں۔

• پہلا مسودہ تیار کریں
• دوسرا مسودہ PDF میں ایکسپورٹ کریں

1. فائل DOCX میں محفوظ کریں
2. لنک https://qalamworks.com/docs چیک کریں
3. تاریخ 2024-08-12 درج کریں
`;

export default function WhatsAppRtlFormatter({
  language = "en",
  className = "",
  showPreview = true,
}: WhatsAppRtlFormatterProps) {
  const t = LABELS[language] ?? LABELS.en;
  const isUrdu = language === "ur";
  const urduFont = isUrdu ? "font-nastaliq" : "";
  const naskh = isUrdu ? "font-naskh" : "";

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormat = useCallback(() => {
    setError(null);
    setCopied(false);
    try {
      const formatted = formatForWhatsAppRTL(input);
      setOutput(formatted);
    } catch (e) {
      setError(t.errorFormat);
      console.error(e);
    }
  }, [input, t.errorFormat]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError(t.errorClipboard);
      console.error(e);
    }
  }, [output, t.errorClipboard]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setCopied(false);
    setError(null);
  }, []);

  const handleExample = useCallback(() => {
    setInput(EXAMPLE_TEXT);
    setOutput("");
    setCopied(false);
    setError(null);
  }, []);

  const shouldShowPreview = showPreview && Boolean(input && output);

  return (
    <div
      className={`w-full ${className}`.trim()}
      lang={isUrdu ? "ur" : "en"}
    >
      {/* Title block — direction only on text, not on layout root */}
      <div className="text-center mb-8 md:mb-10" dir={isUrdu ? "rtl" : "ltr"}>
        <h1
          className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-3 ${
            isUrdu ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.title}
        </h1>
        <p
          className={`text-base md:text-lg text-gray-600 max-w-2xl mx-auto ${naskh}`}
        >
          {t.description}
        </p>
        <p
          className={`mt-3 text-sm font-semibold text-[#B8935A] ${naskh}`}
          dir="ltr"
        >
          {t.workflow}
        </p>
      </div>

      {/* Main card */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Input | Output side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <div className="min-w-0 flex flex-col">
            <label
              htmlFor="waf-input"
              className={`block text-sm font-semibold text-gray-700 mb-2 ${naskh}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {t.inputLabel}
            </label>
            <textarea
              id="waf-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              rows={14}
              dir="auto"
              spellCheck={false}
              className={`w-full min-h-[280px] md:min-h-[320px] flex-1 box-border rounded-xl border border-gray-300 bg-white p-4 text-base leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 focus:border-[#1A3A2A] resize-y ${urduFont}`}
            />
          </div>

          <div className="min-w-0 flex flex-col">
            <label
              htmlFor="waf-output"
              className={`block text-sm font-semibold text-gray-700 mb-2 ${naskh}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {t.outputLabel}
            </label>
            <textarea
              id="waf-output"
              value={output}
              readOnly
              rows={14}
              dir="auto"
              spellCheck={false}
              className={`w-full min-h-[280px] md:min-h-[320px] flex-1 box-border rounded-xl border border-gray-200 bg-gray-50 p-4 text-base leading-relaxed text-gray-900 focus:outline-none resize-y ${urduFont}`}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          className="mt-5 md:mt-6 flex flex-wrap items-center gap-3"
          dir={isUrdu ? "rtl" : "ltr"}
        >
          <button
            type="button"
            onClick={handleFormat}
            disabled={!input.trim()}
            className={`inline-flex items-center justify-center rounded-lg bg-[#1A3A2A] hover:bg-[#244E38] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 text-sm md:text-[15px] transition-colors ${naskh}`}
          >
            {t.format}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!output}
            className={`inline-flex items-center justify-center rounded-lg bg-[#B8935A] hover:bg-[#C9A46B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 text-sm md:text-[15px] transition-colors ${naskh}`}
          >
            {copied ? t.copied : t.copy}
          </button>
          <button
            type="button"
            onClick={handleExample}
            className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2.5 text-sm md:text-[15px] transition-colors ${naskh}`}
          >
            {t.example}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-4 py-2.5 text-sm md:text-[15px] transition-colors ${naskh}`}
          >
            {t.clear}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert" dir={isUrdu ? "rtl" : "ltr"}>
            {error}
          </p>
        )}
      </div>

      {/* Optional Before / After — contained, no layout distortion */}
      {shouldShowPreview && (
        <section
          className="mt-8 md:mt-10"
          aria-label={t.previewTitle}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          <h2
            className={`text-xl font-bold text-gray-900 mb-4 ${
              isUrdu ? "font-nastaliq font-normal" : ""
            }`}
          >
            {t.previewTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className={`text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide ${naskh}`}>
                {t.previewOriginal}
              </h3>
              <pre
                className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 max-h-64 overflow-auto m-0 ${urduFont}`}
                dir="auto"
              >
                {input}
              </pre>
            </div>
            <div className="min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className={`text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide ${naskh}`}>
                {t.previewReady}
              </h3>
              {/* Show user-visible text only — strip isolation controls for display */}
              <pre
                className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 max-h-64 overflow-auto m-0 ${urduFont}`}
                dir="auto"
              >
                {output.replace(/[\u2066\u2069]/g, "")}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Short explanation */}
      <p
        className={`mt-8 md:mt-10 text-sm text-gray-500 max-w-3xl mx-auto text-center leading-relaxed ${naskh}`}
        dir={isUrdu ? "rtl" : "ltr"}
      >
        {t.note}
      </p>
    </div>
  );
}
