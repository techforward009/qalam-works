"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateFile } from "../../../utils/fileValidation";
import { handleDocumentUpload } from "../../../actions/documentAction";
import { PipelineResult } from "../../../types/documentPipeline";
import { downloadCleanedText } from "../../../utils/downloadCleanedText";
import { buildDocxBlob } from "../../document-studio/utils/buildDocxDocument";
import { plainTextToDocNode } from "../../document-studio/utils/plainTextToDocNode";
import { useLanguage } from "../../../lib/language-context";
import { translations } from "../../../lib/translations";
import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";

function selectedModeMatchesResult(
  selected: ProcessingLanguage,
  resolved: ResolvedLanguage | undefined
): boolean {
  if (!resolved) return false;
  if (selected === "auto") {
    // Auto may resolve to en | rtl-neutral (never ur/ar without explicit choice)
    return resolved === "en" || resolved === "rtl-neutral";
  }
  return selected === resolved;
}

export default function DocumentCleanerTool() {
  const { language, dir } = useLanguage();
  const ct = translations[language].cleanerTool;
  const dz = ct.dropzone;
  const naskh = language === "ur" ? "font-naskh" : "";

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "report">("report");
  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("auto");

  const runIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Skip the initial mount effect so we don't process with no file
  const langInitRef = useRef(true);

  const processFile = useCallback(
    async (selectedFile: File, mode: ProcessingLanguage) => {
      const runId = ++runIdRef.current;
      setError(null);
      setResult(null);
      setFile(selectedFile);

      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        const code = validation.errorCode;
        if (code === "unsupported") setError(dz.errorUnsupported);
        else if (code === "too_large") setError(dz.errorTooLarge);
        else setError(dz.errorGeneric);
        return;
      }

      setLoading(true);
      setStepMessage("Extracting text…");
      await new Promise((r) => setTimeout(r, 200));
      if (runId !== runIdRef.current) return;

      setStepMessage("Cleaning with selected language mode…");
      await new Promise((r) => setTimeout(r, 200));
      if (runId !== runIdRef.current) return;

      setStepMessage("Running quality audit…");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("processingLanguage", mode);

      const pipelineResult = await handleDocumentUpload(formData, mode);
      if (runId !== runIdRef.current) return;

      setLoading(false);
      // Allow the same path to be chosen again
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (!pipelineResult.success) {
        setError(dz.errorGeneric);
        return;
      }
      setResult(pipelineResult);
    },
    [dz.errorGeneric, dz.errorTooLarge, dz.errorUnsupported]
  );

  const handleFileChange = (selectedFile: File) => {
    void processFile(selectedFile, processingLanguage);
  };

  // Reprocess when language mode changes if a file is already loaded
  useEffect(() => {
    if (langInitRef.current) {
      langInitRef.current = false;
      return;
    }
    if (!file) return;
    void processFile(file, processingLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on language change
  }, [processingLanguage]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const canDownload =
    !!result?.cleanedText &&
    !!result.summary &&
    selectedModeMatchesResult(processingLanguage, result.summary.resolvedLanguage);

  const handleDownloadTxt = () => {
    if (!canDownload || !result?.cleanedText || !result.summary) return;
    downloadCleanedText(result.cleanedText, result.summary.fileName);
  };

  const handleDownloadDocx = async () => {
    if (!canDownload || !result?.cleanedText || !result.summary) return;
    const docDir = result.summary.direction === "ltr" ? "ltr" : "rtl";
    const blob = await buildDocxBlob(plainTextToDocNode(result.cleanedText), docDir);
    const baseName = (result.summary.fileName || "document").replace(/\.[^.]+$/, "");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}-qalam-cleaned.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resolvedLabel = (resolved?: ResolvedLanguage) => {
    if (!resolved) return "";
    if (resolved === "ur") return ct.processedAsUrdu;
    if (resolved === "en") return ct.processedAsEnglish;
    if (resolved === "ar") return ct.processedAsArabic;
    return ct.processedAsSafeRtl;
  };

  return (
    <div className="site-container">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <div className={`mb-5 ${naskh}`} dir={dir}>
          <label htmlFor="cleaner-lang" className="block text-sm font-semibold text-gray-800 mb-2">
            {ct.languageLabel}
          </label>
          <select
            id="cleaner-lang"
            value={processingLanguage}
            onChange={(e) => setProcessingLanguage(e.target.value as ProcessingLanguage)}
            className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30"
          >
            <option value="auto">{ct.langAuto}</option>
            <option value="ur">{ct.langUrdu}</option>
            <option value="en">{ct.langEnglish}</option>
            <option value="ar">{ct.langArabic}</option>
          </select>
          <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{ct.languageHint}</p>
        </div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl p-6 mb-6 bg-amber-50/30 transition-all flex flex-col items-center justify-center cursor-pointer"
          dir={dir}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx"
            onChange={(e) => e.target.files && e.target.files[0] && handleFileChange(e.target.files[0])}
            className="hidden"
            id="file-upload-input"
          />
          <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center w-full">
            <svg className="w-10 h-10 text-amber-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11V7m0 0l-2 2m2-2l2 2" />
            </svg>
            <span className={`text-[17px] font-semibold text-amber-900 mb-1.5 leading-snug ${naskh}`}>
              {dz.prompt}
            </span>
            <span className="text-[14px] text-gray-500 mt-1" dir="ltr">
              {dz.hint}
            </span>
          </label>
        </div>

        {error && (
          <div className={`mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium ${naskh}`} dir={dir}>
            {error}
          </div>
        )}

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mb-3"></div>
            <p className={`text-xs font-bold text-amber-900 mb-1 ${naskh}`}>{dz.processing}</p>
            <p className="text-[11px] text-amber-700 font-mono" dir="ltr">
              {stepMessage}
            </p>
          </div>
        )}

        {result?.summary?.resolvedLanguage === "rtl-neutral" && (
          <div className={`mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 ${naskh}`} dir={dir}>
            {ct.rtlNeutralStatus}
          </div>
        )}

        {result && result.summary && !loading && (
          <div className="text-left" dir="ltr">
            <div
              className={`mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 ${naskh}`}
              dir={dir}
            >
              {resolvedLabel(result.summary.resolvedLanguage)}
            </div>

            <div className="flex border-b border-amber-200 mb-4">
              <button
                onClick={() => setActiveTab("report")}
                className={`py-2 px-4 text-sm font-bold transition-all border-b-2 ${
                  activeTab === "report"
                    ? "border-amber-700 text-amber-900 bg-amber-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                } ${naskh}`}
              >
                {ct.reportTab}
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`py-2 px-4 text-sm font-bold transition-all border-b-2 ${
                  activeTab === "preview"
                    ? "border-amber-700 text-amber-900 bg-amber-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                } ${naskh}`}
              >
                {ct.previewTab}
              </button>
            </div>

            {activeTab === "report" ? (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 font-mono space-y-4">
                <div className="border-b border-amber-200 pb-3">
                  <span className="font-bold block text-sm text-amber-900 mb-2">File Metadata</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div>• Name: {result.summary.fileName}</div>
                    <div>• Size: {result.summary.fileSize}</div>
                    <div>• Characters: {result.summary.characterCount}</div>
                    <div>• Words: {result.summary.wordCount}</div>
                  </div>
                </div>

                <div className="border-b border-amber-200 pb-3">
                  <span className="font-bold block text-sm text-green-800 mb-2">Corrections Applied</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-green-900">
                    <div>• Total: {result.summary.correctionsApplied.totalCorrections}</div>
                    <div>• Normalizations: {result.summary.correctionsApplied.arabicNormalizations}</div>
                    <div>• Spacing Fixes: {result.summary.correctionsApplied.spacingFixes}</div>
                    <div>• Punctuation Fixes: {result.summary.correctionsApplied.punctuationFixes}</div>
                  </div>
                </div>

                <div>
                  <span className="font-bold block text-sm text-amber-900 mb-2">Remaining Quality Issues</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                    <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
                      <span className="font-bold block mb-1">Typography:</span>
                      <div>• Multiple Spaces: {result.summary.remainingIssues.typography.multipleSpaces}</div>
                      <div>• Empty Lines: {result.summary.remainingIssues.typography.emptyLines}</div>
                      <div>• Long Paragraphs: {result.summary.remainingIssues.typography.longParagraphs}</div>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
                      <span className="font-bold block mb-1">Punctuation:</span>
                      <div>• Mixed Punctuation: {result.summary.remainingIssues.punctuation.mixedPunctuation}</div>
                      <div>• Wrong Quotes: {result.summary.remainingIssues.punctuation.wrongQuotes}</div>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
                      <span className="font-bold block mb-1">Text Quality:</span>
                      <div>• Repeated Words: {result.summary.remainingIssues.textQuality.repeatedWords}</div>
                      <div>• Mixed Script: {result.summary.remainingIssues.textQuality.mixedScript}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="bg-gray-50 border border-gray-300 p-4 rounded-xl text-xs font-mono text-gray-800 max-h-[300px] overflow-y-auto text-right"
                  dir="rtl"
                >
                  {result.cleanedText}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!canDownload}
                className={`font-semibold px-6 py-2.5 rounded-lg shadow-md transition-all text-[15px] flex items-center gap-2 ${naskh} ${
                  canDownload
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <span>{ct.downloadTxt}</span>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {result.summary.fileType === "DOCX" && (
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={!canDownload}
                  className={`font-semibold px-6 py-2.5 rounded-lg shadow-md transition-all text-[15px] flex items-center gap-2 ${naskh} ${
                    canDownload
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <span>{ct.downloadDocx}</span>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
            </div>
            {!canDownload && (
              <p className={`mt-2 text-center text-xs text-amber-800 ${naskh}`} dir={dir}>
                {ct.staleResultHint}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
