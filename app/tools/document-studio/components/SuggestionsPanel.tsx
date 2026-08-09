import React, { useMemo, useState } from "react";
import type { DocumentSuggestion, SuggestionCategory, SuggestionSeverity } from "../utils/generateDocumentSuggestions";
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
}

const CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  unicode: "یونیکوڈ (Unicode)",
  typography: "ٹائپوگرافی (Typography)",
  numeral: "ہندسے (Numerals)",
  punctuation: "رموزِ اوقاف (Punctuation)",
  spacing: "خالی جگہ (Spacing)",
  structure: "ساخت (Structure)",
};

const ALL_CATEGORIES: SuggestionCategory[] = ["unicode", "typography", "numeral", "punctuation", "spacing", "structure"];

// Severity Hierarchy (2026-08-09): clear Error/Warning/Suggestion
// labeling on top of the existing high/medium/low values — the
// underlying severity values are unchanged (still tested/relied on
// elsewhere), this is purely a clearer display layer.
const SEVERITY_LABEL: Record<SuggestionSeverity, string> = {
  high: "خرابی (Error)",
  medium: "تنبیہ (Warning)",
  low: "تجویز (Suggestion)",
};

const SEVERITY_STYLE: Record<SuggestionSeverity, string> = {
  high: "bg-red-50 border-red-300 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-800",
  low: "bg-slate-50 border-slate-200 text-slate-600",
};

const SEVERITY_ORDER: SuggestionSeverity[] = ["high", "medium", "low"];

function groupByCategory(list: DocumentSuggestion[]): Record<SuggestionCategory, DocumentSuggestion[]> {
  const base: Record<SuggestionCategory, DocumentSuggestion[]> = {
    unicode: [],
    typography: [],
    numeral: [],
    punctuation: [],
    spacing: [],
    structure: [],
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
 * and safe per-category batch actions (Accept/Ignore all PENDING items
 * in one category — never a global "Fix All", and never touches
 * accepted/ignored items). No text changes happen here at all — only
 * "Apply Accepted Suggestions" (separately, per suggestion) ever
 * modifies the document. Matches QualityAuditPanel.tsx's visual
 * language.
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
}) => {
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<SuggestionSeverity | "all">("all");

  const total = pending.length + accepted.length + ignored.length;

  const filteredPending = useMemo(() => {
    return pending.filter(
      (s) => (categoryFilter === "all" || s.category === categoryFilter) && (severityFilter === "all" || s.severity === severityFilter)
    );
  }, [pending, categoryFilter, severityFilter]);

  if (total === 0) {
    return (
      <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm text-right text-xs text-emerald-700" dir="rtl">
        ✓ فی الحال کوئی تجویز موجود نہیں — متن صاف نظر آتا ہے۔
      </div>
    );
  }

  const grouped = groupByCategory(filteredPending);
  const categoriesPresent = ALL_CATEGORIES.filter((c) => pending.some((s) => s.category === c));

  return (
    <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-4 text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex gap-2">
          <div className="px-3 py-1 rounded-full text-sm font-bold border border-slate-200 bg-slate-50 text-slate-700">
            زیرِ جائزہ: {pending.length}
          </div>
          <div className="px-3 py-1 rounded-full text-sm font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
            منظور شدہ: {accepted.length}
          </div>
          <div className="px-3 py-1 rounded-full text-sm font-bold border border-slate-200 bg-slate-50 text-slate-400">
            نظرانداز: {ignored.length}
          </div>
        </div>
        <h3 className="text-base font-bold text-slate-800">تجاویز (Suggestions)</h3>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1.5" dir="ltr">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
            categoryFilter === "all" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-300"
          }`}
        >
          All
        </button>
        {categoriesPresent.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
              categoryFilter === cat ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-300"
            }`}
          >
            {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* Severity Filters */}
      <div className="flex flex-wrap gap-1.5" dir="ltr">
        <button
          type="button"
          onClick={() => setSeverityFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
            severityFilter === "all" ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-300"
          }`}
        >
          All Severities
        </button>
        {SEVERITY_ORDER.map((sev) => (
          <button
            key={sev}
            type="button"
            onClick={() => setSeverityFilter(sev)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
              severityFilter === sev ? "bg-slate-700 text-white border-slate-700" : SEVERITY_STYLE[sev]
            }`}
          >
            {SEVERITY_LABEL[sev]}
          </button>
        ))}
      </div>

      {filteredPending.length === 0 ? (
        <p className="text-xs text-slate-500">اس فلٹر کے مطابق کوئی تجویز موجود نہیں۔</p>
      ) : (
        (Object.keys(grouped) as SuggestionCategory[])
          .filter((cat) => grouped[cat].length > 0)
          .map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-600">
                  {CATEGORY_LABEL[cat]} ({grouped[cat].length})
                </h4>
                {/* Batch Actions — only affect PENDING items in this category */}
                <div className="flex gap-1.5" dir="ltr">
                  <button
                    type="button"
                    onClick={() => onAcceptCategory(cat)}
                    className="px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 text-[10px] font-semibold hover:bg-emerald-50 transition"
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={() => onIgnoreCategory(cat)}
                    className="px-2 py-0.5 rounded border border-slate-300 text-slate-500 text-[10px] font-semibold hover:bg-slate-50 transition"
                  >
                    Ignore All
                  </button>
                </div>
              </div>
              <ul className="space-y-2">
                {grouped[cat].map((s) => {
                  const key = suggestionKey(s);
                  return (
                    <li key={key} className={`p-3 rounded-lg border text-xs space-y-2 ${SEVERITY_STYLE[s.severity]}`}>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-current">
                          {SEVERITY_LABEL[s.severity]}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/60 border border-current">
                          {CATEGORY_LABEL[s.category]}
                        </span>
                      </div>

                      {/* Suggestion Context Display: surrounding text with the issue highlighted */}
                      <div className="flex flex-wrap gap-1 items-center text-slate-700 leading-relaxed" dir="rtl">
                        {s.contextBefore && <span className="text-slate-400">…{s.contextBefore}</span>}
                        <span className="line-through decoration-red-400 bg-red-50 px-1 rounded">{s.originalText}</span>
                        <span aria-hidden="true">→</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">{s.suggestedText}</span>
                        {s.contextAfter && <span className="text-slate-400">{s.contextAfter}…</span>}
                      </div>

                      <p className="text-slate-500 leading-relaxed">{s.explanation}</p>
                      <div className="flex gap-2 pt-1" dir="ltr">
                        <button
                          type="button"
                          onClick={() => onAccept(key)}
                          className="px-3 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onIgnore(key)}
                          className="px-3 py-1 rounded-md border border-slate-300 text-slate-600 text-[11px] font-semibold hover:bg-slate-100 transition"
                        >
                          Ignore
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
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onApplyAccepted}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition"
          >
            منظور شدہ تجاویز لاگو کریں ({accepted.length}) / Apply Accepted
          </button>
          <span className="text-[11px] text-slate-400">صرف منظور شدہ آئٹمز لاگو ہوں گے — Ctrl+Z سے واپس لایا جا سکتا ہے</span>
        </div>
      )}
    </div>
  );
};
