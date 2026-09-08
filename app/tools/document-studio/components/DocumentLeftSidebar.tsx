"use client";

import { DocumentOutlinePanel } from "./DocumentOutlinePanel";
import type { OutlineEntry } from "../utils/documentOutline";

export default function DocumentLeftSidebar({
  isUr,
  outline,
  onNavigate,
  onClose,
}: {
  isUr: boolean;
  outline: OutlineEntry[];
  onNavigate: (blockIndex: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[#1A3A2A]/10 px-3 py-2">
        <h2 className={`text-xs font-semibold text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}>
          {isUr ? "خاکہ" : "Outline"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded text-sm text-[#3D5A47] hover:bg-[#F3F7F2]"
          aria-label={isUr ? "بند کریں" : "Close outline"}
        >
          ×
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <DocumentOutlinePanel outline={outline} onNavigate={onNavigate} isUr={isUr} />
      </div>
    </div>
  );
}
