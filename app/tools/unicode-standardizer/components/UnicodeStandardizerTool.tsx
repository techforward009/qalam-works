"use client";

import { useState } from "react";
import { useLanguage } from "../../../lib/language-context";
import { standardizeUrduText } from "../../../utils/unicode/standardizeUrduText";

const SAMPLE_TEXT =
  "قال ابن مسعود رضي الله عنه : ليس العلم بكثرة الرواية ، إنما العلم نور يقذف في القلب";

export default function UnicodeStandardizerTool() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const { output, badges, summary, corrections } = standardizeUrduText(input);
  const hasInput = input.trim().length > 0;
  const alreadyStandardized = hasInput && summary.totalCorrections === 0;

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently, button stays as "Copy"
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-standardized-text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="site-container">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Clarification note — not a translator */}
        {isUr ? (
          <div className="mb-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-[16px] leading-[1.7] text-blue-900" dir="rtl">
            یہ ٹول متن کا مفہوم یا زبان تبدیل نہیں کرتا؛ یہ صرف رسم الخط کی مختلف یونیکوڈ شکلوں کو معیاری بناتا ہے۔ یعنی یہ ترجمہ نہیں کرتا بلکہ متن کی تکنیکی اور ٹائپوگرافی کی یکسانیت بہتر کرتا ہے۔
          </div>
        ) : (
          <div className="mb-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-[16px] leading-[1.7] text-blue-900" dir="ltr">
            This tool does not change meaning or language — it only normalizes different Unicode
            character forms (typography correction, not translation).
          </div>
        )}

        {/* Note about protecting Arabic quotations */}
        {isUr ? (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 text-[16px] leading-[1.7] text-purple-900" dir="rtl">
            اگر متن میں کوئی اصل عربی اقتباس (حدیث، آیت وغیرہ) شامل ہو جسے تبدیل نہیں ہونا چاہیے، تو اسے{" "}
            <span dir="ltr" className="font-mono bg-white px-1 rounded">{"{{ }}"}</span>{" "}
            کے درمیان لکھیں — یہ حصہ بالکل جوں کا توں رہے گا۔
          </div>
        ) : (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 text-[16px] leading-[1.7] text-purple-900" dir="ltr">
            If your text includes a genuine classical Arabic quotation that must not be altered,
            wrap it in <span className="font-mono bg-white px-1 rounded">{"{{ }}"}</span> — that
            section will be left exactly as-is.
          </div>
        )}

        {/* Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700" dir="ltr">
                {isUr ? "اصل متن" : "Input Text"}
              </label>
              <button
                onClick={() => setInput(SAMPLE_TEXT)}
                className="px-4 py-2 rounded-lg text-[15px] font-semibold border border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              >
                {isUr ? "مثال دیکھیں" : "Try Example"}
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isUr ? "یہاں اپنا متن پیسٹ کریں..." : "Paste your text here..."}
              className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[320px] text-base focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-amber-800 mb-1" dir="ltr">
              {isUr ? "درست شدہ متن" : "Standardized Output"}
            </label>
            <div
              className="w-full bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[320px] text-base overflow-y-auto text-right whitespace-pre-wrap"
              dir="rtl"
            >
              {hasInput ? (
                output
              ) : (
                <span className="text-gray-400 font-sans text-xs">{isUr ? "نتائج یہاں ظاہر ہوں گے..." : "Results will appear here..."}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-4" dir="ltr">
          <button
            onClick={handleCopy}
            disabled={!hasInput}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {copied ? (isUr ? "✓ کاپی ہو گیا" : "✓ Copied") : (isUr ? "کاپی کریں" : "Copy Output")}
          </button>
          <button
            onClick={handleDownload}
            disabled={!hasInput}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Download .txt
          </button>
          <button
            onClick={() => setInput("")}
            disabled={!hasInput}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isUr ? "صاف کریں" : "Clear"}
          </button>
        </div>

        {/* Qalam Report */}
        <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-mono" dir="ltr">
          {hasInput ? (
            <div className="flex flex-col md:flex-row flex-wrap items-center gap-2 md:gap-4">
              <span className="font-bold text-amber-950">Qalam Report:</span>
              <span>Total Corrections: {summary.totalCorrections}</span>
              <span>Script Normalizations: {summary.arabicNormalizations}</span>
              <span>Spacing Fixes: {summary.spacingFixes}</span>
              <span>Punctuation Fixes: {summary.punctuationFixes}</span>
            </div>
          ) : (
            <span className="text-gray-400 font-sans text-xs">
              Paste text above to generate a Qalam Report
            </span>
          )}
        </div>

        {/* Positive success state when no corrections were needed */}
        {alreadyStandardized && (
          <div
            className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 font-medium text-center"
            dir={isUr ? "rtl" : "ltr"}
          >
            {isUr ? "مبارک ہو! آپ کا متن پہلے ہی معیاری شکل میں موجود ہے۔" : "Great news! Your text is already in standardized form."}
          </div>
        )}

        {/* Detailed breakdown — exactly what changed and how many times */}
        {hasInput && corrections.length > 0 && (
          <div className="mb-4 bg-white border border-gray-200 rounded-xl p-3" dir={isUr ? "rtl" : "ltr"}>
            <p className="text-sm font-bold text-gray-800 mb-2">{isUr ? "کیا تبدیل ہوا؟" : "What changed?"}</p>
            <ul className="space-y-1">
              {corrections.map((c, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-700 flex items-start justify-between gap-2 border-b border-gray-100 last:border-0 py-1"
                >
                  <span>{c.label}</span>
                  <span className="text-gray-500 font-mono whitespace-nowrap" dir="ltr">
                    ×{c.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Badges */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center gap-2 md:gap-3 text-xs font-medium text-green-700" dir="ltr">
          {hasInput ? (
            badges.map((badge, index) => {
              const displayBadge = badge === "✓ RTL Optimized" ? "✓ RTL Compatible" : badge;
              return (
                <span key={index} className="flex items-center">
                  {displayBadge}
                  {index < badges.length - 1 && <span className="text-gray-300 ml-2 md:ml-3">•</span>}
                </span>
              );
            })
          ) : (
            <span className="text-gray-400 font-sans text-xs">Awaiting input text...</span>
          )}
        </div>
      </div>
    </div>
  );
}
