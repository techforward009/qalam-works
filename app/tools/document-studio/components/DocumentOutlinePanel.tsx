import React from "react";
import type { OutlineEntry } from "../utils/documentOutline";

interface DocumentOutlinePanelProps {
  outline: OutlineEntry[];
  onNavigate: (blockIndex: number) => void;
  isUr?: boolean;
}

const LEVEL_INDENT: Record<number, string> = {
  1: "pr-0",
  2: "pr-3",
  3: "pr-6",
  4: "pr-9",
};

/**
 * Phase 1 Professional Usability (2026-08-09) — Document Outline panel.
 * Read-only navigation view built from the document's existing heading
 * structure (extractDocumentOutline) — no DocNode changes, no schema
 * changes. Clicking an entry reports the heading's blockIndex upward;
 * DocumentStudioEditor.tsx maps that to a real ProseMirror position and
 * moves the cursor there via a genuine TipTap command.
 */
export const DocumentOutlinePanel: React.FC<DocumentOutlinePanelProps> = ({ outline, onNavigate, isUr = false }) => {
  if (outline.length === 0) {
    return (
      <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm text-xs text-slate-400" dir={isUr ? "rtl" : "ltr"}>
        {isUr ? "کوئی عنوان موجود نہیں — خاکہ خالی ہے۔" : "No headings found — outline is empty."}
      </div>
    );
  }

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-sm text-xs space-y-1" dir={isUr ? "rtl" : "ltr"}>
      <h4 className="text-slate-600 font-semibold mb-2">{isUr ? "دستاویز کا خاکہ" : "Document Outline"}</h4>
      <ul className="space-y-0.5">
        {outline.map((entry, i) => (
          <li key={`${entry.blockIndex}-${i}`} className={LEVEL_INDENT[entry.level] ?? ""}>
            <button
              type="button"
              onClick={() => onNavigate(entry.blockIndex)}
              className={`w-full px-2 py-1 rounded hover:bg-amber-50 text-slate-700 hover:text-amber-800 transition truncate ${isUr ? "text-right" : "text-left"}`}
              title={entry.text}
            >
              {entry.text || (isUr ? "(بلا عنوان)" : "(Untitled)")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
