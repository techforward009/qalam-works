"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { extractPlainText, type DocNode } from "../utils/extractPlainText";
import { normalizeDocumentNodes, type NormalizeReport } from "../utils/normalizeDocumentNodes";

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

export default function DocumentStudioEditor() {
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  const [preview, setPreview] = useState<{ document: DocNode; report: NormalizeReport } | null>(null);
  const [alreadyClean, setAlreadyClean] = useState(false);

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

  const handleStandardizeClick = () => {
    if (!editor) return;
    const result = normalizeDocumentNodes(editor.getJSON() as DocNode);
    if (!result.changed) {
      setAlreadyClean(true);
      setTimeout(() => setAlreadyClean(false), 3000);
      return;
    }
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
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-document.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              Download .txt
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
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
      </div>

      <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md mt-4" dir="rtl">
        <h2 className="text-sm font-bold text-amber-800 mb-3">قلم ٹولز / Qalam Tools</h2>

        <button
          type="button"
          onClick={handleStandardizeClick}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
        >
          معیاری بنائیں / Standardize Document
        </button>

        {alreadyClean && (
          <p className="mt-3 text-sm text-green-700">
            ✓ متن پہلے ہی معیاری ہے / Document is already standardized
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
