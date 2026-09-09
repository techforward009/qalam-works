"use client";

import type { RightPanelId } from "../utils/documentShell";

export default function DocumentRightSidebar({
  isUr,
  panel,
  onClose,
  children,
}: {
  isUr: boolean;
  panel: Exclude<RightPanelId, "none">;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const title =
    panel === "quality"
      ? isUr
        ? "معیار اور تجاویز"
        : "Quality & Suggestions"
      : panel === "glossary"
        ? isUr
          ? "اصطلاحات"
          : "Glossary"
        : isUr
          ? "ترتیبات"
          : "Settings";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[#1A3A2A]/10 px-3 py-2">
        <h2 className={`text-xs font-semibold text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded text-sm text-[#3D5A47] hover:bg-[#F3F7F2]"
          aria-label={isUr ? "بند کریں" : "Close panel"}
        >
          ×
        </button>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3">{children}</div>
    </div>
  );
}
