"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationProject, TranslationSegment } from "../utils/translationTypes";
import { resolveTargetDir, nextStatus } from "../utils/segmentation";
import { saveProject, exportProjectBackup } from "../utils/projectStore";
import SegmentRow from "./SegmentRow";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface TranslationWorkspaceProps {
  project: TranslationProject;
  onProjectChange: (project: TranslationProject) => void;
  onClose: () => void;
}

type SaveState = "saved" | "saving" | "error" | "idle";

export default function TranslationWorkspace({ project, onProjectChange, onClose }: TranslationWorkspaceProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the latest project state that has NOT yet been flushed to localStorage.
  // Set immediately on every edit; cleared after a successful write.
  const pendingProject = useRef<TranslationProject | null>(null);

  /** Synchronously write whatever is pending — used on close and pagehide. */
  const flushPending = useCallback(() => {
    const p = pendingProject.current;
    if (!p) return;
    if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null; }
    const result = saveProject({ ...p, updatedAt: new Date().toISOString() });
    setSaveState(result.ok ? "saved" : "error");
    if (result.ok) pendingProject.current = null;
  }, []);

  const debouncedSave = useCallback((updated: TranslationProject) => {
    pendingProject.current = updated; // always track latest, even before debounce fires
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveState("saving");
    autosaveTimer.current = setTimeout(() => {
      const p = pendingProject.current;
      if (!p) return;
      const result = saveProject({ ...p, updatedAt: new Date().toISOString() });
      setSaveState(result.ok ? "saved" : "error");
      if (result.ok) pendingProject.current = null;
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    // pagehide fires reliably on mobile (beforeunload does not). Best-effort
    // synchronous flush — localStorage.setItem is synchronous so this works.
    const onPageHide = () => { flushPending(); };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      // Unmount: flush any pending unsaved state instead of discarding it.
      flushPending();
    };
  }, [flushPending]);

  const updateSegment = useCallback((id: string, patch: Partial<TranslationSegment>) => {
    const segments = project.segments.map(s => s.id === id ? { ...s, ...patch } : s);
    const updated = { ...project, segments };
    onProjectChange(updated);
    debouncedSave(updated);
  }, [project, onProjectChange, debouncedSave]);

  const handleTargetChange = useCallback((id: string, value: string) => {
    const seg = project.segments.find(s => s.id === id);
    if (!seg) return;
    const event = value.trim() === "" ? "clear" : "edit";
    const newStatus = nextStatus(seg.status, event);
    const newTargetDir = resolveTargetDir(value, project.targetLanguage);
    updateSegment(id, { target: value, status: newStatus, targetDir: newTargetDir });
  }, [project, updateSegment]);

  const handleSetFinal = useCallback((id: string) => {
    updateSegment(id, { status: "final" });
  }, [updateSegment]);

  const handleClose = useCallback(() => {
    flushPending(); // synchronous write before leaving the workspace
    onClose();
  }, [flushPending, onClose]);

  const handleExportBackup = () => {
    const json = exportProjectBackup(project);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const finalCount = project.segments.filter(s => s.status === "final").length;
  const draftCount = project.segments.filter(s => s.status === "draft").length;
  const total = project.segments.length;

  const saveLabel = { saving: "Saving…", saved: "Saved on this device ✓", error: "Save failed", idle: "Saved on this device" }[saveState];
  const saveCls = saveState === "error" ? "text-red-500" : "text-gray-500";

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={handleClose} className="text-sm text-[#1A3A2A] hover:underline">← Projects</button>
        <h2 className="font-bold text-[#1A3A2A] flex-1 min-w-0 truncate">{project.name}</h2>
        <span className="text-xs text-gray-500">
          {finalCount}/{total} final · {draftCount} draft
        </span>
        <span className={`text-xs ${saveCls}`}>{saveLabel}</span>
        <button onClick={handleExportBackup} className="h-8 px-3 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Export Backup
        </button>
      </div>
      <div className="space-y-3">
        {project.segments.map(seg => (
          <SegmentRow
            key={seg.id}
            segment={seg}
            targetLanguage={project.targetLanguage}
            onTargetChange={handleTargetChange}
            onSetFinal={handleSetFinal}
          />
        ))}
      </div>
    </div>
  );
}
