"use client";

import { describeDocumentLanguage, describeSaveStatus, type SaveStatus } from "../utils/documentShell";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentLibrary } from "../utils/documentLibrary";
import type { DocumentZoom } from "../utils/documentView";

export default function DocumentStatusBar({
  isUr,
  dir,
  stats,
  saveStatus,
  storageDurability,
  online,
  auditScore,
  auditStale,
  pageCount = null,
  visiblePage = 1,
  zoom = 100,
  zoomPercent = null,
  onPageStep,
}: {
  isUr: boolean;
  dir: "rtl" | "ltr";
  stats: DocumentStats | null;
  saveStatus: SaveStatus;
  storageDurability: DocumentLibrary["durability"] | null;
  online: boolean;
  auditScore?: number | null;
  auditStale?: boolean;
  pageCount?: number | null;
  visiblePage?: number;
  zoom?: DocumentZoom;
  zoomPercent?: number | null;
  onPageStep?: (delta: number) => void;
}) {
  const status = describeSaveStatus({ saveStatus, online, isUr, storageDurability });
  const language = describeDocumentLanguage({
    dominant: stats?.language.dominant,
    isUr,
  });
  const total = typeof pageCount === "number" ? Math.max(1, pageCount) : 1;
  const current = Math.min(total, Math.max(1, visiblePage));
  const percent = typeof zoomPercent === "number" && zoomPercent > 0
    ? zoomPercent
    : typeof zoom === "number"
      ? zoom
      : null;

  return (
    <div
      className="flex w-full items-center gap-x-3 gap-y-1 px-2 py-1 text-[11px] text-[#3D5A47]"
      data-studio-statusbar="true"
      dir="ltr"
    >
      <div className="flex shrink-0 items-center gap-1" data-studio-page-nav="true" data-latin-control="true">
        <button
          type="button"
          className="h-6 w-6 border border-[#c8c8c8] bg-white text-sm leading-none text-[#1c1c1c] disabled:opacity-40"
          aria-label={isUr ? "پچھلا صفحہ" : "Previous page"}
          disabled={!onPageStep || current <= 1}
          onClick={() => onPageStep?.(-1)}
        >
          ‹
        </button>
        <span className="min-w-8 text-center font-medium tabular-nums" data-studio-page-label="true">
          {current}/{total}
        </span>
        <button
          type="button"
          className="h-6 w-6 border border-[#c8c8c8] bg-white text-sm leading-none text-[#1c1c1c] disabled:opacity-40"
          aria-label={isUr ? "اگلا صفحہ" : "Next page"}
          disabled={!onPageStep || current >= total}
          onClick={() => onPageStep?.(1)}
        >
          ›
        </button>
        <span className="ms-2 min-w-10 font-medium tabular-nums" data-studio-zoom-label="true">
          {percent === null ? (zoom === "fit-width" ? "Width" : "Page") : `${percent}%`}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1" dir={isUr ? "rtl" : "ltr"}>
      <span>
        {isUr ? "الفاظ" : "Words"} <bdi dir="ltr" data-latin-control="true">{stats ? stats.wordCount : 0}</bdi>
      </span>
      <span className="text-[#1A3A2A]/20" aria-hidden>
        ·
      </span>
      <span>
        {isUr ? "حروف" : "Characters"} <bdi dir="ltr" data-latin-control="true">{stats ? stats.characterCount : 0}</bdi>
      </span>
      {typeof pageCount === "number" ? (
        <>
          <span className="text-[#1A3A2A]/20" aria-hidden>
            ·
          </span>
          <span data-studio-page-count={pageCount}>
            {isUr ? "صفحات" : "Pages"} <bdi dir="ltr" data-latin-control="true">{pageCount}</bdi>
          </span>
        </>
      ) : null}
      <span className="text-[#1A3A2A]/20" aria-hidden>
        ·
      </span>
      <span>
        {isUr ? "زبان" : "Language"} {language}
      </span>
      <span className="text-[#1A3A2A]/20" aria-hidden>
        ·
      </span>
      <span dir="ltr">{dir.toUpperCase()}</span>
      {typeof auditScore === "number" && (
        <>
          <span className="text-[#1A3A2A]/20" aria-hidden>
            ·
          </span>
          <span>
            {auditStale ? "~" : ""}
            {isUr ? "اسکور" : "Score"} {auditScore}
          </span>
        </>
      )}
      {status.label ? (
        <>
          <span className="text-[#1A3A2A]/20" aria-hidden>
            ·
          </span>
          <span className={status.tone === "error" ? "text-red-700" : status.tone === "offline" ? "text-amber-800" : ""}>
            {status.label}
          </span>
        </>
      ) : null}
      <span className="ms-auto hidden text-[10px] leading-6 text-[#3D5A47]/70 sm:inline">
        {isUr ? "تدوین براؤزر میں رہتی ہے" : "Editing stays in this browser"}
      </span>
      </div>
    </div>
  );
}
