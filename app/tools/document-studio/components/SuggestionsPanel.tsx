import React, { useMemo, useState } from "react";
import type { DocumentSuggestion, SuggestionCategory, SuggestionSeverity } from "../utils/generateDocumentSuggestions";
import { localizedSuggestionExplanation } from "../utils/generateDocumentSuggestions";
import { suggestionKey } from "../utils/suggestionReview";

interface SuggestionsPanelProps {
  pending: DocumentSuggestion[];
  accepted: DocumentSuggestion[];
  ignored: DocumentSuggestion[];
  onAccept: (key: string) => void;
  onIgnore: (key: string) => void;
  onApplyAccepted: () => void;
  onAcceptCategory: (category: SuggestionCategory) => void;
  onIgnoreCategory: (category: SuggestionCategory) => void;
  isUr?: boolean;
}

const CATEGORY_LABEL_EN: Record<SuggestionCategory, string> = {
  unicode: "Unicode",
  typography: "Typography",
  numeral: "Numerals",
  punctuation: "Punctuation",
  spacing: "Spacing",
  structure: "Structure",
  terminology: "Terminology",
};

const CATEGORY_LABEL_UR: Record<SuggestionCategory, string> = {
  unicode: "یونیکوڈ",
  typography: "ٹائپوگرافی",
  numeral: "ہندسے",
  punctuation: "رموزِ اوقاف",
  spacing: "خالی جگہ",
  structure: "ساخت",
  terminology: "اصطلاحات",
};

const ALL_CATEGORIES: SuggestionCategory[] = [
  "unicode",
  "typography",
  "numeral",
  "punctuation",
  "spacing",
  "structure",
  "terminology",
];

const SEVERITY_LABEL_EN: Record<SuggestionSeverity, string> = {
  high: "Error",
  medium: "Warning",
  low: "Suggestion",
};

const SEVERITY_LABEL_UR: Record<SuggestionSeverity, string> = {
  high: "خرابی",
  medium: "تنبیہ",
  low: "تجویز",
};

const SEVERITY_STYLE: Record<SuggestionSeverity, string> = {
  high: "bg-red-50 border-red-300 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-800",
  low: "bg-slate-50 border-slate-200 text-slate-600",
};

const SEVERITY_ORDER: SuggestionSeverity[] = ["high", "medium", "low"];

function categoryLabel(cat: SuggestionCategory, isUr: boolean): string {
  return isUr ? CATEGORY_LABEL_UR[cat] : CATEGORY_LABEL_EN[cat];
}

function severityLabel(sev: SuggestionSeverity, isUr: boolean): string {
  return isUr ? SEVERITY_LABEL_UR[sev] : SEVERITY_LABEL_EN[sev];
}

function groupByCategory(list: DocumentSuggestion[]): Record<SuggestionCategory, DocumentSuggestion[]> {
  const base: Record<SuggestionCategory, DocumentSuggestion[]> = {
    unicode: [],
    typography: [],
    numeral: [],
    punctuation: [],
    spacing: [],
    structure: [],
    terminology: [],
  };
  return list.reduce((acc, s) => {
    acc[s.category].push(s);
    return acc;
  }, base);
}

/**
 * Document Intelligence — Suggestion Review Workflow. Shows PENDING
 * suggestions with surrounding context, Error/Warning/Suggestion
 * severity, category badges + filtering, per-suggestion Accept/Ignore,
 * and safe per-category batch actions. Chrome follows site language.
 */
export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  pending,
  accepted,
  ignored,
  onAccept,
  onIgnore,
  onApplyAccepted,
  onAcceptCategory,
  onIgnoreCategory,
  isUr = false,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<SuggestionSeverity | "all">("all");
  const dir = isUr ? "rtl" : "ltr";
  const naskh = isUr ? "font-naskh" : "";

  const total = pending.length + accepted.length + ignored.length;

  const filteredPending = useMemo(() => {
    return pending.filter(
      (s) => (categoryFilter === "all" || s.category === categoryFilter) && (severityFilter === "all" || s.severity === severityFilter)
    );
  }, [pending, categoryFilter, severityFilter]);

  if (total === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-3 text-xs text-emerald-700 ${naskh}`} dir={dir} data-studio-suggestions="true">
        {isUr ? "✓ فی الحال کوئی تجویز موجود نہیں — متن صاف نظر آتا ہے۔" : "✓ No suggestions right now — the text looks clean."}
      </div>
    );
  }

  const grouped = groupByCategory(filteredPending);
  const categoriesPresent = ALL_CATEGORIES.filter((c) => pending.some((s) => s.category === c));

  return (
    <div className={`min-w-0 space-y-3 overflow-x-hidden rounded-xl border border-slate-200 bg-white p-3 ${naskh}`} dir={dir} data-studio-suggestions="true">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-800">{isUr ? "تجاویز" : "Suggestions"}</h3>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
            {isUr ? "زیرِ جائزہ" : "Pending"}: {pending.length}
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            {isUr ? "منظور شدہ" : "Accepted"}: {accepted.length}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
            {isUr ? "نظرانداز" : "Ignored"}: {ignored.length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
            categoryFilter === "all" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-600"
          }`}
        >
          {isUr ? "سب" : "All"}
        </button>
        {categoriesPresent.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              categoryFilter === cat ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {categoryLabel(cat, isUr)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSeverityFilter("all")}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
            severityFilter === "all" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-600"
          }`}
        >
          {isUr ? "تمام سنگینیاں" : "All severities"}
        </button>
        {SEVERITY_ORDER.map((sev) => (
          <button
            key={sev}
            type="button"
            onClick={() => setSeverityFilter(sev)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              severityFilter === sev ? "border-slate-700 bg-slate-700 text-white" : SEVERITY_STYLE[sev]
            }`}
          >
            {severityLabel(sev, isUr)}
          </button>
        ))}
      </div>

      {filteredPending.length === 0 ? (
        <p className="text-xs text-slate-500">{isUr ? "اس فلٹر کے مطابق کوئی تجویز موجود نہیں۔" : "No suggestions match this filter."}</p>
      ) : (
        (Object.keys(grouped) as SuggestionCategory[])
          .filter((cat) => grouped[cat].length > 0)
          .map((cat) => (
            <div key={cat} className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="min-w-0 text-xs font-semibold text-slate-600">
                  {categoryLabel(cat, isUr)} ({grouped[cat].length})
                </h4>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAcceptCategory(cat)}
                    className="rounded border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    {isUr ? "سب منظور" : "Accept all"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onIgnoreCategory(cat)}
                    className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    {isUr ? "سب نظرانداز" : "Ignore all"}
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {grouped[cat].map((s) => {
                  const key = suggestionKey(s);
                  return (
                    <li key={key} className={`min-w-0 space-y-2 rounded-lg border p-3 text-xs ${SEVERITY_STYLE[s.severity]}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-current px-1.5 py-0.5 text-[10px] font-bold">
                          {severityLabel(s.severity, isUr)}
                        </span>
                        <span className="rounded border border-current bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold">
                          {categoryLabel(s.category, isUr)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 break-words leading-relaxed text-slate-700" dir="auto">
                        {s.contextBefore && <span className="text-slate-400">…{s.contextBefore}</span>}
                        <span className="rounded bg-red-50 px-1 line-through decoration-red-400">{s.originalText}</span>
                        <span aria-hidden="true">→</span>
                        <span className="rounded bg-emerald-50 px-1 font-semibold text-emerald-700">{s.suggestedText}</span>
                        {s.contextAfter && <span className="text-slate-400">{s.contextAfter}…</span>}
                      </div>

                      <p className="leading-relaxed break-words text-slate-500">{localizedSuggestionExplanation(s, isUr)}</p>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onAccept(key)}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          {isUr ? "منظور" : "Accept"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onIgnore(key)}
                          className="rounded-md border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {isUr ? "نظرانداز" : "Ignore"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
      )}

      {accepted.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onApplyAccepted}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            {isUr ? `منظور شدہ تجاویز لاگو کریں (${accepted.length})` : `Apply accepted (${accepted.length})`}
          </button>
          <span className="text-[11px] leading-snug text-slate-400">
            {isUr ? "صرف منظور شدہ آئٹمز لاگو ہوں گے — Ctrl+Z سے واپس لایا جا سکتا ہے" : "Only accepted items will be applied — use Ctrl+Z to undo"}
          </span>
        </div>
      )}
    </div>
  );
};
