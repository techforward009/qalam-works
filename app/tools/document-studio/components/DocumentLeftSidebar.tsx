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
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[#1A3A2A]/10 px-3 py-2">
        <h2 className={`min-w-0 flex-1 text-sm font-semibold leading-loose text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}>
          {isUr ? "خاکہ" : "Outline"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded text-lg text-[#3D5A47] hover:bg-[#F3F7F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B8935A]"
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
