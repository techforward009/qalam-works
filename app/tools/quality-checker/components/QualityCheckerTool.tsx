"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../../../lib/language-context";
import { checkTextQuality, type QualityReport } from "../../../utils/quality/checkTextQuality";
import { resolveProcessingLanguage } from "../../../utils/processing/detectLanguage";
import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";
import { validateFile } from "../../../utils/fileValidation";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";
import { displayDirForPaste } from "../../../utils/processing/cleanTextPipeline";
import { trackEvent, trackToolOpenOnce, toCountBucket } from "../../../lib/analytics";

const SAMPLE_UR =
  "یہ  ایک  نمونہ تحریر ہے ,جس میں spacing کا مسئلہ ہے۔";
const SAMPLE_EN = "This is normal English text with  extra spaces.";

export default function QualityCheckerTool() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("auto");
  const [report, setReport] = useState<QualityReport | null>(null);
  const [resolved, setResolved] = useState<ResolvedLanguage | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackToolOpenOnce("quality_audit");
  }, []);

  const hasInput = input.trim().length > 0;
  const displayDir = displayDirForPaste(processingLanguage, input);

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
      setReport(null);
      setResolved(null);
      setHasRun(false);
    } catch {
      setFileError(isUr ? "فائل پڑھنے میں خرابی ہوئی۔" : "Failed to read file.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleRunAudit = () => {
    if (!hasInput) return;
    const mode = processingLanguage;
    const r = resolveProcessingLanguage(mode, input);
    setResolved(r);
    const rep = checkTextQuality(input, mode);
    setReport(rep);
    setHasRun(true);
    trackEvent("tool_process", {
      tool: "quality_audit",
      mode,
      resolved_mode: r,
      success: true,
      count_bucket: toCountBucket(rep.totalIssues),
    });
  };

  const resetAll = () => {
    setInput("");
    setFileName(null);
    setFileError(null);
    setReport(null);
    setResolved(null);
    setHasRun(false);
  };

  const resolvedLabel = (r: ResolvedLanguage) => {
    if (r === "ur") return isUr ? "آڈٹ موڈ: اردو" : "Audited as: Urdu";
    if (r === "en") return isUr ? "آڈٹ موڈ: انگریزی" : "Audited as: English";
    if (r === "ar") return isUr ? "آڈٹ موڈ: عربی" : "Audited as: Arabic";
    return isUr ? "آڈٹ موڈ: محفوظ آر ٹی ایل" : "Audited as: Safe RTL";
  };

  return (
    <div className="site-container">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <p className={`text-sm text-gray-600 mb-4 ${isUr ? "font-naskh" : ""}`} dir={isUr ? "rtl" : "ltr"}>
          {isUr
            ? "یہ ٹول متن کو تبدیل نہیں کرتا — صرف معیار کے مسائل اور مشاہدات دکھاتا ہے۔ صفائی کے لیے ڈاکومنٹ کلینر یا ڈاکومنٹ اسٹوڈیو استعمال کریں۔"
            : "This tool does not change your text — it only reports issues and observations. To clean text, use Document Cleaner or Document Studio."}
        </p>

        <div className={`mb-4 ${isUr ? "font-naskh" : ""}`} dir={isUr ? "rtl" : "ltr"}>
          <label htmlFor="qa-lang" className="block text-xs font-semibold text-gray-700 mb-1">
            {isUr ? "متن کی زبان" : "Text language"}
          </label>
          <select
            id="qa-lang"
            value={processingLanguage}
            onChange={(e) => {
              const next = e.target.value as ProcessingLanguage;
              setProcessingLanguage(next);
              trackEvent("tool_mode_change", { tool: "quality_audit", mode: next });
              setReport(null);
              setResolved(null);
              setHasRun(false);
            }}
            className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30"
          >
            <option value="auto">{isUr ? "آٹو" : "Auto"}</option>
            <option value="ur">{isUr ? "اردو" : "Urdu"}</option>
            <option value="en">{isUr ? "انگریزی" : "English"}</option>
            <option value="ar">{isUr ? "عربی" : "Arabic"}</option>
          </select>
          <p className="mt-1 text-[11px] text-gray-500 leading-snug max-w-xl">
            {isUr
              ? "آٹو غیر یقینی عربی رسم الخط پر محفوظ آڈٹ کرتا ہے۔ اردو/عربی مخصوص قواعد کے لیے زبان منتخب کریں۔"
              : "Auto uses a safe audit when Arabic-script language is uncertain. Choose Urdu or Arabic for language-specific rules."}
          </p>
        </div>

        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <label htmlFor="qa-input" className="block text-xs font-semibold text-gray-700">
            {isUr ? "آڈٹ کے لیے متن" : "Text to audit"}
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setInput(processingLanguage === "en" ? SAMPLE_EN : SAMPLE_UR);
                setFileName(null);
                setReport(null);
                setHasRun(false);
              }}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
            >
              {isUr ? "مثال دیکھیں" : "Try Example"}
            </button>
            <button
              type="button"
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
            if (file) void handleFileSelect(file);
          }}
        />
        <textarea
          id="qa-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setFileName(null);
            setReport(null);
            setHasRun(false);
          }}
          placeholder={isUr ? "یہاں متن پیسٹ کریں یا فائل اپلوڈ کریں..." : "Paste text here, or upload a file..."}
          className={`w-full bg-gray-50 border border-gray-300 p-3 rounded-lg text-sm font-mono text-gray-800 min-h-[280px] focus:outline-none focus:ring-2 focus:ring-amber-500 break-words ${
            displayDir === "rtl" ? "text-right" : "text-left"
          }`}
          dir={displayDir}
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
            type="button"
            onClick={handleRunAudit}
            disabled={!hasInput}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isUr ? "آڈٹ چلائیں" : "Run Audit"}
          </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={!hasInput && !hasRun}
            className="px-5 py-2.5 rounded-lg text-[15px] font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {isUr ? "صاف کریں" : "Clear"}
          </button>
        </div>

        {hasRun && resolved && report && (
          <div className="space-y-3">
            <p className={`text-sm font-medium text-gray-800 ${isUr ? "font-naskh" : ""}`} dir={isUr ? "rtl" : "ltr"}>
              {resolvedLabel(resolved)}
            </p>
            {resolved === "rtl-neutral" && (
              <p
                className={`text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 ${isUr ? "font-naskh" : ""}`}
                dir={isUr ? "rtl" : "ltr"}
              >
                {isUr
                  ? "عربی رسم الخط کا متن — محفوظ مشاہداتی آڈٹ۔ اردو یا عربی مخصوص قواعد کے لیے زبان منتخب کریں۔"
                  : "Arabic-script text — safe advisory audit. Choose Urdu or Arabic for language-specific rules."}
              </p>
            )}
            <ReportPanel report={report} isUr={isUr} resolved={resolved} />
            <p className={`text-sm text-gray-600 ${isUr ? "font-naskh" : ""}`} dir={isUr ? "rtl" : "ltr"}>
              {isUr ? (
                <>
                  آڈٹ صرف مسائل دکھاتا ہے — متن خود نہیں بدلتا۔ فارمیٹنگ ٹھیک کرنے کے لیے{" "}
                  <Link href="/tools/document-cleaner" onClick={() => trackEvent("nav_click", { tool: "quality_audit", target_tool: "document_cleaner", nav_source: "cross_link" })} className="text-amber-800 font-semibold underline">
                    ڈاکومنٹ کلینر
                  </Link>
                  ؛ حتمی دستاویز تیار کرنے کے لیے{" "}
                  <Link href="/tools/document-studio" onClick={() => trackEvent("nav_click", { tool: "quality_audit", target_tool: "document_studio", nav_source: "cross_link" })} className="text-amber-800 font-semibold underline">
                    ڈاکومنٹ اسٹوڈیو
                  </Link>{" "}
                  استعمال کریں۔
                </>
              ) : (
                <>
                  Audit finds issues — it does not change your text. Use{" "}
                  <Link href="/tools/document-cleaner" onClick={() => trackEvent("nav_click", { tool: "quality_audit", target_tool: "document_cleaner", nav_source: "cross_link" })} className="text-amber-800 font-semibold underline">
                    Document Cleaner
                  </Link>{" "}
                  to fix formatting, or{" "}
                  <Link href="/tools/document-studio" onClick={() => trackEvent("nav_click", { tool: "quality_audit", target_tool: "document_studio", nav_source: "cross_link" })} className="text-amber-800 font-semibold underline">
                    Document Studio
                  </Link>{" "}
                  to prepare the final document.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportPanel({
  report,
  isUr,
  resolved,
}: {
  report: QualityReport;
  isUr: boolean;
  resolved: ResolvedLanguage;
}) {
  const actionable =
    report.typography.multipleSpaces +
    report.typography.emptyLines +
    report.typography.missingSpaceAfterPunctuation +
    report.typography.spaceBeforePunctuation +
    report.punctuation.mixedPunctuation +
    report.punctuation.wrongQuotes +
    report.punctuation.duplicatedPunctuation +
    report.textQuality.repeatedWords +
    (resolved === "ur" ? report.textQuality.mixedUrduArabicForms : 0);

  const advisory =
    report.typography.longParagraphs +
    report.textQuality.mixedScript +
    report.typography.tatweelCount +
    (resolved !== "ur" ? 0 : 0);

  const noSignificant = actionable === 0 && advisory === 0;

  return (
    <div className="mb-4">
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-950" dir="ltr">
        <div className="flex flex-wrap justify-between items-center border-b border-amber-200 pb-2 mb-3 gap-2">
          <span className="font-bold text-sm text-amber-900">
            {isUr ? "قلم کوالٹی آڈٹ" : "Qalam Quality Audit"}
          </span>
          {noSignificant ? (
            <span className="bg-green-100 px-2 py-0.5 rounded text-green-800 font-semibold">
              {isUr ? "کوئی قابلِ توجہ مسئلہ نہیں ملا" : "No significant issues detected"}
            </span>
          ) : (
            <span className="bg-amber-200/60 px-2 py-0.5 rounded text-amber-900 font-semibold">
              {isUr ? `مسائل: ${actionable}` : `Issues: ${actionable}`}
              {advisory > 0 ? (isUr ? ` · مشاہدات: ${advisory}` : ` · Observations: ${advisory}`) : ""}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
            <span className="font-bold block text-amber-900 mb-1">{isUr ? "مسائل" : "Issues"}</span>
            <div>• Multiple spaces: {report.typography.multipleSpaces}</div>
            <div>• Empty lines: {report.typography.emptyLines}</div>
            <div>• Space before/after punctuation: {report.typography.spaceBeforePunctuation + report.typography.missingSpaceAfterPunctuation}</div>
            <div>• Mixed / wrong punctuation: {report.punctuation.mixedPunctuation + report.punctuation.wrongQuotes + report.punctuation.duplicatedPunctuation}</div>
            <div>• Repeated words: {report.textQuality.repeatedWords}</div>
            {resolved === "ur" && (
              <div>• Mixed Urdu/Arabic letter forms: {report.textQuality.mixedUrduArabicForms}</div>
            )}
          </div>
          <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
            <span className="font-bold block text-amber-900 mb-1">{isUr ? "مشاہدات" : "Observations"}</span>
            <div>
              • {isUr ? "مخلوط رسم الخط کا متن" : "Mixed-script content detected"}:{" "}
              {report.textQuality.mixedScript}
            </div>
            <div>• Long paragraphs: {report.typography.longParagraphs}</div>
            <div>• Tatweel (ـ): {report.typography.tatweelCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
