"use client";

import { useState } from "react";
import { standardizeUrduText } from "../utils/unicodeStandardizer";

export default function InteractiveDemo() {
  const [input, setInput] = useState("قال الامام علي عليه السلام: العلم نور ، والجهل ظلام");
  const { output, badges, summary } = standardizeUrduText(input);

  return (
    <section id="demo" className="max-w-4xl mx-auto px-4 py-8 text-center">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-1 font-nastaliq text-amber-900">
            لائیو ڈیمو / Interactive Demo
          </h2>
          <p className="text-xs md:text-sm text-gray-600" dir="ltr">
            Type or paste your raw Arabic-script text below to see instant normalization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-center">
          <div className="flex flex-col items-center">
            <label className="block text-xs font-semibold text-gray-700 mb-1 text-center w-full" dir="ltr">
              Input Sample (Raw Text):
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="یہاں متن درج کریں..."
              className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex flex-col items-center">
            <label className="block text-xs font-semibold text-amber-800 mb-1 text-center w-full" dir="ltr">
              Processed Output (Qalam Works):
            </label>
            <div
              className="w-full bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[100px] overflow-x-auto flex items-center justify-center text-center"
              dir="rtl"
            >
              {input.trim() ? (
                output
              ) : (
                <span className="text-gray-400 font-sans text-xs">نتائج یہاں ظاہر ہوں گے...</span>
              )}
            </div>
          </div>
        </div>

        {/* Qalam Audit Report Summary Box (Mobile Optimized Stack/Flex) */}
        <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-mono" dir="ltr">
          {input.trim() ? (
            <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-2 md:gap-4">
              <span className="font-bold text-amber-950">Qalam Report:</span>
              <span>Total Corrections: {summary.totalCorrections}</span>
              <span>Arabic Normalizations: {summary.arabicNormalizations}</span>
              <span>Spacing Fixes: {summary.spacingFixes}</span>
              <span>Punctuation Fixes: {summary.punctuationFixes}</span>
            </div>
          ) : (
            <span className="text-gray-400 font-sans text-xs">
              Paste text to generate Qalam Report
            </span>
          )}
        </div>

        {/* Conditional Dynamic Badges */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-center gap-2 md:gap-3 text-xs font-medium text-green-700" dir="ltr">
          {input.trim() ? (
            badges.map((badge, index) => (
              <span key={index} className="flex items-center">
                {badge}
                {index < badges.length - 1 && <span className="text-gray-300 ml-2 md:ml-3">•</span>}
              </span>
            ))
          ) : (
            <span className="text-gray-400 font-sans text-xs">Awaiting input text...</span>
          )}
        </div>
      </div>
    </section>
  );
}
