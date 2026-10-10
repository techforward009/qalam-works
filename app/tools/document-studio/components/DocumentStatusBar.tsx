"use client";

import { describeDocumentLanguage, describeSaveStatus, type SaveStatus } from "../utils/documentShell";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentLibrary } from "../utils/documentLibrary";

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
}) {
  const status = describeSaveStatus({ saveStatus, online, isUr, storageDurability });
  const language = describeDocumentLanguage({
    dominant: stats?.language.dominant,
    isUr,
  });

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-14 py-1.5 text-[11px] text-[#3D5A47]"
      data-studio-statusbar="true"
      dir={isUr ? "rtl" : "ltr"}
    >
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
  );
}
