"use client";

import { useState, useRef } from "react";
import { checkTextQuality, QualityReport } from "../../../utils/quality/checkTextQuality";
import { standardizeUrduText } from "../../../utils/unicode/standardizeUrduText";
import { validateFile } from "../../../utils/fileValidation";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";

const SAMPLE_TEXT =
  "علي عليه السلام  کربلاء ؛ يحيى ؟ العلم العلم نور یقذف فی القلب";

export default function QualityCheckerTool() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [afterReport, setAfterReport] = useState<QualityReport | null>(null);
  const [standardizedText, setStandardizedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasInput = input.trim().length > 0;
  const beforeReport = checkTextQuality(input);

  const handleFileSelect = async (file: File) => {
    setFileError(null);
    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error || "فائل قابلِ قبول نہیں ہے۔");
      return;
    }
    setIsProcessingFile(true);
    try {
      const text = await extractTextFromFile(file);
      setInput(text);
      setFileName(file.name);
      setAfterReport(null);
      setStandardizedText(null);
    } catch {
      setFileError("فائل پڑھنے میں خرابی ہوئی۔ / Failed to read file.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleStandardizeAndRecheck = () => {
    const result = standardizeUrduText(input);
    setStandardizedText(result.output);
    setAfterReport(checkTextQuality(result.output));
  };

  const resetAll = () => {
    setInput("");
    setFileName(null);
    setFileError(null);
    setAfterReport(null);
    setStandardizedText(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Clarification note about {{ }} markers */}
        <div
          className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900"
          dir="rtl"
        >
          اگر متن میں اصل عربی اقتباس شامل ہو، تو اسے{" "}
          <span dir="ltr" className="font-mono bg-white px-1 rounded">{"{{ }}"}</span>{" "}
          کے درمیان لکھیں — اس صورت میں "Repeated Words"، "Mixed Punctuation" اور "Mixed
          Script" کی جانچ اس حصے کے اندر نظر انداز ہو جائے گی (چونکہ یہ عربی متن میں جائز
          ہو سکتے ہیں)۔
        </div>

        {/* Input + Upload */}
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-700" dir="ltr">
            Audit Input Text / متن پیسٹ کریں
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setInput(SAMPLE_TEXT)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Try Example
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              Upload .txt/.docx
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setFileName(null);
            setAfterReport(null);
            setStandardizedText(null);
          }}
          placeholder="یہاں متن پیسٹ کریں یا فائل اپ لوڈ کریں..."
          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[160px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
          dir="rtl"
        />
        <div dir="ltr" className="mt-1 text-xs">
          {isProcessingFile && <span className="text-gray-500">فائل پڑھی جا رہی ہے...</span>}
          {fileName && !isProcessingFile && (
            <span className="text-green-700">✓ فائل لوڈ ہو گئی: {fileName}</span>
          )}
          {fileError && <span className="text-red-600">{fileError}</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 mb-4" dir="ltr">
          <button
            onClick={handleStandardizeAndRecheck}
            disabled={!hasInput}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            متن معیاری بنائیں اور دوبارہ جانچیں
          </button>
          <button
            onClick={resetAll}
            disabled={!hasInput}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Clear
          </button>
        </div>

        {/* Before Report */}
        <ReportPanel title="آڈٹ رپورٹ (اصل متن)" report={beforeReport} hasInput={hasInput} />

        {/* After Report + standardized text, shown only after button click */}
        {afterReport && standardizedText !== null && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div
              className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-900 flex flex-wrap items-center gap-3"
              dir="ltr"
            >
              <span className="font-bold">تقابل:</span>
              <span>پہلے: {beforeReport.totalIssues} مسائل</span>
              <span>معیار بندی کے بعد: {afterReport.totalIssues} مسائل</span>
              <span>
                کم ہوئے: {Math.max(beforeReport.totalIssues - afterReport.totalIssues, 0)}
              </span>
            </div>
            <label className="block text-xs font-semibold text-amber-800 mb-1" dir="ltr">
              Standardized Text / معیاری متن
            </label>
            <div
              className="w-full bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[120px] overflow-y-auto text-right whitespace-pre-wrap mb-4"
              dir="rtl"
            >
              {standardizedText}
            </div>
            <ReportPanel title="آڈٹ رپورٹ (معیاری متن کے بعد)" report={afterReport} hasInput={true} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportPanel({
  title,
  report,
  hasInput,
}: {
  title: string;
  report: QualityReport;
  hasInput: boolean;
}) {
  if (!hasInput) {
    return (
      <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-gray-400 font-sans text-center">
        متن پیسٹ کریں یا فائل اپ لوڈ کریں تاکہ آڈٹ رپورٹ بن سکے
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-sm font-bold text-gray-800 mb-2 text-right" dir="rtl">
        {title}
      </p>
      <div
        className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 font-mono"
        dir="ltr"
      >
        <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
          <span className="font-bold text-sm text-amber-900">Qalam Publication Report</span>
          <span className="bg-amber-200/60 px-2 py-0.5 rounded text-amber-900 font-semibold">
            Total Issues: {report.totalIssues}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
            <span className="font-bold block text-amber-900 mb-1">Typography:</span>
            <div>• Multiple Spaces: {report.typography.multipleSpaces}</div>
            <div>• Empty Lines: {report.typography.emptyLines}</div>
            <div>• Long Paragraphs: {report.typography.longParagraphs}</div>
          </div>
          <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
            <span className="font-bold block text-amber-900 mb-1">Punctuation:</span>
            <div>• Mixed Punctuation: {report.punctuation.mixedPunctuation}</div>
            <div>• Wrong Quotes: {report.punctuation.wrongQuotes}</div>
          </div>
          <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
            <span className="font-bold block text-amber-900 mb-1">Text Quality:</span>
            <div>• Repeated Words: {report.textQuality.repeatedWords}</div>
            <div>• Mixed Script: {report.textQuality.mixedScript}</div>
          </div>
        </div>
      </div>
      <div
        className="mt-2 bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center gap-2 md:gap-3 text-xs font-medium text-green-700"
        dir="ltr"
      >
        {report.badges.length > 0 ? (
          report.badges.map((badge, index) => (
            <span key={index} className="flex items-center">
              {badge}
              {index < report.badges.length - 1 && (
                <span className="text-gray-300 ml-2 md:ml-3">•</span>
              )}
            </span>
          ))
        ) : (
          <span className="text-gray-400 font-sans text-xs">No issues found.</span>
        )}
      </div>
    </div>
  );
}
