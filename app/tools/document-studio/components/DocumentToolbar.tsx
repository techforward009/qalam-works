"use client";

import type { Editor } from "@tiptap/react";
import type { ProcessingLanguage } from "../../../utils/processing/types";
import { listEditorFonts } from "../utils/fontRegistry";
import { FONT_SIZE_OPTIONS_PT, LINE_HEIGHT_OPTIONS, resolveFontSizePt, validateLineHeight } from "../utils/documentSettings";
import { BLOCK_STYLES, BLOCK_STYLE_IDS, type BlockStyleId } from "../utils/documentStyles";
import { trackEvent } from "../../../lib/analytics";
import { DictationControl } from "./DictationControl";
import {
  activeBlockStyleId,
  applyBlockStyle,
  applyFontFamily,
  applyFontSize,
  applyLineHeight,
  redo,
  setAlign,
  setLinkHref,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleHeading,
  toggleItalic,
  toggleOrderedList,
  toggleUnderline,
  undo,
} from "../utils/documentCommands";

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
      className={`h-[38px] px-3 rounded-md text-sm font-semibold border transition-all ${
        active
          ? "bg-[#1A3A2A] text-white border-[#1A3A2A]"
          : "bg-white text-gray-600 border-gray-200 hover:border-[#B8935A] hover:text-[#1A3A2A]"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-[26px] bg-gray-200 mx-1.5 self-center" />;
}

const STUDIO_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  ...listEditorFonts().map((f) => ({
    label: f.availability === "local-preview-only" ? `${f.label} — Local` : f.label,
    value: f.editorFamily,
  })),
];

export default function DocumentToolbar({
  editor,
  dir,
  setDir,
  processingLanguage,
  setProcessingLanguage,
  isUr,
}: {
  editor: Editor | null;
  dir: "rtl" | "ltr";
  setDir: (d: "rtl" | "ltr") => void;
  processingLanguage: ProcessingLanguage;
  setProcessingLanguage: (lang: ProcessingLanguage) => void;
  isUr: boolean;
}) {
  if (!editor) return null;

  const labelCls = "text-xs font-semibold text-[#3D5A47] bg-[#EAF2EB] px-2 py-0.5 rounded whitespace-nowrap select-none";
  const pairDir = isUr ? "rtl" : "ltr";
  const currentFont =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) || "";

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 pb-3 sm:pb-4 border-b border-gray-100 overflow-x-auto" dir="ltr">
      <span dir={pairDir} className="inline-flex items-center gap-1.5">
        <label htmlFor="studio-block-style" className={labelCls}>
          {isUr ? "انداز" : "Style"}
        </label>
      <select
        id="studio-block-style"
        value={activeBlockStyleId(editor)}
        onChange={(e) => applyBlockStyle(editor, e.target.value as BlockStyleId)}
        className="h-[38px] max-w-[7.5rem] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Paragraph style"
      >
        {BLOCK_STYLE_IDS.map((id) => (
          <option key={id} value={id}>
            {BLOCK_STYLES[id].label}
          </option>
        ))}
      </select>
      </span>
      <ToolbarDivider />
      <span dir={pairDir} className="inline-flex items-center gap-1.5">
        <label htmlFor="studio-line-height" className={labelCls}>
          {isUr ? "فاصلہ" : "Spacing"}
        </label>
      <select
        id="studio-line-height"
        value={(() => {
          const pAttr = editor.getAttributes("paragraph").lineHeight;
          const hAttr = editor.getAttributes("heading").lineHeight;
          const validated =
            (typeof pAttr === "number" ? validateLineHeight(pAttr) : null) ??
            (typeof hAttr === "number" ? validateLineHeight(hAttr) : null);
          return validated !== null ? String(validated) : "default";
        })()}
        onChange={(e) => {
          const raw = e.target.value;
          applyLineHeight(editor, raw === "default" ? null : Number(raw));
        }}
        className="h-[38px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Line spacing"
      >
        <option value="default">Default</option>
        {LINE_HEIGHT_OPTIONS.map((lh) => (
          <option key={lh} value={lh}>
            {lh}
          </option>
        ))}
      </select>
      </span>
      <ToolbarDivider />
      <span dir={pairDir} className="inline-flex items-center gap-1.5">
        <label htmlFor="studio-font-family" className={labelCls}>
          {isUr ? "فونٹ" : "Font"}
        </label>
      <select
        id="studio-font-family"
        value={currentFont}
        onChange={(e) => applyFontFamily(editor, e.target.value)}
        className="h-[38px] max-w-[11rem] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Font family"
      >
        {STUDIO_FONT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      </span>
      <span dir={pairDir} className="inline-flex items-center gap-1.5">
        <label htmlFor="studio-font-size" className={labelCls}>
          {isUr ? "سائز" : "Size"}
        </label>
      <select
        id="studio-font-size"
        value={
          (() => {
            const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
            const pt = resolveFontSizePt(raw);
            return pt ? String(pt) : "";
          })()
        }
        onChange={(e) => applyFontSize(editor, e.target.value)}
        className="h-[38px] min-w-[6rem] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Font size"
      >
        <option value="">Default</option>
        {FONT_SIZE_OPTIONS_PT.map((pt) => (
          <option key={pt} value={pt}>
            {pt}
          </option>
        ))}
      </select>
      </span>
      <ToolbarDivider />
      <span dir={pairDir} className="inline-flex items-center gap-1.5">
        <label htmlFor="studio-proc-lang" className={`${labelCls} ${isUr ? "font-naskh" : ""}`}>
          {isUr ? "متن کی زبان" : "Language"}
        </label>
      <select
        id="studio-proc-lang"
        value={processingLanguage}
        onChange={(e) => { setProcessingLanguage(e.target.value as ProcessingLanguage); trackEvent("tool_mode_change", { tool: "document_studio", mode: e.target.value as ProcessingLanguage }); }}
        className="h-[38px] min-w-[6.5rem] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25"
        title="Text language"
      >
        <option value="auto">{isUr ? "آٹو" : "Auto"}</option>
        <option value="ur">{isUr ? "اردو" : "Urdu"}</option>
        <option value="en">{isUr ? "انگریزی" : "English"}</option>
        <option value="ar">{isUr ? "عربی" : "Arabic"}</option>
      </select>
      </span>
      <ToolbarDivider />
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => toggleBold(editor)}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => toggleItalic(editor)}>
        I
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => toggleUnderline(editor)}>
        U
      </ToolbarButton>
      <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => toggleHeading(editor, 1)}>
        H1
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => toggleHeading(editor, 2)}>
        H2
      </ToolbarButton>
      <ToolbarButton label="Bullet List" active={editor.isActive("bulletList")} onClick={() => toggleBulletList(editor)}>
        • List
      </ToolbarButton>
      <ToolbarButton label="Numbered List" active={editor.isActive("orderedList")} onClick={() => toggleOrderedList(editor)}>
        1. List
      </ToolbarButton>
      <ToolbarButton label="Blockquote" active={editor.isActive("blockquote")} onClick={() => toggleBlockquote(editor)}>
        " Quote
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          const url = window.prompt("URL:");
          setLinkHref(editor, url);
        }}
      >
        Link
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Align Left" active={editor.isActive({ textAlign: "left" })} onClick={() => setAlign(editor, "left")}>
        ⇤
      </ToolbarButton>
      <ToolbarButton label="Align Center" active={editor.isActive({ textAlign: "center" })} onClick={() => setAlign(editor, "center")}>
        ⇔
      </ToolbarButton>
      <ToolbarButton label="Align Right" active={editor.isActive({ textAlign: "right" })} onClick={() => setAlign(editor, "right")}>
        ⇥
      </ToolbarButton>
      <ToolbarButton label="Justify" active={editor.isActive({ textAlign: "justify" })} onClick={() => setAlign(editor, "justify")}>
        ☰
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Undo" onClick={() => undo(editor)}>
        ↶ Undo
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => redo(editor)}>
        ↷ Redo
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton label="Right-to-left (Urdu/Arabic/Persian)" active={dir === "rtl"} onClick={() => setDir("rtl")}>
        RTL
      </ToolbarButton>
      <ToolbarButton label="Left-to-right (English)" active={dir === "ltr"} onClick={() => setDir("ltr")}>
        LTR
      </ToolbarButton>

      <ToolbarDivider />

      <DictationControl editor={editor} docDir={dir} isUr={isUr} />
    </div>
  );
}
