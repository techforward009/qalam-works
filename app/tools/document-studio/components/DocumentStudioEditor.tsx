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
  defaultDocumentSettings,
  type DocumentStudioSettings,
} from "../utils/documentSettings";
import { resolvePageLayout, commitPhysicalMarginDrag, type PhysicalMarginEdge } from "../utils/pageLayout";
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
  setEditorContent,
  setLinkHref,
  transformPastedSlice,
  activeBlockStyleId,
} from "../utils/documentCommands";
import {
  defaultDocumentTitle,
  sanitizeDocumentTitle,
} from "../utils/documentTitle";
import {
  isFindOpenShortcut,
  toggleLeftPanel,
  toggleRightPanel,
  type LeftPanelId,
  type RightPanelId,
} from "../utils/documentShell";
import type { MenuActionId } from "../utils/documentMenus";
import {
  dispatchDocumentMenuAction,
  focusExistingDictationControl,
  toggleStudioFullscreen,
  type HelpDialogMode,
} from "../utils/documentMenuActions";
import { validateLineHeight } from "../utils/documentSettings";
import {
  loadDocumentViewMode,
  saveDocumentViewMode,
  loadDocumentZoom,
  saveDocumentZoom,
  loadRulerVisible,
  saveRulerVisible,
  loadRulerUnit,
  saveRulerUnit,
  printDocumentStudio,
  EDITOR_SPELLCHECK_ATTR,
  type DocumentViewMode,
  type DocumentZoom,
  type RulerUnit,
} from "../utils/documentView";
import { QalamPagination } from "../extensions/QalamPagination";
import DocumentToolbar from "./DocumentToolbar";
import DocumentCanvas from "./DocumentCanvas";
import DocumentStudioPanels from "./DocumentStudioPanels";
import DocumentStudioShell from "./DocumentStudioShell";
import DocumentTopBar from "./DocumentTopBar";
import DocumentMenuBar from "./DocumentMenuBar";
import DocumentStatusBar from "./DocumentStatusBar";
import DocumentLeftSidebar from "./DocumentLeftSidebar";
import DocumentRightSidebar from "./DocumentRightSidebar";
import DocumentHelpDialog from "./DocumentHelpDialog";
import QalamAiPanel from "./QalamAiPanel";
import { FindReplacePanel } from "./FindReplacePanel";
import DocumentLibraryDialog from "./DocumentLibraryDialog";
import {
  getDocumentLibrary,
  migrateLegacyDraftIfNeeded,
  loadActiveDocumentId,
  saveActiveDocumentId,
  emptyDocumentContent,
  type DocumentLibrary,
  type DocumentListItem,
  type DocumentRecord,
} from "../utils/documentLibrary";

/** Compatibility re-exports — existing tests may still import from this file. */
export { ParagraphWithDir, HeadingWithDir, BLOCK_STYLE_EDITOR_CSS };
export { buildDocumentStudioExample, buildReplaceAllTransaction };

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
    // consumeHandoff failed — proceed to library bootstrap
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
    documentSettingsRef.current = documentSettings;
    const library = libraryRef.current;
    const id = activeDocumentIdRef.current;
    if (!libraryReadyRef.current || !library || !id) return;
    void library.updateDocument(id, { documentSettings }).catch((err) => {
      console.error("Failed to save document settings:", err);
      setSaveStatus("error");
    });
  }, [documentSettings]);


  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("auto");
  const processingLanguageRef = useRef<ProcessingLanguage>(processingLanguage);
  useEffect(() => {
    processingLanguageRef.current = processingLanguage;
  }, [processingLanguage]);
  const [lastResolved, setLastResolved] = useState<ResolvedLanguage | null>(null);

  useEffect(() => {
    trackToolOpenOnce("document_studio");
  }, []);

  useEffect(() => {
    const syncOnline = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [exampleJustLoaded, setExampleJustLoaded] = useState(false);
  const standardizeButtonRef = useRef<HTMLDivElement>(null);

  // Publishing Preset Foundation — Phase 1 (2026-08-09). Batch 16A
  // (2026-08-11) wired this through documentSettings.typography into the
  // editor CSS variables, PDF body defaults, and DOCX paragraph/run
  // defaults — no longer "selection only"; changing settings.typography
  // genuinely changes rendered output across Editor/PDF/DOCX.
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>(() => loadSelectedPresetId());
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle" | "error">("idle");
  const [online, setOnline] = useState(true);
  const [documentTitle, setDocumentTitle] = useState(() => defaultDocumentTitle(isUr));
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<DocumentListItem[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryRef = useRef<DocumentLibrary | null>(null);
  const activeDocumentIdRef = useRef<string | null>(null);
  const libraryReadyRef = useRef(false);
  const documentTitleRef = useRef(documentTitle);
  const documentSettingsRef = useRef(documentSettings);
  const isUrRef = useRef(isUr);
  useEffect(() => {
    isUrRef.current = isUr;
  }, [isUr]);
  useEffect(() => {
    documentTitleRef.current = documentTitle;
  }, [documentTitle]);
  const saveChainRef = useRef(Promise.resolve());
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [findOpen, setFindOpen] = useState(false);
  const [leftPanel, setLeftPanel] = useState<LeftPanelId>("none");
  const [rightPanel, setRightPanel] = useState<RightPanelId>("none");
  const [helpOpen, setHelpOpen] = useState<HelpDialogMode | null>(null);
  const [qalamAiOpen, setQalamAiOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<DocumentViewMode>(() => loadDocumentViewMode());
  const [zoom, setZoomState] = useState<DocumentZoom>(() => loadDocumentZoom());
  const [rulerVisible, setRulerVisibleState] = useState(() => loadRulerVisible());
  const [rulerUnit, setRulerUnitState] = useState<RulerUnit>(() => loadRulerUnit());
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
      const context = createDocumentAnalysisContext(json, processingLanguageRef.current);
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, context, glossary)));
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
    extensions: [...createDocumentStudioExtensions(), QalamPagination],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir,
        class: "focus:outline-none",
        spellcheck: EDITOR_SPELLCHECK_ATTR,
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
        const context = createDocumentAnalysisContext(json, processingLanguageRef.current);
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
        saveChainRef.current = saveChainRef.current.then(async () => {
          const library = libraryRef.current;
          const id = activeDocumentIdRef.current;
          if (!library || !id || !libraryReadyRef.current) return;
          try {
            await library.updateDocument(id, {
              content: editor.getJSON() as DocNode,
              title: sanitizeDocumentTitle(documentTitleRef.current) || defaultDocumentTitle(isUrRef.current),
              documentSettings: documentSettingsRef.current,
            });
            const items = await library.listDocuments();
            setLibraryItems(items);
            setSaveStatus("saved");
          } catch (err) {
            console.error("Autosave error:", err);
            setSaveStatus("error");
          }
        });
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
    editor.chain().focus().run();
    setEditorContent(editor, exampleDoc, "user");
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
      setOutline(extractDocumentOutline(editor.getJSON()));
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const json = editor.getJSON();
    const context = createDocumentAnalysisContext(json, processingLanguage);
    setStats(buildDocumentStats(json, context));
    setHealth(buildDocumentHealthReport(json, context));
    setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json, context, glossaryRef.current)));
    if (hasAuditReportRef.current) {
      setAuditReport(buildDocumentAuditReport(json as DocNode, context, processingLanguage));
    }
  }, [processingLanguage, editor]);

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    if (!editor.isFocused) {
      editor.commands.focus(editor.isEmpty ? "start" : "end");
    }
  };

  const handleNewDocument = () => {
    void createAndOpenDocument();
  };

  const handleClearDraft = () => {
    if (window.confirm(isUr ? "کیا آپ موجودہ دستاویز کو خالی کرنا چاہتے ہیں؟" : "Clear the current document text?")) {
      if (!editor) return;
      setEditorContent(editor, emptyDocumentContent(dir), "user");
    }
  };

  const refreshLibraryList = async (library: DocumentLibrary) => {
    setLibraryItems(await library.listDocuments());
  };

  const applyRecordToEditor = (record: DocumentRecord, options?: { skipContent?: boolean }) => {
    activeDocumentIdRef.current = record.id;
    setActiveDocumentId(record.id);
    saveActiveDocumentId(record.id);
    setDocumentTitle(record.title);
    documentTitleRef.current = record.title;
    setDocumentSettings(record.documentSettings);
    documentSettingsRef.current = record.documentSettings;
    if (!options?.skipContent && editor) {
      setEditorContent(editor, record.content, "load");
    }
    setSaveStatus("saved");
    setPreview(null);
    setAlreadyClean(false);
    setExampleJustLoaded(false);
    setLastResolved(null);
    setAuditReport(null);
    hasAuditReportRef.current = false;
    setIsAuditStale(false);
  };

  const persistActiveNow = async () => {
    const library = libraryRef.current;
    const id = activeDocumentIdRef.current;
    if (!library || !id || !editor) return;
    await library.updateDocument(id, {
      content: editor.getJSON() as DocNode,
      title: sanitizeDocumentTitle(documentTitleRef.current) || defaultDocumentTitle(isUrRef.current),
      documentSettings: documentSettingsRef.current,
    });
  };

  const createAndOpenDocument = async (input?: { title?: string; content?: DocNode; skipContent?: boolean }) => {
    const library = libraryRef.current;
    if (!library) return;
    try {
      if (activeDocumentIdRef.current && editor) {
        await persistActiveNow();
      }
      const record = await library.createDocument({
        title: input?.title ?? defaultDocumentTitle(isUrRef.current),
        content: input?.content ?? emptyDocumentContent(dir),
        documentSettings: defaultDocumentSettings(),
      });
      applyRecordToEditor(record, { skipContent: input?.skipContent });
      await refreshLibraryList(library);
    } catch (err) {
      console.error("Failed to create document:", err);
      setSaveStatus("error");
    }
  };

  const openLibraryDocument = async (id: string) => {
    const library = libraryRef.current;
    if (!library || !editor) return;
    try {
      if (activeDocumentIdRef.current && activeDocumentIdRef.current !== id) {
        await persistActiveNow();
      }
      const record = await library.getDocument(id);
      if (!record) return;
      applyRecordToEditor(record);
      setLibraryOpen(false);
      await refreshLibraryList(library);
    } catch (err) {
      console.error("Failed to open document:", err);
      setSaveStatus("error");
    }
  };

  const renameLibraryDocument = async (id: string) => {
    const library = libraryRef.current;
    if (!library) return;
    const current = libraryItems.find((item) => item.id === id);
    const next = window.prompt(isUr ? "نیا عنوان:" : "Rename document:", current?.title ?? "");
    if (next == null) return;
    const title = sanitizeDocumentTitle(next) || defaultDocumentTitle(isUr);
    try {
      await library.renameDocument(id, title);
      if (id === activeDocumentIdRef.current) {
        setDocumentTitle(title);
        documentTitleRef.current = title;
      }
      await refreshLibraryList(library);
    } catch (err) {
      console.error("Failed to rename document:", err);
      setSaveStatus("error");
    }
  };

  const deleteLibraryDocument = async (id: string) => {
    const library = libraryRef.current;
    if (!library) return;
    const current = libraryItems.find((item) => item.id === id);
    const ok = window.confirm(
      isUr
        ? `کیا آپ “${current?.title ?? ""}” حذف کرنا چاہتے ہیں؟`
        : `Delete “${current?.title ?? ""}”? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      const deletingActive = id === activeDocumentIdRef.current;
      await library.deleteDocument(id);
      const remaining = await library.listDocuments();
      setLibraryItems(remaining);
      if (!deletingActive) return;
      activeDocumentIdRef.current = null;
      saveActiveDocumentId(null);
      if (remaining[0]) {
        const record = await library.getDocument(remaining[0].id);
        if (record) applyRecordToEditor(record);
      } else {
        await createAndOpenDocument();
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      setSaveStatus("error");
    }
  };

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const library = await getDocumentLibrary();
        if (cancelled) return;
        libraryRef.current = library;
        const migrated = await migrateLegacyDraftIfNeeded(library, window.localStorage, {
          defaultTitle: defaultDocumentTitle(isUrRef.current),
          settings: documentSettingsRef.current,
        });
        if (cancelled) return;
        const initialWasHandoff =
          typeof initialContent === "object" && initialContent !== null && (initialContent as DocNode).type === "doc";
        if (initialWasHandoff) {
          await createAndOpenDocument({
            content: initialContent as DocNode,
            skipContent: true,
          });
        } else {
          const activeId = loadActiveDocumentId();
          const existing = (activeId && (await library.getDocument(activeId))) || migrated || null;
          const list = await library.listDocuments();
          const fallback = existing ?? (list[0] ? await library.getDocument(list[0].id) : null);
          if (fallback) {
            applyRecordToEditor(fallback);
          } else {
            await createAndOpenDocument();
          }
        }
        if (cancelled) return;
        await refreshLibraryList(library);
        libraryReadyRef.current = true;
      } catch (err) {
        console.error("Document library bootstrap failed:", err);
        libraryReadyRef.current = false;
        setSaveStatus("error");
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

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
      if (editor) setEditorContent(editor, docNode, "user");

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
        setEditorContent(editor, normalized, "user");
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
    const json = editor.getJSON() as DocNode;
    const context = createDocumentAnalysisContext(json, processingLanguage);
    const report = buildDocumentAuditReport(json, context, processingLanguage);
    setAuditReport(report);
    hasAuditReportRef.current = true;
    setIsAuditStale(false);
    setRightPanel("quality");
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
    setFindOpen(false);
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
    const finalContext = createDocumentAnalysisContext(finalJson, processingLanguage);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isFindOpenShortcut(e)) return;
      e.preventDefault();
      setFindOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commitDocumentTitle = () => {
    const next = sanitizeDocumentTitle(documentTitle) || defaultDocumentTitle(isUr);
    setDocumentTitle(next);
    documentTitleRef.current = next;
    const library = libraryRef.current;
    const id = activeDocumentIdRef.current;
    if (library && id) {
      void library.renameDocument(id, next).then(() => refreshLibraryList(library)).catch((err) => {
        console.error("Failed to save title:", err);
        setSaveStatus("error");
      });
    }
  };

  const setViewMode = (mode: DocumentViewMode) => {
    setViewModeState(mode);
    saveDocumentViewMode(mode);
  };

  const setZoom = (next: DocumentZoom) => {
    setZoomState(next);
    saveDocumentZoom(next);
  };

  const toggleRuler = () => {
    setRulerVisibleState((visible) => {
      const next = !visible;
      saveRulerVisible(next);
      return next;
    });
  };

  const setRulerUnit = (unit: RulerUnit) => {
    setRulerUnitState(unit);
    saveRulerUnit(unit);
  };

  const handlePhysicalMarginChange = (edge: PhysicalMarginEdge, mm: number) => {
    setDocumentSettings((current) => ({
      ...current,
      page: {
        ...current.page,
        margins: commitPhysicalMarginDrag(current.page.margins, dir, edge, mm),
      },
    }));
  };

  const promptLink = () => {
    if (!editor) return;
    const url = window.prompt("URL:");
    setLinkHref(editor, url);
  };

  const handleMenuAction = (id: MenuActionId) => {
    dispatchDocumentMenuAction(id, editor, {
      newDocument: handleNewDocument,
      openLibrary: () => setLibraryOpen(true),
      upload: () => fileInputRef.current?.click(),
      downloadTxt: handleDownload,
      downloadDocx: () => {
        void handleDownloadDocx();
      },
      downloadPdf: () => {
        void handleDownloadPdf();
      },
      print: printDocumentStudio,
      openPageSetup: () => setRightPanel("settings"),
      find: () => setFindOpen(true),
      toggleOutline: () => setLeftPanel((p) => toggleLeftPanel(p, "outline")),
      toggleQuality: () => setRightPanel((p) => toggleRightPanel(p, "quality")),
      toggleGlossary: () => setRightPanel((p) => toggleRightPanel(p, "glossary")),
      toggleSettings: () => setRightPanel((p) => toggleRightPanel(p, "settings")),
      toggleFullscreen: toggleStudioFullscreen,
      setViewMode,
      setZoom,
      setRulerUnit,
      toggleRuler,
      loadExample: handleLoadExample,
      promptLink,
      setDir,
      standardize: handleStandardizeClick,
      audit: handleRunAudit,
      showStats: () => setRightPanel("quality"),
      startDictation: focusExistingDictationControl,
      openQalamAi: () => setQalamAiOpen(true),
      openHelp: setHelpOpen,
    });
  };

  const disabledIds = new Set<MenuActionId>();
  if (isExportingPdf) disabledIds.add("file.downloadPdf");
  if (isImporting) disabledIds.add("file.upload");
  if (typeof document !== "undefined" && !document.fullscreenEnabled) {
    disabledIds.add("view.fullscreen");
  }

  const checkedIds = new Set<MenuActionId>();
  if (editor?.isActive("bold")) checkedIds.add("format.bold");
  if (editor?.isActive("italic")) checkedIds.add("format.italic");
  if (editor?.isActive("underline")) checkedIds.add("format.underline");
  if (editor) {
    const styleId = activeBlockStyleId(editor);
    checkedIds.add(`format.style.${styleId}` as MenuActionId);
    const pAttr = editor.getAttributes("paragraph").lineHeight;
    const hAttr = editor.getAttributes("heading").lineHeight;
    const lh =
      (typeof pAttr === "number" ? validateLineHeight(pAttr) : null) ??
      (typeof hAttr === "number" ? validateLineHeight(hAttr) : null);
    if (lh === null) checkedIds.add("format.lh.default");
    else checkedIds.add(`format.lh.${lh}` as MenuActionId);
  }
  if (editor?.isActive("bulletList")) checkedIds.add("format.bullet");
  if (editor?.isActive("orderedList")) checkedIds.add("format.ordered");
  if (editor?.isActive({ textAlign: "left" })) checkedIds.add("format.alignLeft");
  if (editor?.isActive({ textAlign: "center" })) checkedIds.add("format.alignCenter");
  if (editor?.isActive({ textAlign: "right" })) checkedIds.add("format.alignRight");
  if (editor?.isActive({ textAlign: "justify" })) checkedIds.add("format.alignJustify");
  if (dir === "rtl") checkedIds.add("format.rtl");
  if (dir === "ltr") checkedIds.add("format.ltr");
  if (leftPanel === "outline") checkedIds.add("view.outline");
  if (rightPanel === "quality") checkedIds.add("view.quality");
  if (rightPanel === "glossary") checkedIds.add("view.glossary");
  if (rightPanel === "settings") checkedIds.add("view.settings");
  if (viewMode === "pages") checkedIds.add("view.pages");
  if (viewMode === "pageless") checkedIds.add("view.pageless");
  checkedIds.add(`view.zoom.${zoom}` as MenuActionId);
  if (rulerVisible) checkedIds.add("view.ruler");
  checkedIds.add(`view.rulerUnit.${rulerUnit}` as MenuActionId);
  if (typeof document !== "undefined" && document.fullscreenElement) {
    checkedIds.add("view.fullscreen");
  }

  const qualityProps = {
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
  };
  const glossaryProps = {
    entries: glossary,
    onAdd: handleGlossaryAdd,
    onUpdate: handleGlossaryUpdate,
    onDelete: handleGlossaryDelete,
    onExport: handleGlossaryExport,
    onImport: handleGlossaryImport,
  };
  const settingsProps = {
    pageLayout,
    documentSettings,
    setDocumentSettings,
    selectedPresetId,
    onPresetChange: handlePresetChange,
    onPageChange: () => setPdfSummary(null),
    viewMode,
    rulerUnit,
    setRulerUnit,
  };

  return (
    <div className="mx-auto w-full max-w-[1680px] px-2 sm:px-3 lg:px-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) handleUploadFile(f);
          e.target.value = "";
        }}
        className="hidden"
        id="document-studio-upload-input"
        disabled={isImporting}
      />

      {libraryOpen ? (
        <DocumentLibraryDialog
          isUr={isUr}
          documents={libraryItems}
          activeId={activeDocumentId}
          onOpen={(id) => {
            void openLibraryDocument(id);
          }}
          onNew={() => {
            setLibraryOpen(false);
            void createAndOpenDocument();
          }}
          onRename={(id) => {
            void renameLibraryDocument(id);
          }}
          onDelete={(id) => {
            void deleteLibraryDocument(id);
          }}
          onClose={() => setLibraryOpen(false)}
        />
      ) : null}

      <DocumentStudioShell
        isUr={isUr}
        topBar={
          <DocumentTopBar
            isUr={isUr}
            title={documentTitle}
            onTitleChange={setDocumentTitle}
            onTitleCommit={commitDocumentTitle}
            saveStatus={saveStatus}
            online={online}
            isImporting={isImporting}
            onNewDocument={handleNewDocument}
            onUploadClick={() => fileInputRef.current?.click()}
            onStandardize={handleStandardizeClick}
            onAudit={handleRunAudit}
          />
        }
        menuBar={
          <DocumentMenuBar
            isUr={isUr}
            onAction={handleMenuAction}
            disabledIds={disabledIds}
            checkedIds={checkedIds}
          />
        }
        toolbar={
          <DocumentToolbar
            editor={editor}
            dir={dir}
            setDir={setDir}
            processingLanguage={processingLanguage}
            setProcessingLanguage={setProcessingLanguage}
            isUr={isUr}
            zoom={zoom}
            onZoomChange={setZoom}
            documentSettings={documentSettings}
          />
        }
        findBar={
          findOpen ? (
            <FindReplacePanel
              isOpen={true}
              searchQuery={findQuery}
              replaceQuery={replaceQuery}
              matchCount={currentMatches.length}
              currentMatchIndex={currentMatchIndex}
              onSearchChange={handleFindQueryChange}
              onReplaceChange={setReplaceQuery}
              onNext={handleFindNext}
              onPrevious={handleFindPrevious}
              onReplaceCurrent={handleReplaceCurrent}
              onReplaceAll={handleReplaceAll}
              onClose={handleCloseFindReplace}
              isUr={isUr}
            />
          ) : null
        }
        leftSidebar={
          leftPanel === "outline" ? (
            <DocumentLeftSidebar
              isUr={isUr}
              outline={outline}
              onNavigate={handleOutlineNavigate}
              onClose={() => setLeftPanel("none")}
            />
          ) : null
        }
        rightSidebar={
          rightPanel !== "none" ? (
            <DocumentRightSidebar isUr={isUr} panel={rightPanel} onClose={() => setRightPanel("none")}>
              <DocumentStudioPanels
                isUr={isUr}
                dir={dir}
                panel={rightPanel}
                glossaryCount={glossary.length}
                auditReport={auditReport}
                isAuditStale={isAuditStale}
                quality={qualityProps}
                glossary={glossaryProps}
                settings={settingsProps}
              />
            </DocumentRightSidebar>
          ) : null
        }
        statusBar={
          <DocumentStatusBar
            isUr={isUr}
            dir={dir}
            stats={stats}
            saveStatus={saveStatus}
            online={online}
            auditScore={auditReport?.score ?? null}
            auditStale={isAuditStale}
          />
        }
      >
        <div className="p-3 sm:p-4 md:p-6">
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
            viewMode={viewMode}
            zoom={zoom}
            rulerVisible={rulerVisible}
            rulerUnit={rulerUnit}
            onPhysicalMarginChange={handlePhysicalMarginChange}
            onLoadExample={handleLoadExample}
            onWrapperClick={handleWrapperClick}
          />

          <div className="mt-3 space-y-3" dir={dir} ref={standardizeButtonRef}>
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
                    <div className="rounded-md border border-gray-200 bg-white p-2 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto" dir={dir}>
                      {preview.beforePlain}
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold text-gray-600 mb-1 ${isUr ? "font-naskh" : ""}`}>
                      {isUr ? "بعد" : "After"}
                    </p>
                    <div className="rounded-md border border-green-200 bg-green-50/50 p-2 text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto" dir={preview.report.direction}>
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

            {pdfSummary && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs" dir="ltr">
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
                        /jameel/i.test(f.requested)
                          ? (isUr
                            ? "پی ڈی ایف میں جمیل نوری نستعلیق دستیاب نہ تھا، اس لیے نوٹو نستعلیق اردو استعمال ہوا۔"
                            : "Jameel Noori Nastaleeq was unavailable in PDF export; Noto Nastaliq Urdu was used.")
                          : (isUr
                            ? `${f.requested} مقامی ایڈیٹر میں دستیاب ہے۔ PDF میں ${f.used} استعمال کیا گیا ہے۔`
                            : `${f.requested} is available as a local editor preview. PDF export used ${f.used}.`)
                      ).join(" ")}
                    </div>
                  )}
                  <div>{isUr ? "فارمیٹ: بصری / پرنٹ PDF" : "Format: Visual / Print PDF"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DocumentStudioShell>

      {helpOpen && <DocumentHelpDialog isUr={isUr} mode={helpOpen} onClose={() => setHelpOpen(null)} />}
      {qalamAiOpen ? <QalamAiPanel editor={editor} isUr={isUr} onClose={() => setQalamAiOpen(false)} /> : null}
    </div>
  );
}
