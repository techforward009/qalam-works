"use client";
import React, { useState, useRef } from "react";
import type { TranslationProject } from "../utils/translationTypes";
import {
  buildTranslationExportModel,
  serializeExportModelToText,
  sanitizeFilenameBase,
  buildDocxFromExportModel,
} from "../utils/translationExport";
import { exportProjectBackup, importProjectBackup } from "../utils/projectStore";
import {
  buildHandoff,
  writeHandoff,
} from "../utils/translationHandoff";

interface ExportPanelProps {
  project: TranslationProject;
  onImportProject?: (updated: TranslationProject) => void;
  isUr?: boolean;
}

export default function ExportPanel({ project, onImportProject, isUr }: ExportPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const model = buildTranslationExportModel(project);
  const text = serializeExportModelToText(model);
  const isEmpty = model.translatedSegments === 0;
  const hasUntranslated = model.untranslatedSegments > 0;

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }

  const handleCopy = async () => {
    if (isEmpty) { showFeedback(isUr ? "کاپی کے لیے کوئی ترجمہ موجود نہیں۔" : "Nothing to copy — no translated segments."); return; }
    try {
      await navigator.clipboard.writeText(text);
      showFeedback(
        hasUntranslated
          ? isUr ? `ترجمہ کاپی ہو گیا (${model.untranslatedSegments} سیگمنٹ غیر ترجمہ شدہ)` : `Translation copied (${model.untranslatedSegments} segment${model.untranslatedSegments === 1 ? "" : "s"} untranslated)`
          : isUr ? "ترجمہ کاپی ہو گیا" : "Translation copied"
      );
    } catch {
      showFeedback(isUr ? "کاپی ناکام — دوبارہ کوشش کریں۔" : "Copy failed — please try again.");
    }
  };

  const handleDownloadTxt = () => {
    if (isEmpty) { showFeedback(isUr ? "ایکسپورٹ کے لیے کوئی ترجمہ موجود نہیں۔" : "Nothing to export — no translated segments."); return; }
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilenameBase(project.name)}-translation.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (hasUntranslated) {
      showFeedback(isUr ? `ڈاؤن لوڈ ہو گیا — ${model.untranslatedSegments} سیگمنٹ غیر ترجمہ شدہ۔` : `Downloaded — ${model.untranslatedSegments} segment${model.untranslatedSegments === 1 ? "" : "s"} untranslated.`);
    }
  };

  const handleDownloadDocx = async () => {
    if (isEmpty) { showFeedback(isUr ? "ایکسپورٹ کے لیے کوئی ترجمہ موجود نہیں۔" : "Nothing to export — no translated segments."); return; }
    try {
      const blob = await buildDocxFromExportModel(model);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilenameBase(project.name)}-translation.docx`;
      a.click();
      URL.revokeObjectURL(url);
      if (hasUntranslated) {
        showFeedback(isUr ? `ڈاؤن لوڈ ہو گیا — ${model.untranslatedSegments} سیگمنٹ غیر ترجمہ شدہ۔` : `Downloaded — ${model.untranslatedSegments} segment${model.untranslatedSegments === 1 ? "" : "s"} untranslated.`);
      }
    } catch {
      showFeedback(isUr ? "DOCX ایکسپورٹ ناکام — دوبارہ کوشش کریں۔" : "DOCX export failed — please try again.");
    }
  };

  const handleDownloadBackup = () => {
    const json = exportProjectBackup(project);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilenameBase(project.name)}.qalam-translation.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      const result = importProjectBackup(json);
      if (!result.ok) {
        showFeedback(isUr ? "درآمد ناکام — غلط یا غیر معاون بیک اپ فائل۔" : "Import failed — invalid or unsupported backup file.");
      } else {
        onImportProject?.(result.value);
        showFeedback(isUr ? "پروجیکٹ کامیابی سے درآمد ہو گیا۔" : "Project imported successfully.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleContinueInDocumentStudio = () => {
    if (isEmpty) { showFeedback(isUr ? "کھولنے کے لیے کوئی ترجمہ موجود نہیں۔" : "Nothing to open — no translated segments."); return; }
    const handoff = buildHandoff(model);
    const ok = writeHandoff(handoff);
    if (!ok) { showFeedback(isUr ? "ڈاکومنٹ اسٹوڈیو نہیں کھل سکا — دوبارہ کوشش کریں۔" : "Could not open Document Studio — please try again."); return; }
    window.location.href = "/tools/document-studio";
  };

  const btnCls = "h-9 px-4 rounded-md border text-xs font-medium transition-colors";
  const primaryCls = `${btnCls} bg-[#1A3A2A] text-white border-[#1A3A2A] hover:bg-[#12172A]`;
  const secondaryCls = `${btnCls} bg-white text-[#1A3A2A] border-[#1A3A2A]/20 hover:bg-[#F3F7F2]`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button type="button" data-testid="export-copy" onClick={handleCopy} disabled={isEmpty} className={`${primaryCls} disabled:opacity-40`}>
        {isUr ? "ترجمہ کاپی کریں" : "Copy translation"}
      </button>
      <button type="button" data-testid="export-txt" onClick={handleDownloadTxt} disabled={isEmpty} className={`${secondaryCls} disabled:opacity-40`}>
        {isUr ? "TXT ڈاؤن لوڈ کریں" : "Download TXT"}
      </button>
      <button type="button" data-testid="export-docx" onClick={handleDownloadDocx} disabled={isEmpty} className={`${secondaryCls} disabled:opacity-40`}>
        {isUr ? "DOCX ڈاؤن لوڈ کریں" : "Download DOCX"}
      </button>
      <button type="button" data-testid="export-handoff" onClick={handleContinueInDocumentStudio} disabled={isEmpty} className={`${secondaryCls} disabled:opacity-40`}>
        {isUr ? "ڈاکومنٹ اسٹوڈیو میں جاری رکھیں ←" : "Continue in Document Studio →"}
      </button>
      {feedback && (
        <span className="text-xs text-gray-600 ml-1">{feedback}</span>
      )}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
      <div className="w-full flex flex-wrap gap-2 mt-1 border-t border-gray-100 pt-2">
        <button type="button" data-testid="export-backup" onClick={handleDownloadBackup} className={secondaryCls}>
          {isUr ? "پروجیکٹ بیک اپ ڈاؤن لوڈ کریں" : "Download project backup"}
        </button>
        {onImportProject && (
          <button type="button" data-testid="export-import" onClick={() => fileRef.current?.click()} className={secondaryCls}>
            {isUr ? "پروجیکٹ بیک اپ درآمد کریں" : "Import project backup"}
          </button>
        )}
      </div>
    </div>
  );
}
