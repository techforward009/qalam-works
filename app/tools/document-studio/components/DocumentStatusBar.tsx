"use client";

import { describeSaveStatus, type SaveStatus } from "../utils/documentShell";
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
  void status;
  void stats;
  void dir;
  void auditScore;
  void auditStale;
  void pageCount;
  void visiblePage;
  void zoom;
  void zoomPercent;
  void onPageStep;

  return (
    <div
      className="flex w-full items-center px-2"
      data-studio-statusbar="true"
      dir="ltr"
      style={{
        height: 19,
        background: "#f0f0f0",
        color: "#000",
        fontFamily: "Tahoma, 'Segoe UI', sans-serif",
        fontSize: 11,
        boxSizing: "border-box",
        borderTop: "1px solid #fff",
      }}
    >
      <span>{isUr ? "مدد کے لیے F1 دبائیں" : "For Help, press F1"}</span>
      <span
        data-studio-num-lock="true"
        className="ms-auto grid h-[15px] min-w-[34px] place-items-center px-1"
        style={{
          boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff",
          background: "#f0f0f0",
        }}
      >
        NUM
      </span>
    </div>
  );
}
