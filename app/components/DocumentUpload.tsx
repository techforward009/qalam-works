"use client";

import { useState } from "react";
import { validateFile } from "../utils/fileValidation";
import { handleDocumentUpload } from "../actions/documentAction";
import { PipelineResult } from "../types/documentPipeline";
import { downloadCleanedText } from "../utils/downloadCleanedText";

export default function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepMessage, setStepMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "report">("report");

  const handleFileChange = async (selectedFile: File) => {
    setError(null);
    setResult(null);

    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || "فائل ناکام ہو گئی / File validation failed.");
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    setStepMessage("Extracting text from document...");
    await new Promise((r) => setTimeout(r, 400));

    setStepMessage("Normalizing Unicode & Spacing...");
    await new Promise((r) => setTimeout(r, 400));

    setStepMessage("Running Quality Audit & Generating Qalam Report...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const pipelineResult = await handleDocumentUpload(formData);
    setLoading(false);

    if (!pipelineResult.success) {
      setError(pipelineResult.error || "فائل پراسیس کرنے میں خرابی ہوئی / Processing error.");
      return;
    }

    setResult(pipelineResult);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <section id="document-upload" className="max-w-4xl mx-auto px-4 py-8 text-center">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-1 font-naskh text-amber-900">
            ڈاکومنٹ پائپ لائن / Document Pipeline
          </h2>
          <p className="text-xs md:text-sm text-gray-600" dir="ltr">
            Upload .txt or .docx files for automated extraction, Unicode normalization, and quality audit.
          </p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl p-6 mb-6 bg-amber-50/30 transition-all flex flex-col items-center justify-center cursor-pointer"
        >
          <input
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
            <span className="text-sm font-semibold text-amber-900 mb-1">
              اپنی دستاویز یہاں ڈراپ کریں یا منتخب کریں
            </span>
            <span className="text-xs text-gray-500" dir="ltr">
              Drop your document here or click to browse (.txt, .docx up to 5MB)
            </span>
          </label>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mb-3"></div>
            <p className="text-xs font-bold text-amber-900 mb-1">پراسیسنگ جاری ہے...</p>
            <p className="text-[11px] text-amber-700 font-mono" dir="ltr">{stepMessage}</p>
          </div>
        )}

        {result && result.summary && (
          <div className="text-left" dir="ltr">
            <div className="flex border-b border-amber-200 mb-4">
              <button
                onClick={() => setActiveTab("report")}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === "report"
                    ? "border-amber-700 text-amber-900 bg-amber-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Unified Qalam Report
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === "preview"
                    ? "border-amber-700 text-amber-900 bg-amber-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Extracted Text Preview
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
                  <span className="font-bold block text-sm text-green-800 mb-2">Corrections Applied (Standardizer v1.0)</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-green-900">
                    <div>• Total: {result.summary.correctionsApplied.totalCorrections}</div>
                    <div>• Normalizations: {result.summary.correctionsApplied.arabicNormalizations}</div>
                    <div>• Spacing Fixes: {result.summary.correctionsApplied.spacingFixes}</div>
                    <div>• Punctuation Fixes: {result.summary.correctionsApplied.punctuationFixes}</div>
                  </div>
                </div>

                <div>
                  <span className="font-bold block text-sm text-amber-900 mb-2">Remaining Quality Issues (Audit v0.1)</span>
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
                <div className="bg-gray-50 border border-gray-300 p-4 rounded-xl text-xs font-mono text-gray-800 max-h-[300px] overflow-y-auto text-right" dir="rtl">
                  {result.cleanedText}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => result.cleanedText && downloadCleanedText(result.cleanedText, result.summary!.fileName)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-md transition-all text-xs flex items-center gap-2"
                dir="ltr"
              >
                <span>Download Cleaned File (.txt)</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Link to full tool */}
        <div className="mt-4 text-center" dir="ltr">
          <a
            href="/tools/document-cleaner"
            className="text-xs md:text-sm font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Open full Document Cleaner tool →
          </a>
        </div>
      </div>
    </section>
  );
}
