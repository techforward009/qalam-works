"use client";

import { useState } from "react";
import { standardizeUrduText } from "../../../utils/unicode/standardizeUrduText";

export default function UnicodeStandardizerTool() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const { output, badges, summary } = standardizeUrduText(input);
  const hasInput = input.trim().length > 0;

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
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-700 mb-1" dir="ltr">
              Input Text / اصل متن
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="یہاں اپنا متن پیسٹ کریں..."
              className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[180px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-amber-800 mb-1" dir="ltr">
              Standardized Output / درست شدہ متن
            </label>
            <div
              className="w-full bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[180px] overflow-y-auto text-right"
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
            {copied ? "✓ Copied" : "Copy Output"}
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
            Clear
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
