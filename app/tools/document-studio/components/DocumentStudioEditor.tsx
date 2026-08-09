"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { extractPlainText, type DocNode } from "../utils/extractPlainText";
import { normalizeDocumentNodes, type NormalizeReport } from "../utils/normalizeDocumentNodes";
import { buildDocumentAuditReport, type QualityAuditReport } from "../utils/buildDocumentAuditReport";
import { buildDocumentStats, type DocumentStats } from "../utils/buildDocumentStats";
import { buildDocumentHealthReport, type DocumentHealthReport } from "../utils/buildDocumentHealthReport";
import { generateDocumentSuggestions, type DocumentSuggestion } from "../utils/generateDocumentSuggestions";
import {
  createReviewState,
  acceptSuggestion,
  ignoreSuggestion,
  refreshPendingSuggestions,
  suggestionKey,
  type SuggestionReviewState,
} from "../utils/suggestionReview";
import { buildDocxBlob } from "../utils/buildDocxDocument";
import { plainTextToDocNode, normalizeDocxParagraphBreaks } from "../utils/plainTextToDocNode";
import { QualityAuditPanel } from "./QualityAuditPanel";
import { DocumentStatsBar } from "./DocumentStatsBar";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { validateFile } from "../../../utils/fileValidation";
import { extractTextFromFile } from "../../../utils/documents/extractTextFromFile";
import { formatFileSize } from "../../../utils/formatFileSize";

const DRAFT_STORAGE_KEY = "qalam-document-studio-draft";
const AUTOSAVE_DEBOUNCE_MS = 1000;

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${
        active
          ? "bg-amber-600 text-white border-amber-600"
          : "bg-white text-gray-700 border-gray-300 hover:border-amber-400"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, dir, setDir }: { editor: Editor | null; dir: "rtl" | "ltr"; setDir: (d: "rtl" | "ltr") => void }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-200" dir="ltr">
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        I
      </ToolbarButton>
      <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        H1
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton label="Bullet List" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton label="Numbered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
      <ToolbarButton label="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        " Quote
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const url = window.prompt("URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}
      >
        Link
      </ToolbarButton>

      <div className="w-px bg-gray-300 mx-1" />

      <ToolbarButton label="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        ⇤
      </ToolbarButton>
      <ToolbarButton label="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        ⇔
      </ToolbarButton>
      <ToolbarButton label="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        ⇥
      </ToolbarButton>
      <ToolbarButton label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
        ☰
      </ToolbarButton>

      <div className="w-px bg-gray-300 mx-1" />

      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        ↶ Undo
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        ↷ Redo
      </ToolbarButton>

      <div className="w-px bg-gray-300 mx-1" />

      <ToolbarButton label="Right-to-left (Urdu/Arabic/Persian)" active={dir === "rtl"} onClick={() => setDir("rtl")}>
        RTL
      </ToolbarButton>
      <ToolbarButton label="Left-to-right (English)" active={dir === "ltr"} onClick={() => setDir("ltr")}>
        LTR
      </ToolbarButton>
    </div>
  );
}

function editorToPlainText(editor: Editor, dir: "rtl" | "ltr"): string {
  return extractPlainText(editor.getJSON() as DocNode, dir);
}

function getInitialDraftContent(): DocNode | string {
  if (typeof window === "undefined") return "<p></p>";
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

// Suggestion Review Workflow (2026-08-09) — finds a suggestion's real
// position in the LIVE ProseMirror document by searching individual text
// nodes for the first verbatim occurrence of its originalText. Limited
// to matches within a single text node (won't find text split across
// separately-marked runs, e.g. half-bold half-plain) — an accepted,
// documented limitation for v1, since the vast majority of flagged
// issues (typos, spacing, stray characters) occur in plain, unformatted
// text anyway. Returns null (stale-safe) if no longer found, e.g. the
// user already edited that text some other way.
function findSuggestionRange(editor: Editor, searchText: string): { from: number; to: number } | null {
  let result: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (result) return false;
    if (node.isText && node.text) {
      const idx = node.text.indexOf(searchText);
      if (idx !== -1) {
        result = { from: pos + idx, to: pos + idx + searchText.length };
        return false;
      }
    }
    return true;
  });
  return result;
}

export default function DocumentStudioEditor() {
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  const [preview, setPreview] = useState<{ document: DocNode; report: NormalizeReport } | null>(null);
  const [alreadyClean, setAlreadyClean] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docxImportNotice, setDocxImportNotice] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSummary, setPdfSummary] = useState<{ pages: number; fileSizeLabel: string; fontsUsed: string[] } | null>(null);

  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [health, setHealth] = useState<DocumentHealthReport | null>(null);
  const [reviewState, setReviewState] = useState<SuggestionReviewState>(createReviewState([]));
  const [isAuditStale, setIsAuditStale] = useState(false);
  // Mirrors "auditReport !== null" but as a ref, so the onUpdate callback
  // below (captured once when the editor is created) can check it without
  // reading stale React state from a closure.
  const hasAuditReportRef = useRef(false);

  // Browser-safe timeout ref (avoids Node types dependency)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialContent] = useState(() => getInitialDraftContent());

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (hasAuditReportRef.current) {
        setIsAuditStale(true);
      }
      setAlreadyClean(false);
      setPdfSummary(null);
      const json = editor.getJSON();
      setStats(buildDocumentStats(json));
      setHealth(buildDocumentHealthReport(json));
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json)));
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
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Initial stats/health for whatever content loaded first (fresh empty
  // doc or a restored draft) — onUpdate only fires on subsequent user
  // edits, not on the editor's own first mount.
  useEffect(() => {
    if (editor) {
      const json = editor.getJSON();
      setStats(buildDocumentStats(json));
      setHealth(buildDocumentHealthReport(json));
      setReviewState((prev) => refreshPendingSuggestions(prev, generateDocumentSuggestions(json)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor) return;
    if (e.target === e.currentTarget && !editor.isFocused) {
      editor.commands.focus("end");
    }
  };

  const handleNewDocument = () => {
    if (!editor) return;
    if (window.confirm("کیا آپ نیا مسودہ شروع کرنا چاہتے ہیں؟ غیر محفوظ شدہ تبدیلیاں ختم ہو جائیں گی۔ / Start new document?")) {
      editor.commands.setContent("<p></p>");
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.error("Failed to clear localStorage", e);
      }
      setSaveStatus("idle");
      setPreview(null);
      setAlreadyClean(false);
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
      const docNode = plainTextToDocNode(text);
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

  const handleStandardizeClick = () => {
    if (!editor) return;
    const result = normalizeDocumentNodes(editor.getJSON() as DocNode);
    if (!result.changed) {
      // No auto-dismiss timer here: this message can include a manual-review
      // note (see the alreadyClean block in the JSX below) that's genuinely
      // useful to keep visible, not a fleeting confirmation toast — a fixed
      // timeout previously made it vanish before it could be fully read.
      // It clears naturally on the next Standardize click, text edit, or
      // New Document instead.
      setAlreadyClean(true);
      return;
    }
    setAlreadyClean(false);
    setPreview({ document: result.document, report: result.report });
  };

  const handleConfirmStandardize = () => {
    if (!editor || !preview) return;

    try {
      const { state, view } = editor;
      const normalizedDoc = state.schema.nodeFromJSON(preview.document);

      if (normalizedDoc.type !== state.doc.type) {
        console.error("Invalid doc type during normalization application");
        setPreview(null);
        return;
      }

      const tr = state.tr.replaceWith(0, state.doc.content.size, normalizedDoc.content);
      tr.setMeta("addToHistory", true);

      view.dispatch(tr);
    } catch (err) {
      console.error("Failed to apply standardization transaction safely:", err);
    } finally {
      setPreview(null);
    }
  };

  const handleCancelStandardize = () => {
    setPreview(null);
  };

  const handleRunAudit = () => {
    if (!editor) return;
    const report = buildDocumentAuditReport(editor.getJSON() as DocNode);
    setAuditReport(report);
    hasAuditReportRef.current = true;
    setIsAuditStale(false);
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
    setReviewState((prev) => ({ ...prev, accepted: [] }));
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
    if (!editor) return;
    try {
      const blob = await buildDocxBlob(editor.getJSON() as DocNode, dir);
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
    if (!editor) return;
    setPdfError(null);
    setPdfSummary(null);
    setIsExportingPdf(true);
    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: editor.getJSON(), dir }),
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const pageCountHeader = response.headers.get("X-Pdf-Page-Count");
      const fileSizeHeader = response.headers.get("X-Pdf-File-Size-Bytes");
      const fontsUsedHeader = response.headers.get("X-Pdf-Fonts-Used");

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
        try {
          fontsUsed = fontsUsedHeader ? JSON.parse(fontsUsedHeader) : [];
        } catch {
          fontsUsed = [];
        }
        setPdfSummary({
          pages: parseInt(pageCountHeader, 10),
          fileSizeLabel: formatFileSize(parseInt(fileSizeHeader, 10)),
          fontsUsed,
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
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-amber-200/80 shadow-md">
        <div className="flex justify-between items-center mb-2">
          <Toolbar editor={editor} dir={dir} setDir={setDir} />
          <div className="text-xs text-stone-500 font-sans" dir="ltr">
            {saveStatus === "saving" && "💾 Saving..."}
            {saveStatus === "saved" && "✓ Saved to browser"}
          </div>
        </div>

        <div className="mb-3">
          <DocumentStatsBar stats={stats} health={health} />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-3">
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
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition flex items-center gap-2 ${
              isImporting
                ? "bg-amber-300 text-white cursor-not-allowed"
                : "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            }`}
          >
            {isImporting ? "درآمد ہو رہا ہے... / Importing..." : "فائل اپلوڈ کریں / Upload File (.txt, .docx)"}
          </label>
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

        <div
          className="border border-gray-300 rounded-lg p-4 min-h-[300px] focus-within:ring-2 focus-within:ring-amber-500 cursor-text"
          dir={dir}
          onClick={handleWrapperClick}
        >
          <EditorContent
            editor={editor}
            className={`qalam-editor-content focus:outline-none ${
              dir === "rtl" ? "font-nastaliq text-right" : "text-left"
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4" dir="ltr">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
            >
              {copied ? "✓ Copied" : "Copy Text"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 transition"
            >
              Download .txt <span className="text-[10px] font-normal text-amber-500">(Plain Text)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadDocx}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 transition"
            >
              Download .docx <span className="text-[10px] font-normal text-amber-500">(For Word / Publishing)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                isExportingPdf
                  ? "border-amber-300 text-amber-400 cursor-not-allowed"
                  : "border-amber-600 text-amber-700 hover:bg-amber-50"
              }`}
            >
              {isExportingPdf ? "PDF بن رہی ہے... / Generating..." : (
                <>
                  Download PDF <span className="text-[10px] font-normal text-amber-500">
                    (Visual/Print{pdfSummary ? ` — ${pdfSummary.fileSizeLabel}` : ""})
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs items-center">
            <button
              type="button"
              onClick={handleNewDocument}
              className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-100 transition"
            >
              New Document / نیا مسودہ
            </button>
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition"
            >
              Clear Draft / ڈرافٹ صاف کریں
            </button>
          </div>
        </div>

        {pdfSummary && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs" dir="ltr">
            <div className="font-semibold text-amber-800 mb-1.5">✓ PDF Export Complete</div>
            <div className="text-stone-700 space-y-0.5">
              <div>Pages: {pdfSummary.pages}</div>
              <div>File Size: {pdfSummary.fileSizeLabel}</div>
              {pdfSummary.fontsUsed.length > 0 && (
                <div>Fonts Used: {pdfSummary.fontsUsed.map((f) => `✓ ${f}`).join("  ")}</div>
              )}
              <div>Format: Visual / Print PDF</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md mt-4" dir="rtl">
        <h2 className="text-sm font-bold text-amber-800 mb-3">قلم ٹولز / Qalam Tools</h2>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStandardizeClick}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
          >
            معیاری بنائیں / Standardize Document
          </button>
          <button
            type="button"
            onClick={handleRunAudit}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 transition"
          >
            معیار جانچیں / Run Quality Audit
          </button>
        </div>

        {alreadyClean && (
          <p className="mt-3 text-sm text-green-700">
            ✓ اس متن میں مزید کوئی خودکار اصلاح دستیاب نہیں / No further automatic corrections available for this text
            {auditReport && auditReport.totalIssues > 0 && (
              <span className="block text-amber-700 mt-1">
                (نوٹ: Quality Audit ابھی بھی {auditReport.totalIssues} ایسا مسئلہ دکھا رہا ہے جسے دستی طور پر دیکھنا ہوگا — یہ خودکار اصلاح کی فہرست میں شامل نہیں / Note: Quality Audit still shows {auditReport.totalIssues} issue(s) needing manual review — these aren't part of automatic correction)
              </span>
            )}
          </p>
        )}

        {preview && (
          <div className="mt-4 border border-amber-300 rounded-lg p-4 bg-amber-50">
            <p className="text-sm font-semibold text-gray-800 mb-2">تجویز کردہ تبدیلیاں / Proposed changes:</p>
            <ul className="text-sm text-gray-700 space-y-1 mb-4">
              <li>کل تصحیحات / Total corrections: {preview.report.totalCorrections}</li>
              <li>رسم الخط / Script normalizations: {preview.report.scriptNormalizations}</li>
              <li>خالی جگہ / Spacing fixes: {preview.report.spacingFixes}</li>
              <li>رموز اوقاف / Punctuation fixes: {preview.report.punctuationFixes}</li>
            </ul>
            <div className="flex gap-2" dir="ltr">
              <button
                type="button"
                onClick={handleConfirmStandardize}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
              >
                تصدیق کریں / Confirm
              </button>
              <button
                type="button"
                onClick={handleCancelStandardize}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                منسوخ / Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <QualityAuditPanel report={auditReport} isStale={isAuditStale} />
        </div>

        <div className="mt-4">
          <SuggestionsPanel
            pending={reviewState.pending}
            accepted={reviewState.accepted}
            ignored={reviewState.ignored}
            onAccept={handleAcceptSuggestion}
            onIgnore={handleIgnoreSuggestion}
            onApplyAccepted={handleApplyAccepted}
          />
        </div>
      </div>

      <style jsx global>{`
        .qalam-editor-content p {
          margin: 0.35rem 0;
        }
        .qalam-editor-content h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.75rem 0 0.5rem;
        }
        .qalam-editor-content h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.65rem 0 0.4rem;
        }
        .qalam-editor-content h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0.55rem 0 0.35rem;
        }
        .qalam-editor-content ul {
          list-style: disc;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content ol {
          list-style: decimal;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content li {
          margin: 0.15rem 0;
        }
        .qalam-editor-content blockquote {
          border-inline-start: 3px solid #d97706;
          padding-inline-start: 1rem;
          color: #57534e;
          font-style: italic;
          margin: 0.5rem 0;
        }
        .qalam-editor-content a {
          color: #b45309;
          text-decoration: underline;
        }
        .qalam-editor-content .ProseMirror {
          min-height: 260px;
        }
      `}</style>
    </div>
  );
}
