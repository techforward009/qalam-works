"use client";

import { useState } from "react";
import { checkTextQuality } from "../utils/quality/checkTextQuality";

export default function PublicationQualityChecker() {
  const [input, setInput] = useState(
    "قال الامام امام علی علیہ السلام: العلم نور، والجهل ظلام ، ون م العلم م ون العلم"
  );
  const report = checkTextQuality(input);

  return (
    <section id="quality-checker" className="max-w-4xl mx-auto px-4 py-8 text-center">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-1 font-naskh text-amber-900">
            پبلیکیشن کوالٹی آڈٹ / Publication Quality Audit
          </h2>
          <p className="text-xs md:text-sm text-gray-600" dir="ltr">
            Paste your text below to audit layout, typography, punctuation, and text quality.
          </p>
        </div>

        {/* Input Text Area */}
        <div className="mb-4 text-center">
          <label className="block text-xs font-semibold text-gray-700 mb-1 text-center w-full" dir="ltr">
            Audit Input Text:
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="یہاں متن پیسٹ کریں..."
            className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
            dir="rtl"
          />
        </div>

        {/* Qalam Publication Report Breakdown */}
        <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 font-mono text-left" dir="ltr">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-amber-200 pb-2 mb-3">
            <span className="font-bold text-sm text-amber-900">Qalam Publication Report</span>
            <span className="bg-amber-200/60 px-2 py-0.5 rounded text-amber-900 font-semibold mt-1 md:mt-0">
              Total Issues: {report.totalIssues}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Typography Section */}
            <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
              <span className="font-bold block text-amber-900 mb-1">Typography:</span>
              <div>• Multiple Spaces: {report.typography.multipleSpaces}</div>
              <div>• Empty Lines: {report.typography.emptyLines}</div>
              <div>• Long Paragraphs: {report.typography.longParagraphs}</div>
              <div>• Missing Space After Punctuation: {report.typography.missingSpaceAfterPunctuation}</div>
            </div>

            {/* Punctuation Section */}
            <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
              <span className="font-bold block text-amber-900 mb-1">Punctuation:</span>
              <div>• Mixed Punctuation: {report.punctuation.mixedPunctuation}</div>
              <div>• Wrong Quotes: {report.punctuation.wrongQuotes}</div>
              <div>• Duplicated Punctuation: {report.punctuation.duplicatedPunctuation}</div>
            </div>

            {/* Text Quality Section */}
            <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
              <span className="font-bold block text-amber-900 mb-1">Text Quality:</span>
              <div>• Repeated Words: {report.textQuality.repeatedWords}</div>
              <div>• Mixed Script: {report.textQuality.mixedScript}</div>
            </div>
          </div>
        </div>

        {/* Dynamic Audit Badges */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-center gap-2 md:gap-3 text-xs font-medium text-amber-800" dir="ltr">
          {report.badges.length > 0 ? (
            report.badges.map((badge, index) => (
              <span key={index} className="flex items-center text-green-700">
                {badge}
                {index < report.badges.length - 1 && <span className="text-gray-300 ml-2 md:ml-3">•</span>}
              </span>
            ))
          ) : (
            <span className="text-gray-400 font-sans text-xs">No issues found. Ready for publication!</span>
          )}
        </div>

        {/* Link to full tool */}
        <div className="mt-4 text-center" dir="ltr">
          <a
            href="/tools/quality-checker"
            className="text-xs md:text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Open full Quality Checker tool →
          </a>
        </div>
      </div>
    </section>
  );
}
