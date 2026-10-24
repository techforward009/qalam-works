"use client";
import { migrateDocumentLeading } from "../utils/leading";


import { useState, useEffect, useRef, useCallback } from "react";
import { isSingleEmptyParagraph } from "../utils/singleEmptyParagraph";
import { useLanguage } from "../../../lib/language-context";
import { rulerDirectionAtSelection } from "../utils/paragraphDirection";
import NewDocumentDialog, { contentFromNewDocument, pageCountFromNewDocument, readStoredMinimumPages, settingsFromNewDocument, STUDIO_DEFAULT_GUTTER_MM, writeStoredMinimumPages, type NewDocumentDraft } from "./NewDocumentDialog";
import { useEditor, type Editor } from "@tiptap/react";
import { consumeHandoff } from "../../translation-studio/utils/translationHandoff";
import { extractPlainText, createDocumentAnalysisContext, type DocNode } from "../utils/extractPlainText";
import { normalizeDocumentNodes, type NormalizeReport } from "../utils/normalizeDocumentNodes";
import type { ProcessingLanguage, ResolvedLanguage } from "../../../utils/processing/types";
import { trackEvent, trackToolOpenOnce } from "../../../lib/analytics";
import {
  loadDocumentSettings,
  saveDocumentSettings,
  defaultDocumentSettings,
  withStudioUrduFont,
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
  documentImagePayloadBytes,
  getImageDimensions,
  imageDataUrlByteLength,
  MAX_DOCUMENT_IMAGE_BYTES,
  MAX_DOCUMENT_IMAGE_TOTAL_BYTES,
  readImageAsDataUrl,
  sanitizeImageMetadata,
  validateDocumentImage,
} from "../utils/documentImages";
import {
  ParagraphWithDir,
  HeadingWithDir,
  BLOCK_STYLE_EDITOR_CSS,
  createDocumentStudioExtensions,
  placeCaretAfterAtom,
  insertDocumentBreak,
} from "../utils/documentSchema";
import {
  applyDocumentDirection,
  applyParagraphDirection,
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
import {
  loadDocumentViewMode,
  saveDocumentViewMode,
  saveDocumentZoom,
  openingDocumentZoom,
  NARROW_STUDIO_PX,
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
import { studioJameelFontFaceCss, studioOnDemandFontFaceCss } from "../utils/fontRegistry";
import { LatinScriptRuns } from "../extensions/LatinScriptRuns";
import { QalamPagination } from "../extensions/QalamPagination";
import DocumentToolbar from "./DocumentToolbar";
import DocumentCanvas from "./DocumentCanvas";
import type { StudioToolId } from "./InPageToolPalette";
import { readStoredFrames, writeStoredFrames, type StudioFrame } from "./StudioObjectLayer";
import DocumentStudioPanels from "./DocumentStudioPanels";
import DocumentStudioShell from "./DocumentStudioShell";
import DocumentMenuBar from "./DocumentMenuBar";
import { StudioTextContextMenu } from "./StudioTextContextMenu";
import { StudioCharacterDialog } from "./StudioCharacterDialog";
import { functionKeyZoom } from "../utils/documentView";
import DocumentStatusBar from "./DocumentStatusBar";
import DocumentLeftSidebar from "./DocumentLeftSidebar";
import DocumentRightSidebar from "./DocumentRightSidebar";
import DocumentHelpDialog from "./DocumentHelpDialog";
import QalamAiPanel from "./QalamAiPanel";
import { FindReplacePanel } from "./FindReplacePanel";
import DocumentLibraryDialog from "./DocumentLibraryDialog";
import InPageStoriesDialog, { type ImportedStory } from "./InPageStoriesDialog";
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

export const GENERIC_PDF_EXPORT_ERROR = "PDF بنانے میں خرابی ہوئی / Failed to generate PDF.";

function shapePngDataUrl(kind: "rect" | "ellipse" | "round-rect" | "line"): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = kind === "line" ? 80 : 110;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (kind === "rect") {
    ctx.strokeRect(2, 2, 176, 106);
  } else if (kind === "ellipse") {
    ctx.ellipse(90, 55, 84, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "round-rect") {
    const x = 2;
    const y = 2;
    const w = 176;
    const h = 106;
    const r = 16;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.moveTo(6, 74);
    ctx.lineTo(174, 6);
    ctx.stroke();
  }
  return canvas.toDataURL("image/png");
}

function insertStudioShape(editor: Editor | null, kind: "rect" | "ellipse" | "round-rect" | "line") {
  if (!editor) return;
  const src = shapePngDataUrl(kind);
  if (!src) return;
  editor.chain().focus().insertContent({
    type: "image",
    attrs: {
      src,
      alt: kind,
      title: kind,
      width: 180,
      height: kind === "line" ? 80 : 110,
      alignment: "center",
      wrapMode: "break",
    },
  }).run();
  placeCaretAfterAtom(editor);
}

export async function readPdfExportError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (
      payload
      && typeof payload === "object"
      && "error" in payload
      && typeof (payload as { error: unknown }).error === "string"
    ) {
      const message = (payload as { error: string }).error.trim();
      if (message) return message;
    }
  } catch {
    // Non-JSON bodies keep the existing bilingual fallback.
  }
  return GENERIC_PDF_EXPORT_ERROR;
}

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

export default function DocumentStudioEditor({ fillWindow = false }: { fillWindow?: boolean } = {}) {
  // InPage-style window chrome stays English independently of the site language.
  const { language: uiLanguage } = useLanguage();
  const isUr = false;
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [visiblePage, setVisiblePage] = useState(1);
  const [zoomPercent, setZoomPercent] = useState<number | null>(null);
  const [columnCount, setColumnCount] = useState(1);
  const [columnGutterMm, setColumnGutterMm] = useState(STUDIO_DEFAULT_GUTTER_MM);
  const [minimumPages, setMinimumPages] = useState(1);
  const minimumPagesRef = useRef(1);
  const [frames, setFrames] = useState<StudioFrame[]>([]);
  const [canvasTool, setCanvasTool] = useState<StudioToolId>("text");
  const canvasToolRef = useRef(canvasTool);
  canvasToolRef.current = canvasTool;
  const [characterOpen,setCharacterOpen] = useState(false);
  const [paragraphRequest,setParagraphRequest] = useState(0);
  const [imageMenu, setImageMenu] = useState<{ x: number; y: number } | null>(null);
  const [tableInsertOpen, setTableInsertOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pendingMetadataWrites,setPendingMetadataWrites] = useState(0);
  const [documentSettings, setDocumentSettings] = useState<DocumentStudioSettings>(() => withStudioUrduFont(loadDocumentSettings()));
  // Batch 16B — computed once per render, shared by the page preview and
  // the ruler so their boundaries always agree (single geometry source).
  const pageLayout = resolvePageLayout({
    size: documentSettings.page.size,
    orientation: documentSettings.page.orientation,
    marginPreset: documentSettings.page.margins.preset,
    customMargins: documentSettings.page.margins,
    customSizeMm: documentSettings.page.customSizeMm,
  });

  useEffect(() => {
    saveDocumentSettings(documentSettings);
    documentSettingsRef.current = documentSettings;
    const library = libraryRef.current;
    const id = activeDocumentIdRef.current;
    if (!libraryReadyRef.current || !library || !id) return;
    setPendingMetadataWrites(count=>count+1);
    void library.updateDocument(id, { documentSettings }).catch((err) => {
      console.error("Failed to save document settings:", err);
      setSaveStatus("error");
    }).finally(()=>setPendingMetadataWrites(count=>count-1));
    // Only the matching pending write clears its part of the Home guard.
  }, [documentSettings]);


  const [processingLanguage, setProcessingLanguage] = useState<ProcessingLanguage>("ur");
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
  const [storageDurability, setStorageDurability] = useState<DocumentLibrary["durability"] | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [englishFont, setEnglishFont] = useState("Arial Unicode MS");
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
  const inpageInputRef = useRef<HTMLInputElement>(null);
  const [inpageStories, setInpageStories] = useState<ImportedStory[] | null>(null);
  const [inpageError, setInpageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [zoom, setZoomState] = useState<DocumentZoom>(100);
  const zoomTouchedRef = useRef(false);
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
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const restoringEmptyRef = useRef(false);
  const textLenRef = useRef(0);
  const fullDeleteRef = useRef(false);

  const editor = useEditor({
    extensions: [...createDocumentStudioExtensions(), QalamPagination, LatinScriptRuns],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir,
        class: "focus:outline-none",
        spellcheck: EDITOR_SPELLCHECK_ATTR,
      },
      transformPasted: (slice) => transformPastedSlice(slice, dir),
      handleKeyDown: (_view, event) => {
        if (event.key !== "Backspace" && event.key !== "Delete") return false;
        const { from, to } = _view.state.selection;
        const size = _view.state.doc.content.size;
        if (from <= 1 && to >= Math.max(1, size - 1)) fullDeleteRef.current = true;
        return false;
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        const nextLen = editor.getText().length;
        const userEdit = transaction.getMeta("addToHistory") !== false;
        const emptied = textLenRef.current > 0 && nextLen === 0;
        if (userEdit && (emptied || fullDeleteRef.current)) {
          minimumPagesRef.current = 1;
          setMinimumPages(1);
          const id = activeDocumentIdRef.current;
          if (id) writeStoredMinimumPages(id, 1);
        }
        fullDeleteRef.current = false;
        textLenRef.current = nextLen;
      }
      if (transaction.docChanged && editor.state.doc.childCount === 0 && !restoringEmptyRef.current) {
        restoringEmptyRef.current = true;
        const direction = dirRef.current;
        queueMicrotask(() => {
          restoringEmptyRef.current = false;
          if (editor.isDestroyed || editor.state.doc.childCount > 0) return;
          editor.commands.setContent(emptyDocumentContent(direction));
        });
      }
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

  // Language mode supplies canvas direction; textblocks resolve independently.
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
    if (!editor || canvasTool !== "text") return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, img, [data-resize-container]")) return;
    if (!editor.isFocused || !target.closest(".ProseMirror")) {
      const hit = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      editor.commands.focus(isSingleEmptyParagraph(editor.state.doc) ? "start" : hit?.pos ?? "end");
    }
  };

  const handleNewDocument = () => {
    setNewDocOpen(true);
  };

  const confirmNewDocument = (draft: NewDocumentDraft) => {
    const pages = pageCountFromNewDocument(draft);
    setDir(draft.direction);
    setProcessingLanguage(draft.direction === "ltr" ? "en" : "ur");
    setColumnCount(Math.max(1, Math.min(4, Math.floor(draft.columns) || 1)));
    setColumnGutterMm(Math.max(0, Number(draft.gutter) || 0));
    minimumPagesRef.current = pages;
    setMinimumPages(pages);
    setZoom(openingDocumentZoom(window.innerWidth));
    setVisiblePage(1);
    setNewDocOpen(false);
    void createAndOpenDocument({
      content: contentFromNewDocument(draft),
      documentSettings: settingsFromNewDocument(draft),
      minimumPages: pages,
    });
  };

  const handleClearDraft = () => {
    if (window.confirm(isUr ? "کیا آپ موجودہ دستاویز کو خالی کرنا چاہتے ہیں؟" : "Clear the current document text?")) {
      if (!editor) return;
      minimumPagesRef.current = 1;
      setMinimumPages(1);
      const id = activeDocumentIdRef.current;
      if (id) writeStoredMinimumPages(id, 1);
      setEditorContent(editor, emptyDocumentContent(dir), "user");
    }
  };

  const refreshLibraryList = async (library: DocumentLibrary) => {
    setLibraryItems(await library.listDocuments());
  };

  const applyRecordToEditor = (record: DocumentRecord, options?: { skipContent?: boolean; minimumPages?: number }) => {
    activeDocumentIdRef.current = record.id;
    setActiveDocumentId(record.id);
    saveActiveDocumentId(record.id);
    setDocumentTitle(record.title);
    documentTitleRef.current = record.title;
    const settings = withStudioUrduFont(record.documentSettings);
    setDocumentSettings(settings);
    documentSettingsRef.current = settings;
    if (!options?.skipContent && editor) {
      setEditorContent(editor, migrateDocumentLeading(record.content, settings.typography.bodyFontSizePt), "load");
    }
    const pages = options?.minimumPages ?? readStoredMinimumPages(record.id);
    minimumPagesRef.current = pages;
    setMinimumPages(pages);
    writeStoredMinimumPages(record.id, pages);
    setFrames(readStoredFrames(record.id));
    if (typeof window !== "undefined" && window.innerWidth < NARROW_STUDIO_PX && !zoomTouchedRef.current) {
      setZoomState("fit-width");
    }
    setSaveStatus("saved");
    setPreview(null);
    setAlreadyClean(false);
    setExampleJustLoaded(false);
    setLastResolved(null);
    setAuditReport(null);
    hasAuditReportRef.current = false;
    setIsAuditStale(false);
    setVisiblePage(1);
    if (editor) {
      const place = () => {
        try {
          if (canvasToolRef.current === "text") editor.commands.focus("start");
          else editor.commands.blur();
        } catch {
          /* view not mounted yet */
        }
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => requestAnimationFrame(place));
      else place();
    }
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

  const createAndOpenDocument = async (input?: { title?: string; content?: DocNode; skipContent?: boolean; documentSettings?: DocumentStudioSettings; minimumPages?: number }) => {
    const library = libraryRef.current;
    if (!library) return false;
    try {
      if (activeDocumentIdRef.current && editor) {
        await persistActiveNow();
      }
      const record = await library.createDocument({
        title: input?.title ?? defaultDocumentTitle(isUrRef.current),
        content: input?.content ?? emptyDocumentContent(dir),
        documentSettings: withStudioUrduFont(input?.documentSettings ?? defaultDocumentSettings()),
      });
      setCanvasTool("text");
      canvasToolRef.current = "text";
      applyRecordToEditor(record, { skipContent: input?.skipContent, minimumPages: input?.minimumPages });
      await refreshLibraryList(library);
      return true;
    } catch (err) {
      console.error("Failed to create document:", err);
      setSaveStatus("error");
      return false;
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
        setStorageDurability(library.durability);
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

  const handleInPageFile = async (file: File) => {
    setInpageError(null);
    setIsImporting(true);
    try {
      const { parseInPage, MAX_INPAGE_BYTES } = await import("../utils/inpage/parseInPage");
      if (file.size > MAX_INPAGE_BYTES) throw new Error("InPage files must be 32 MB or smaller.");
      const buffer = await file.arrayBuffer();
      const parsed = parseInPage(buffer);
      const { parseInPageSetup } = await import("../utils/inpage/parseInPageSetup");
      const { settingsFromInPageSetup } = await import("../utils/inpage/inpageSetupSettings");
      const setup = parseInPageSetup(buffer);
      const stories = parsed.stories.map((paragraphs, index) => ({ number: index + 1, text: paragraphs.join("\n") }));
      const longest = stories.reduce((best, story) => story.text.length > best.text.length ? story : best, stories[0]);
      if (!longest) throw new Error("No stories were found in this InPage file.");
      const created = await createAndOpenDocument({
        title: file.name.replace(/\.inp$/i, "") || "InPage import",
        content: plainTextToDocNodeWithDir(longest.text, "rtl"),
        ...(setup ? { documentSettings: settingsFromInPageSetup(setup) } : {}),
      });
      if (!created) throw new Error("The imported document could not be saved in this browser.");
      setLibraryOpen(false);
      setInpageStories(stories.filter((story) => story !== longest && story.text.trim().length > 0));
    } catch (error) {
      setLibraryOpen(false);
      setInpageError(error instanceof Error ? error.message : "Failed to import InPage text.");
    } finally { setIsImporting(false); }
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


  // Mode change: never present a preview generated under a different language.
  // Direction is not tied to this mode; the ruler follows the document.
  useEffect(() => {
    setPreview(null);
    setAlreadyClean(false);
    setLastResolved(null);
  }, [processingLanguage]);

  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const { $from } = editor.state.selection;
      const nodes = [];
      for (let depth = 1; depth <= $from.depth; depth += 1) {
        const node = $from.node(depth);
        nodes.push({ typeName: node.type.name, directionMode: node.attrs.directionMode, dir: node.attrs.dir });
      }
      setDir(rulerDirectionAtSelection(nodes));
    };
    sync();
    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
    };
  }, [editor]);

  const languageWas = useRef<string | null>(null);
  const urduDirPending = useRef(false);
  useEffect(() => {
    const previous = languageWas.current;
    languageWas.current = uiLanguage;
    if (previous !== null && previous !== uiLanguage && uiLanguage === "ur") urduDirPending.current = true;
    if (!urduDirPending.current || !editor) return;
    urduDirPending.current = false;
    setDir("rtl");
    applyParagraphDirection(editor, "rtl");
  }, [uiLanguage, editor]);

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
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
        setPdfError(await readPdfExportError(response));
        return;
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
      window.setTimeout(() => URL.revokeObjectURL(url), 0);

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
      setPdfError(GENERIC_PDF_EXPORT_ERROR);
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    const onContext = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("img.qalam-document-image")) {
        setImageMenu(null);
        return;
      }
      event.preventDefault();
      const img = target.closest("img");
      if (editor && img) {
        try {
          const pos = editor.view.posAtDOM(img, 0);
          editor.chain().setNodeSelection(pos).run();
        } catch {
          /* image not in the document view */
        }
      }
      setImageMenu({ x: event.clientX, y: event.clientY });
    };
    const onPointer = () => setImageMenu(null);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [editor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen("about");
        return;
      }
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
      setPendingMetadataWrites(count=>count+1);
      void library.renameDocument(id, next).then(() => refreshLibraryList(library)).catch((err) => {
        console.error("Failed to save title:", err);
        setSaveStatus("error");
      }).finally(()=>setPendingMetadataWrites(count=>count-1));
    }
  };

  const setViewMode = (mode: DocumentViewMode) => {
    setViewModeState(mode);
    saveDocumentViewMode(mode);
  };

  const setZoom = (next: DocumentZoom) => {
    zoomTouchedRef.current = true;
    setZoomState(next);
    saveDocumentZoom(next);
    if(editor && canvasToolRef.current === "text") editor.commands.focus();
  };

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      const next=functionKeyZoom(event.key);
      if(next===null || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)return;
      const target=event.target instanceof Element?event.target:null;
      if(!target?.closest("[data-studio-root],[data-studio-zoom-scope],[data-studio-text-menu],[data-studio-context-zoom],[data-menu-portaled][data-studio-menu-language]"))return;
      event.preventDefault();setZoom(next);
    };
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  });

  useEffect(() => {
    if (zoomTouchedRef.current || typeof window === "undefined") return;
    const next = openingDocumentZoom(window.innerWidth);
    if (next !== 100) setZoomState(next);
  }, []);

  useEffect(() => {
    if (!editor) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        try {
          if (canvasToolRef.current === "text") editor.commands.focus("start");
          else editor.commands.blur();
        } catch {
          /* view not mounted yet */
        }
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [editor]);

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

  const insertImageFile = async (file: File) => {
    const error = await validateDocumentImage(file);
    if (error) {
      setImageError(isUr
        ? (error === "oversized" ? "تصویر 2 ایم بی سے چھوٹی ہونی چاہیے۔" : "درست PNG، JPEG یا WebP تصویر منتخب کریں۔")
        : (error === "oversized" ? "Images must be smaller than 2 MB." : "Choose a valid PNG, JPEG, or WebP image."));
      return;
    }
    try {
      const src = await readImageAsDataUrl(file);
      const imageBytes = imageDataUrlByteLength(src);
      if (imageBytes > MAX_DOCUMENT_IMAGE_BYTES) {
        setImageError(isUr ? "تصویر 2 ایم بی سے چھوٹی ہونی چاہیے۔" : "Images must be smaller than 2 MB.");
        return;
      }
      if ((editor ? documentImagePayloadBytes(editor.getJSON()) : 0) + imageBytes > MAX_DOCUMENT_IMAGE_TOTAL_BYTES) {
        setImageError(isUr ? "اس دستاویز میں تصاویر کی 8 ایم بی حد پوری ہو چکی ہے۔" : "This document has reached its 8 MB image limit.");
        return;
      }
      const dimensions = await getImageDimensions(src);
      const width = Math.max(80, Math.min(480, dimensions.width));
      const height = Math.max(1, Math.round((dimensions.height / dimensions.width) * width));
      editor?.chain().focus().insertContent({
        type: "image",
        attrs: {
          src,
          alt: sanitizeImageMetadata(file.name),
          title: sanitizeImageMetadata(file.name),
          width,
          height,
          alignment: "center",
          wrapMode: "break",
        },
      }).run();
      // Block images are atoms: insert leaves a NodeSelection. Move into the
      // following paragraph so the next keystroke cannot replace the image.
      if (editor) placeCaretAfterAtom(editor);
      setImageError(null);
    } catch {
      setImageError(isUr ? "تصویر شامل نہیں ہو سکی۔" : "Image could not be inserted.");
    }
  };

  const onCanvasTool = (id: StudioToolId) => {
    setCanvasTool(id);
    if (id === "select" && editor) {
      editor.commands.blur();
    }
  };

  const changeFrames = (next: StudioFrame[]) => {
    setFrames(next);
    const id = activeDocumentIdRef.current;
    if (id) writeStoredFrames(id, next);
  };

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({
      rows: Math.min(10, Math.max(1, tableRows)),
      cols: Math.min(10, Math.max(1, tableColumns)),
      withHeaderRow: true,
    }).run();
    setTableInsertOpen(false);
  };

  const insertPageBreak = () => {
    if (!editor) return;
    insertDocumentBreak(editor, { type: "pageBreak" });
  };

  const insertSectionBreak = (type: "nextPage" | "continuous") => {
    if (!editor) return;
    insertDocumentBreak(editor, { type: "sectionBreak", attrs: { type } });
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
      openTableInsert: () => setTableInsertOpen(true),
      openImageInsert: () => imageInputRef.current?.click(),
      insertPageBreak,
      insertSectionBreak,
      setDir: (direction) => {
        setDir(direction);
        if (editor) applyParagraphDirection(editor, direction);
      },
      standardize: handleStandardizeClick,
      audit: handleRunAudit,
      showStats: () => setRightPanel("quality"),
      startDictation: focusExistingDictationControl,
      openQalamAi: () => setQalamAiOpen(true),
      openHelp: setHelpOpen,
      setCanvasTool,
    });
  };

  const disabledIds = new Set<MenuActionId>();
  if (isExportingPdf) disabledIds.add("file.downloadPdf");
  if (isImporting) disabledIds.add("file.upload");
  if (typeof document !== "undefined" && !document.fullscreenEnabled) {
    disabledIds.add("view.fullscreen");
  }
  if (!editor?.isActive("table")) {
    ([
      "table.addRowBefore", "table.addRowAfter", "table.deleteRow",
      "table.addColumnBefore", "table.addColumnAfter", "table.deleteColumn",
      "table.toggleHeaderRow", "table.delete",
    ] as MenuActionId[]).forEach((id) => disabledIds.add(id));
  }

  const checkedIds = new Set<MenuActionId>();
  if (editor?.isActive("bold")) checkedIds.add("format.bold");
  if (editor?.isActive("italic")) checkedIds.add("format.italic");
  if (editor?.isActive("underline")) checkedIds.add("format.underline");
  if (editor) {
    const styleId = activeBlockStyleId(editor);
    checkedIds.add(`format.style.${styleId}` as MenuActionId);
    const leading = editor.getAttributes(editor.isActive("heading") ? "heading" : "paragraph").leading;
    if (!leading || leading.mode === "auto") checkedIds.add("format.lh.default");
    else checkedIds.add(`format.lh.${leading.value}` as MenuActionId);
  }
  if (editor?.isActive("bulletList")) checkedIds.add("format.bullet");
  if (editor?.isActive("orderedList")) checkedIds.add("format.ordered");
  if (editor?.isActive({ textAlign: "left" })) checkedIds.add("format.alignLeft");
  if (editor?.isActive({ textAlign: "center" })) checkedIds.add("format.alignCenter");
  if (editor?.isActive({ textAlign: "right" })) checkedIds.add("format.alignRight");
  if (editor?.isActive({ textAlign: "justify" })) checkedIds.add("format.alignJustify");
  const paragraphMode = editor?.state.selection.$from.parent.attrs.directionMode;
  if (paragraphMode === "rtl") checkedIds.add("format.rtl");
  if (paragraphMode === "ltr") checkedIds.add("format.ltr");
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

  const [jameelFace, setJameelFace] = useState(false);
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const current = editor.getAttributes("textStyle").fontFamily;
      if (typeof current === "string" && current.includes("Jameel Noori Nastaleeq")) {
        setJameelFace(true);
        return;
      }
      let found = false;
      editor.state.doc.descendants((node) => {
        if (found) return false;
        for (const mark of node.marks) {
          const family = mark.attrs?.fontFamily;
          if (typeof family === "string" && family.includes("Jameel Noori Nastaleeq")) {
            found = true;
            return false;
          }
        }
      });
      setJameelFace(found);
    };
    sync();
    editor.on("transaction", sync);
    return () => {
      editor.off("transaction", sync);
    };
  }, [editor]);

  const onZoomPercentChange = useCallback((percent: number) => {
    setZoomPercent((prev) => (prev === percent ? prev : percent));
  }, []);
  const [onDemandFaces, setOnDemandFaces] = useState("");
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const names: string[] = [];
      const current = editor.getAttributes("textStyle").fontFamily;
      if (typeof current === "string") names.push(current);
      editor.state.doc.descendants((node) => {
        for (const mark of node.marks) {
          const family = mark.attrs?.fontFamily;
          if (typeof family === "string") names.push(family);
        }
      });
      const css = studioOnDemandFontFaceCss(names.join("\n"));
      setOnDemandFaces((prev) => prev === css ? prev : css);
    };
    sync();
    editor.on("transaction", sync);
    return () => {
      editor.off("transaction", sync);
    };
  }, [editor]);


  return (
    <div data-studio-root="true" className={fillWindow ? "flex h-full min-h-0 w-full flex-1 flex-col" : "mx-auto w-full max-w-[1680px] px-2 sm:px-3 lg:px-4"}>
      {jameelFace ? <style data-studio-jameel-face="true">{studioJameelFontFaceCss()}</style> : null}
      {onDemandFaces ? <style data-studio-on-demand-faces="true">{onDemandFaces}</style> : null}
      {inpageError ? <p role="alert" dir="ltr" className="m-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{inpageError}</p> : null}
      <input ref={inpageInputRef} type="file" accept=".inp" className="hidden" data-studio-inpage-input="true" disabled={isImporting} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void handleInPageFile(file);
        event.target.value = "";
      }} />
      {inpageStories !== null ? <InPageStoriesDialog stories={inpageStories} onClose={() => setInpageStories(null)} /> : null}
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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        data-studio-image-input="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImageFile(file);
          event.target.value = "";
        }}
      />
      {imageError ? <p role="alert" className="mx-2 mt-2 text-sm text-red-700">{imageError}</p> : null}
      <StudioTextContextMenu editor={editor} onZoom={setZoom} onImport={()=>fileInputRef.current?.click()}
        onCharacter={()=>setCharacterOpen(true)} onParagraph={()=>setParagraphRequest(value=>value+1)} />
      {characterOpen && editor ? <StudioCharacterDialog editor={editor} settings={documentSettings} onClose={()=>setCharacterOpen(false)} /> : null}
      {imageMenu && editor ? (
        <div
          role="menu"
          data-studio-image-menu="true"
          className="fixed z-[90] border border-[#808080] bg-[#f0f0f0] py-1 text-[11px] text-black shadow-md"
          style={{ left: imageMenu.x, top: imageMenu.y, fontFamily: "Tahoma, 'Segoe UI', sans-serif" }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {([
            ["Left", { alignment: "left" }],
            ["Center", { alignment: "center", wrapMode: "break" }],
            ["Right", { alignment: "right" }],
            ["Wrap text", { wrapMode: "wrap", alignment: "left" }],
            ["Break text", { wrapMode: "break" }],
          ] as const).map(([label, attrs]) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1 text-left hover:bg-[#d6dff2]"
              onClick={() => {
                editor.chain().focus().updateAttributes("image", attrs).run();
                setImageMenu(null);
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1 text-left hover:bg-[#d6dff2]"
            onClick={() => {
              const alt = window.prompt("Alternative text", String(editor.getAttributes("image").alt ?? ""));
              if (alt !== null) editor.chain().focus().updateAttributes("image", { alt }).run();
              setImageMenu(null);
            }}
          >
            Alt text
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1 text-left hover:bg-[#d6dff2]"
            onClick={() => {
              editor.chain().focus().deleteSelection().run();
              setImageMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      ) : null}

      {libraryOpen ? (
        <DocumentLibraryDialog
          isUr={isUr}
          documents={libraryItems}
          activeId={activeDocumentId}
          onOpenInPage={() => inpageInputRef.current?.click()}
          onOpen={(id) => {
            void openLibraryDocument(id);
          }}
          onNew={() => {
            setLibraryOpen(false);
            setNewDocOpen(true);
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

      {tableInsertOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" data-studio-dialog={isUr ? "ur" : "en"} aria-label={isUr ? "جدول شامل کریں" : "Insert table"}>
          <form
            className={`w-full max-w-sm rounded-xl border border-[#1A3A2A]/15 bg-[#FFFCF6] p-5 shadow-xl ${isUr ? "font-naskh" : ""}`}
            dir={isUr ? "rtl" : "ltr"}
            onSubmit={(event) => { event.preventDefault(); insertTable(); }}
          >
            <h2 className="text-base font-semibold text-[#1A3A2A]">{isUr ? "جدول شامل کریں" : "Insert table"}</h2>
            <p className="mt-1 text-sm text-[#3D5A47]">{isUr ? "قطاریں اور ستون منتخب کریں۔" : "Choose rows and columns."}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-[#1A3A2A]">
                {isUr ? "قطاریں" : "Rows"}
                <input className="mt-1 block w-full rounded-md border border-[#1A3A2A]/20 bg-white px-2 py-1.5" type="number" min={1} max={10} value={tableRows} onChange={(event) => setTableRows(Number(event.target.value))} />
              </label>
              <label className="text-sm font-medium text-[#1A3A2A]">
                {isUr ? "ستون" : "Columns"}
                <input className="mt-1 block w-full rounded-md border border-[#1A3A2A]/20 bg-white px-2 py-1.5" type="number" min={1} max={10} value={tableColumns} onChange={(event) => setTableColumns(Number(event.target.value))} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md px-3 py-1.5 text-sm text-[#1A3A2A] hover:bg-[#EAF2EB]" onClick={() => setTableInsertOpen(false)}>{isUr ? "منسوخ" : "Cancel"}</button>
              <button type="submit" className="rounded-md bg-[#1A3A2A] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#123020]">{isUr ? "شامل کریں" : "Insert"}</button>
            </div>
          </form>
        </div>
      ) : null}

      <DocumentStudioShell
        isUr={isUr}
        fillWindow={fillWindow}
        topBar={null}
        menuBar={
          <DocumentMenuBar
            isUr={isUr}
            showHome={fillWindow}
            hasUnsavedChanges={pendingMetadataWrites > 0 || saveStatus === "saving" || saveStatus === "error" || (editingTitle && documentTitle !== documentTitleRef.current) || (storageDurability === "memory" && !isEditorEmpty)}
            onAction={handleMenuAction}
            disabledIds={disabledIds}
            checkedIds={checkedIds}
            endSlot={
              <div className="flex h-[20px] min-w-0 items-center gap-1" data-studio-title-slot="true">
                {storageDurability === "memory" ? (
                  <span className="sr-only" role="status">
                    {isUr
                      ? "براؤزر اسٹوریج دستیاب نہیں۔ اس سیشن کی تبدیلیاں عارضی ہیں۔ یہ ٹیب کھلا رکھیں اور اپنی دستاویز ڈاؤن لوڈ یا ایکسپورٹ کر لیں۔"
                      : "Browser storage is unavailable. Changes are temporary in this session. Keep this tab open and download/export your document."}
                  </span>
                ) : null}
                {editingTitle ? <input autoFocus
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  onBlur={() => { commitDocumentTitle(); setEditingTitle(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  aria-label={isUr ? "دستاویز کا عنوان" : "Document title"}
                  data-studio-document-title="true"
                  className="h-[20px] w-36 min-w-0 rounded-none border border-transparent bg-transparent px-1 text-[12px] leading-none text-[#1c1c1c] hover:border-[#c8c8c8] focus:border-[#1A3A2A] focus:outline-none"
                /> : <button type="button" data-studio-document-title="true" aria-label={isUr ? "دستاویز کا عنوان" : "Document title"} onClick={() => setEditingTitle(true)} style={{ height: 18, padding: 0, border: "none", background: "transparent", color: "#000", fontSize: 12, whiteSpace: "nowrap" }}>[{documentTitle}]</button>}

              </div>
            }
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
            englishFont={englishFont}
            onEnglishFontChange={setEnglishFont}
            paragraphRequest={paragraphRequest}
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
            storageDurability={storageDurability}
            online={online}
            auditScore={auditReport?.score ?? null}
            auditStale={isAuditStale}
            pageCount={pageCount}
            visiblePage={visiblePage}
            zoom={zoom}
            zoomPercent={zoomPercent}
            onPageStep={(delta) => {
              const root = document.querySelector("[data-studio-print-root]") as HTMLElement | null;
              const stride = Number(root?.getAttribute("data-page-stride-px") || 0);
              const total = pageCount ?? 1;
              const next = Math.min(total, Math.max(1, visiblePage + delta));
              if (root && stride > 0) root.scrollTo({ top: (next - 1) * stride });
              setVisiblePage(next);
            }}
          />
        }
        onDismissLeft={() => setLeftPanel("none")}
        onDismissRight={() => setRightPanel("none")}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {newDocOpen ? (
            <NewDocumentDialog
              onCancel={() => setNewDocOpen(false)}
              onConfirm={confirmNewDocument}
            />
          ) : null}
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

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
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
            onPageCountChange={setPageCount}
            onVisiblePageChange={setVisiblePage}
            onZoomPercentChange={onZoomPercentChange}
            onZoomChange={setZoom}
            columnCount={columnCount}
            columnGutterMm={columnGutterMm}
            minimumPages={minimumPages}
            frames={frames}
            onFramesChange={changeFrames}
            englishFont={englishFont}
            tool={canvasTool}
            onToolAction={onCanvasTool}
          />
            </div>
          </div>

          <div className="max-h-48 shrink-0 overflow-auto" dir={dir} ref={standardizeButtonRef}>
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
