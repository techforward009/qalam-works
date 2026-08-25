"use client";

import React, { useState, useCallback, useEffect } from "react";
import { formatForWhatsAppRTL } from "../../../utils/whatsappRtlFormatter";
import { convertMarkdownForWhatsApp } from "../utils/whatsappMarkdownCompat";
import { htmlToPlainText, hasMeaningfulHtml } from "../utils/richClipboardToText";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";

export type FormatterLanguage = "en" | "ur";

export interface WhatsAppRtlFormatterProps {
  language?: FormatterLanguage;
  className?: string;
  showPreview?: boolean;
}

const LABELS = {
  en: {
    title: "WhatsApp RTL Formatter",
    description:
      "Prepare Urdu and mixed RTL/LTR plain text for more stable display when pasted into WhatsApp.",
    inputLabel: "Paste Text",
    outputLabel: "Formatted Text",
    format: "Format for WhatsApp",
    copy: "Copy for WhatsApp",
    copied: "Copied for WhatsApp",
    clear: "Clear",
    example: "Try Example",
    workflow: "Paste → Format → Copy → WhatsApp",
    placeholder: "Paste your Urdu and mixed text here…",
    errorFormat: "Formatting failed. Please try again.",
    errorClipboard: "Clipboard access denied. Please copy manually.",
    previewTitle: "Before / After",
    previewOriginal: "Original",
    previewReady: "WhatsApp-ready",
    faqTitle: "What does this tool do?",
    faqBody:
      "It prepares Urdu and mixed RTL/LTR plain text for more stable display when pasted into WhatsApp. It helps keep numbered lists, bullets, English words, numbers, links and Urdu text in their intended reading direction.",
    faqPreserve:
      "Wording is not translated or rewritten. Visible text is preserved. Invisible Unicode direction controls are inserted only where needed. Processing happens entirely in your browser — nothing is uploaded.",
  },
  ur: {
    title: "واٹس ایپ آر ٹی ایل فارمیٹر",
    description:
      "اردو اور مخلوط متن کو واٹس ایپ میں بہتر اور درست سمت میں دکھانے کے لیے تیار کریں۔",
    inputLabel: "متن پیسٹ کریں",
    outputLabel: "درست شدہ متن",
    format: "واٹس ایپ کے لیے درست کریں",
    copy: "واٹس ایپ کے لیے کاپی کریں",
    copied: "واٹس ایپ کے لیے کاپی ہوگیا",
    clear: "صاف کریں",
    example: "مثال آزمائیں",
    workflow: "متن پیسٹ کریں ← درست کریں ← کاپی کریں ← واٹس ایپ",
    placeholder: "اپنا اردو اور مخلوط متن یہاں پیسٹ کریں…",
    errorFormat: "فارمیٹنگ ناکام رہی۔ دوبارہ کوشش کریں۔",
    errorClipboard: "کلپ بورڈ تک رسائی نہیں ملی۔ براہ کرم دستی طور پر کاپی کریں۔",
    previewTitle: "پہلے / بعد",
    previewOriginal: "اصل متن",
    previewReady: "واٹس ایپ کے لیے تیار",
    faqTitle: "یہ ٹول کیا کرتا ہے؟",
    faqBody:
      "یہ ٹول اردو اور مخلوط اردو و انگریزی متن کو واٹس ایپ میں بہتر اور درست سمت میں دکھانے کے لیے تیار کرتا ہے۔ یہ نمبروں، بلٹس، انگریزی الفاظ، لنکس اور اردو عبارت کی سمت کو مستحکم رکھنے میں مدد دیتا ہے۔",
    faqPreserve:
      "الفاظ کا ترجمہ یا تبدیلی نہیں ہوتی۔ ظاہری متن جوں کا توں محفوظ رہتا ہے۔ صرف جہاں ضروری ہو وہاں پوشیدہ یونیکوڈ سمت کنٹرولز لگائے جاتے ہیں۔ تمام کارروائی آپ کے براؤزر میں ہوتی ہے — کچھ بھی سرور پر نہیں بھیجا جاتا۔",
  },
} as const;

/** Realistic mixed example — demonstrates 1., bullets, English, numbers, domain, email, final RTL line. */
const EXAMPLE_TEXT = `السلام علیکم
Meeting tomorrow at 5 PM
براہ کرم جواب دیں`;

export default function WhatsAppRtlFormatter({
  language = "en",
  className = "",
  showPreview = true,
}: WhatsAppRtlFormatterProps) {
  useEffect(() => { trackToolOpenOnce("whatsapp_rtl_formatter"); }, []);
  const t = LABELS[language] ?? LABELS.en;
  const isUrdu = language === "ur";
  const urduFont = isUrdu ? "font-nastaliq" : "";
  const naskh = isUrdu ? "font-naskh" : "";

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData.getData("text/html");

      // Only intercept if there is meaningful HTML to convert
      if (!hasMeaningfulHtml(html)) return; // browser handles plain-text paste normally

      const converted = htmlToPlainText(html);
      if (!converted) return; // conversion failed → let browser paste plain text

      e.preventDefault();

      const ta = e.currentTarget;
      const start = ta.selectionStart ?? 0;
      const end   = ta.selectionEnd   ?? 0;
      const before = input.slice(0, start);
      const after  = input.slice(end);
      const next   = before + converted + after;

      setInput(next);

      // Restore caret after the inserted text
      requestAnimationFrame(() => {
        ta.selectionStart = start + converted.length;
        ta.selectionEnd   = start + converted.length;
      });
    },
    [input],
  );

  const handleFormat = useCallback(() => {
    setError(null);
    setCopied(false);
    try {
      setOutput(formatForWhatsAppRTL(convertMarkdownForWhatsApp(input)));
      trackEvent("tool_process", { tool: "whatsapp_rtl_formatter", success: true });
    } catch (e) {
      trackEvent("tool_error", { tool: "whatsapp_rtl_formatter", error_code: "processing_failed", success: false });
      setError(t.errorFormat);
      console.error(e);
    }
  }, [input, t.errorFormat]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    setError(null);
    try {
      // Copy exact formatter output INCLUDING invisible bidi controls
      await navigator.clipboard.writeText(output);
      trackEvent("tool_copy", { tool: "whatsapp_rtl_formatter", export_format: "copy", success: true });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
    <div className={`w-full min-w-0 ${className}`.trim()} lang={isUrdu ? "ur" : "en"}>
      {/* Title */}
      <div className="text-center mb-8 md:mb-10" dir={isUrdu ? "rtl" : "ltr"}>
        <h1
          className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-3 ${
            isUrdu ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.title}
        </h1>
        <p className={`text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed ${naskh}`}>
          {t.description}
        </p>
        <p
          className={`mt-4 text-[15px] md:text-base font-semibold text-[#B8935A] tracking-wide ${naskh}`}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          {t.workflow}
        </p>
      </div>

      {/* Main workspace card */}
      <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Input | Output — two columns desktop, stacked mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <div className="min-w-0 flex flex-col">
            <label
              htmlFor="waf-input"
              className={`block text-[15px] font-semibold text-gray-800 mb-2 ${naskh}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {t.inputLabel}
            </label>
            <textarea
              id="waf-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={t.placeholder}
              rows={16}
              dir="auto"
              spellCheck={false}
              className={`w-full min-w-0 min-h-[300px] md:min-h-[360px] flex-1 box-border rounded-xl border border-gray-300 bg-white p-4 text-[16px] leading-[1.75] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/35 focus:border-[#1A3A2A] resize-y ${urduFont}`}
            />
          </div>

          <div className="min-w-0 flex flex-col">
            <label
              htmlFor="waf-output"
              className={`block text-[15px] font-semibold text-gray-800 mb-2 ${naskh}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              {t.outputLabel}
            </label>
            <textarea
              id="waf-output"
              value={output}
              readOnly
              rows={16}
              dir="auto"
              spellCheck={false}
              aria-readonly="true"
              className={`w-full min-w-0 min-h-[300px] md:min-h-[360px] flex-1 box-border rounded-xl border border-gray-200 bg-gray-50 p-4 text-[16px] leading-[1.75] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#B8935A]/30 resize-y ${urduFont}`}
            />
          </div>
        </div>

        {/* Primary + secondary actions */}
        <div
          className="mt-6 flex flex-wrap items-center gap-3"
          dir={isUrdu ? "rtl" : "ltr"}
        >
          <button
            type="button"
            onClick={handleFormat}
            disabled={!input.trim()}
            className={`inline-flex items-center justify-center rounded-lg bg-[#1A3A2A] hover:bg-[#244E38] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 text-[15px] md:text-base transition-colors ${naskh}`}
          >
            {t.format}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!output}
            className={`inline-flex items-center justify-center rounded-lg bg-[#B8935A] hover:bg-[#C9A46B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 text-[15px] md:text-base transition-colors ${naskh}`}
          >
            {copied ? t.copied : t.copy}
          </button>
          <button
            type="button"
            onClick={handleExample}
            className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-5 py-3 text-[15px] transition-colors ${naskh}`}
          >
            {t.example}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold px-5 py-3 text-[15px] transition-colors ${naskh}`}
          >
            {t.clear}
          </button>
        </div>

        {error && (
          <p
            className={`mt-3 text-sm text-red-700 ${naskh}`}
            role="alert"
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {error}
          </p>
        )}
        {copied && !error && (
          <p
            className={`mt-3 text-sm font-medium text-emerald-700 ${naskh}`}
            role="status"
            aria-live="polite"
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {t.copied}
          </p>
        )}
      </div>

      {/* Optional Before / After preview (display only — strip controls for readability) */}
      {shouldShowPreview && (
        <section
          className="mt-8 md:mt-10"
          aria-label={t.previewTitle}
          dir={isUrdu ? "rtl" : "ltr"}
        >
          <h2 className={`text-lg font-semibold text-[#1A3A2A] mb-4 text-center ${naskh}`}>
            {t.previewTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
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
              <pre
                className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 max-h-64 overflow-auto m-0 ${urduFont}`}
                dir="auto"
              >
                {output.replace(/[\u2066\u2067\u2069\u200E\u200F]/g, "")}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* FAQ / explanation */}
      <section
        className="mt-10 md:mt-12 max-w-3xl mx-auto"
        dir={isUrdu ? "rtl" : "ltr"}
      >
        <h2 className={`text-[17px] md:text-[18px] font-semibold text-[#1A3A2A] mb-3 ${naskh}`}>
          {t.faqTitle}
        </h2>
        <p className={`text-[15px] md:text-[16px] text-gray-600 leading-relaxed mb-3 ${naskh}`}>
          {t.faqBody}
        </p>
        <p className={`text-[15px] md:text-[16px] text-gray-500 leading-relaxed ${naskh}`}>
          {t.faqPreserve}
        </p>
      </section>
    </div>
  );
}
