"use client";

import type { DocumentListItem } from "../utils/documentLibrary";

export default function DocumentLibraryDialog({
  isUr,
  documents,
  activeId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onClose,
}: {
  isUr: boolean;
  documents: DocumentListItem[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const dir = isUr ? "rtl" : "ltr";
  const naskh = isUr ? "font-naskh" : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="document-library-title">
      <div className={`w-full max-w-lg overflow-hidden rounded-xl border border-[#1A3A2A]/15 bg-white shadow-lg ${naskh}`} dir={dir}>
        <div className="flex items-start justify-between gap-3 border-b border-[#1A3A2A]/10 px-4 py-3">
          <div>
            <h2 id="document-library-title" className="text-sm font-semibold text-[#1A3A2A]">
              {isUr ? "دستاویز لائبریری" : "Document library"}
            </h2>
            <p className="mt-1 text-[11px] text-[#3D5A47]">
              {isUr ? "دستاویزات اسی براؤزر میں محفوظ رہتی ہیں۔" : "Documents are stored in this browser."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded hover:bg-[#F3F7F2]" aria-label={isUr ? "بند کریں" : "Close"}>
            ×
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
          {documents.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-[#3D5A47]">
              {isUr ? "ابھی کوئی دستاویز نہیں۔" : "No documents yet."}
            </p>
          ) : (
            <ul className="space-y-1">
              {documents.map((doc) => {
                const active = doc.id === activeId;
                return (
                  <li
                    key={doc.id}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 ${
                      active ? "bg-[#F3F7F2]" : "hover:bg-slate-50"
                    }`}
                  >
                    <button type="button" className="min-w-0 flex-1 text-start" onClick={() => onOpen(doc.id)}>
                      <div className="truncate text-sm font-semibold text-[#1A3A2A]">{doc.title}</div>
                      <div className="text-[11px] text-[#3D5A47]">
                        {isUr ? "آخری ترمیم" : "Last modified"}: {new Date(doc.updatedAt).toLocaleString()}
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded border border-[#1A3A2A]/15 px-2 py-1 text-[11px] font-semibold text-[#1A3A2A] hover:bg-white"
                        onClick={() => onOpen(doc.id)}
                      >
                        {isUr ? "کھولیں" : "Open"}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[#1A3A2A]/15 px-2 py-1 text-[11px] font-semibold text-[#1A3A2A] hover:bg-white"
                        onClick={() => onRename(doc.id)}
                      >
                        {isUr ? "نام" : "Rename"}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(doc.id)}
                      >
                        {isUr ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#1A3A2A]/10 px-4 py-3">
          <button
            type="button"
            className="rounded-md bg-[#1A3A2A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#244A36]"
            onClick={onNew}
          >
            {isUr ? "نیا مسودہ" : "New document"}
          </button>
        </div>
      </div>
    </div>
  );
}
