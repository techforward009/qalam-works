"use client";

import { useState } from "react";
import { standardizeUrduText } from "../utils/unicode/standardizeUrduText";
import MixedDirectionText from "./MixedDirectionText";

export default function InteractiveDemo() {
  const [input, setInput] = useState(
    "آج  کے  دور  میں  علم  اور  تحقیق  کے  میدان  میں\nڈیجیٹل  مواد  کی  اہمیت  بہت  زیادہ  بڑھ  گئی  ہے ۔\nلیکن  مختلف  ذرائع  سے  نقل  کیا  گیا  متن  اکثر\nغلط  spacing ، بےترتیب  رموز  اور  خراب  formatting\nکی وجہ سے پڑھنے میں مشکل ہو جاتا ہے۔"
  );
  const { output, badges, summary } = standardizeUrduText(input);

  return (
    <section id="demo" className="bg-[#F3EFE6] py-12 md:py-14 border-y border-[#1A3A2A]/8">
      <div className="site-container max-w-4xl mx-auto text-center">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#B8935A]/35 shadow-lg shadow-[#B8935A]/10">
        <div className="text-center mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A6A30] mb-1">Live proof</p>
          <h2 className="text-xl md:text-2xl font-bold mb-1 font-naskh text-[#1A3A2A]">
            لائیو ڈیمو / Interactive Demo
          </h2>
          <p className="text-xs md:text-sm text-gray-600" dir="ltr">
            Type or paste mixed Urdu/English text to see spacing, punctuation, and letter-form cleanup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 text-center">
          <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50/80 p-3">
            <label className="block text-xs font-semibold text-gray-600 mb-2 text-center w-full" dir="ltr">
              Before
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="یہاں متن درج کریں..."
              className="w-full bg-white border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[110px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex flex-col items-center rounded-xl border border-amber-300 bg-amber-50/70 p-3">
            <label className="block text-xs font-semibold text-amber-900 mb-2 text-center w-full" dir="ltr">
              After
            </label>
            <div className="w-full bg-white border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[110px] overflow-x-auto text-start">
              {input.trim() ? (
                <MixedDirectionText text={output} fallbackDir="rtl" />
              ) : (
                <span className="text-gray-400 font-sans text-xs text-center block">نتائج یہاں ظاہر ہوں گے...</span>
              )}
            </div>
          </div>
        </div>

        {/* Qalam Audit Report Summary Box */}
        <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-mono" dir="ltr">
          {input.trim() ? (
            <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-2 md:gap-4">
              <span className="font-bold text-amber-950">Qalam Report:</span>
              <span>Total Corrections: {summary.totalCorrections}</span>
              <span>Script Normalizations: {summary.arabicNormalizations}</span>
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

        {/* Link to full tool */}
        <div className="mt-4 text-center" dir="ltr">
          <a
            href="/tools/unicode-standardizer"
            className="text-xs md:text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Open full Unicode Standardizer tool →
          </a>
        </div>
      </div>
      </div>
    </section>
  );
}
