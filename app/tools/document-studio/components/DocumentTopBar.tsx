"use client";

import { describeSaveStatus, type SaveStatus } from "../utils/documentShell";

export default function DocumentTopBar({
  isUr,
  title,
  onTitleChange,
  onTitleCommit,
  saveStatus,
  online,
  isImporting,
  onNewDocument,
  onUploadClick,
  onStandardize,
  onAudit,
}: {
  isUr: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  onTitleCommit: () => void;
  saveStatus: SaveStatus;
  online: boolean;
  isImporting: boolean;
  onNewDocument: () => void;
  onUploadClick: () => void;
  onStandardize: () => void;
  onAudit: () => void;
}) {
  const status = describeSaveStatus({ saveStatus, online, isUr });
  const btn =
    "h-8 px-2.5 rounded-md text-xs font-semibold border border-transparent text-[#1A3A2A] hover:bg-[#F3F7F2] disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2" data-studio-topbar="true">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="hidden shrink-0 text-sm font-semibold tracking-tight text-[#1A3A2A] sm:inline"
          aria-hidden
        >
          قلم
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          aria-label={isUr ? "دستاویز کا عنوان" : "Document title"}
          className={`min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-[#1A3A2A] hover:border-[#1A3A2A]/15 focus:border-[#B8935A] focus:outline-none ${isUr ? "font-naskh" : ""}`}
        />
        {status.label ? (
          <span
            className={`shrink-0 text-[11px] font-medium ${
              status.tone === "error"
                ? "text-red-700"
                : status.tone === "offline"
                  ? "text-amber-800"
                  : "text-[#3D5A47]"
            }`}
            data-studio-save-status={status.tone}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={btn} onClick={onNewDocument} title={isUr ? "نیا مسودہ" : "New document"}>
          {isUr ? "نیا" : "New"}
        </button>
        <button
          type="button"
          className={btn}
          onClick={onUploadClick}
          disabled={isImporting}
          title={isUr ? "فائل اپلوڈ" : "Upload file"}
        >
          {isImporting ? (isUr ? "…" : "…") : isUr ? "اپلوڈ" : "Upload"}
        </button>
        <button
          type="button"
          onClick={onStandardize}
          className={`h-8 px-3 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 ${isUr ? "font-naskh" : ""}`}
        >
          {isUr ? "معیاری بنائیں" : "Standardize"}
        </button>
        <button
          type="button"
          onClick={onAudit}
          className={`h-8 px-3 rounded-md text-xs font-semibold border border-amber-600 text-amber-800 hover:bg-amber-50 ${isUr ? "font-naskh" : ""}`}
        >
          {isUr ? "آڈٹ" : "Audit"}
        </button>
      </div>
    </div>
  );
}
