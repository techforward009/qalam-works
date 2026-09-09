"use client";

import { WordRuler } from "./WordRuler";
import { PublishingPresetSelector } from "./PublishingPresetSelector";
import {
  FONT_SIZE_OPTIONS_PT,
  LINE_HEIGHT_OPTIONS,
  type DocumentStudioSettings,
} from "../utils/documentSettings";
import {
  MARGIN_MIN_MM,
  MARGIN_MAX_MM,
  clampMarginMm,
  type ResolvedPageLayout,
} from "../utils/pageLayout";
import type { PresetId } from "../utils/publishingPresets";
import type { DocumentViewMode } from "../utils/documentView";

export default function DocumentSettingsPanel({
  dir,
  isUr,
  pageLayout,
  documentSettings,
  setDocumentSettings,
  selectedPresetId,
  onPresetChange,
  onPageChange,
  viewMode = "pages",
}: {
  dir: "rtl" | "ltr";
  isUr: boolean;
  pageLayout: ResolvedPageLayout;
  documentSettings: DocumentStudioSettings;
  setDocumentSettings: React.Dispatch<React.SetStateAction<DocumentStudioSettings>>;
  selectedPresetId: PresetId;
  onPresetChange: (id: PresetId) => void;
  onPageChange: () => void;
  viewMode?: DocumentViewMode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[#1A3A2A]/10 bg-white p-3">
      <WordRuler dir={dir} layout={pageLayout} />
      <div>
        <h3 className="text-sm font-semibold text-[#1A3A2A] mb-2">Document Style</h3>
        <PublishingPresetSelector selectedId={selectedPresetId} onChange={onPresetChange} isUr={isUr} />
      </div>
      {viewMode === "pageless" && (
        <p className={`text-[11px] leading-snug text-slate-500 ${isUr ? "font-naskh" : ""}`}>
          {isUr
            ? "یہ صفحہ ترتیبات صفحات والے منظر اور ایکسپورٹ پر لاگو رہتی ہیں۔"
            : "These page settings still apply to Pages view and to export."}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-600">
          Page size
          <select
            className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={documentSettings.page.size}
            onChange={(e) => {
              const size = e.target.value as "a4" | "a5" | "letter";
              setDocumentSettings((s) => ({ ...s, page: { ...s.page, size } }));
              onPageChange();
            }}
          >
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Orientation
          <select
            className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={documentSettings.page.orientation}
            onChange={(e) => {
              const orientation = e.target.value as "portrait" | "landscape";
              setDocumentSettings((s) => ({ ...s, page: { ...s.page, orientation } }));
              onPageChange();
            }}
          >
            <option value="portrait">{isUr ? "عمودی" : "Portrait"}</option>
            <option value="landscape">{isUr ? "افقی" : "Landscape"}</option>
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Margins
          <select
            className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={documentSettings.page.margins.preset}
            onChange={(e) => {
              const preset = e.target.value as "normal" | "narrow" | "wide" | "custom";
              setDocumentSettings((s) => ({
                ...s,
                page: { ...s.page, margins: { ...s.page.margins, preset } },
              }));
              onPageChange();
            }}
          >
            <option value="normal">{isUr ? "عام" : "Normal"}</option>
            <option value="narrow">{isUr ? "تنگ" : "Narrow"}</option>
            <option value="wide">{isUr ? "چوڑا" : "Wide"}</option>
            <option value="custom">{isUr ? "خصوصی" : "Custom"}</option>
          </select>
        </label>
        {documentSettings.page.margins.preset === "custom" && (
          <div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["topMm", "bottomMm", "startMm", "endMm"] as const).map((key) => (
              <label key={key} className="text-xs font-medium text-gray-600">
                {isUr ? (key === "topMm" ? "اوپر" : key === "bottomMm" ? "نیچے" : key === "startMm" ? "آغاز" : "اختتام") : (key === "topMm" ? "Top" : key === "bottomMm" ? "Bottom" : key === "startMm" ? "Start" : "End")} (mm)
                <input
                  type="number"
                  min={MARGIN_MIN_MM}
                  max={MARGIN_MAX_MM}
                  className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                  value={documentSettings.page.margins[key]}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    const value = clampMarginMm(raw);
                    setDocumentSettings((s) => ({
                      ...s,
                      page: { ...s.page, margins: { ...s.page.margins, [key]: value } },
                    }));
                    onPageChange();
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <label className="text-xs font-medium text-gray-600">
          Body size (pt)
          <select
            className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={documentSettings.typography.bodyFontSizePt}
            onChange={(e) => {
              const bodyFontSizePt = Number(e.target.value);
              setDocumentSettings((s) => ({
                ...s,
                typography: { ...s.typography, bodyFontSizePt },
              }));
            }}
          >
            {FONT_SIZE_OPTIONS_PT.map((pt) => (
              <option key={pt} value={pt}>
                {pt} pt
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Default line spacing
          <select
            className="mt-1 w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={documentSettings.typography.lineHeight}
            onChange={(e) => {
              const lineHeight = Number(e.target.value);
              setDocumentSettings((s) => ({
                ...s,
                typography: { ...s.typography, lineHeight },
              }));
            }}
          >
            {LINE_HEIGHT_OPTIONS.map((lh) => (
              <option key={lh} value={lh}>
                {lh}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={documentSettings.headerFooter.headerEnabled}
              onChange={(e) => {
                setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, headerEnabled: e.target.checked } }));
                onPageChange();
              }}
            />
            {isUr ? "ہیڈر" : "Header"}
          </label>
          {documentSettings.headerFooter.headerEnabled && (
            <>
              <select
                className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-xs"
                value={documentSettings.headerFooter.headerMode}
                onChange={(e) => {
                  setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, headerMode: e.target.value as "auto-title" | "custom" } }));
                  onPageChange();
                }}
              >
                <option value="auto-title">{isUr ? "خودکار عنوان" : "Auto title"}</option>
                <option value="custom">{isUr ? "حسب ضرورت" : "Custom"}</option>
              </select>
              {documentSettings.headerFooter.headerMode === "custom" && (
                <input
                  type="text"
                  maxLength={120}
                  placeholder={isUr ? "ہیڈر متن…" : "Header text…"}
                  className="w-full h-9 rounded-md border border-gray-200 px-2 text-xs"
                  value={documentSettings.headerFooter.headerText}
                  onChange={(e) => {
                    setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, headerText: e.target.value } }));
                    onPageChange();
                  }}
                />
              )}
            </>
          )}
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={documentSettings.headerFooter.footerEnabled}
              onChange={(e) => {
                setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, footerEnabled: e.target.checked } }));
                onPageChange();
              }}
            />
            {isUr ? "فوٹر" : "Footer"}
          </label>
          {documentSettings.headerFooter.footerEnabled && (
            <>
              <input
                type="text"
                maxLength={120}
                placeholder={isUr ? "فوٹر متن…" : "Footer text…"}
                className="w-full h-9 rounded-md border border-gray-200 px-2 text-xs"
                value={documentSettings.headerFooter.footerText}
                onChange={(e) => {
                  setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, footerText: e.target.value } }));
                  onPageChange();
                }}
              />
              <select
                className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-xs"
                value={documentSettings.headerFooter.pageNumbers}
                onChange={(e) => {
                  const pageNumbers = e.target.value as "none" | "current" | "current-total";
                  setDocumentSettings((s) => ({ ...s, headerFooter: { ...s.headerFooter, pageNumbers } }));
                  onPageChange();
                }}
              >
                <option value="none">{isUr ? "صفحہ نمبر نہیں" : "No page numbers"}</option>
                <option value="current">{isUr ? "موجودہ صفحہ" : "Current page"}</option>
                <option value="current-total">{isUr ? "موجودہ / کل" : "Current / Total"}</option>
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
