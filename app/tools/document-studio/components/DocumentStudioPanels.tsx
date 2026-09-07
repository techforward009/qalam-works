"use client";

import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";
import { trackEvent } from "../../../lib/analytics";
import { FindReplacePanel } from "./FindReplacePanel";
import { DocumentOutlinePanel } from "./DocumentOutlinePanel";
import { GlossaryPanel } from "./GlossaryPanel";
import { QualityAuditPanel } from "./QualityAuditPanel";
import { DocumentStatsBar } from "./DocumentStatsBar";
import { SuggestionsPanel } from "./SuggestionsPanel";
import DocumentSettingsPanel from "./DocumentSettingsPanel";
import type { OutlineEntry } from "../utils/documentOutline";
import type { GlossaryEntry } from "../utils/glossary";
import type { QualityAuditReport } from "../utils/buildDocumentAuditReport";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentHealthReport } from "../utils/buildDocumentHealthReport";
import type { DocumentSuggestion } from "../utils/generateDocumentSuggestions";
import type { SuggestionReviewState } from "../utils/suggestionReview";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import type { ResolvedPageLayout } from "../utils/pageLayout";
import type { PresetId } from "../utils/publishingPresets";

export type StudioTab = "none" | "find" | "outline" | "quality" | "glossary" | "settings";

export default function DocumentStudioPanels({
  isUr,
  dir,
  activeTab,
  onToggleTab,
  setActiveTab,
  glossaryCount,
  auditReport,
  isAuditStale,
  find,
  outline,
  quality,
  glossary,
  settings,
}: {
  isUr: boolean;
  dir: "rtl" | "ltr";
  activeTab: StudioTab;
  onToggleTab: (tab: Exclude<StudioTab, "none">) => void;
  setActiveTab: (tab: StudioTab) => void;
  glossaryCount: number;
  auditReport: QualityAuditReport | null;
  isAuditStale: boolean;
  find: {
    query: string;
    replaceQuery: string;
    matchCount: number;
    currentMatchIndex: number;
    onSearchChange: (value: string) => void;
    onReplaceChange: (value: string) => void;
    onNext: () => void;
    onPrevious: () => void;
    onReplaceCurrent: () => void;
    onReplaceAll: () => void;
    onClose: () => void;
  };
  outline: {
    entries: OutlineEntry[];
    onNavigate: (blockIndex: number) => void;
  };
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
  const TAB_LABELS: Record<Exclude<StudioTab, "none">, string> = isUr
    ? {
        find: "🔍 تلاش اور تبدیلی",
        outline: "📑 خاکہ",
        quality: "✓ معیار اور تجاویز",
        glossary: `📖 اصطلاحات${glossaryCount > 0 ? ` (${glossaryCount})` : ""}`,
        settings: "⚙️ ترتیبات",
      }
    : {
        find: "🔍 Find & Replace",
        outline: "📑 Outline",
        quality: "✓ Quality & Suggestions",
        glossary: `📖 Glossary${glossaryCount > 0 ? ` (${glossaryCount})` : ""}`,
        settings: "⚙️ Settings",
      };

  const TAB_DEFINITIONS: { id: Exclude<StudioTab, "none">; label: string }[] = [
    { id: "find", label: TAB_LABELS.find },
    { id: "outline", label: TAB_LABELS.outline },
    { id: "quality", label: TAB_LABELS.quality },
    { id: "glossary", label: TAB_LABELS.glossary },
    { id: "settings", label: TAB_LABELS.settings },
  ];

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mt-5 bg-[#D8EBDC] rounded-xl border border-[#1A3A2A]/20 shadow-md p-3" dir={isUr ? "rtl" : "ltr"}>
        {TAB_DEFINITIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onToggleTab(tab.id)}
            className={`h-10 px-5 rounded-lg text-[15px] font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-[#1A3A2A] text-white shadow-sm"
                : "bg-white/80 text-[#1A3A2A]/80 border border-[#1A3A2A]/10 hover:bg-white hover:text-[#1A3A2A] hover:border-[#1A3A2A]/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {auditReport && (
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "quality" ? "none" : "quality")}
            title={isAuditStale ? (isUr ? "کوالٹی اسکور پرانا ہو سکتا ہے — دوبارہ آڈٹ چلائیں" : "Quality score may be outdated — re-run Quality audit") : (isUr ? "کوالٹی اسکور" : "Quality score")}
            className="h-10 px-4 rounded-lg text-xs font-semibold border border-[#1A3A2A]/20 bg-white/80 text-[#1A3A2A] hover:bg-white tabular-nums"
          >
            {isAuditStale ? "~" : ""}
            {auditReport.score}
            {auditReport.totalIssues > 0 ? ` · ${auditReport.totalIssues} ⚠` : " ✓"}
          </button>
        )}
      </div>

      {activeTab === "find" && (
        <div className="mt-3">
          <FindReplacePanel
            isOpen={true}
            searchQuery={find.query}
            replaceQuery={find.replaceQuery}
            matchCount={find.matchCount}
            currentMatchIndex={find.currentMatchIndex}
            onSearchChange={find.onSearchChange}
            onReplaceChange={find.onReplaceChange}
            onNext={find.onNext}
            onPrevious={find.onPrevious}
            onReplaceCurrent={find.onReplaceCurrent}
            onReplaceAll={find.onReplaceAll}
            onClose={find.onClose}
            isUr={isUr}
          />
        </div>
      )}

      {activeTab === "outline" && (
        <div className="mt-3">
          <DocumentOutlinePanel outline={outline.entries} onNavigate={outline.onNavigate} isUr={isUr} />
        </div>
      )}

      {activeTab === "settings" && (
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
      )}

      {activeTab === "glossary" && (
        <div className="mt-3">
          <GlossaryPanel
            entries={glossary.entries}
            onAdd={glossary.onAdd}
            onUpdate={glossary.onUpdate}
            onDelete={glossary.onDelete}
            onExport={glossary.onExport}
            onImport={glossary.onImport}
            isUr={isUr}
          />
        </div>
      )}

      {activeTab === "quality" && (
        <div className="bg-white p-6 rounded-2xl border border-[#1A3A2A]/10 shadow-[0_2px_20px_rgba(26,58,42,0.06)] mt-3" dir="rtl">
          <div className="mb-4">
            <DocumentStatsBar stats={quality.stats} health={quality.health} isUr={isUr} />
          </div>

          <h2 className="text-sm font-bold text-amber-800 mb-3">قلم ٹولز / Qalam Tools</h2>

          <div className="mb-4" dir="ltr">
            <label htmlFor="studio-proc-lang" className="block text-xs font-semibold text-gray-700 mb-1">
              {isUr ? "متن کی زبان" : "Text language"}
            </label>
            <select
              id="studio-proc-lang"
              value={quality.processingLanguage}
              onChange={(e) => {
                const next = e.target.value as ProcessingLanguage;
                quality.setProcessingLanguage(next);
                trackEvent("tool_mode_change", { tool: "document_studio", mode: next });
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

          <div className="mt-4">
            <QualityAuditPanel report={auditReport} isStale={isAuditStale} isUr={isUr} />
          </div>

          <div className="mt-4">
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
        </div>
      )}
    </>
  );
}
