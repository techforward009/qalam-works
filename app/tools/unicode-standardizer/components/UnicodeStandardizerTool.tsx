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
    <div className="max-w-[1100px] mx-auto px-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Clarification note — not a translator */}
        <div
          className="mb-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900"
          dir="rtl"
        >
          یہ ٹول متن کا مفہوم یا زبان تبدیل نہیں کرتا — یہ صرف رسم الخط کے مختلف Unicode
          variants کو معیاری بناتا ہے (ترجمہ نہیں، صرف ٹائپوگرافی کی درستگی)۔
        </div>

        {/* Note about protecting Arabic quotations */}
        <div
          className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900"
          dir="rtl"
        >
          اگر متن میں اصل عربی اقتباس (حدیث، آیت وغیرہ) شامل ہو جسے تبدیل نہیں ہونا چاہیے، تو اسے{" "}
          <span dir="ltr" className="font-mono bg-white px-1 rounded">{"{{ }}"}</span>{" "}
          کے درمیان لکھیں — مثلاً <span dir="ltr" className="font-mono">{"{{قال...}}"}</span> —
          یہ حصہ بالکل جوں کا توں رہے گا۔
        </div>

        {/* Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700" dir="ltr">
                {isUr ? "اصل متن" : "Input Text"}
              </label>
              <button
                onClick={() => setInput(SAMPLE_TEXT)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
              >
                {isUr ? "مثال دیکھیں" : "Try Example"}
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="یہاں اپنا متن پیسٹ کریں..."
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
                <span className="text-gray-400 font-sans text-xs">نتائج یہاں ظاہر ہوں گے...</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-4" dir="ltr">
          <button
            onClick={handleCopy}
            disabled={!hasInput}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {copied ? (isUr ? "✓ کاپی ہو گیا" : "✓ Copied") : (isUr ? "کاپی کریں" : "Copy Output")}
          </button>
          <button
            onClick={handleDownload}
            disabled={!hasInput}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Download .txt
          </button>
          <button
            onClick={() => setInput("")}
            disabled={!hasInput}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
            dir="rtl"
          >
            مبارک ہو! آپ کا متن پہلے ہی معیاری شکل میں موجود ہے۔
          </div>
        )}

        {/* Detailed breakdown — exactly what changed and how many times */}
        {hasInput && corrections.length > 0 && (
          <div className="mb-4 bg-white border border-gray-200 rounded-xl p-3" dir="rtl">
            <p className="text-sm font-bold text-gray-800 mb-2">کیا تبدیل ہوا؟</p>
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
