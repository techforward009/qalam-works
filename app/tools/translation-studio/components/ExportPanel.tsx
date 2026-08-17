"use client";
import React, { useState } from "react";
import type { TranslationProject } from "../utils/translationTypes";
import {
  buildTranslationExportModel,
  serializeExportModelToText,
  sanitizeFilenameBase,
} from "../utils/translationExport";

interface ExportPanelProps {
  project: TranslationProject;
}

export default function ExportPanel({ project }: ExportPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

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
      {feedback && (
        <span className="text-xs text-gray-600 ml-1">{feedback}</span>
      )}
    </div>
  );
}
