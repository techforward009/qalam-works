"use client";

import { describeDocumentLanguage, describeSaveStatus, type SaveStatus } from "../utils/documentShell";
import type { DocumentStats } from "../utils/buildDocumentStats";

export default function DocumentStatusBar({
  isUr,
  dir,
  stats,
  saveStatus,
  online,
  auditScore,
  auditStale,
}: {
  isUr: boolean;
  dir: "rtl" | "ltr";
  stats: DocumentStats | null;
  saveStatus: SaveStatus;
  online: boolean;
  auditScore?: number | null;
  auditStale?: boolean;
}) {
  const status = describeSaveStatus({ saveStatus, online, isUr });
  const language = describeDocumentLanguage({
    dominant: stats?.language.dominant,
    isUr,
  });

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-[11px] text-[#3D5A47]"
      data-studio-statusbar="true"
      dir={isUr ? "rtl" : "ltr"}
    >
      <span>
        {isUr ? "الفاظ" : "Words"} {stats ? stats.wordCount : 0}
      </span>
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
      <span className={`ms-auto text-[10px] text-[#3D5A47]/70 ${isUr ? "font-naskh" : ""}`}>
        {isUr ? "تدوین براؤزر میں رہتی ہے" : "Editing stays in this browser"}
      </span>
    </div>
  );
}
