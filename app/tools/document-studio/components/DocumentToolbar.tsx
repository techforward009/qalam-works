"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { ProcessingLanguage } from "../../../utils/processing/types";
import { listEditorFonts } from "../utils/fontRegistry";
import { FONT_SIZE_OPTIONS_PT, LINE_SPACING_PRESETS, parseNumericField, type DocumentStudioSettings, defaultDocumentSettings } from "../utils/documentSettings";
import { BLOCK_STYLES, BLOCK_STYLE_IDS, type BlockStyleId } from "../utils/documentStyles";
import { DictationControl } from "./DictationControl";
import type { DocumentZoom } from "../utils/documentView";
import { DOCUMENT_ZOOM_PRESETS } from "../utils/documentView";
import { MIXED_TOOLBAR_VALUE, resolveActiveToolbarFormatting } from "../utils/activeToolbarFormatting";
import { STUDIO_HIGHLIGHT_COLORS, STUDIO_TEXT_COLORS, normalizeSafeHex, parseCustomColorInput } from "../utils/studioColors";
import {
  addSpaceAfterParagraph,
  addSpaceBeforeParagraph,
  applyBlockStyle,
  applyCustomParagraphSpacing,
  applyFontFamily,
  applyFontSize,
  applyHighlight,
  applyLineHeight,
  applyTextColor,
  redo,
  removeSpaceAfterParagraph,
  removeSpaceBeforeParagraph,
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

type StudioSwatch = { id: string; label: string; hex: string };

function applyKeepingSelection(editor: Editor, apply: () => void) {
  const { from, to } = editor.state.selection;
  apply();
  editor.commands.setTextSelection({ from, to });
}

function ColorPaletteControl({
  editor,
  kind,
  colors,
  value,
  mixed,
  isUr,
}: {
  editor: Editor;
  kind: "text" | "highlight";
  colors: readonly StudioSwatch[];
  value: string | null;
  mixed: boolean;
  isUr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = mixed ? null : (value ?? "");
  const triggerLabel = kind === "text" ? (isUr ? "متن کا رنگ" : "Text color") : (isUr ? "نمایاں رنگ" : "Highlight");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const keepFocus = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  const pick = (hex: string, close = true) => {
    applyKeepingSelection(editor, () => {
      if (kind === "text") applyTextColor(editor, hex);
      else applyHighlight(editor, hex);
    });
    if (close) setOpen(false);
  };

  const applyCustom = (raw: string) => {
    const safe = parseCustomColorInput(raw);
    if (!safe) return false;
    pick(safe, false);
    return true;
  };

  const barColor = mixed ? undefined : current || (kind === "text" ? "#111111" : "transparent");
  const resetSwatch = colors[0];
  const gridSwatches = colors.slice(1);
  const customValue = normalizeSafeHex(current) ?? (kind === "text" ? "#111111" : "#FEF3C7");
  const customLabel = isUr ? "حسب ضرورت" : "Custom";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-studio-text-color={kind === "text" ? "palette" : undefined}
        data-studio-highlight={kind === "highlight" ? "palette" : undefined}
        data-studio-text-color-button={kind === "text" ? "true" : undefined}
        data-studio-highlight-button={kind === "highlight" ? "true" : undefined}
        onMouseDown={keepFocus}
        onClick={() => setOpen((next) => !next)}
        className="h-8 min-w-8 px-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:border-[#B8935A] hover:text-[#1A3A2A]"
      >
        {kind === "text" ? (
          <span className="flex flex-col items-center leading-none">
            <span className="text-[13px] font-bold">A</span>
            <span
              data-studio-text-color-swab="true"
              className="mt-0.5 h-[3px] w-4 rounded-sm"
              style={{
                background: mixed ? "repeating-linear-gradient(90deg,#111 0 2px,#ccc 2px 4px)" : barColor,
              }}
            />
          </span>
        ) : (
          <span className="flex flex-col items-center leading-none">
            <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
              <path d="M1.5 11h5.2L12 3.4 9.4 1.6 3.7 9.2H1.5V11zm8.3-8.2 1.2.8L9.6 5.7 8.4 4.9l1.4-2.1z" fill="currentColor" />
            </svg>
            <span
              data-studio-highlight-swab="true"
              className="mt-0.5 h-[3px] w-4 rounded-sm border border-gray-200"
              style={{
                background: mixed ? "repeating-linear-gradient(90deg,#FEF3C7 0 2px,#fff 2px 4px)" : barColor,
              }}
            />
          </span>
        )}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={triggerLabel}
          data-studio-text-color-palette={kind === "text" ? "true" : undefined}
          data-studio-highlight-palette={kind === "highlight" ? "true" : undefined}
          className="absolute left-0 top-full z-[80] mt-1 w-[232px] rounded-md border border-gray-200 bg-white p-2 shadow-md"
        >
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {triggerLabel}
          </div>
          {resetSwatch ? (
            <button
              type="button"
              title={isUr && resetSwatch.id === "default" ? "طے شدہ" : isUr && resetSwatch.id === "none" ? "کوئی نہیں" : resetSwatch.label}
              aria-label={isUr && resetSwatch.id === "default" ? "طے شدہ" : isUr && resetSwatch.id === "none" ? "کوئی نہیں" : resetSwatch.label}
              aria-pressed={!mixed && (current ?? "") === ""}
              data-studio-color-swatch={resetSwatch.id}
              data-studio-color-swatch-active={!mixed && (current ?? "") === "" ? "true" : "false"}
              onMouseDown={keepFocus}
              onClick={() => pick("")}
              className={`mb-1.5 flex h-6 w-full items-center gap-2 rounded border px-1.5 text-[11px] font-medium ${
                !mixed && (current ?? "") === "" ? "border-[#1A3A2A] text-[#1A3A2A]" : "border-gray-200 text-gray-600"
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-sm border border-gray-300"
                style={{ background: "linear-gradient(135deg, #fff 46%, #ef4444 46%, #ef4444 54%, #fff 54%)" }}
              />
              {isUr && resetSwatch.id === "default" ? "طے شدہ" : isUr && resetSwatch.id === "none" ? "کوئی نہیں" : resetSwatch.label}
            </button>
          ) : null}
          <div className="grid grid-cols-10 gap-[3px]" data-studio-color-grid="true">
            {gridSwatches.map((swatch) => {
              const selected = !mixed && (current ?? "").toUpperCase() === swatch.hex.toUpperCase();
              return (
                <button
                  key={swatch.id}
                  type="button"
                  title={swatch.label}
                  aria-label={swatch.label}
                  aria-pressed={selected}
                  data-studio-color-swatch={swatch.id}
                  data-studio-color-swatch-active={selected ? "true" : "false"}
                  onMouseDown={keepFocus}
                  onClick={() => pick(swatch.hex)}
                  className={`relative h-[18px] w-[18px] rounded-sm border ${selected ? "ring-2 ring-[#1A3A2A] ring-offset-1" : "border-black/10 hover:ring-1 hover:ring-[#B8935A]"}`}
                  style={{ background: swatch.hex }}
                >
                  {selected ? (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: isLightHex(swatch.hex) ? "#1A3A2A" : "#fff" }}>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <label className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2 text-[11px] font-medium text-gray-600">
            <span className="shrink-0">{customLabel}</span>
            <input
              type="color"
              aria-label={customLabel}
              data-studio-custom-color={kind}
              value={customValue}
              onMouseDown={keepFocus}
              onChange={(event) => applyCustom(event.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-gray-200 bg-white p-0"
            />
            <input
              type="text"
              spellCheck={false}
              maxLength={7}
              placeholder="#RRGGBB"
              aria-label={isUr ? "حسب ضرورت کوڈ" : "Custom hex"}
              data-studio-custom-hex={kind}
              defaultValue={normalizeSafeHex(current) ?? ""}
              onMouseDown={keepFocus}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => applyCustom(event.target.value)}
              className="h-6 min-w-0 flex-1 rounded border border-gray-200 px-1.5 font-mono text-[10px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1A3A2A]/30"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function isLightHex(hex: string): boolean {
  const match = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!match) return true;
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function ParagraphSpacingMenu({
  editor,
  ui,
  settings,
  isUr,
}: {
  editor: Editor;
  ui: NonNullable<ReturnType<typeof resolveActiveToolbarFormatting>>;
  settings: DocumentStudioSettings;
  isUr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = isUr ? "پیراگراف فاصلہ" : "Paragraph spacing";

  useEffect(() => {
    if (!open && !customOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setCustomOpen(false);
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCustomOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, customOpen]);

  const keepFocus = (event: React.MouseEvent) => event.preventDefault();
  const hasBefore = !ui.mixed.spaceBefore && (ui.spaceBeforePt ?? 0) > 0;
  const hasAfter = !ui.mixed.spaceAfter && (ui.spaceAfterPt ?? 0) > 0;

  const applyPreset = (value: number) => {
    applyLineHeight(editor, value);
    setOpen(false);
  };

  const applyCustom = (form: HTMLFormElement) => {
    const read = (name: string, kind: "line" | "pt" | "mm") => {
      const raw = String(new FormData(form).get(name) ?? "").trim();
      if (!raw) return undefined;
      return parseNumericField(raw, kind);
    };
    const lineHeight = read("lineHeight", "line");
    const spaceBeforePt = read("spaceBeforePt", "pt");
    const spaceAfterPt = read("spaceAfterPt", "pt");
    const firstLineIndentMm = read("firstLineIndentMm", "mm");
    const indentStartMm = read("indentStartMm", "mm");
    const indentEndMm = read("indentEndMm", "mm");
    const fields = { lineHeight, spaceBeforePt, spaceAfterPt, firstLineIndentMm, indentStartMm, indentEndMm };
    const filled = Object.values(fields).filter((value) => value !== undefined);
    if (filled.some((value) => value === null)) return;
    const next: Record<string, number> = {};
    (Object.keys(fields) as (keyof typeof fields)[]).forEach((key) => {
      const value = fields[key];
      if (typeof value === "number") next[key] = value;
    });
    applyCustomParagraphSpacing(editor, next);
    setCustomOpen(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open || customOpen}
        data-studio-line-height="menu"
        data-studio-spacing-button="true"
        onMouseDown={keepFocus}
        onClick={() => {
          setCustomOpen(false);
          setOpen((next) => !next);
        }}
        className="h-8 min-w-8 px-1.5 rounded border bg-white text-gray-700 border-gray-200 hover:border-[#B8935A] hover:text-[#1A3A2A]"
      >
        <span className="flex flex-col items-center leading-none">
          <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
            <path d="M1 2h12M1 6h12M1 10h8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          data-studio-spacing-menu="true"
          className="absolute right-0 top-full z-[80] mt-1 w-[240px] rounded-md border border-gray-200 bg-white py-1 shadow-md"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {isUr ? "لائن اسپیسنگ" : "Line spacing"}
          </div>
          {LINE_SPACING_PRESETS.map((preset) => {
            const checked = !ui.mixed.lineHeight && ui.lineHeight === preset.value;
            return (
              <button
                key={preset.id}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                data-studio-spacing-preset={String(preset.value)}
                onMouseDown={keepFocus}
                onClick={() => applyPreset(preset.value)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-gray-700 hover:bg-[#F7F5EF]"
              >
                <span className="w-4 text-[#1A3A2A]">{checked ? "✓" : ""}</span>
                {isUr ? preset.labelUr : preset.labelEn}
              </button>
            );
          })}
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            role="menuitem"
            data-studio-add-space-before="true"
            onMouseDown={keepFocus}
            onClick={() => {
              if (hasBefore) removeSpaceBeforeParagraph(editor);
              else addSpaceBeforeParagraph(editor, settings);
              setOpen(false);
            }}
            className="flex w-full px-2 py-1.5 text-left text-[12px] text-gray-700 hover:bg-[#F7F5EF]"
          >
            {hasBefore
              ? isUr ? "پیراگراف سے پہلے فاصلہ ہٹائیں" : "Remove space before paragraph"
              : isUr ? "پیراگراف سے پہلے فاصلہ شامل کریں" : "Add space before paragraph"}
          </button>
          <button
            type="button"
            role="menuitem"
            data-studio-add-space-after="true"
            onMouseDown={keepFocus}
            onClick={() => {
              if (hasAfter) removeSpaceAfterParagraph(editor);
              else addSpaceAfterParagraph(editor, settings);
              setOpen(false);
            }}
            className="flex w-full px-2 py-1.5 text-left text-[12px] text-gray-700 hover:bg-[#F7F5EF]"
          >
            {hasAfter
              ? isUr ? "پیراگراف کے بعد فاصلہ ہٹائیں" : "Remove space after paragraph"
              : isUr ? "پیراگراف کے بعد فاصلہ شامل کریں" : "Add space after paragraph"}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            type="button"
            role="menuitem"
            data-studio-custom-spacing="true"
            onMouseDown={keepFocus}
            onClick={() => {
              setOpen(false);
              setCustomOpen(true);
            }}
            className="flex w-full px-2 py-1.5 text-left text-[12px] text-gray-700 hover:bg-[#F7F5EF]"
          >
            {isUr ? "حسب ضرورت فاصلہ…" : "Custom spacing…"}
          </button>
        </div>
      ) : null}
      {customOpen ? (
        <form
          role="dialog"
          aria-label={isUr ? "حسب ضرورت فاصلہ" : "Custom spacing"}
          data-studio-custom-spacing-dialog="true"
          className="absolute right-0 top-full z-[80] mt-1 w-[260px] rounded-md border border-gray-200 bg-white p-2 shadow-md"
          onSubmit={(event) => {
            event.preventDefault();
            applyCustom(event.currentTarget);
          }}
        >
          {[
            { name: "lineHeight", label: isUr ? "لائن اسپیسنگ" : "Line spacing", kind: "line" as const, value: ui.mixed.lineHeight ? "" : ui.lineHeight, step: "0.05" },
            { name: "spaceBeforePt", label: isUr ? "پہلے فاصلہ (pt)" : "Space before (pt)", kind: "pt" as const, value: ui.mixed.spaceBefore ? "" : ui.spaceBeforePt, step: "1" },
            { name: "spaceAfterPt", label: isUr ? "بعد فاصلہ (pt)" : "Space after (pt)", kind: "pt" as const, value: ui.mixed.spaceAfter ? "" : ui.spaceAfterPt, step: "1" },
            { name: "firstLineIndentMm", label: isUr ? "پہلی سطر انڈینٹ (mm)" : "First-line indent (mm)", kind: "mm" as const, value: ui.mixed.firstLineIndent ? "" : ui.firstLineIndentMm, step: "1" },
            { name: "indentStartMm", label: isUr ? "شروع انڈینٹ (mm)" : "Start indent (mm)", kind: "mm" as const, value: ui.mixed.indentStart ? "" : ui.indentStartMm, step: "1" },
            { name: "indentEndMm", label: isUr ? "اختتام انڈینٹ (mm)" : "End indent (mm)", kind: "mm" as const, value: ui.mixed.indentEnd ? "" : ui.indentEndMm, step: "1" },
          ].map((field) => (
            <label key={field.name} className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-600">
              <span>{field.label}</span>
              <input
                name={field.name}
                type="number"
                step={field.step}
                defaultValue={field.value ?? ""}
                placeholder={field.value == null || field.value === "" ? (isUr ? "مخلوط" : "Mixed") : undefined}
                data-studio-spacing-field={field.name}
                className="h-7 w-20 rounded border border-gray-200 px-1.5 text-[11px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1A3A2A]/30"
              />
            </label>
          ))}
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              data-studio-spacing-cancel="true"
              onMouseDown={keepFocus}
              onClick={() => setCustomOpen(false)}
              className="h-7 rounded border border-gray-200 px-2 text-[11px] text-gray-600"
            >
              {isUr ? "منسوخ" : "Cancel"}
            </button>
            <button
              type="submit"
              data-studio-spacing-apply="true"
              onMouseDown={keepFocus}
              className="h-7 rounded bg-[#1A3A2A] px-2 text-[11px] font-semibold text-white"
            >
              {isUr ? "لاگو کریں" : "Apply"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
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
  const sizeOptions = FONT_SIZE_OPTIONS_PT.includes((ui.fontSizePt ?? settings.typography.bodyFontSizePt) as typeof FONT_SIZE_OPTIONS_PT[number])
    ? FONT_SIZE_OPTIONS_PT
    : [...FONT_SIZE_OPTIONS_PT, ui.fontSizePt as number].filter((n): n is number => typeof n === "number").sort((a, b) => a - b);

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
      <ColorPaletteControl
        editor={editor}
        kind="text"
        colors={STUDIO_TEXT_COLORS}
        value={ui.color}
        mixed={ui.mixed.color}
        isUr={isUr}
      />
      <ColorPaletteControl
        editor={editor}
        kind="highlight"
        colors={STUDIO_HIGHLIGHT_COLORS}
        value={ui.highlight}
        mixed={ui.mixed.highlight}
        isUr={isUr}
      />
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
      <ParagraphSpacingMenu editor={editor} ui={ui} settings={settings} isUr={isUr} />
      <div className="shrink-0" data-studio-dictation="true">
        <DictationControl editor={editor} docDir={dir} isUr={isUr} />
      </div>
    </div>
  );
}
