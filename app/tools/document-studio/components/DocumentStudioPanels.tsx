"use client";

import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";
import { trackEvent } from "../../../lib/analytics";
import { GlossaryPanel } from "./GlossaryPanel";
import { QualityAuditPanel } from "./QualityAuditPanel";
import { DocumentStatsBar } from "./DocumentStatsBar";
import { SuggestionsPanel } from "./SuggestionsPanel";
import DocumentSettingsPanel from "./DocumentSettingsPanel";
import type { GlossaryEntry } from "../utils/glossary";
import type { QualityAuditReport } from "../utils/buildDocumentAuditReport";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentHealthReport } from "../utils/buildDocumentHealthReport";
import type { DocumentSuggestion } from "../utils/generateDocumentSuggestions";
import type { SuggestionReviewState } from "../utils/suggestionReview";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import type { ResolvedPageLayout } from "../utils/pageLayout";
import type { PresetId } from "../utils/publishingPresets";
import type { RightPanelId } from "../utils/documentShell";

/** @deprecated Phase 0 tab id — kept so older imports type-check. */
export type StudioTab = "none" | "find" | "outline" | "quality" | "glossary" | "settings";

export default function DocumentStudioPanels({
  isUr,
  dir,
  panel,
  glossaryCount: _glossaryCount,
  auditReport,
  isAuditStale,
  quality,
  glossary,
  settings,
}: {
  isUr: boolean;
  dir: "rtl" | "ltr";
  panel: Exclude<RightPanelId, "none">;
  glossaryCount: number;
  auditReport: QualityAuditReport | null;
  isAuditStale: boolean;
  quality: {
    stats: DocumentStats | null;
    health: DocumentHealthReport | null;
    processingLanguage: ProcessingLanguage;
    setProcessingLanguage: (lang: ProcessingLanguage) => void;
    lastResolved: ResolvedLanguage | null;
    reviewState: SuggestionReviewState;
    onAccept: (key: string) => void;
    onIgnore: (key: string) => void;
    onApplyAccepted: () => void;
    onAcceptCategory: (category: DocumentSuggestion["category"]) => void;
    onIgnoreCategory: (category: DocumentSuggestion["category"]) => void;
  };
  glossary: {
    entries: GlossaryEntry[];
    onAdd: (incorrectTerm: string, correctTerm: string, note: string) => string | null;
    onUpdate: (id: string, incorrectTerm: string, correctTerm: string, note: string) => string | null;
    onDelete: (id: string) => void;
    onExport: () => void;
    onImport: (jsonText: string) => string | null;
  };
  settings: {
    pageLayout: ResolvedPageLayout;
    documentSettings: DocumentStudioSettings;
    setDocumentSettings: React.Dispatch<React.SetStateAction<DocumentStudioSettings>>;
    selectedPresetId: PresetId;
    onPresetChange: (id: PresetId) => void;
    onPageChange: () => void;
  };
}) {
  if (panel === "settings") {
    return (
      <DocumentSettingsPanel
        dir={dir}
        isUr={isUr}
        pageLayout={settings.pageLayout}
        documentSettings={settings.documentSettings}
        setDocumentSettings={settings.setDocumentSettings}
        selectedPresetId={settings.selectedPresetId}
        onPresetChange={settings.onPresetChange}
        onPageChange={settings.onPageChange}
      />
    );
  }

  if (panel === "glossary") {
    return (
      <GlossaryPanel
        entries={glossary.entries}
        onAdd={glossary.onAdd}
        onUpdate={glossary.onUpdate}
        onDelete={glossary.onDelete}
        onExport={glossary.onExport}
        onImport={glossary.onImport}
        isUr={isUr}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden" dir={isUr ? "rtl" : "ltr"}>
      <DocumentStatsBar stats={quality.stats} health={quality.health} isUr={isUr} />

      <div dir="ltr">
        <label htmlFor="studio-panel-proc-lang" className="block text-xs font-semibold text-gray-700 mb-1">
          {isUr ? "متن کی زبان" : "Text language"}
        </label>
        <select
          id="studio-panel-proc-lang"
          value={quality.processingLanguage}
          onChange={(e) => {
            const next = e.target.value as ProcessingLanguage;
            quality.setProcessingLanguage(next);
            trackEvent("tool_mode_change", { tool: "document_studio", mode: next });
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30"
        >
          <option value="auto">{isUr ? "آٹو" : "Auto"}</option>
          <option value="ur">{isUr ? "اردو" : "Urdu"}</option>
          <option value="en">{isUr ? "انگریزی" : "English"}</option>
          <option value="ar">{isUr ? "عربی" : "Arabic"}</option>
        </select>
        <p className="mt-1 text-[11px] text-gray-500 leading-snug">
          {isUr
            ? "آٹو غیر یقینی عربی رسم الخط پر صرف محفوظ صفائی کرتا ہے۔ مخصوص اصلاح کے لیے اردو یا عربی منتخب کریں۔"
            : "Auto safely detects English or uses non-destructive RTL cleanup when the script is uncertain. Choose Urdu or Arabic for language-specific normalization."}
        </p>
        {quality.lastResolved && (
          <p className="mt-2 text-xs font-medium text-gray-800">
            {quality.lastResolved === "ur"
              ? (isUr ? "عمل کی زبان: اردو" : "Processed as: Urdu")
              : quality.lastResolved === "en"
                ? (isUr ? "عمل کی زبان: انگریزی" : "Processed as: English")
                : quality.lastResolved === "ar"
                  ? (isUr ? "عمل کی زبان: عربی" : "Processed as: Arabic")
                  : (isUr ? "عمل کی نوعیت: محفوظ آر ٹی ایل" : "Processed as: Safe RTL")}
          </p>
        )}
        {quality.lastResolved === "rtl-neutral" && (
          <p className="mt-1 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
            {isUr
              ? "عربی رسم الخط کا متن پایا گیا — صرف محفوظ عمومی صفائی۔ مخصوص اصلاح کے لیے اردو یا عربی منتخب کریں۔"
              : "Arabic-script text detected — safe cleanup only. Choose Urdu or Arabic for language-specific processing."}
          </p>
        )}
      </div>

      <QualityAuditPanel report={auditReport} isStale={isAuditStale} isUr={isUr} />
      <SuggestionsPanel
        pending={quality.reviewState.pending}
        accepted={quality.reviewState.accepted}
        ignored={quality.reviewState.ignored}
        onAccept={quality.onAccept}
        onIgnore={quality.onIgnore}
        onApplyAccepted={quality.onApplyAccepted}
        onAcceptCategory={quality.onAcceptCategory}
        onIgnoreCategory={quality.onIgnoreCategory}
        isUr={isUr}
      />
    </div>
  );
}
