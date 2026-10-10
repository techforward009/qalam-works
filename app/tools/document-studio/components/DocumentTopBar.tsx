"use client";

import { useState } from "react";
import { describeSaveStatus, type SaveStatus } from "../utils/documentShell";
import type { DocumentLibrary } from "../utils/documentLibrary";

export default function DocumentTopBar({
  isUr,
  title,
  onTitleChange,
  onTitleCommit,
  saveStatus,
  storageDurability,
  online,
  isImporting,
  onNewDocument,
  onUploadClick,
  onStandardize,
  onAudit,
  onOpenLibrary,
  onDownloadDocx,
  onDownloadPdf,
  onPrint,
  pdfBusy = false,
}: {
  isUr: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  onTitleCommit: () => void;
  saveStatus: SaveStatus;
  storageDurability: DocumentLibrary["durability"] | null;
  online: boolean;
  isImporting: boolean;
  onNewDocument: () => void;
  onUploadClick: () => void;
  onStandardize: () => void;
  onAudit: () => void;
  onOpenLibrary?: () => void;
  onDownloadDocx?: () => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
  pdfBusy?: boolean;
}) {
  const status = describeSaveStatus({ saveStatus, online, isUr, storageDurability });
  const [headerMore, setHeaderMore] = useState(false);
  const btn =
    "inline-flex h-9 shrink-0 items-center rounded-md border border-transparent px-2.5 text-xs font-semibold text-[#1A3A2A] hover:bg-[#F3F7F2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#B8935A] disabled:opacity-40";
  const primary =
    "inline-flex h-9 shrink-0 items-center rounded-md bg-[#1A3A2A] px-2.5 text-xs font-semibold text-white hover:bg-[#244E38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#B8935A] disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2" data-studio-topbar="true">
      {storageDurability === "memory" ? (
        <p role="status" dir={isUr ? "rtl" : "ltr"} className="w-full rounded-md bg-amber-50 px-3 py-2 text-xs leading-7 text-amber-900">
          {isUr
            ? "براؤزر اسٹوریج دستیاب نہیں۔ اس سیشن کی تبدیلیاں عارضی ہیں۔ یہ ٹیب کھلا رکھیں اور اپنی دستاویز ڈاؤن لوڈ یا ایکسپورٹ کر لیں۔"
            : "Browser storage is unavailable. Changes are temporary in this session. Keep this tab open and download/export your document."}
        </p>
      ) : null}
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:min-w-[12rem] sm:flex-1">
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
          className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-[#1A3A2A] hover:border-[#1A3A2A]/15 focus:border-[#B8935A] focus:outline-none ${isUr ? "h-12 leading-[2]" : "h-9"}`}
        />
        {status.label ? (
          <span
            className={`shrink-0 whitespace-nowrap text-[11px] font-medium ${
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

      <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto" data-studio-topbar-actions="true">
        <button type="button" className={btn} onClick={onNewDocument} title={isUr ? "نیا مسودہ" : "New document"}>
          {isUr ? "نیا" : "New"}
        </button>
        {onOpenLibrary ? (
          <button type="button" className={btn} onClick={onOpenLibrary} data-studio-open-library="true">
            {isUr ? "ذخیرہ" : "Library"}
          </button>
        ) : null}
        <button
          type="button"
          className={btn}
          onClick={onUploadClick}
          disabled={isImporting}
          title={isUr ? "فائل درآمد" : "Import file"}
        >
          {isImporting ? "…" : isUr ? "درآمد" : "Import"}
        </button>
        {onDownloadDocx ? (
          <button type="button" className={primary} onClick={onDownloadDocx} data-studio-export-docx="true" data-latin-control="true" dir="ltr">
            DOCX
          </button>
        ) : null}
        {onDownloadPdf ? (
          <button type="button" className={primary} onClick={onDownloadPdf} disabled={pdfBusy} data-studio-export-pdf="true" data-latin-control="true" dir="ltr">
            {pdfBusy ? "…" : "PDF"}
          </button>
        ) : null}
        {onPrint ? (
          <button type="button" className={btn} onClick={onPrint} data-studio-print="true">
            {isUr ? "پرنٹ" : "Print"}
          </button>
        ) : null}
        <div
          className={`${headerMore ? "flex" : "hidden"} w-full basis-full flex-wrap items-center gap-1 sm:flex sm:w-auto sm:basis-auto`}
          data-studio-topbar-secondary="true"
        >
          <button
            type="button"
            onClick={onStandardize}
            className="inline-flex h-9 items-center rounded-md border border-amber-600 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
          >
            {isUr ? "معیاری بنائیں" : "Standardize"}
          </button>
          <button
            type="button"
            onClick={onAudit}
            className="inline-flex h-9 items-center rounded-md border border-[#1A3A2A]/15 px-2.5 text-xs font-semibold text-[#1A3A2A] hover:bg-[#F3F7F2]"
          >
            {isUr ? "جانچ" : "Audit"}
          </button>
        </div>
        <button
          type="button"
          className={`${btn} border border-[#1A3A2A]/15 sm:hidden`}
          aria-expanded={headerMore}
          data-studio-topbar-more="true"
          onClick={() => setHeaderMore((open) => !open)}
        >
          {isUr ? "مزید" : "More"}
        </button>
      </div>
    </div>
  );
}
