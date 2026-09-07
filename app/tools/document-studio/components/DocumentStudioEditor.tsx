"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../lib/language-context";
import { useEditor } from "@tiptap/react";
import { consumeHandoff } from "../../translation-studio/utils/translationHandoff";
import { extractPlainText, createDocumentAnalysisContext, type DocNode } from "../utils/extractPlainText";
import { normalizeDocumentNodes, type NormalizeReport } from "../utils/normalizeDocumentNodes";
import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import {
  loadDocumentSettings,
  saveDocumentSettings,
  type DocumentStudioSettings,
} from "../utils/documentSettings";
import { resolvePageLayout } from "../utils/pageLayout";
import {
  applyPresetToSettings,
  loadSelectedPresetId,
  saveSelectedPresetId,
  type PresetId,
} from "../utils/publishingPresets";
import { buildDocumentAuditReport, type QualityAuditReport } from "../utils/buildDocumentAuditReport";
import { buildDocumentStats, type DocumentStats } from "../utils/buildDocumentStats";
import { buildDocumentHealthReport, type DocumentHealthReport } from "../utils/buildDocumentHealthReport";
import { generateDocumentSuggestions, type DocumentSuggestion } from "../utils/generateDocumentSuggestions";
import { extractDocumentOutline, type OutlineEntry } from "../utils/documentOutline";
import {
  addGlossaryEntry,
  updateGlossaryEntry,
  removeGlossaryEntry,
  loadGlossary,
  saveGlossary,
  exportGlossaryToJson,
  importGlossaryFromJson,
  type GlossaryEntry,
} from "../utils/glossary";
import {
  createReviewState,
  acceptSuggestion,
  ignoreSuggestion,
  acceptCategory,
  ignoreCategory,
  refreshPendingSuggestions,
  type SuggestionReviewState,
} from "../utils/suggestionReview";
import { buildDocxBlob } from "../utils/buildDocxDocument";
import { plainTextToDocNodeWithDir, normalizeDocxParagraphBreaks } from "../utils/plainTextToDocNode";
import { validateFile } from "../../../utils/fileValidation";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";
import { formatFileSize } from "../../../utils/formatFileSize";
import {
  ParagraphWithDir,
  HeadingWithDir,
  BLOCK_STYLE_EDITOR_CSS,
  createDocumentStudioExtensions,
} from "../utils/documentSchema";
import {
  applyDocumentDirection,
  buildDocumentStudioExample,
  buildReplaceAllTransaction,
  editorToPlainText,
  findAllRangesInEditor,
  findBlockStartPosition,
  findSuggestionRange,
  replaceAll,
  transformPastedSlice,
} from "../utils/documentCommands";
import DocumentToolbar from "./DocumentToolbar";
import DocumentCanvas from "./DocumentCanvas";
import DocumentStudioPanels, { type StudioTab } from "./DocumentStudioPanels";

/** Compatibility re-exports — existing tests may still import from this file. */
export { ParagraphWithDir, HeadingWithDir, BLOCK_STYLE_EDITOR_CSS };
export { buildDocumentStudioExample, buildReplaceAllTransaction };

const DRAFT_STORAGE_KEY = "qalam-document-studio-draft";
const AUTOSAVE_DEBOUNCE_MS = 1000;
const LARGE_DOCUMENT_CHAR_THRESHOLD = 5000;
const ANALYSIS_DEBOUNCE_MS = 300;

function getInitialDraftContent(): DocNode | string {
  if (typeof window === "undefined") return "<p></p>";
  try {
    const handoffDoc = consumeHandoff();
    if (handoffDoc && typeof handoffDoc === "object" && (handoffDoc as DocNode).type === "doc") {
      return handoffDoc as DocNode;
    }
  } catch {
    // consumeHandoff failed — proceed to normal draft loading
  }
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return "<p></p>";
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed as DocNode;
    }
  } catch (err) {
    console.error("Failed to parse initial draft from localStorage:", err);
  }
  return "<p></p>";
}

export default function DocumentStudioEditor() {
  const { language: uiLanguage } = useLanguage();
  const isUr = uiLanguage === "ur";
  const [dir, setDir] = useState<"rtl" | "ltr">(isUr ? "rtl" : "ltr");
  const [documentSettings, setDocumentSettings] = useState<DocumentStudioSettings>(() => loadDocumentSettings());
  // Batch 16B — computed once per render, shared by the page preview and
  // the ruler so their boundaries always agree (single geometry source).
  const pageLayout = resolvePageLayout({
    size: documentSettings.page.size,
    orientation: documentSettings.page.orientation,
    marginPreset: documentSettings.page.margins.preset,
    customMargins: documentSettings.page.margins,
  });

  useEffect(() => {
    saveDocumentSettings(documentSettings);
  }, [documentSettings]);


  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("auto");
  const [lastResolved, setLastResolved] = useState<ResolvedLanguage | null>(null);

  useEffect(() => {
    trackToolOpenOnce("document_studio");
  }, []);

  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [exampleJustLoaded, setExampleJustLoaded] = useState(false);
  const standardizeButtonRef = useRef<HTMLButtonElement>(null);

  // Publishing Preset Foundation — Phase 1 (2026-08-09). Batch 16A
  // (2026-08-11) wired this through documentSettings.typography into the
  // editor CSS variables, PDF body defaults, and DOCX paragraph/run
  // defaults — no longer "selection only"; changing settings.typography
  // genuinely changes rendered output across Editor/PDF/DOCX.
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>(() => loadSelectedPresetId());
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  const [preview, setPreview] = useState<{
    document: DocNode;
    report: NormalizeReport;
    beforePlain: string;
  } | null>(null);
  const [alreadyClean, setAlreadyClean] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docxImportNotice, setDocxImportNotice] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSummary, setPdfSummary] = useState<{
    pages: number;
    fileSizeLabel: string;
    fontsUsed: string[];
    fontFallbacks: Array<{ requested: string; used: string }>;
  } | null>(null);

  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [health, setHealth] = useState<DocumentHealthReport | null>(null);
  const [reviewState, setReviewState] = useState<SuggestionReviewState>(createReviewState([]));

  // Phase 1 Professional Usability (2026-08-09) — Find & Replace state.
  // Document Studio Simplification (2026-08-10) — replaces the previous
  // "everything stacked and visible at once" layout (Find & Replace,
  // Outline, Stats, Quality Audit, Suggestions, Glossary, Settings all
  // shown simultaneously) with a single-tab system: at most ONE
  // secondary panel is visible at a time, and the editor itself stays
  // the clean, unchanged default view. All existing state/handlers below
  // are unchanged — this only reorganizes how they're rendered.
  const [activeTab, setActiveTab] = useState<StudioTab>("none");
  const toggleTab = (tab: Exclude<StudioTab, "none">) => setActiveTab((prev) => (prev === tab ? "none" : tab));
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Phase 1 Professional Usability (2026-08-09) — Document Outline state.
  const [outline, setOutline] = useState<OutlineEntry[]>([]);

  // User-defined Terminology Glossary MVP (2026-08-09) — loaded once from
  // localStorage on mount, same lazy-initializer pattern already used for
  // the draft content above (getInitialDraftContent).
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => loadGlossary());
  // Mirrors `glossary` state but as a ref, so the onUpdate callback below
  // (captured once when the editor is created — same reasoning as
  // hasAuditReportRef above) always reads the CURRENT glossary rather
  // than whatever it was when the editor was first created.
  const glossaryRef = useRef<GlossaryEntry[]>(glossary);
  useEffect(() => {
    glossaryRef.current = glossary;
    saveGlossary(glossary);
    // Refresh suggestions immediately when the glossary itself changes
    // (add/edit/delete/import) — otherwise a newly-added glossary term
    // wouldn't be reflected in the Suggestions panel until the next
    // document edit, which would feel like the glossary "didn't work".
    if (editor) {
      const json = editor.getJSON();
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, undefined, glossary)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glossary]);
  const [isAuditStale, setIsAuditStale] = useState(false);
  // Mirrors "auditReport !== null" but as a ref, so the onUpdate callback
  // below (captured once when the editor is created) can check it without
  // reading stale React state from a closure.
  const hasAuditReportRef = useRef(false);

  // Browser-safe timeout ref (avoids Node types dependency)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Maintenance Batch (2026-08-09) — separate debounce timer for the
  // Stats/Health/Suggestions analysis specifically (independent of the
  // autosave timer above, which has its own longer interval and purpose).
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialContent] = useState(() => getInitialDraftContent());

  const editor = useEditor({
    extensions: createDocumentStudioExtensions(),
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir,
        class: "focus:outline-none",
      },
      transformPasted: (slice) => transformPastedSlice(slice, dir),
    },
    onUpdate: ({ editor }) => {
      if (hasAuditReportRef.current) {
        setIsAuditStale(true);
      }
      setAlreadyClean(false);
      setPdfSummary(null);

      // Maintenance Batch (2026-08-09) — run the analysis immediately for
      // small documents (preserves today's exact instant behavior, no
      // delay), but debounce it for large ones so rapid typing doesn't
      // trigger a full re-scan on every single keystroke. The cheap
      // JSON-length check below is only an approximate size proxy —
      // deliberately cheap so deciding whether to debounce doesn't itself
      // add meaningful cost.
      const json = editor.getJSON();

      // Phase 1 Professional Usability (2026-08-09) — Document Outline
      // updates immediately (not debounced with the rest of the analysis
      // below): extracting headings is a cheap plain-array walk, not a
      // regex-heavy scan, so there's no performance reason to delay it,
      // and a lagging outline would feel wrong for a navigation aid.
      setOutline(extractDocumentOutline(json));

      // Shared Analysis Context (2026-08-09) — computed ONCE per
      // analysis run (inside runAnalysis, so it's still properly
      // debounced for large documents — computing it here, outside
      // runAnalysis, would defeat the debounce entirely since context
      // creation IS the expensive getBlockTexts traversal) and passed to
      // all three analysis functions, replacing what was previously 8
      // independent getBlockTexts(doc) calls with exactly 1.
      const runAnalysis = () => {
        const context = createDocumentAnalysisContext(json);
        setStats(buildDocumentStats(json, context));
        setHealth(buildDocumentHealthReport(json, context));
        setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, context, glossaryRef.current)));
      };

      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);

      const approximateSize = JSON.stringify(json).length;
      if (approximateSize < LARGE_DOCUMENT_CHAR_THRESHOLD) {
        runAnalysis();
      } else {
        analysisTimerRef.current = setTimeout(runAnalysis, ANALYSIS_DEBOUNCE_MS);
      }

      // Deliberately NOT clearing docxImportNotice here anymore (2026-08-08
      // requirement change): it must be a genuinely persistent, explicitly-
      // dismissed notice (the "Got it" button below), not one that quietly
      // vanishes the moment the user types — that was too easy to miss.

      setSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        try {
          const json = editor.getJSON();
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(json));
          setSaveStatus("saved");
        } catch (err) {
          console.error("Autosave error:", err);
          setSaveStatus("idle");
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const syncEmpty = () => {
      const empty = editor.isEmpty;
      setIsEditorEmpty(empty);
      if (empty) setExampleJustLoaded(false);
    };
    syncEmpty();
    editor.on("update", syncEmpty);
    editor.on("create", syncEmpty);
    return () => {
      editor.off("update", syncEmpty);
      editor.off("create", syncEmpty);
    };
  }, [editor]);

  // Persist direction on root + every paragraph/heading so empty RTL
  // documents place the caret on the right and new blocks inherit RTL.
  useEffect(() => {
    if (!editor) return;
    applyDocumentDirection(editor, dir);
  }, [editor, dir]);

  const handleLoadExample = () => {
    if (!editor) return;
    const exampleDoc = buildDocumentStudioExample(dir);
    editor.chain().focus().setContent(exampleDoc).run();
    // NOTE: applyDocumentDirection is intentionally NOT called here.
    // That function bulk-overwrites every block's dir with the document-
    // level dir, which would destroy the per-block direction detection
    // we just set. Only the editor DOM's own dir attribute needs updating.
    const dom = editor.view.dom as HTMLElement;
    dom.setAttribute("dir", dir);
    dom.style.direction = dir;
    setExampleJustLoaded(true);
    trackEvent("tool_example", { tool: "document_studio" });
    requestAnimationFrame(() => {
      standardizeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleFocusPaste = () => {
    editor?.chain().focus().run();
  };


  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    };
  }, []);

  // Initial stats/health for whatever content loaded first (fresh empty
  // doc or a restored draft) — onUpdate only fires on subsequent user
  // edits, not on the editor's own first mount.
  useEffect(() => {
    if (editor) {
      const json = editor.getJSON();
      setOutline(extractDocumentOutline(json));
      const context = createDocumentAnalysisContext(json);
      setStats(buildDocumentStats(json, context));
      setHealth(buildDocumentHealthReport(json, context));
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, context, glossaryRef.current)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    if (!editor.isFocused) {
      editor.commands.focus(editor.isEmpty ? "start" : "end");
    }
  };

  const handleNewDocument = () => {
    if (!editor) return;
    if (window.confirm(isUr ? "کیا آپ نیا مسودہ شروع کرنا چاہتے ہیں؟ غیر محفوظ شدہ تبدیلیاں ختم ہو جائیں گی۔" : "Start a new document? Unsaved changes will be lost.")) {
      editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", attrs: { dir }, content: [] }] });
      applyDocumentDirection(editor, dir);
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to clear localStorage", e);
      }
      setSaveStatus("idle");
      setPreview(null);
      setAlreadyClean(false);
      setExampleJustLoaded(false);
      setLastResolved(null);
      setDocxImportNotice(false);
      setAuditReport(null);
      hasAuditReportRef.current = false;
      setIsAuditStale(false);
    }
  };

  const handleClearDraft = () => {
    if (window.confirm("کیا آپ محفوظ شدہ ڈرافٹ کو حذف کرنا چاہتے ہیں؟ / Clear saved draft from browser storage?")) {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setSaveStatus("idle");
      } catch (e) {
        console.error("Failed to remove draft", e);
      }
    }
  };

  /** Clear TipTap content + related UI state (parallel to Quality Checker Clear). */
  const handleClearText = () => {
    if (!editor) return;
    editor.commands.clearContent(true);
    setExampleJustLoaded(false);
    setPreview(null);
    setAlreadyClean(false);
    setLastResolved(null);
    setDocxImportNotice(false);
    setAuditReport(null);
    hasAuditReportRef.current = false;
    setIsAuditStale(false);
    setUploadError(null);
    setPdfError(null);
    setPdfSummary(null);
    setCopied(false);
  };

  // v1 file import (Option A, per Sajjad's 2026-08-08 decision): both .txt
  // and .docx come in as PLAIN TEXT only — extractTextFromFile() uses
  // mammoth.extractRawText() for .docx, which does not preserve headings/
  // bold/lists/layout. A formatting-preserving import (mammoth.convertToHtml
  // + TipTap's generateJSON) is a separate, later "Option B" spike, not part
  // of this change. Reuses the exact same validateFile/extractTextFromFile
  // Document Cleaner already uses, and the newly-shared plainTextToDocNode.
  const handleUploadFile = async (file: File) => {
    setUploadError(null);
    setDocxImportNotice(false);

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "فائل ناکام ہو گئی / File validation failed.");
      return;
    }

    // Pre-import warning (added 2026-08-08, per Sajjad's requirement that the
    // formatting-loss warning appear BEFORE import, not only after): a .docx
    // file always loses its original formatting on import in v1 (Option A —
    // plain text only), so this needs saying before the user commits to it,
    // not just as an after-the-fact notice.
    if (file.name.toLowerCase().endsWith(".docx")) {
      const proceedWithDocx = window.confirm(
        "یہ .docx فائل صرف خام متن کے طور پر درآمد ہوگی — عنوانات (headings)، بولڈ، فہرستیں (lists) اور صفحہ بندی محفوظ نہیں رہیں گی۔ جاری رکھیں؟\n\nThis .docx file will be imported as plain text only — headings, bold, lists, and layout will NOT be preserved. Continue?"
      );
      if (!proceedWithDocx) return;
    }

    if (editor && !editor.isEmpty) {
      const confirmed = window.confirm(
        "موجودہ متن کو اپلوڈ شدہ فائل سے تبدیل کر دیا جائے گا۔ جاری رکھیں؟ / This will replace the current content in the editor. Continue?"
      );
      if (!confirmed) return;
    }

    setIsImporting(true);
    try {
      const rawText = await extractTextFromFile(file);
      const isDocxFile = file.name.toLowerCase().endsWith(".docx");
      // DOCX-only fix (2026-08-08): collapse mammoth's artificial "\n\n"
      // paragraph separators (and its trailing end-of-document artifact)
      // before this reaches plainTextToDocNode (unchanged) — see
      // normalizeDocxParagraphBreaks' own comment for the full empirical
      // basis. .txt files skip this entirely; their blank lines and
      // trailing newline (if any) are already meaningful as typed.
      const text = isDocxFile ? normalizeDocxParagraphBreaks(rawText) : rawText;
      const docNode = plainTextToDocNodeWithDir(text, dir);
      editor?.commands.setContent(docNode);

      // Same full-state reset as New Document — the previous document's
      // preview/audit/save state no longer describes what's in the editor.
      setSaveStatus("idle");
      setPreview(null);
      setAlreadyClean(false);
      setAuditReport(null);
      hasAuditReportRef.current = false;
      setIsAuditStale(false);

      if (isDocxFile) {
        setDocxImportNotice(true);
      }
    } catch (err) {
      console.error("Failed to import file:", err);
      setUploadError("فائل درآمد کرنے میں خرابی ہوئی / Failed to import file.");
    } finally {
      setIsImporting(false);
    }
  };


  // Mode change: never present a preview generated under a different language
  useEffect(() => {
    setPreview(null);
    setAlreadyClean(false);
    setLastResolved(null);
    if (processingLanguage === "en") setDir("ltr");
    else if (processingLanguage === "ur" || processingLanguage === "ar") setDir("rtl");
    // Auto: display dir stays user-controlled until process runs
  }, [processingLanguage]);

  /** Write normalized TipTap JSON into the live editor (with undo history). */
  const applyNormalizedDocument = (normalized: DocNode): boolean => {
    if (!editor) return false;
    try {
      const { state, view } = editor;
      const normalizedDoc = state.schema.nodeFromJSON(normalized);
      if (normalizedDoc.type.name !== state.doc.type.name) {
        console.error("Invalid doc type during normalization application");
        return false;
      }
      const tr = state.tr.replaceWith(0, state.doc.content.size, normalizedDoc.content);
      tr.setMeta("addToHistory", true);
      view.dispatch(tr);
      return true;
    } catch (err) {
      console.error("Failed to apply standardization transaction:", err);
      try {
        editor.commands.setContent(normalized);
        return true;
      } catch (err2) {
        console.error("Fallback setContent also failed:", err2);
        return false;
      }
    }
  };

  const handleStandardizeClick = () => {
    setExampleJustLoaded(false);
    if (!editor) return;
    try {
      const currentJson = editor.getJSON() as DocNode;
      const beforePlain = extractPlainText(currentJson, dir === "ltr" ? "ltr" : "rtl");
      const result = normalizeDocumentNodes(currentJson, processingLanguage);
      setLastResolved(result.report.resolvedLanguage);
      trackEvent("tool_process", {
        tool: "document_studio",
        mode: processingLanguage,
        resolved_mode: result.report.resolvedLanguage,
        success: true,
      });
      // Do not force a single editor dir from document-level resolve.

      if (!result.changed) {
        setAlreadyClean(true);
        setPreview(null);
        requestAnimationFrame(() => {
          standardizeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        return;
      }

      // Apply into TipTap immediately so the editor shows normalized text
      // (preview/confirm alone left the editor looking "unchanged").
      const applied = applyNormalizedDocument(result.document);
      if (applied) {
        trackEvent("preview_confirm", {
          tool: "document_studio",
          mode: processingLanguage,
          success: true,
        });
      }
      setAlreadyClean(false);
      setPreview({
        document: result.document,
        report: result.report,
        beforePlain,
      });
      requestAnimationFrame(() => {
        standardizeButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch (err) {
      console.error("Standardize failed:", err);
      setAlreadyClean(false);
      setPreview(null);
    }
  };

  const handleConfirmStandardize = () => {
    // Changes are applied on Standardize; Confirm only dismisses the summary.
    if (!preview) return;
    trackEvent("preview_confirm", { tool: "document_studio", mode: processingLanguage, success: true });
    setPreview(null);
  };

  const handleCancelStandardize = () => {
    trackEvent("preview_cancel", { tool: "document_studio", mode: processingLanguage });
    setPreview(null);
  };

  const handleRunAudit = () => {
    if (!editor) return;
    const report = buildDocumentAuditReport(editor.getJSON() as DocNode, undefined, processingLanguage);
    setAuditReport(report);
    hasAuditReportRef.current = true;
    setIsAuditStale(false);
  };

  // Phase 1 Professional Usability (2026-08-09) — Find & Replace.
  // Recomputes matches fresh from the live editor on every keystroke in
  // the search box, matching document text at that moment (never a
  // stale/cached position list). Selecting a match uses TipTap's own
  // setTextSelection command — a native selection, giving the browser's
  // real, built-in highlight for the current match, rather than a custom
  // decoration overlay (keeping this to "TipTap commands only", per the
  // explicit requirement).
  const currentMatches = editor ? findAllRangesInEditor(editor, findQuery) : [];

  const handleFindQueryChange = (value: string) => {
    setFindQuery(value);
    setCurrentMatchIndex(value ? 0 : -1);
    if (editor && value) {
      const matches = findAllRangesInEditor(editor, value);
      if (matches.length > 0) {
        editor.chain().setTextSelection(matches[0]).scrollIntoView().run();
      }
    }
  };

  const handleFindNext = () => {
    if (!editor || currentMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % currentMatches.length;
    setCurrentMatchIndex(nextIndex);
    editor.chain().focus().setTextSelection(currentMatches[nextIndex]).scrollIntoView().run();
  };

  const handleFindPrevious = () => {
    if (!editor || currentMatches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
    setCurrentMatchIndex(prevIndex);
    editor.chain().focus().setTextSelection(currentMatches[prevIndex]).scrollIntoView().run();
  };

  // Replaces only the CURRENT match — a real, targeted ProseMirror
  // transaction (insertContentAt), automatically undoable via TipTap's
  // built-in History extension, same as the Suggestion Review workflow's
  // own apply mechanism. Never touches any other match.
  // Batch 16D — Replace Current: preserves source run's marks (bold/italic/
  // fontFamily/fontSize/underline) by using a direct ProseMirror transaction
  // instead of insertContentAt (which applies editor defaults, not source marks).
  const handleReplaceCurrent = () => {
    if (!editor || currentMatches.length === 0 || currentMatchIndex < 0) return;
    const range = currentMatches[currentMatchIndex];
    // Get source marks from the node at this position.
    const node = editor.state.doc.nodeAt(range.from);
    const marks = node?.isText ? [...node.marks] : [];
    const { tr, schema } = editor.state;
    const textNode = replaceQuery ? schema.text(replaceQuery, marks) : null;
    tr.replaceWith(range.from, range.to, textNode ? [textNode] : []);
    editor.view.dispatch(tr);
    const refreshed = findAllRangesInEditor(editor, findQuery);
    setCurrentMatchIndex(refreshed.length > 0 ? Math.min(currentMatchIndex, refreshed.length - 1) : -1);
  };

  // Batch 16D — Replace All: terminates even when replacement contains the
  // search query, by collecting ALL original matches ONCE (descending by
  // position) and applying them in one transaction. Descending order prevents
  // earlier replacements shifting later offsets. One transaction = one undo step.
  const handleReplaceAll = () => {
    if (!editor || !findQuery) return;
    replaceAll(editor, findQuery, replaceQuery);
    setCurrentMatchIndex(-1);
  };

  const handleCloseFindReplace = () => {
    setActiveTab("none");
    setFindQuery("");
    setReplaceQuery("");
    setCurrentMatchIndex(-1);
  };

  // Phase 1 Professional Usability (2026-08-09) — Document Outline
  // navigation. Moves the cursor to the clicked heading via TipTap's own
  // setTextSelection + scrollIntoView commands — a real, native cursor
  // move, not a custom scroll implementation.
  // Publishing Preset Foundation — Phase 1 (2026-08-09). Persists the
  // choice only — no export or editor-formatting side effect yet.
  const handlePresetChange = (id: PresetId) => {
    setSelectedPresetId(id);
    saveSelectedPresetId(id);
    setDocumentSettings((prev) => {
      const next = applyPresetToSettings(prev, id);
      saveDocumentSettings(next);
      return next;
    });
    setPdfSummary(null);
    saveSelectedPresetId(id);
  };

  const handleOutlineNavigate = (blockIndex: number) => {
    if (!editor) return;
    const pos = findBlockStartPosition(editor, blockIndex);
    if (pos !== null) {
      editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    }
  };

  // User-defined Terminology Glossary MVP (2026-08-09) — thin wrappers
  // around the pure functions in glossary.ts. All persistence happens
  // via the useEffect above (triggered by the `glossary` state change),
  // not here directly, keeping these handlers simple.
  const handleGlossaryAdd = (incorrectTerm: string, correctTerm: string, note: string): string | null => {
    const { entries, error } = addGlossaryEntry(glossary, incorrectTerm, correctTerm, note || undefined);
    if (!error) setGlossary(entries);
    return error;
  };

  const handleGlossaryUpdate = (id: string, incorrectTerm: string, correctTerm: string, note: string): string | null => {
    const { entries, error } = updateGlossaryEntry(glossary, id, incorrectTerm, correctTerm, note || undefined);
    if (!error) setGlossary(entries);
    return error;
  };

  const handleGlossaryDelete = (id: string) => {
    setGlossary((prev) => removeGlossaryEntry(prev, id));
  };

  const handleGlossaryExport = () => {
    const json = exportGlossaryToJson(glossary);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-glossary.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGlossaryImport = (jsonText: string): string | null => {
    const { entries, error } = importGlossaryFromJson(jsonText);
    if (error) return error;
    // Imported entries are MERGED with the existing glossary (via
    // addGlossaryEntry's own duplicate handling — an imported term that
    // already exists updates that entry rather than duplicating it),
    // rather than replacing the whole glossary outright.
    let merged = glossary;
    for (const entry of entries) {
      merged = addGlossaryEntry(merged, entry.incorrectTerm, entry.correctTerm, entry.note).entries;
    }
    setGlossary(merged);
    return null;
  };

  // Suggestion Review Workflow (2026-08-09) — Accept/Ignore only move a
  // suggestion between the pending/accepted/ignored lists; neither one
  // touches the editor's content. No text changes until "Apply Accepted"
  // is pressed, and even then only the specific accepted items are
  // applied (never a blind bulk find-replace).
  const handleAcceptSuggestion = (key: string) => {
    setReviewState((prev) => acceptSuggestion(prev, key));
  };

  const handleIgnoreSuggestion = (key: string) => {
    setReviewState((prev) => ignoreSuggestion(prev, key));
  };

  // Batch Actions — only ever affect PENDING items in the given
  // category; already-accepted/ignored items and other categories are
  // untouched. No global "Fix All".
  const handleAcceptCategory = (category: DocumentSuggestion["category"]) => {
    setReviewState((prev) => acceptCategory(prev, category));
  };

  const handleIgnoreCategory = (category: DocumentSuggestion["category"]) => {
    setReviewState((prev) => ignoreCategory(prev, category));
  };

  // Applies each currently-accepted suggestion as its own real,
  // targeted ProseMirror transaction (editor.chain()...insertContentAt),
  // not a raw string replace on the document — this is what makes it
  // automatically undoable via TipTap's built-in History extension
  // (part of StarterKit by default), satisfying "preserve undo safety"
  // without any extra plumbing. A suggestion whose original text can no
  // longer be found (stale — the user already changed that part of the
  // document some other way) is safely skipped, never force-applied.
  const handleApplyAccepted = () => {
    if (!editor) return;
    for (const suggestion of reviewState.accepted) {
      const range = findSuggestionRange(editor, suggestion.originalText);
      if (range) {
        editor.chain().focus().insertContentAt(range, suggestion.suggestedText).run();
      }
    }
    // State Refresh Verification (2026-08-09): each insertContentAt above
    // already triggers onUpdate (which itself calls setStats/setHealth/
    // refreshPendingSuggestions), but that refresh runs against the
    // state BEFORE `accepted` is cleared below, and the ordering of
    // several rapid transactions vs this final state update is worth
    // being explicit about rather than relying solely on React's
    // batching. Recomputing directly here from the editor's final JSON
    // guarantees stats/health reflect the truly-final document, and
    // accepted is cleared in the same update.
    const finalJson = editor.getJSON();
    const finalContext = createDocumentAnalysisContext(finalJson);
    setStats(buildDocumentStats(finalJson, finalContext));
    setHealth(buildDocumentHealthReport(finalJson, finalContext));
    setReviewState((prev) => refreshPendingSuggestions({ ...prev, accepted: [] }, generateDocumentSuggestions(finalJson, finalContext, glossaryRef.current)));
  };

  const handleCopy = async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editorToPlainText(editor, dir));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback
    }
  };

  const handleDownload = () => {
    trackEvent("tool_download", { tool: "document_studio", export_format: "txt", mode: processingLanguage, success: true });
    if (!editor) return;
    const text = editorToPlainText(editor, dir);
    // A leading BOM (U+FEFF) makes apps that guess a text file's encoding —
    // Word chief among them — reliably detect UTF-8 instead of guessing.
    // Without it, Word's "open this .txt file directly" path could mis-detect
    // the encoding and mangle the invisible RTL isolation marks (U+200F)
    // used elsewhere in this file for correct bracket/digit ordering, even
    // though the exact same text pasted from the clipboard rendered fine
    // (clipboard content always carries unambiguous Unicode metadata).
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-document.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Async — unlike handleDownload above — because buildDocxBlob is async
  // (docx's Packer.toBlob() genuinely is; see PHASE-3C-DOCX-SPEC.md §3).
  const handleDownloadDocx = async () => {
    trackEvent("tool_download", { tool: "document_studio", export_format: "docx", mode: processingLanguage, success: true });
    if (!editor) return;
    try {
      const blob = await buildDocxBlob(editor.getJSON() as DocNode, dir, documentSettings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qalam-document.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate .docx:", err);
    }
  };

  // v1 — visual/print quality only, no searchable text layer (see
  // docs/KNOWN-LIMITATIONS.md's "PDF Export" section for the full
  // investigation behind that decision). Sends structured DocNode JSON
  // to the server, not raw HTML — the server (app/api/export-pdf/route.ts)
  // builds the actual HTML and renders it, keeping the request small and
  // the server's own template in full control of what markup ever exists.
  const handleDownloadPdf = async () => {
    trackEvent("tool_download", { tool: "document_studio", export_format: "pdf", mode: processingLanguage, success: true });
    if (!editor) return;
    setPdfError(null);
    setPdfSummary(null);
    setIsExportingPdf(true);
    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: editor.getJSON(), dir, settings: documentSettings }),
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const pageCountHeader = response.headers.get("X-Pdf-Page-Count");
      const fileSizeHeader = response.headers.get("X-Pdf-File-Size-Bytes");
      const fontsUsedHeader = response.headers.get("X-Pdf-Fonts-Used");
      const fontFallbacksHeader = response.headers.get("X-Pdf-Font-Fallbacks");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qalam-document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (pageCountHeader && fileSizeHeader) {
        let fontsUsed: string[] = [];
        let fontFallbacks: Array<{ requested: string; used: string }> = [];
        try {
          fontsUsed = fontsUsedHeader ? JSON.parse(fontsUsedHeader) : [];
        } catch {
          fontsUsed = [];
        }
        try {
          fontFallbacks = fontFallbacksHeader ? JSON.parse(fontFallbacksHeader) : [];
        } catch {
          fontFallbacks = [];
        }
        setPdfSummary({
          pages: parseInt(pageCountHeader, 10),
          fileSizeLabel: formatFileSize(parseInt(fileSizeHeader, 10)),
          fontsUsed,
          fontFallbacks,
        });
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setPdfError("PDF بنانے میں خرابی ہوئی / Failed to generate PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="site-container">
      {/* Document Studio Simplification (2026-08-10) — the editor card
          below is now the ONLY thing shown by default: toolbar, the text
          area itself, and export/save actions. Every analysis/utility
          system (Find & Replace, Outline, Quality Audit + Suggestions,
          Glossary, Ruler + Publishing Presets) moved into the tab bar
          further down — at most one of those panels is ever visible at
          once, and none of them show unless explicitly opened. */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#1A3A2A]/10 shadow-[0_2px_20px_rgba(26,58,42,0.06)]">
        <div className="flex justify-between items-center mb-3">
          <DocumentToolbar editor={editor} dir={dir} setDir={setDir} processingLanguage={processingLanguage} setProcessingLanguage={setProcessingLanguage} isUr={isUr} />
          <div className="text-xs text-stone-500 font-sans" dir="ltr">
            {saveStatus === "saving" && (isUr ? "💾 محفوظ ہو رہا ہے…" : "💾 Saving...")}
            {saveStatus === "saved" && (isUr ? "✓ براؤزر میں محفوظ" : "✓ Saved to browser")}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <input
            type="file"
            accept=".txt,.docx"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              if (f) handleUploadFile(f);
              e.target.value = ""; // allow re-selecting the same file later
            }}
            className="hidden"
            id="document-studio-upload-input"
            disabled={isImporting}
          />
          <label
            htmlFor="document-studio-upload-input"
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-md text-[15px] font-semibold border-2 transition-all ${
              isImporting
                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                : "border-[#1A3A2A] bg-[#1A3A2A] text-white hover:bg-[#244E38] hover:border-[#244E38] cursor-pointer shadow-sm"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className={isUr ? "font-naskh" : ""}>
              {isImporting ? (isUr ? "درآمد ہو رہا ہے..." : "Importing…") : (isUr ? "فائل اپلوڈ کریں" : "Upload File")}
            </span>
          </label>
          {!isImporting && (
            <span className="text-[13px] text-gray-400 font-mono select-none" dir="ltr">TXT · DOCX</span>
          )}
        </div>

        {uploadError && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium" dir="rtl">
            {uploadError}
          </div>
        )}

        {pdfError && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium" dir="rtl">
            {pdfError}
          </div>
        )}

        {docxImportNotice && (
          <div className="mb-3 bg-amber-50 border-2 border-amber-400 text-amber-900 p-3 rounded-lg text-xs flex items-start justify-between gap-3" dir="rtl">
            <span>
              ⚠️ .docx فائل صرف خام متن کے طور پر درآمد ہوئی ہے — اصل فارمیٹنگ (headings، bold، lists، ترتیب) محفوظ نہیں رہی۔ / The .docx file was imported as plain text only — original formatting (headings, bold, lists, layout) was not preserved.
            </span>
            <button
              type="button"
              onClick={() => setDocxImportNotice(false)}
              className="shrink-0 px-2 py-1 rounded-md border border-amber-400 text-amber-800 hover:bg-amber-100 transition text-xs font-semibold"
              dir="ltr"
            >
              سمجھ گیا / Got it
            </button>
          </div>
        )}

        <DocumentCanvas
          editor={editor}
          dir={dir}
          isUr={isUr}
          isEditorEmpty={isEditorEmpty}
          documentSettings={documentSettings}
          pageLayout={pageLayout}
          onLoadExample={handleLoadExample}
          onWrapperClick={handleWrapperClick}
        />

        {/* Primary processing actions — directly under editor (mobile + desktop) */}
        <div className="mt-4 space-y-3" dir={dir}>
          {exampleJustLoaded && (
            <p
              className={`rounded-lg border border-[#1A3A2A]/15 bg-[#F3F7F2] px-3 py-2.5 text-sm font-medium text-[#1A3A2A] ${isUr ? "font-naskh" : ""}`}
              role="status"
            >
              {isUr
                ? "مثال لوڈ ہوگئی۔ اردو حروف کی اصلاح کے لیے Standardize سے پہلے اردو موڈ منتخب کریں۔ مخلوط متن کے لیے Auto محفوظ صفائی کرتا ہے۔"
                : "Example loaded. For Urdu letter normalization, choose Urdu mode before Standardize. Auto performs safe mixed-language cleanup."}
            </p>
          )}

          <div className="flex flex-wrap gap-2 items-center" dir={isUr ? "rtl" : "ltr"}>
            {/* Primary action */}
            <button
              ref={standardizeButtonRef}
              type="button"
              onClick={handleStandardizeClick}
              className={`h-11 px-5 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-900/20 ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "معیاری بنائیں" : "Standardize Document"}
            </button>
            {/* Strong secondary */}
            <button
              type="button"
              onClick={handleRunAudit}
              className={`h-11 px-4 rounded-lg text-sm font-semibold border-2 border-amber-600 text-amber-700 hover:bg-amber-50 ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "معیار جانچیں" : "Run Quality Audit"}
            </button>
            {/* Neutral secondary */}
            <button
              type="button"
              onClick={handleNewDocument}
              className={`h-11 px-4 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "نیا مسودہ" : "New Document"}
            </button>
            {/* Destructive outline */}
            <button
              type="button"
              onClick={handleClearText}
              disabled={isEditorEmpty}
              className={`h-11 px-4 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "متن صاف کریں" : "Clear Text"}
            </button>
            {/* Destructive outline */}
            <button
              type="button"
              onClick={handleClearDraft}
              className={`h-11 px-4 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "ڈرافٹ صاف کریں" : "Clear Draft"}
            </button>
          </div>

          {preview && editor && (
            <div className="border border-amber-300 rounded-lg p-4 bg-amber-50 space-y-3">
              <p className={`text-sm font-semibold text-gray-800 ${isUr ? "font-naskh" : ""}`}>
                {isUr ? "تبدیلیاں ایڈیٹر میں لگ گئی ہیں (Undo سے واپس)" : "Changes applied in the editor (use Undo to revert)"}
              </p>
              <ul className="text-sm text-gray-700 space-y-1" dir="ltr">
                <li>{isUr ? "کل اصلاحات" : "Total corrections"}: {preview.report.totalCorrections}</li>
                <li>{isUr ? "رسم الخط" : "Script"}: {preview.report.scriptNormalizations} · {isUr ? "فاصلہ" : "Spacing"}: {preview.report.spacingFixes} · {isUr ? "رموزِ اوقاف" : "Punctuation"}: {preview.report.punctuationFixes}</li>
                <li>{isUr ? "موڈ" : "Mode"}: {preview.report.resolvedLanguage} · {isUr ? "سمت" : "Direction"}: {preview.report.direction}</li>
              </ul>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs font-semibold text-gray-600 mb-1 ${isUr ? "font-naskh" : ""}`}>
                    {isUr ? "قبل" : "Before"}
                  </p>
                  <div
                    className="rounded-md border border-gray-200 bg-white p-2 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
                    dir={dir}
                  >
                    {preview.beforePlain}
                  </div>
                </div>
                <div>
                  <p className={`text-xs font-semibold text-gray-600 mb-1 ${isUr ? "font-naskh" : ""}`}>
                    {isUr ? "بعد" : "After"}
                  </p>
                  <div
                    className="rounded-md border border-green-200 bg-green-50/50 p-2 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
                    dir={preview.report.direction}
                  >
                    {extractPlainText(preview.document, preview.report.direction)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={handleConfirmStandardize}
                  className="min-h-[44px] px-5 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  {isUr ? "ٹھیک ہے" : "Dismiss"}
                </button>
              </div>
            </div>
          )}

          {alreadyClean && !preview && (
            <div className={`rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-900 ${isUr ? "font-naskh" : ""}`}>
              <p>
                ✓ {isUr
                  ? "معیاری بنانا مکمل۔ کچھ زبان مخصوص اصلاحات کے لیے مماثل موڈ منتخب کریں۔"
                  : "Standardization complete. Some language-specific corrections require selecting the matching mode."}
              </p>
              {processingLanguage === "auto" && lastResolved === "rtl-neutral" && (
                <p className="mt-1 text-amber-900">
                  {isUr
                    ? "آٹو محفوظ مخلوط صفائی کرتا ہے۔ اردو حروف کی تبدیلی کے لیے «اردو» موڈ منتخب کریں۔"
                    : "Auto performs safe mixed-language cleanup. Choose “Urdu” mode for Urdu letter normalization."}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-5" dir={isUr ? "rtl" : "ltr"}>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="h-10 px-4 rounded-lg text-[15px] font-semibold bg-[#B8935A] text-white hover:bg-[#C9A46B] shadow-sm transition"
            >
              {copied ? (isUr ? "✓ نقل ہو گیا" : "✓ Copied") : (isUr ? "متن نقل کریں" : "Copy Text")}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className={`h-10 px-4 rounded-lg text-[15px] font-semibold bg-[#1A3A2A] text-white hover:bg-[#204a35] focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 shadow-sm transition ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? (
                <span dir="rtl">
                  <span dir="ltr" className="inline-block">TXT</span>
                  {" فائل ڈاؤن لوڈ کریں"}
                </span>
              ) : (
                "Download TXT File"
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              className={`h-10 px-4 rounded-lg text-[15px] font-semibold bg-[#1A3A2A] text-white hover:bg-[#204a35] focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 shadow-sm transition ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? (
                <span dir="rtl">
                  <span dir="ltr" className="inline-block">DOCX</span>
                  {" فائل ڈاؤن لوڈ کریں"}
                </span>
              ) : (
                "Download DOCX"
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className={`h-10 px-4 rounded-lg text-[15px] font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/30 ${
                isExportingPdf
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#1A3A2A] text-white hover:bg-[#204a35]"
              }`}
            >
              {isExportingPdf
                ? (isUr ? "PDF بن رہی ہے..." : "Generating…")
                : isUr
                  ? `PDF ڈاؤن لوڈ کریں${pdfSummary ? ` (${pdfSummary.fileSizeLabel})` : ""}`
                  : `Download PDF${pdfSummary ? ` (${pdfSummary.fileSizeLabel})` : ""}`}
            </button>
          </div>



        </div>

        <p className={`mt-2 text-[12px] text-gray-500 leading-relaxed ${isUr ? "font-naskh" : ""}`} dir={dir}>
          {isUr
            ? "تدوین آپ کے براؤزر میں ہوتی ہے۔ PDF ایکسپورٹ صرف فائل بنانے کے لیے سرور استعمال کرتا ہے — دستاویز محفوظ نہیں کی جاتی。"
            : "Editing stays in your browser. PDF export uses the server only to generate your file — documents are not stored."}
        </p>

        {pdfSummary && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs" dir="ltr">
            <div className="font-semibold text-amber-800 mb-1.5">{isUr ? "✓ PDF برآمد مکمل" : "✓ PDF Export Complete"}</div>
            <div className="text-stone-700 space-y-0.5">
              <div>{isUr ? "صفحات" : "Pages"}: {pdfSummary.pages}</div>
              <div>{isUr ? "فائل سائز" : "File Size"}: {pdfSummary.fileSizeLabel}</div>
              {pdfSummary.fontsUsed.length > 0 && (
                <div>{isUr ? "استعمال شدہ فونٹس" : "Fonts Used"}: {pdfSummary.fontsUsed.map((f) => `✓ ${f}`).join("  ")}</div>
              )}
              {pdfSummary.fontFallbacks.length > 0 && (
                <div className="text-amber-800 mt-1">
                  {pdfSummary.fontFallbacks.map((f) =>
                    isUr
                      ? `${f.requested} مقامی ایڈیٹر میں دستیاب ہے۔ PDF میں ${f.used} استعمال کیا گیا ہے۔`
                      : `${f.requested} is available as a local editor preview. PDF export used ${f.used}.`
                  ).join(" ")}
                </div>
              )}
              <div>{isUr ? "فارمیٹ: بصری / پرنٹ PDF" : "Format: Visual / Print PDF"}</div>
            </div>
          </div>
        )}
      </div>

      <DocumentStudioPanels
        isUr={isUr}
        dir={dir}
        activeTab={activeTab}
        onToggleTab={toggleTab}
        setActiveTab={setActiveTab}
        glossaryCount={glossary.length}
        auditReport={auditReport}
        isAuditStale={isAuditStale}
        find={{
          query: findQuery,
          replaceQuery,
          matchCount: currentMatches.length,
          currentMatchIndex,
          onSearchChange: handleFindQueryChange,
          onReplaceChange: setReplaceQuery,
          onNext: handleFindNext,
          onPrevious: handleFindPrevious,
          onReplaceCurrent: handleReplaceCurrent,
          onReplaceAll: handleReplaceAll,
          onClose: handleCloseFindReplace,
        }}
        outline={{
          entries: outline,
          onNavigate: handleOutlineNavigate,
        }}
        quality={{
          stats,
          health,
          processingLanguage,
          setProcessingLanguage,
          lastResolved,
          reviewState,
          onAccept: handleAcceptSuggestion,
          onIgnore: handleIgnoreSuggestion,
          onApplyAccepted: handleApplyAccepted,
          onAcceptCategory: handleAcceptCategory,
          onIgnoreCategory: handleIgnoreCategory,
        }}
        glossary={{
          entries: glossary,
          onAdd: handleGlossaryAdd,
          onUpdate: handleGlossaryUpdate,
          onDelete: handleGlossaryDelete,
          onExport: handleGlossaryExport,
          onImport: handleGlossaryImport,
        }}
        settings={{
          pageLayout,
          documentSettings,
          setDocumentSettings,
          selectedPresetId,
          onPresetChange: handlePresetChange,
          onPageChange: () => setPdfSummary(null),
        }}
      />
    </div>
  );
}
