"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { extractPlainText, type DocNode } from "../utils/extractPlainText";
import { normalizeDocumentNodes, type NormalizeReport } from "../utils/normalizeDocumentNodes";

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

// Plain-text extraction (numbering, bullets, RTL-safe bidi handling, \r\n
// line endings) now lives in utils/extractPlainText.ts as the single
// reusable source — Copy/Download here, and the Quality Checker input in
// utils/buildQualityInput.ts, both call into it instead of duplicating
// this traversal.
function editorToPlainText(editor: Editor, dir: "rtl" | "ltr"): string {
  return extractPlainText(editor.getJSON(), dir);
}

export default function DocumentStudioEditor() {
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");
  const [copied, setCopied] = useState(false);

  // Standardize Document flow: calculate the normalized result first and
  // hold it here for review — nothing touches the editor until the user
  // presses Confirm. "alreadyClean" is a separate transient flag so the
  // "already standardized" message doesn't get mixed up with an actual
  // pending preview.
  const [preview, setPreview] = useState<{ document: DocNode; report: NormalizeReport } | null>(null);
  const [alreadyClean, setAlreadyClean] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "<p></p>",
    immediatelyRender: false,
  });

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
    // A single setContent call = a single ProseMirror transaction, so this
    // is one undo step — Ctrl+Z (or the future Undo button) reverts the
    // whole normalization at once, not fix-by-fix.
    editor.commands.setContent(preview.document);
    setPreview(null);
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
      // Clipboard API unavailable — button stays as "Copy"
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
        <Toolbar editor={editor} dir={dir} setDir={setDir} />

        {/* Clicking anywhere in this box — not just directly on an existing
            line of text — should activate the editor. Without this handler,
            ProseMirror's contentEditable region is only as tall as its
            content, so empty space below the last line doesn't focus it
            and can look like the box is inactive. */}
        <div
          className="border border-gray-300 rounded-lg p-4 min-h-[300px] focus-within:ring-2 focus-within:ring-amber-500 cursor-text"
          dir={dir}
          onClick={() => editor?.chain().focus("end").run()}
        >
          <EditorContent
            editor={editor}
            className={`qalam-editor-content focus:outline-none ${
              dir === "rtl" ? "font-nastaliq text-right" : "text-left"
            }`}
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4" dir="ltr">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition"
          >
            {copied ? "✓ Copied" : "Copy Text"}
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-amber-600 text-amber-700 hover:bg-amber-50 transition"
          >
            Download .txt
          </button>
        </div>
      </div>

      {/* Publishing intelligence lives in its own panel, separate from the
          formatting toolbar above — keeps "make it bold" and "make it
          correct" visually distinct, per the 3B plan. */}
      <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-md mt-4" dir="rtl">
        <h2 className="text-sm font-bold text-amber-800 mb-3">قلم ٹولز / Qalam Tools</h2>

        <button
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
                onClick={handleConfirmStandardize}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition"
              >
                تصدیق کریں / Confirm
              </button>
              <button
                onClick={handleCancelStandardize}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                منسوخ / Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scoped styling for editor content — Tailwind's base reset strips
          default heading/list/blockquote styling, so headings, lists, and
          blockquotes need explicit rules here to look different from plain
          paragraphs. Logical (inline-start) properties are used so styling
          flips correctly between RTL and LTR. */}
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
        /* Makes the actual contentEditable region fill the visible box,
           so the whole box is clickable/typeable, not just the line(s)
           of existing text. */
        .qalam-editor-content .ProseMirror {
          min-height: 260px;
        }
      `}</style>
    </div>
  );
}
