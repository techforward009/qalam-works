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

interface ExportPanelProps {
  project: TranslationProject;
  onImportProject?: (updated: TranslationProject) => void;
}

export default function ExportPanel({ project, onImportProject }: ExportPanelProps) {
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
    if (isEmpty) { showFeedback("Nothing to copy — no translated segments."); return; }
    try {
      await navigator.clipboard.writeText(text);
      showFeedback(
        hasUntranslated
          ? `Translation copied (${model.untranslatedSegments} segment${model.untranslatedSegments === 1 ? "" : "s"} untranslated)`
          : "Translation copied"
      );
    } catch {
      showFeedback("Copy failed — please try again.");
    }
  };

  const handleDownloadTxt = () => {
    if (isEmpty) { showFeedback("Nothing to export — no translated segments."); return; }
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilenameBase(project.name)}-translation.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (hasUntranslated) {
      showFeedback(`Downloaded — ${model.untranslatedSegments} segment${model.untranslatedSegments === 1 ? "" : "s"} untranslated.`);
    }
  };

  const handleDownloadDocx = async () => {
    if (isEmpty) { showFeedback("Nothing to export — no translated segments."); return; }
    try {
      const blob = await buildDocxFromExportModel(model);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilenameBase(project.name)}-translation.docx`;
      a.click();
      URL.revokeObjectURL(url);
      if (hasUntranslated) {
        showFeedback(`Downloaded — ${model.untranslatedSegments} segment${model.untranslatedSegments === 1 ? "" : "s"} untranslated.`);
      }
    } catch {
      showFeedback("DOCX export failed — please try again.");
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
        showFeedback("Import failed — invalid or unsupported backup file.");
      } else {
        onImportProject?.(result.value);
        showFeedback("Project imported successfully.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const btnCls = "h-9 px-4 rounded-md border text-xs font-medium transition-colors";
  const primaryCls = `${btnCls} bg-[#1A3A2A] text-white border-[#1A3A2A] hover:bg-[#12172A]`;
  const secondaryCls = `${btnCls} bg-white text-[#1A3A2A] border-[#1A3A2A]/20 hover:bg-[#F3F7F2]`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleCopy} disabled={isEmpty} className={`${primaryCls} disabled:opacity-40`}>
        Copy translation
      </button>
      <button type="button" onClick={handleDownloadTxt} disabled={isEmpty} className={`${secondaryCls} disabled:opacity-40`}>
        Download TXT
      </button>
      <button type="button" onClick={handleDownloadDocx} disabled={isEmpty} className={`${secondaryCls} disabled:opacity-40`}>
        Download DOCX
      </button>
      {feedback && (
        <span className="text-xs text-gray-600 ml-1">{feedback}</span>
      )}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
      <div className="w-full flex flex-wrap gap-2 mt-1 border-t border-gray-100 pt-2">
        <button type="button" onClick={handleDownloadBackup} className={secondaryCls}>
          Download project backup
        </button>
        {onImportProject && (
          <button type="button" onClick={() => fileRef.current?.click()} className={secondaryCls}>
            Import project backup
          </button>
        )}
      </div>
    </div>
  );
}
