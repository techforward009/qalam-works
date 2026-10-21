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
      className="relative flex w-full items-center"
      data-studio-statusbar="true"
      dir="ltr"
      style={{
        height: 19,
        paddingLeft: 33,
        background: "#f0f0f0",
        color: "#000",
        fontFamily: "Tahoma, 'Segoe UI', sans-serif",
        fontSize: 11,
        boxSizing: "border-box",
        borderTop: "1px solid #fff",
      }}
    >
      <span>{isUr ? "مدد کے لیے F1 دبائیں" : "For Help, press F1"}</span>
      <div className="absolute right-[2px] flex gap-[2px]" style={{ height: 15 }}>
        <span role="status" aria-live="polite" data-studio-status-panel="left" data-studio-save-status={status.tone} dir={dir} title={status.label} style={{ width: 150, paddingInline: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: "#000", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "15px", boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }}>{status.label}</span>
        <span data-studio-num-lock="true" className="grid place-items-center" style={{ width: 34, boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }}><span style={{ width: 26, fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, letterSpacing: 1 }}>NUM</span></span>
        <span aria-hidden="true" data-studio-status-panel="right" style={{ width: 32, boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }} />
      </div>
    </div>
  );
}
