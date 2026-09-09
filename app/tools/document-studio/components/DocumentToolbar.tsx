"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { ProcessingLanguage } from "../../../utils/processing/types";
import { listEditorFonts } from "../utils/fontRegistry";
import { FONT_SIZE_OPTIONS_PT, LINE_HEIGHT_OPTIONS, type DocumentStudioSettings, defaultDocumentSettings } from "../utils/documentSettings";
import { BLOCK_STYLES, BLOCK_STYLE_IDS, type BlockStyleId } from "../utils/documentStyles";
import { DictationControl } from "./DictationControl";
import type { DocumentZoom } from "../utils/documentView";
import { DOCUMENT_ZOOM_PRESETS } from "../utils/documentView";
import { MIXED_TOOLBAR_VALUE, resolveActiveToolbarFormatting } from "../utils/activeToolbarFormatting";
import {
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
  documentSettings,
}: {
  editor: Editor | null;
  dir: "rtl" | "ltr";
  setDir: (d: "rtl" | "ltr") => void;
  processingLanguage?: ProcessingLanguage;
  setProcessingLanguage?: (lang: ProcessingLanguage) => void;
  isUr: boolean;
  zoom?: DocumentZoom;
  onZoomChange?: (zoom: DocumentZoom) => void;
  documentSettings?: DocumentStudioSettings;
}) {
  const settings = documentSettings ?? defaultDocumentSettings();
  const ui = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? resolveActiveToolbarFormatting(current, settings, dir) : null,
  });
  if (!editor || !ui) return null;

  const currentFont = ui.mixed.fontFamily ? MIXED_TOOLBAR_VALUE : ui.fontFamily;
  const currentSize = ui.mixed.fontSize ? MIXED_TOOLBAR_VALUE : String(ui.fontSizePt ?? settings.typography.bodyFontSizePt);
  const currentLine = ui.mixed.lineHeight ? MIXED_TOOLBAR_VALUE : String(ui.lineHeight ?? settings.typography.lineHeight);
  const sizeOptions = FONT_SIZE_OPTIONS_PT.includes((ui.fontSizePt ?? settings.typography.bodyFontSizePt) as typeof FONT_SIZE_OPTIONS_PT[number])
    ? FONT_SIZE_OPTIONS_PT
    : [...FONT_SIZE_OPTIONS_PT, ui.fontSizePt as number].filter((n): n is number => typeof n === "number").sort((a, b) => a - b);
  const lineOptions = LINE_HEIGHT_OPTIONS.includes((ui.lineHeight ?? settings.typography.lineHeight) as typeof LINE_HEIGHT_OPTIONS[number])
    ? LINE_HEIGHT_OPTIONS
    : [...LINE_HEIGHT_OPTIONS, ui.lineHeight as number].filter((n): n is number => typeof n === "number").sort((a, b) => a - b);

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
        value={ui.blockStyle}
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
        data-studio-font-family="true"
        value={currentFont}
        onChange={(e) => {
          if (e.target.value === MIXED_TOOLBAR_VALUE) return;
          applyFontFamily(editor, e.target.value);
        }}
        className={`${selectCls} max-w-[9.5rem]`}
        title={isUr ? "فونٹ" : "Font family"}
        aria-label={isUr ? "فونٹ" : "Font"}
      >
        {ui.mixed.fontFamily && (
          <option value={MIXED_TOOLBAR_VALUE} disabled>
            {isUr ? "مخلوط" : "Mixed"}
          </option>
        )}
        {STUDIO_FONT_OPTIONS.filter((opt) => opt.value).map((opt) => (
          <option key={opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        id="studio-font-size"
        data-studio-font-size="true"
        value={currentSize}
        onChange={(e) => {
          if (e.target.value === MIXED_TOOLBAR_VALUE) return;
          applyFontSize(editor, e.target.value);
        }}
        className={`${selectCls} min-w-[4.25rem]`}
        title={isUr ? "سائز" : "Font size"}
        aria-label={isUr ? "سائز" : "Size"}
      >
        {ui.mixed.fontSize && (
          <option value={MIXED_TOOLBAR_VALUE} disabled>
            {isUr ? "مخلوط" : "Mixed"}
          </option>
        )}
        {sizeOptions.map((pt) => (
          <option key={pt} value={pt}>
            {pt}
          </option>
        ))}
      </select>
      <ToolbarDivider />
      <ToolbarButton label="Bold" active={ui.bold} onClick={() => toggleBold(editor)}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={ui.italic} onClick={() => toggleItalic(editor)}>
        I
      </ToolbarButton>
      <ToolbarButton label="Underline" active={ui.underline} onClick={() => toggleUnderline(editor)}>
        U
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Align Left" active={ui.textAlign === "left"} onClick={() => setAlign(editor, "left")}>
        ⇤
      </ToolbarButton>
      <ToolbarButton label="Align Center" active={ui.textAlign === "center"} onClick={() => setAlign(editor, "center")}>
        ⇔
      </ToolbarButton>
      <ToolbarButton label="Align Right" active={ui.textAlign === "right"} onClick={() => setAlign(editor, "right")}>
        ⇥
      </ToolbarButton>
      <ToolbarButton label="Justify" active={ui.textAlign === "justify"} onClick={() => setAlign(editor, "justify")}>
        ☰
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Bullet List" active={ui.bullet} onClick={() => toggleBulletList(editor)}>
        •
      </ToolbarButton>
      <ToolbarButton label="Numbered List" active={ui.ordered} onClick={() => toggleOrderedList(editor)}>
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
        data-studio-line-height="true"
        value={currentLine}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === MIXED_TOOLBAR_VALUE) return;
          applyLineHeight(editor, Number(raw));
        }}
        className={selectCls}
        title={isUr ? "فاصلہ" : "Line spacing"}
        aria-label={isUr ? "فاصلہ" : "Line spacing"}
      >
        {ui.mixed.lineHeight && (
          <option value={MIXED_TOOLBAR_VALUE} disabled>
            {isUr ? "مخلوط" : "Mixed"}
          </option>
        )}
        {lineOptions.map((lh) => (
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
