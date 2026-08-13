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
import {
  cleanTextPipeline,
  displayDirForPaste,
  type CleanTextPipelineResult,
} from "../../../utils/processing/cleanTextPipeline";

type InputMode = "file" | "paste";

type PasteResult = CleanTextPipelineResult;

function selectedModeMatchesResult(
  selected: ProcessingLanguage,
  resolved: ResolvedLanguage | undefined
): boolean {
  if (!resolved) return false;
  if (selected === "auto") return resolved === "en" || resolved === "rtl-neutral";
  return selected === resolved;
}

export default function DocumentCleanerTool() {
  const { language, dir } = useLanguage();
  const ct = translations[language].cleanerTool;
  const dz = ct.dropzone;
  const naskh = language === "ur" ? "font-naskh" : "";

  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("auto");

  // File workflow state
  const [file, setFile] = useState<File | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "preview">("report");

  // Paste workflow state
  const [pasteText, setPasteText] = useState("");
  const [pasteResult, setPasteResult] = useState<PasteResult | null>(null);
  const [pasteStale, setPasteStale] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const langInitRef = useRef(true);

  const processFile = useCallback(
    async (selectedFile: File, mode: ProcessingLanguage) => {
      const runId = ++runIdRef.current;
      setFileError(null);
      setFileResult(null);
      setFile(selectedFile);

      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        const code = validation.errorCode;
        if (code === "unsupported") setFileError(dz.errorUnsupported);
        else if (code === "too_large") setFileError(dz.errorTooLarge);
        else setFileError(dz.errorGeneric);
        return;
      }

      setFileLoading(true);
      setStepMessage("Extracting text…");
      await new Promise((r) => setTimeout(r, 150));
      if (runId !== runIdRef.current) return;

      setStepMessage("Cleaning with selected language mode…");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("processingLanguage", mode);
      const pipelineResult = await handleDocumentUpload(formData, mode);
      if (runId !== runIdRef.current) return;

      setFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (!pipelineResult.success) {
        setFileError(dz.errorGeneric);
        return;
      }
      setFileResult(pipelineResult);
    },
    [dz.errorGeneric, dz.errorTooLarge, dz.errorUnsupported]
  );

  // Reprocess file when language changes
  useEffect(() => {
    if (langInitRef.current) {
      langInitRef.current = false;
      return;
    }
    if (file && inputMode === "file") {
      void processFile(file, processingLanguage);
    }
    if (inputMode === "paste" && pasteResult) {
      setPasteStale(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processingLanguage]);

  const handleFileChange = (selectedFile: File) => {
    void processFile(selectedFile, processingLanguage);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  const handleCleanPaste = () => {
    setPasteError(null);
    setCopied(false);
    const r = cleanTextPipeline(pasteText, processingLanguage);
    if (!r.success) {
      setPasteResult(null);
      setPasteStale(false);
      setPasteError(r.error === "empty" ? ct.emptyPasteError : r.error);
      return;
    }
    setPasteResult(r);
    setPasteStale(false);
  };

  const handleClearPaste = () => {
    setPasteText("");
    setPasteResult(null);
    setPasteStale(false);
    setPasteError(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!pasteResult || pasteStale) return;
    try {
      await navigator.clipboard.writeText(pasteResult.cleanedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const switchInputMode = (mode: InputMode) => {
    setInputMode(mode);
    // Do not carry results across input modes
    if (mode === "file") {
      setPasteResult(null);
      setPasteStale(false);
      setCopied(false);
    } else {
      setFileResult(null);
    }
  };

  const fileCanDownload =
    !!fileResult?.cleanedText &&
    !!fileResult.summary &&
    selectedModeMatchesResult(processingLanguage, fileResult.summary.resolvedLanguage);

  const pasteCanExport = !!pasteResult && !pasteStale;

  const handleDownloadTxt = (text: string, name: string) => {
    downloadCleanedText(text, name);
  };

  const handleDownloadDocx = async (text: string, name: string, direction: "rtl" | "ltr") => {
    const blob = await buildDocxBlob(plainTextToDocNode(text), direction);
    const baseName = name.replace(/\.[^.]+$/, "") || "qalam-cleaned";
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

  const pasteDisplayDir = displayDirForPaste(processingLanguage, pasteText);
  const resultContentDir = (direction?: "rtl" | "ltr") => direction || "rtl";

  const renderCorrections = (c: {
    totalCorrections: number;
    arabicNormalizations: number;
    spacingFixes: number;
    punctuationFixes: number;
  }) => {
    if (c.totalCorrections === 0) {
      return <p className={`text-sm text-green-800 ${naskh}`}>{ct.noChanges}</p>;
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px] text-green-900">
        <div>• Total: {c.totalCorrections}</div>
        <div>• Character: {c.arabicNormalizations}</div>
        <div>• Spacing: {c.spacingFixes}</div>
        <div>• Punctuation: {c.punctuationFixes}</div>
      </div>
    );
  };

  const renderRemaining = (issues: NonNullable<PipelineResult["summary"]>["remainingIssues"]) => {
    const total = issues.totalIssues;
    if (total === 0) {
      return <p className={`text-sm text-green-800 ${naskh}`}>{ct.noIssues}</p>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
        <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
          <span className="font-bold block mb-1">Typography</span>
          <div>• Multiple spaces: {issues.typography.multipleSpaces}</div>
          <div>• Empty lines: {issues.typography.emptyLines}</div>
          <div>• Long paragraphs: {issues.typography.longParagraphs}</div>
        </div>
        <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
          <span className="font-bold block mb-1">Punctuation</span>
          <div>• Mixed punctuation: {issues.punctuation.mixedPunctuation}</div>
          <div>• Quotes: {issues.punctuation.wrongQuotes}</div>
        </div>
        <div className="bg-white/60 p-2.5 rounded-lg border border-amber-100">
          <span className="font-bold block mb-1">Text</span>
          <div>• Repeated words: {issues.textQuality.repeatedWords}</div>
          <div>
            • {ct.mixedScriptLabel}: {issues.textQuality.mixedScript}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="site-container">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        {/* Language selector */}
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

        {/* Input mode switch */}
        <div className={`mb-5 flex gap-2 ${naskh}`} dir={dir} role="tablist" aria-label="Input mode">
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === "file"}
            onClick={() => switchInputMode("file")}
            className={`px-4 py-2 rounded-lg text-[15px] font-semibold border transition ${
              inputMode === "file"
                ? "bg-[#1A3A2A] text-white border-[#1A3A2A]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {ct.inputUpload}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={inputMode === "paste"}
            onClick={() => switchInputMode("paste")}
            className={`px-4 py-2 rounded-lg text-[15px] font-semibold border transition ${
              inputMode === "paste"
                ? "bg-[#1A3A2A] text-white border-[#1A3A2A]"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {ct.inputPaste}
          </button>
        </div>

        {/* FILE MODE */}
        {inputMode === "file" && (
          <>
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
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
                id="file-upload-input"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center w-full">
                <svg className="w-10 h-10 text-amber-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11V7m0 0l-2 2m2-2l2 2" />
                </svg>
                <span className={`text-[17px] font-semibold text-amber-900 mb-1.5 leading-snug ${naskh}`}>{dz.prompt}</span>
                <span className="text-[14px] text-gray-500 mt-1" dir="ltr">
                  {dz.hint}
                </span>
              </label>
            </div>

            {fileError && (
              <div className={`mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium ${naskh}`} dir={dir}>
                {fileError}
              </div>
            )}

            {fileLoading && (
              <div className="py-8 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mb-3" />
                <p className={`text-xs font-bold text-amber-900 mb-1 ${naskh}`}>{dz.processing}</p>
                <p className="text-[11px] text-amber-700 font-mono" dir="ltr">
                  {stepMessage}
                </p>
              </div>
            )}

            {fileResult?.summary?.resolvedLanguage === "rtl-neutral" && (
              <div className={`mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 ${naskh}`} dir={dir}>
                {ct.rtlNeutralStatus}
              </div>
            )}

            {fileResult?.summary && !fileLoading && (
              <div className="text-left" dir="ltr">
                <div className={`mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 ${naskh}`} dir={dir}>
                  {resolvedLabel(fileResult.summary.resolvedLanguage)}
                </div>

                <div className="flex border-b border-amber-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("report")}
                    className={`py-2 px-4 text-sm font-bold border-b-2 ${
                      activeTab === "report" ? "border-amber-700 text-amber-900" : "border-transparent text-gray-500"
                    } ${naskh}`}
                  >
                    {ct.reportTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`py-2 px-4 text-sm font-bold border-b-2 ${
                      activeTab === "preview" ? "border-amber-700 text-amber-900" : "border-transparent text-gray-500"
                    } ${naskh}`}
                  >
                    {ct.previewTab}
                  </button>
                </div>

                {activeTab === "report" ? (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs space-y-4">
                    <div>
                      <span className={`font-bold block text-sm text-green-800 mb-2 ${naskh}`}>{ct.correctionsHeading}</span>
                      {renderCorrections(fileResult.summary.correctionsApplied)}
                    </div>
                    <div>
                      <span className={`font-bold block text-sm text-amber-900 mb-2 ${naskh}`}>{ct.remainingHeading}</span>
                      {renderRemaining(fileResult.summary.remainingIssues)}
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-gray-50 border border-gray-300 p-4 rounded-xl text-xs font-mono max-h-[300px] overflow-y-auto break-words"
                    dir={resultContentDir(fileResult.summary.direction)}
                  >
                    {fileResult.cleanedText}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    disabled={!fileCanDownload}
                    onClick={() =>
                      fileCanDownload &&
                      handleDownloadTxt(fileResult.cleanedText!, fileResult.summary!.fileName)
                    }
                    className={`font-semibold px-6 py-2.5 rounded-lg text-[15px] ${naskh} ${
                      fileCanDownload ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {ct.downloadTxt}
                  </button>
                  {fileResult.summary.fileType === "DOCX" && (
                    <button
                      type="button"
                      disabled={!fileCanDownload}
                      onClick={() =>
                        fileCanDownload &&
                        handleDownloadDocx(
                          fileResult.cleanedText!,
                          fileResult.summary!.fileName,
                          fileResult.summary!.direction === "ltr" ? "ltr" : "rtl"
                        )
                      }
                      className={`font-semibold px-6 py-2.5 rounded-lg text-[15px] ${naskh} ${
                        fileCanDownload ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {ct.downloadDocx}
                    </button>
                  )}
                </div>
                {!fileCanDownload && (
                  <p className={`mt-2 text-center text-xs text-amber-800 ${naskh}`} dir={dir}>
                    {ct.staleResultHint}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* PASTE MODE */}
        {inputMode === "paste" && (
          <div dir={dir}>
            <label htmlFor="cleaner-paste" className={`block text-sm font-semibold text-gray-800 mb-2 ${naskh}`}>
              {ct.pasteLabel}
            </label>
            <textarea
              id="cleaner-paste"
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                if (pasteResult) setPasteStale(true);
              }}
              placeholder={ct.pastePlaceholder}
              rows={12}
              dir={pasteDisplayDir}
              className={`w-full rounded-xl border border-gray-300 bg-white p-4 text-[16px] leading-relaxed text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 resize-y min-h-[180px] break-words ${
                pasteDisplayDir === "rtl" ? "font-naskh text-right" : "text-left"
              }`}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCleanPaste}
                className={`h-10 px-5 rounded-lg text-[15px] font-semibold bg-[#1A3A2A] text-white hover:bg-[#204a35] ${naskh}`}
              >
                {ct.cleanText}
              </button>
              <button
                type="button"
                onClick={handleClearPaste}
                className={`h-10 px-4 rounded-lg text-[15px] font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 ${naskh}`}
              >
                {ct.clear}
              </button>
            </div>

            {pasteError && (
              <div className={`mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm ${naskh}`}>{pasteError}</div>
            )}

            {pasteStale && pasteResult && (
              <p className={`mt-3 text-sm text-amber-800 ${naskh}`}>{ct.staleResultHint}</p>
            )}

            {pasteResult && !pasteStale && (
              <div className="mt-6 space-y-4">
                {pasteResult.resolvedLanguage === "rtl-neutral" && (
                  <div className={`rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 ${naskh}`}>
                    {ct.rtlNeutralStatus}
                  </div>
                )}
                <div className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm ${naskh}`}>
                  {resolvedLabel(pasteResult.resolvedLanguage)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className={`text-sm font-bold text-gray-700 mb-2 ${naskh}`}>{ct.originalLabel}</h3>
                    <div
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm whitespace-pre-wrap break-words max-h-[280px] overflow-y-auto"
                      dir={pasteDisplayDir}
                    >
                      {pasteResult.originalText}
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold text-gray-700 mb-2 ${naskh}`}>{ct.cleanedLabel}</h3>
                    <div
                      className="bg-green-50/50 border border-green-200 rounded-xl p-3 text-sm whitespace-pre-wrap break-words max-h-[280px] overflow-y-auto"
                      dir={resultContentDir(pasteResult.direction)}
                    >
                      {pasteResult.cleanedText}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div>
                    <span className={`font-bold block text-sm text-green-800 mb-1 ${naskh}`}>{ct.correctionsHeading}</span>
                    {renderCorrections(pasteResult.correctionsApplied)}
                  </div>
                  <div>
                    <span className={`font-bold block text-sm text-amber-900 mb-1 ${naskh}`}>{ct.remainingHeading}</span>
                    {renderRemaining(pasteResult.remainingIssues)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!pasteCanExport}
                    className={`h-10 px-5 rounded-lg text-[15px] font-semibold ${naskh} ${
                      pasteCanExport ? "bg-[#B8935A] text-white hover:bg-[#C9A46B]" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {copied ? ct.copied : ct.copyCleaned}
                  </button>
                  <button
                    type="button"
                    disabled={!pasteCanExport}
                    onClick={() => pasteCanExport && handleDownloadTxt(pasteResult.cleanedText, "pasted-text.txt")}
                    className={`h-10 px-5 rounded-lg text-[15px] font-semibold ${naskh} ${
                      pasteCanExport ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {ct.downloadTxt}
                  </button>
                  <button
                    type="button"
                    disabled={!pasteCanExport}
                    onClick={() =>
                      pasteCanExport &&
                      handleDownloadDocx(pasteResult.cleanedText, "pasted-text", pasteResult.direction)
                    }
                    className={`h-10 px-5 rounded-lg text-[15px] font-semibold ${naskh} ${
                      pasteCanExport ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {ct.downloadDocx}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
