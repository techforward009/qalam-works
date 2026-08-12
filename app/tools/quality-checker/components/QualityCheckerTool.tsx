"use client";

import { useState, useRef } from "react";
import { useLanguage } from "../../../lib/language-context";
import { checkTextQuality, QualityReport } from "../../../utils/quality/checkTextQuality";
import { standardizeUrduText } from "../../../utils/unicode/standardizeUrduText";
import { validateFile } from "../../../utils/fileValidation";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";

const SAMPLE_TEXT =
  "علي عليه السلام  کربلاء ؛ يحيى ؟ العلم العلم نور یقذف فی القلب";

export default function QualityCheckerTool() {
  const { language } = useLanguage();
  const isUr = language === "ur";
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
      setFileError(validation.error || (isUr ? "فائل قابلِ قبول نہیں ہے۔" : "File is not acceptable."));
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
      setFileError(isUr ? "فائل پڑھنے میں خرابی ہوئی۔" : "Failed to read file.");
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
    <div className="max-w-[1100px] mx-auto px-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Clarification note about {{ }} markers */}
        {isUr ? (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 text-[15px] text-purple-900 leading-relaxed" dir="rtl">
            اگر متن میں اصل عربی اقتباس شامل ہو تو اسے{" "}
            <span dir="ltr" className="font-mono bg-white px-1 rounded">{"{{ }}"}</span>{" "}
            کے درمیان لکھیں — اس صورت میں دہرائے گئے الفاظ، مخلوط رموزِ اوقاف، اور مخلوط رسم الخط کی جانچ اس حصے میں نظر انداز کر دی جائے گی (چونکہ یہ عربی متن میں فطری ہو سکتے ہیں)۔
          </div>
        ) : (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 text-[15px] text-purple-900 leading-relaxed" dir="ltr">
            If your text includes a genuine classical Arabic quotation, wrap it in{" "}
            <span className="font-mono bg-white px-1 rounded">{"{{ }}"}</span> — the Repeated
            Words, Mixed Punctuation, and Mixed Script checks will be skipped inside that
            section (since these are expected in classical Arabic text).
          </div>
        )}

        {/* Input + Upload */}
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-700">
            {isUr ? "آڈٹ کے لیے متن" : "Audit Input Text"}
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setInput(SAMPLE_TEXT)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              {isUr ? "مثال دیکھیں" : "Try Example"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              {isUr ? "فائل اپلوڈ کریں (.txt/.docx)" : "Upload .txt/.docx"}
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
          placeholder={isUr ? "یہاں متن پیسٹ کریں یا فائل اپلوڈ کریں..." : "Paste text here, or upload a file..."}
          className="w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[320px] text-base focus:outline-none focus:ring-2 focus:ring-amber-500 text-right"
          dir="rtl"
        />
        <div dir="ltr" className="mt-1 text-xs">
          {isProcessingFile && <span className="text-gray-500">{isUr ? "فائل پڑھی جا رہی ہے..." : "Reading file..."}</span>}
          {fileName && !isProcessingFile && (
            <span className="text-green-700">{isUr ? `✓ فائل لوڈ ہو گئی: ${fileName}` : `✓ Loaded: ${fileName}`}</span>
          )}
          {fileError && <span className="text-red-600">{fileError}</span>}
        </div>

        <div className="flex flex-wrap gap-2 mt-3 mb-4" dir="ltr">
          <button
            onClick={handleStandardizeAndRecheck}
            disabled={!hasInput}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isUr ? "متن معیاری بنائیں اور دوبارہ جانچیں" : "Standardize & Re-check"}
          </button>
          <button
            onClick={resetAll}
            disabled={!hasInput}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isUr ? "صاف کریں" : "Clear"}
          </button>
        </div>

        {/* Before Report */}
        <ReportPanel title={isUr ? "آڈٹ رپورٹ (اصل متن)" : "Audit Report (Original Text)"} report={beforeReport} hasInput={hasInput} isUr={isUr} />

        {/* After Report + standardized text, shown only after button click */}
        {afterReport && standardizedText !== null && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div
              className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-900 flex flex-wrap items-center gap-3"
              dir="ltr"
            >
              <span className="font-bold">{isUr ? "تقابل:" : "Comparison:"}</span>
              <span>{isUr ? `پہلے: ${beforeReport.totalIssues} مسائل` : `Before: ${beforeReport.totalIssues} issues`}</span>
              <span>{isUr ? `معیار بندی کے بعد: ${afterReport.totalIssues} مسائل` : `After: ${afterReport.totalIssues} issues`}</span>
              <span>
                {isUr ? "کم ہوئے: " : "Reduced by: "}
                {Math.max(beforeReport.totalIssues - afterReport.totalIssues, 0)}
              </span>
            </div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">
              {isUr ? "معیاری متن" : "Standardized Text"}
            </label>
            <div
              className="w-full bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-sm font-mono text-amber-950 font-medium min-h-[200px] text-base overflow-y-auto text-right whitespace-pre-wrap mb-4"
              dir="rtl"
            >
              {standardizedText}
            </div>
            <ReportPanel title={isUr ? "آڈٹ رپورٹ (معیاری متن کے بعد)" : "Audit Report (After Standardizing)"} report={afterReport} hasInput={true} isUr={isUr} />
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
  isUr,
}: {
  title: string;
  report: QualityReport;
  hasInput: boolean;
  isUr: boolean;
}) {
  if (!hasInput) {
    return (
      <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-gray-400 font-sans text-center">
        {isUr ? "متن پیسٹ کریں یا فائل اپلوڈ کریں تاکہ آڈٹ رپورٹ بن سکے" : "Paste text or upload a file to generate an audit report"}
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
            <div>• Missing Space After Punctuation: {report.typography.missingSpaceAfterPunctuation}</div>
          </div>
          <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
            <span className="font-bold block text-amber-900 mb-1">Punctuation:</span>
            <div>• Mixed Punctuation: {report.punctuation.mixedPunctuation}</div>
            <div>• Wrong Quotes: {report.punctuation.wrongQuotes}</div>
            <div>• Duplicated Punctuation: {report.punctuation.duplicatedPunctuation}</div>
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
