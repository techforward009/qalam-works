"use client";

import type { Editor } from "@tiptap/react";
import type { ProcessingLanguage } from "../../../utils/processing/types";
import { listEditorFonts } from "../utils/fontRegistry";
import { FONT_SIZE_OPTIONS_PT, LINE_HEIGHT_OPTIONS, resolveFontSizePt, validateLineHeight } from "../utils/documentSettings";
import { BLOCK_STYLES, BLOCK_STYLE_IDS, type BlockStyleId } from "../utils/documentStyles";
import { DictationControl } from "./DictationControl";
import type { DocumentZoom } from "../utils/documentView";
import { DOCUMENT_ZOOM_PRESETS } from "../utils/documentView";
import {
  activeBlockStyleId,
  applyBlockStyle,
  applyFontFamily,
  applyFontSize,
  applyLineHeight,
  redo,
  setAlign,
  toggleBold,
  toggleBulletList,
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
      aria-label={label}
      className={`h-8 min-w-8 px-2 rounded text-xs font-semibold border transition-all ${
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
  return <div className="w-px h-5 bg-gray-200 mx-0.5 self-center" />;
}

const STUDIO_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  ...listEditorFonts().map((f) => ({
    label: f.availability === "local-preview-only" ? `${f.label} — Local` : f.label,
    value: f.editorFamily,
  })),
];

const selectCls =
  "h-8 rounded-md border border-gray-200 bg-white px-1.5 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25";

export const DOCUMENT_TOOLBAR_LEADING = ["undo", "redo", "zoom", "style"] as const;

export default function DocumentToolbar({
  editor,
  dir,
  setDir,
  isUr,
  zoom = 100,
  onZoomChange,
}: {
  editor: Editor | null;
  dir: "rtl" | "ltr";
  setDir: (d: "rtl" | "ltr") => void;
  processingLanguage?: ProcessingLanguage;
  setProcessingLanguage?: (lang: ProcessingLanguage) => void;
  isUr: boolean;
  zoom?: DocumentZoom;
  onZoomChange?: (zoom: DocumentZoom) => void;
}) {
  if (!editor) return null;

  const currentFont =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) || "";
  const lineHeightValue = (() => {
    const pAttr = editor.getAttributes("paragraph").lineHeight;
    const hAttr = editor.getAttributes("heading").lineHeight;
    const validated =
      (typeof pAttr === "number" ? validateLineHeight(pAttr) : null) ??
      (typeof hAttr === "number" ? validateLineHeight(hAttr) : null);
    return validated !== null ? String(validated) : "default";
  })();
  const fontSizeValue = (() => {
    const raw = editor.getAttributes("textStyle").fontSize as string | undefined;
    const pt = resolveFontSizePt(raw);
    return pt ? String(pt) : "";
  })();

  return (
    <div
      className="flex flex-wrap items-center gap-1 px-2 py-1.5"
      dir="ltr"
      data-studio-toolbar="true"
      data-studio-toolbar-leading={DOCUMENT_TOOLBAR_LEADING.join(",")}
    >
      <ToolbarButton label={isUr ? "کالعدم" : "Undo"} onClick={() => undo(editor)}>
        ↶
      </ToolbarButton>
      <ToolbarButton label={isUr ? "دہرائیں" : "Redo"} onClick={() => redo(editor)}>
        ↷
      </ToolbarButton>
      {onZoomChange && (
        <label className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
          <span className="sr-only">{isUr ? "زوم" : "Zoom"}</span>
          <select
            className={selectCls}
            aria-label={isUr ? "زوم" : "Zoom"}
            data-studio-zoom-control="true"
            value={String(zoom)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "fit-width" || raw === "fit-page") onZoomChange(raw);
              else onZoomChange(Number(raw) as DocumentZoom);
            }}
          >
            {DOCUMENT_ZOOM_PRESETS.map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
            <option value="fit-width">{isUr ? "چوڑائی" : "Fit width"}</option>
            <option value="fit-page">{isUr ? "صفحہ" : "Fit page"}</option>
          </select>
        </label>
      )}
      <ToolbarDivider />
      <select
        id="studio-block-style"
        value={activeBlockStyleId(editor)}
        onChange={(e) => applyBlockStyle(editor, e.target.value as BlockStyleId)}
        className={`${selectCls} max-w-[7.25rem]`}
        title={isUr ? "انداز" : "Paragraph style"}
        aria-label={isUr ? "انداز" : "Style"}
        data-studio-style-control="true"
      >
        {BLOCK_STYLE_IDS.map((id) => (
          <option key={id} value={id}>
            {BLOCK_STYLES[id].label}
          </option>
        ))}
      </select>
      <select
        id="studio-font-family"
        value={currentFont}
        onChange={(e) => applyFontFamily(editor, e.target.value)}
        className={`${selectCls} max-w-[9.5rem]`}
        title={isUr ? "فونٹ" : "Font family"}
        aria-label={isUr ? "فونٹ" : "Font"}
      >
        {STUDIO_FONT_OPTIONS.map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        id="studio-font-size"
        value={fontSizeValue}
        onChange={(e) => applyFontSize(editor, e.target.value)}
        className={`${selectCls} min-w-[4.25rem]`}
        title={isUr ? "سائز" : "Font size"}
        aria-label={isUr ? "سائز" : "Size"}
      >
        <option value="">Default</option>
        {FONT_SIZE_OPTIONS_PT.map((pt) => (
          <option key={pt} value={pt}>
            {pt}
          </option>
        ))}
      </select>
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
      <ToolbarButton label="Bullet List" active={editor.isActive("bulletList")} onClick={() => toggleBulletList(editor)}>
        •
      </ToolbarButton>
      <ToolbarButton label="Numbered List" active={editor.isActive("orderedList")} onClick={() => toggleOrderedList(editor)}>
        1.
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Right-to-left (Urdu/Arabic/Persian)" active={dir === "rtl"} onClick={() => setDir("rtl")}>
        RTL
      </ToolbarButton>
      <ToolbarButton label="Left-to-right (English)" active={dir === "ltr"} onClick={() => setDir("ltr")}>
        LTR
      </ToolbarButton>
      <select
        id="studio-line-height"
        value={lineHeightValue}
        onChange={(e) => {
          const raw = e.target.value;
          applyLineHeight(editor, raw === "default" ? null : Number(raw));
        }}
        className={selectCls}
        title={isUr ? "فاصلہ" : "Line spacing"}
        aria-label={isUr ? "فاصلہ" : "Line spacing"}
      >
        <option value="default">Spacing</option>
        {LINE_HEIGHT_OPTIONS.map((lh) => (
          <option key={lh} value={lh}>
            {lh}
          </option>
        ))}
      </select>
      <div className="shrink-0" data-studio-dictation="true">
        <DictationControl editor={editor} docDir={dir} isUr={isUr} />
      </div>
    </div>
  );
}
