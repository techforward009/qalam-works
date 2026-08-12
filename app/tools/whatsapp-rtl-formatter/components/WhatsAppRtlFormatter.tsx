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
    outputLabel: "Output (read-only)",
    format: "Format for WhatsApp",
    copy: "Copy for WhatsApp",
    copied: "Copied!",
    clear: "Clear",
    example: "Example",
    workflow: "Workflow: PASTE → FORMAT → COPY → WHATSAPP",
    note: "Invisible Unicode bidirectional isolation controls (LRI / PDI) are inserted only around meaningful LTR runs inside RTL text. Always verify the result on WhatsApp Web, Android and iOS.",
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
    outputLabel: "آؤٹ پٹ (صرف پڑھنے کے لیے)",
    format: "واٹس ایپ کے لیے درست کریں",
    copy: "واٹس ایپ کے لیے نقل کریں",
    copied: "کاپی ہو گیا!",
    clear: "صاف کریں",
    example: "مثال",
    workflow: "طریقہ کار: پیسٹ، فارمیٹ، کاپی، واٹس ایپ",
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
      className={`whatsapp-rtl-formatter ${className}`.trim()}
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
    >
      <header className="waf-header">
        <h1 className="waf-title">{t.title}</h1>
        <p className="waf-description">{t.description}</p>
      </header>

      <section className="waf-section">
        <label htmlFor="waf-input" className="waf-label">
          {t.inputLabel}
        </label>
        <textarea
          id="waf-input"
          className="waf-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          rows={12}
          dir="auto"
          spellCheck={false}
        />
      </section>

      <div className="waf-actions">
        <button
          type="button"
          className="waf-btn waf-btn-primary"
          onClick={handleFormat}
          disabled={!input.trim()}
        >
          {t.format}
        </button>
        <button
          type="button"
          className="waf-btn waf-btn-secondary"
          onClick={handleExample}
        >
          {t.example}
        </button>
        <button
          type="button"
          className="waf-btn waf-btn-secondary"
          onClick={handleClear}
        >
          {t.clear}
        </button>
      </div>

      {error && (
        <p className="waf-error" role="alert">
          {error}
        </p>
      )}

      <section className="waf-section">
        <label htmlFor="waf-output" className="waf-label">
          {t.outputLabel}
        </label>
        <textarea
          id="waf-output"
          className="waf-textarea waf-textarea-output"
          value={output}
          readOnly
          rows={12}
          dir="auto"
          spellCheck={false}
        />
      </section>

      <div className="waf-actions">
        <button
          type="button"
          className="waf-btn waf-btn-primary"
          onClick={handleCopy}
          disabled={!output}
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>

      {/* Optional Before / After preview */}
      {shouldShowPreview && (
        <section className="waf-preview" aria-label={t.previewTitle}>
          <h2 className="waf-preview-title">{t.previewTitle}</h2>
          <div className="waf-preview-grid">
            <div className="waf-preview-panel">
              <h3 className="waf-preview-label">{t.previewOriginal}</h3>
              <pre className="waf-preview-text" dir="auto">
                {input}
              </pre>
            </div>
            <div className="waf-preview-panel">
              <h3 className="waf-preview-label">{t.previewReady}</h3>
              <pre className="waf-preview-text" dir="auto">
                {output}
              </pre>
            </div>
          </div>
        </section>
      )}

      <footer className="waf-footer">
        <p className="waf-workflow">{t.workflow}</p>
        <p className="waf-note">{t.note}</p>
      </footer>
    </div>
  );
}
