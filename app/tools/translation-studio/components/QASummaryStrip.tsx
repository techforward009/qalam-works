"use client";
import React, { useState } from "react";
import type { QASummary } from "../utils/translationQA";

interface QASummaryStripProps {
  summary: QASummary;
  sourceLanguage: string;
  targetLanguage: string;
  isUr?: boolean;
}

export default function QASummaryStrip({ summary, isUr }: QASummaryStripProps) {
  const [open, setOpen] = useState(false);
  const { total, critical, warning, info, untranslatedCount } = summary;

  const t = {
    heading: isUr ? "ترجمہ QA" : "Translation QA",
    check: isUr ? "جانچ" : "check",
    checks: isUr ? "جانچیں" : "checks",
    untranslated: isUr ? "غیر ترجمہ شدہ" : "untranslated",
    noChecks: isUr
      ? `کوئی یقینی مسئلہ نہیں · ${untranslatedCount} ${untranslatedCount === 1 ? "سیگمنٹ" : "سیگمنٹ"} غیر ترجمہ شدہ`
      : `No deterministic checks · ${untranslatedCount} untranslated`,
    someChecks: isUr
      ? `${total} ${total === 1 ? "جانچ" : "جانچیں"} · ${untranslatedCount} غیر ترجمہ شدہ`
      : `${total} ${total === 1 ? "check" : "checks"} · ${untranslatedCount} untranslated`,
    critical: isUr ? "شدید" : "Critical",
    warnings: isUr ? "انتباہ" : "Warnings",
    info: isUr ? "معلومات" : "Info",
    noIssues: isUr
      ? "کوئی یقینی مسئلہ نہیں۔ ترجمے کی درستگی کے لیے انسانی نظرثانی ضروری ہے۔"
      : "No deterministic issues detected. Human review is still required for translation accuracy.",
    untranslatedSegs: isUr
      ? `غیر ترجمہ شدہ سیگمنٹ: ${untranslatedCount}`
      : `Untranslated segments: ${untranslatedCount}`,
  };

  const headerLabel = total === 0 ? t.noChecks : t.someChecks;

  return (
    <div className="border border-gray-200 rounded-lg bg-white mb-3">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left">
        <span className="font-semibold text-gray-700">{t.heading}</span>
        <span className="text-xs text-gray-500 ml-2 flex-1">{headerLabel}</span>
        <span className="text-gray-400 text-xs ml-2">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600 space-y-0.5">
          {critical > 0 && <p className="text-red-700 font-medium">{t.critical}: {critical}</p>}
          {warning > 0 && <p className="text-amber-700">{t.warnings}: {warning}</p>}
          {info > 0 && <p className="text-blue-700">{t.info}: {info}</p>}
          {total === 0 && <p className="text-gray-400">{t.noIssues}</p>}
          <p className="text-gray-400 pt-1">{t.untranslatedSegs}</p>
        </div>
      )}
    </div>
  );
}
