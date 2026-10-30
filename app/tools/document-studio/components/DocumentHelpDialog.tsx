"use client";

import type { HelpDialogMode } from "../utils/documentMenuActions";
import { useMovableStudioDialog } from "./useMovableStudioDialog";

export default function DocumentHelpDialog({
  isUr,
  mode,
  onClose,
}: {
  isUr: boolean;
  mode: HelpDialogMode;
  onClose: () => void;
}) {
  const drag = useMovableStudioDialog<HTMLDivElement>();
  const title =
    mode === "about"
      ? isUr
        ? "قلم پیج: اردو ایڈیٹر مدد"
        : "Qalam Page: Urdu Editor help"
      : mode === "shortcuts"
        ? isUr
          ? "کی بورڈ شارٹ کٹس"
          : "Keyboard shortcuts"
        : mode === "rtl"
          ? isUr
            ? "اردو / دائیں-بائیں مدد"
            : "Urdu / RTL help"
          : isUr
            ? "آواز سے لکھنے کی مدد"
            : "Voice dictation help";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" data-studio-dialog={isUr ? "ur" : "en"}>
      <div ref={drag.dialogRef} style={drag.style} className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl border border-[#1A3A2A]/15 bg-white p-4 shadow-lg" dir={isUr ? "rtl" : "ltr"}>
        <div {...drag.handleProps} style={drag.handleProps.style} className="mb-3 flex items-start justify-between gap-3" data-studio-help-title="true">
          <h2 className={`text-sm font-semibold text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}>{title}</h2>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded hover:bg-[#F3F7F2]" aria-label={isUr ? "بند کریں" : "Close"}>
            ×
          </button>
        </div>
        {mode === "about" && (
          <div className={`space-y-2 text-sm text-[#1A3A2A]/80 ${isUr ? "font-naskh" : ""}`}>
            <p>
              {isUr
                ? "مکمل workspace: مسودہ → معیاری بنائیں → کوالٹی چیک → ایکسپورٹ۔ دستاویزات اسی براؤزر میں محفوظ رہتی ہیں۔"
                : "Full workspace: Draft → Standardize → Quality Check → Export. Documents are stored in this browser."}
            </p>
            <p>
              {isUr
                ? "PDF ایکسپورٹ صرف فائل بنانے کے لیے سرور استعمال کرتا ہے — دستاویز محفوظ نہیں کی جاتی۔ کلاؤڈ شیئرنگ ابھی نہیں ہے۔"
                : "PDF export uses the server only to generate your file — documents are not stored. Cloud sharing is not available yet."}
            </p>
          </div>
        )}
        {mode === "shortcuts" && (
          <ul className="space-y-1.5 text-sm text-[#1A3A2A]/80" dir="ltr">
            <li>Ctrl/Cmd + N — New document</li>
            <li>Ctrl/Cmd + O — Open document library</li>
            <li>Ctrl/Cmd + S — Save in this browser</li>
            <li>Ctrl/Cmd + H — Character</li>
            <li>Ctrl/Cmd + G — Paragraph</li>
            <li>Alt + Insert — Insert page break</li>
            <li>Ctrl/Cmd + Alt + Y — Export all text</li>
            <li>Ctrl/Cmd + B — Bold</li>
            <li>Ctrl/Cmd + I — Italic</li>
            <li>Ctrl/Cmd + U — Underline</li>
            <li>Ctrl/Cmd + Z — Undo</li>
            <li>Ctrl/Cmd + Shift + Z — Redo</li>
            <li>Ctrl/Cmd + A — Select all</li>
            <li>Ctrl/Cmd + F — Find and replace</li>
            <li>F6 / F7 / F8 — 50% / 100% / 200% zoom</li>
          </ul>
        )}
        {mode === "rtl" && (
          <div className={`space-y-2 text-sm text-[#1A3A2A]/80 ${isUr ? "font-naskh" : ""}`}>
            <p>
              {isUr
                ? "اردو اور عربی کے لیے RTL منتخب کریں۔ انگریزی کے لیے LTR۔ ہر پیراگراف کی سمت الگ محفوظ رہتی ہے۔"
                : "Use RTL for Urdu and Arabic, LTR for English. Each paragraph keeps its own direction."}
            </p>
            <p>
              {isUr
                ? "Text → Align and direction، یا ٹول بار کے RTL/LTR بٹن استعمال کریں۔"
                : "Use Text → Align and direction, or the toolbar RTL/LTR buttons."}
            </p>
          </div>
        )}
        {mode === "voice" && (
          <div className={`space-y-2 text-sm text-[#1A3A2A]/80 ${isUr ? "font-naskh" : ""}`}>
            <p>
              {isUr
                ? "آواز سے لکھنا براؤزر کے Web Speech API سے ہوتا ہے — آڈیو قلم ورکس کے سرور پر نہیں بھیجا جاتا۔"
                : "Voice dictation uses the browser Web Speech API. Audio is not sent to Qalam Works servers."}
            </p>
            <p>
              {isUr
                ? "Chrome، Edge اور Safari میں دستیاب ہے۔ ٹول بار کے مائیک بٹن یا Tools → Voice dictation استعمال کریں۔"
                : "Available in Chrome, Edge, and Safari. Use the toolbar microphone or Tools → Voice dictation."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
