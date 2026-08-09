import React from "react";
import type { DocumentSuggestion, SuggestionCategory } from "../utils/generateDocumentSuggestions";
import { suggestionKey } from "../utils/suggestionReview";

interface SuggestionsPanelProps {
  pending: DocumentSuggestion[];
  accepted: DocumentSuggestion[];
  ignored: DocumentSuggestion[];
  onAccept: (key: string) => void;
  onIgnore: (key: string) => void;
  onApplyAccepted: () => void;
}

const CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  unicode: "یونیکوڈ (Unicode)",
  spacing: "خالی جگہ (Spacing)",
  numeral: "ہندسے (Numerals)",
  punctuation: "رموزِ اوقاف (Punctuation)",
};

const SEVERITY_STYLE: Record<DocumentSuggestion["severity"], string> = {
  low: "bg-slate-50 border-slate-200 text-slate-600",
  medium: "bg-amber-50 border-amber-200 text-amber-800",
  high: "bg-red-50 border-red-200 text-red-700",
};

function groupByCategory(list: DocumentSuggestion[]): Record<SuggestionCategory, DocumentSuggestion[]> {
  return list.reduce<Record<SuggestionCategory, DocumentSuggestion[]>>(
    (acc, s) => {
      acc[s.category].push(s);
      return acc;
    },
    { unicode: [], spacing: [], numeral: [], punctuation: [] }
  );
}

/**
 * Document Intelligence — Suggestion Review Workflow (2026-08-09).
 * Shows PENDING suggestions with Accept/Ignore actions, plus compact
 * accepted/ignored counts. Accepting/ignoring only moves a suggestion
 * between lists here — no text changes until "Apply Accepted
 * Suggestions" is pressed separately, and even then only the specific
 * accepted items are applied (see suggestionReview.ts / the editor's own
 * apply handler) — never a blind bulk find-replace. Matches
 * QualityAuditPanel.tsx's exact visual language.
 */
export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  pending,
  accepted,
  ignored,
  onAccept,
  onIgnore,
  onApplyAccepted,
}) => {
  const total = pending.length + accepted.length + ignored.length;

  if (total === 0) {
    return (
      <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm text-right text-xs text-emerald-700" dir="rtl">
        ✓ فی الحال کوئی تجویز موجود نہیں — متن صاف نظر آتا ہے۔
      </div>
    );
  }

  const grouped = groupByCategory(pending);

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

      {pending.length === 0 ? (
        <p className="text-xs text-slate-500">تمام تجاویز کا جائزہ لیا جا چکا ہے۔</p>
      ) : (
        (Object.keys(grouped) as SuggestionCategory[])
          .filter((cat) => grouped[cat].length > 0)
          .map((cat) => (
            <div key={cat} className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-600">
                {CATEGORY_LABEL[cat]} ({grouped[cat].length})
              </h4>
              <ul className="space-y-2">
                {grouped[cat].map((s) => {
                  const key = suggestionKey(s);
                  return (
                    <li key={key} className={`p-3 rounded-lg border text-xs space-y-2 ${SEVERITY_STYLE[s.severity]}`}>
                      <div className="flex flex-wrap gap-2 items-center text-slate-700">
                        <span className="line-through decoration-red-400">{s.originalText}</span>
                        <span aria-hidden="true">→</span>
                        <span className="font-semibold text-emerald-700">{s.suggestedText}</span>
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
