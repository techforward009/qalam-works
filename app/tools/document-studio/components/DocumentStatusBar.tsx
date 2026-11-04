"use client";

import { describeSaveStatus, type SaveStatus } from "../utils/documentShell";
import type { DocumentStats } from "../utils/buildDocumentStats";
import type { DocumentLibrary } from "../utils/documentLibrary";
import type { DocumentZoom } from "../utils/documentView";
import { useEffect, useState } from "react";

/**
 * Tracks the real Num Lock state from keyboard/mouse/focus events (capture
 * phase). Until the first event that reports it, `initial` is used.
 */
export function useNumLockState(initial = true): boolean {
  const [on, setOn] = useState(initial);
  useEffect(() => {
    const read = (event: Event) => {
      const e = event as KeyboardEvent | MouseEvent;
      if (typeof e.getModifierState !== "function") return;
      setOn(e.getModifierState("NumLock"));
    };
    const types = ["keydown", "keyup", "mousedown", "focus"] as const;
    for (const t of types) window.addEventListener(t, read, true);
    return () => { for (const t of types) window.removeEventListener(t, read, true); };
  }, []);
  return on;
}

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
  keyboardName,
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
  /** English name of the active keyboard layout (display-only panel). */
  keyboardName?: string;
}) {
  const status = describeSaveStatus({ saveStatus, online, isUr, storageDurability });
  const numLockOn = useNumLockState(true);
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
        <span role="status" aria-live="polite" data-studio-status-panel="left" data-studio-save-status={status.tone} dir={dir} title={status.label} style={{ width: 80, paddingInline: 3, textAlign: "center", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: "#000", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "15px", boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }}>{status.label}</span>
        {keyboardName ? <span data-studio-keyboard-status="true" dir="ltr" title={`Keyboard: ${keyboardName}`} style={{ width: 150, paddingInline: 3, textAlign: "center", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: "#000", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "15px", boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }}>{keyboardName}</span> : null}
        <span data-studio-num-lock="true" data-studio-num-lock-on={numLockOn ? "true" : "false"} className="grid place-items-center" style={{ width: 34, boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }}><span style={{ width: 26, fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, letterSpacing: 1 }}>{numLockOn ? "NUM" : ""}</span></span>
        <span aria-hidden="true" data-studio-status-panel="right" style={{ width: 32, boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff" }} />
      </div>
    </div>
  );
}
