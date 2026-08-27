"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationProject, TranslationSegment, GlossaryEntry } from "../utils/translationTypes";
import { resolveTargetDir, nextStatus } from "../utils/segmentation";
import { saveProject } from "../utils/projectStore";
import { findTerminologyFindings, findExactMemorySuggestion, hasRepeatedSourceConflict } from "../utils/terminology";
import { runSegmentQA, runProjectQA } from "../utils/translationQA";
import {
  approveSegment, requestChanges, applyTargetEditReviewTransition,
  applyMarkFinalReviewTransition, summarizeReviewState,
} from "../utils/reviewState";
import {
  filterSegmentsByReviewState, findNextVisibleSegment, type ReviewFilter,
} from "../utils/reviewNavigation";
import GlossaryPanel from "./GlossaryPanel";
import QASummaryStrip from "./QASummaryStrip";
import ReviewSummaryPanel from "./ReviewSummaryPanel";
import ReviewFilterBar from "./ReviewFilterBar";
import ExportPanel from "./ExportPanel";
import SegmentRow from "./SegmentRow";
import { generateProjectId } from "../utils/projectId";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface TranslationWorkspaceProps {
  project: TranslationProject;
  onProjectChange: (project: TranslationProject) => void;
  onClose: () => void;
  isUr?: boolean;
}

type SaveState = "saved" | "saving" | "error" | "idle";

export default function TranslationWorkspace({ project, onProjectChange, onClose, isUr }: TranslationWorkspaceProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  /** Navigation cursor: order of last acted/navigated-to segment. 0 = before first. */
  const [navCursor, setNavCursor] = useState(0);
  const segmentRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProject = useRef<TranslationProject | null>(null);

  const flushPending = useCallback(() => {
    const p = pendingProject.current;
    if (!p) return;
    if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null; }
    const result = saveProject({ ...p, updatedAt: new Date().toISOString() });
    setSaveState(result.ok ? "saved" : "error");
    if (result.ok) pendingProject.current = null;
  }, []);

  const debouncedSave = useCallback((updated: TranslationProject) => {
    pendingProject.current = updated;
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
    const onPageHide = () => { flushPending(); };
    window.addEventListener("pagehide", onPageHide);
    return () => { window.removeEventListener("pagehide", onPageHide); flushPending(); };
  }, [flushPending]);

  const updateProject = useCallback((patch: Partial<TranslationProject>) => {
    const updated = { ...project, ...patch };
    onProjectChange(updated);
    debouncedSave(updated);
  }, [project, onProjectChange, debouncedSave]);

  const updateSegment = useCallback((id: string, segPatch: Partial<TranslationSegment>) => {
    updateProject({ segments: project.segments.map(s => s.id === id ? { ...s, ...segPatch } : s) });
  }, [project.segments, updateProject]);

  const handleTargetChange = useCallback((id: string, value: string) => {
    const seg = project.segments.find(s => s.id === id);
    if (!seg) return;
    const event = value.trim() === "" ? "clear" : "edit";
    const reviewPatch = applyTargetEditReviewTransition(seg, value);
    updateSegment(id, {
      target: value,
      status: nextStatus(seg.status, event),
      targetDir: resolveTargetDir(value, project.targetLanguage),
      ...reviewPatch,
    });
  }, [project, updateSegment]);

  const handleSetFinal = useCallback((id: string) => {
    const seg = project.segments.find(s => s.id === id);
    if (!seg) return;
    const reviewPatch = applyMarkFinalReviewTransition(seg);
    updateSegment(id, { status: "final", ...reviewPatch });
  }, [project, updateSegment]);

  const handleApprove = useCallback((id: string) => {
    const seg = project.segments.find(s => s.id === id);
    if (!seg) return;
    const updated = approveSegment(seg);
    if (updated) { updateSegment(id, updated); setNavCursor(seg.order); }
  }, [project, updateSegment]);

  const handleRequestChanges = useCallback((id: string, note: string) => {
    const seg = project.segments.find(s => s.id === id);
    if (!seg) return;
    const updated = requestChanges(seg, note);
    if (updated) { updateSegment(id, updated); setNavCursor(seg.order); }
  }, [project, updateSegment]);

  const handleImportProject = useCallback((restored: TranslationProject) => {
    // Atomic: only called after full validation in importProjectBackup.
    // Replace current project state and persist.
    const withTimestamp = { ...restored, updatedAt: new Date().toISOString() };
    onProjectChange(withTimestamp);
    debouncedSave(withTimestamp);
  }, [onProjectChange, debouncedSave]);

  const handleFilterChange = useCallback((f: ReviewFilter) => {
    setReviewFilter(f);
    setNavCursor(0);
  }, []);

  const handleNext = useCallback(() => {
    const visible = filterSegmentsByReviewState(project.segments, reviewFilter);
    const next = findNextVisibleSegment(visible, navCursor);
    if (!next) return;
    setNavCursor(next.order);
    const el = segmentRefs.current[next.id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [project.segments, reviewFilter, navCursor]);

  const handleApplyMemory = useCallback((id: string, target: string) => {
    const seg = project.segments.find(s => s.id === id);
    if (!seg) return;
    updateSegment(id, { target, status: "draft", targetDir: resolveTargetDir(target, project.targetLanguage) });
  }, [project, updateSegment]);

  // Glossary CRUD
  const handleAddGlossaryEntry = useCallback((entry: Omit<GlossaryEntry, "id">) => {
    const newEntry: GlossaryEntry = { id: generateProjectId(), ...entry };
    updateProject({ glossary: [...project.glossary, newEntry] });
  }, [project.glossary, updateProject]);

  const handleUpdateGlossaryEntry = useCallback((id: string, patch: Partial<Omit<GlossaryEntry, "id">>) => {
    updateProject({ glossary: project.glossary.map(e => e.id === id ? { ...e, ...patch } : e) });
  }, [project.glossary, updateProject]);

  const handleDeleteGlossaryEntry = useCallback((id: string) => {
    updateProject({ glossary: project.glossary.filter(e => e.id !== id) });
  }, [project.glossary, updateProject]);

  const handleClose = useCallback(() => { flushPending(); onClose(); }, [flushPending, onClose]);


  const finalCount = project.segments.filter(s => s.status === "final").length;
  const draftCount = project.segments.filter(s => s.status === "draft").length;
  const total = project.segments.length;
  const saveLabel = {
    saving: isUr ? "محفوظ ہو رہا ہے…" : "Saving…",
    saved: isUr ? "اس ڈیوائس پر محفوظ ✓" : "Saved on this device ✓",
    error: isUr ? "محفوظ نہیں ہو سکا" : "Save failed",
    idle: isUr ? "اس ڈیوائس پر محفوظ" : "Saved on this device",
  }[saveState];
  const saveCls = saveState === "error" ? "text-red-500" : "text-gray-500";

  // QA: derived state, never stored — recomputed each render
  const conflictMap = new Map(project.segments.map(s => [s.id, hasRepeatedSourceConflict(s, project.segments)]));
  const qaSummary = runProjectQA(project.segments, project.sourceLanguage, project.targetLanguage);
  const reviewSummary = summarizeReviewState(project.segments);
  // visibleSegments is ONLY for rendering — all business logic above uses project.segments
  const visibleSegments = filterSegmentsByReviewState(project.segments, reviewFilter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-4" dir={isUr ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={handleClose} className="text-sm text-[#1A3A2A] hover:underline">{isUr ? "→ پروجیکٹس" : "← Projects"}</button>
        <h2 className={`font-bold text-[#1A3A2A] flex-1 min-w-0 truncate ${isUr ? "font-nastaliq font-normal" : ""}`}>{project.name}</h2>
        <span className="text-xs text-gray-500">{finalCount}/{total} {isUr ? "حتمی" : "final"} · {draftCount} {isUr ? "مسودہ" : "draft"}</span>
        <span className={`text-xs ${saveCls}`}>{saveLabel}</span>
      </div>

      <GlossaryPanel
        entries={project.glossary}
        sourceLanguage={project.sourceLanguage}
        targetLanguage={project.targetLanguage}
        onAdd={handleAddGlossaryEntry}
        onUpdate={handleUpdateGlossaryEntry}
        onDelete={handleDeleteGlossaryEntry}
        isUr={isUr}
      />

      <QASummaryStrip summary={qaSummary} sourceLanguage={project.sourceLanguage} targetLanguage={project.targetLanguage} isUr={isUr} />
      <ReviewSummaryPanel summary={reviewSummary} isUr={isUr} />

      <ReviewFilterBar
        filter={reviewFilter}
        summary={reviewSummary}
        totalSegments={project.segments.length}
        onFilterChange={handleFilterChange}
        isUr={isUr}
      />

      <ExportPanel project={project} onImportProject={handleImportProject} isUr={isUr} />

      {/* Sticky navigation row — must be a sibling of the segment list, NOT inside
          ReviewFilterBar, so its containing block spans the full scroll area.
          top-16 = site header height (h-16 on mobile). */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm -mx-4 px-4 py-1.5 flex items-center justify-between gap-2 text-xs text-gray-500 mb-3">
        <span>{isUr ? `${visibleSegments.length} / ${project.segments.length} دکھایا جا رہا ہے` : `Showing ${visibleSegments.length} of ${project.segments.length}`}</span>
        <button
          type="button"
          onClick={handleNext}
          disabled={visibleSegments.length === 0}
          className="h-7 px-3 rounded border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
{isUr ? "↑ اگلا" : "Next ↓"}
        </button>
      </div>

      {visibleSegments.length === 0 ? (
        <div className="text-center py-10 text-gray-400 space-y-3">
          <p className="text-sm">{isUr ? "اس فلٹر میں کوئی سیگمنٹ نہیں۔" : "No segments in this view."}</p>
          <button type="button" onClick={() => handleFilterChange("all")}
            className="h-8 px-4 rounded border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            {isUr ? "سب دکھائیں" : "Show all"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSegments.map(seg => (
            <div key={seg.id} ref={el => { segmentRefs.current[seg.id] = el; }}>
              <SegmentRow
                segment={seg}
                targetLanguage={project.targetLanguage}
                terminologyFindings={findTerminologyFindings(seg.source, seg.target, project.glossary)}
                qaIssues={runSegmentQA(seg, project.sourceLanguage, project.targetLanguage)}
                memorySuggestion={findExactMemorySuggestion(seg, project.segments)}
                hasRepeatedConflict={conflictMap.get(seg.id) ?? false}
                onTargetChange={handleTargetChange}
                onSetFinal={handleSetFinal}
                onApplyMemory={handleApplyMemory}
                onApprove={handleApprove}
                onRequestChanges={handleRequestChanges}
                isUr={isUr}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
