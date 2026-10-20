"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { ProcessingLanguage } from "../../../utils/processing/types";
import { listEditorFonts } from "../utils/fontRegistry";
import { FONT_SIZE_OPTIONS_PT, LINE_SPACING_PRESETS, parseNumericField, type DocumentStudioSettings, defaultDocumentSettings } from "../utils/documentSettings";
import { BLOCK_STYLES, BLOCK_STYLE_IDS, type BlockStyleId } from "../utils/documentStyles";
import { DictationControl } from "./DictationControl";
import type { DocumentZoom } from "../utils/documentView";
import { DOCUMENT_ZOOM_PRESETS } from "../utils/documentView";
import { MIXED_TOOLBAR_VALUE, resolveActiveToolbarFormatting } from "../utils/activeToolbarFormatting";
import { STUDIO_HIGHLIGHT_COLORS, STUDIO_TEXT_COLORS, normalizeSafeHex, parseCustomColorInput } from "../utils/studioColors";
import { sanitizeImageMetadata } from "../utils/documentImages";
import {
  addSpaceAfterParagraph,
  addSpaceBeforeParagraph,
  applyBlockStyle,
  applyParagraphDirection,
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
  latin = false,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
  latin?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      data-latin-control={latin ? "true" : undefined}
      className={`inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center px-1 text-[11px] font-bold leading-none text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-black ${
        active ? "bg-[#d0d0d0]" : "bg-[#f0f0f0] hover:bg-[#e6e6e6]"
      }`}
      style={{
        boxShadow: active
          ? "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff"
          : "inset 1px 1px 0 #a0a0a0, inset 2px 2px 0 #696969, inset -1px -1px 0 #fff, inset -2px -2px 0 #e3e3e3",
      }}
    >
      {children}
    </button>
  );
}

function AlignIcon({ kind }: { kind: "left" | "center" | "right" | "justify" | "distribute" }) {
  const widths = kind === "left" ? [13, 8, 13, 6]
    : kind === "right" ? [13, 8, 13, 6]
    : kind === "center" ? [11, 7, 11, 7]
    : kind === "justify" ? [13, 13, 13, 13]
    : [13, 9, 13, 9];
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
      {widths.map((width, index) => {
        const y = 1 + index * 3;
        const x = kind === "right" ? 13 - width : kind === "center" ? (14 - width) / 2 : 0.5;
        return <path key={index} d={`M${x} ${y} H${x + width}`} stroke="#000" strokeWidth="1.2" />;
      })}
    </svg>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-4 w-px self-center bg-[#c8c8c8]" />;
}

function ImageActionButton({
  label,
  active,
  onClick,
  wrapMode,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  wrapMode?: "wrap" | "break";
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      data-studio-image-wrap={wrapMode}
      className={`inline-flex h-[22px] items-center rounded-none border px-1.5 text-[11px] font-semibold leading-none focus:outline-none ${
        active
          ? "border-[#1A3A2A] bg-[#1A3A2A] text-white"
          : "border-[#1A3A2A]/15 bg-white text-[#1A3A2A] hover:border-[#B8935A] hover:bg-[#FBF6EC]"
      }`}
    >
      {label}
    </button>
  );
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
        className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-none border border-[#b5b5b5] bg-white px-1 leading-none text-[#1c1c1c] hover:bg-[#f3f3f3]"
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
        className="inline-flex h-[18px] min-w-[36px] items-center justify-center bg-[#f0f0f0] px-1 text-[11px] leading-none text-black"
        style={{ boxShadow: "inset 1px 1px 0 #a0a0a0, inset -1px -1px 0 #fff" }}
      >
        <span className="px-0.5" data-latin-control="true">0pt</span>
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

// Native optgroups keep Urdu, Arabic (including Qur'anic), Persian and
// English families separate without adding an extra click or changing values.
const STUDIO_FONT_GROUPS = ([
  { category: "urdu", labelUr: "اردو فونٹس", labelEn: "Urdu fonts" },
  { category: "arabic", labelUr: "عربی فونٹس", labelEn: "Arabic fonts" },
  { category: "persian", labelUr: "فارسی فونٹس", labelEn: "Persian fonts" },
  { category: "latin", labelUr: "انگریزی فونٹس", labelEn: "English fonts" },
] as const).map(group => ({
  ...group,
  fonts: listEditorFonts()
    .filter(font => font.category === group.category)
    .sort((a, b) => group.category === "persian" ? persianMenuRank(a.id) - persianMenuRank(b.id) : 0)
    .map(font => ({
      label: font.availability === "local-preview-only" ? `${font.label} — Local` : font.label,
      value: font.editorFamily,
    })),
}));

function persianMenuRank(id: string): number {
  if (id === "al-fars-9-badr") return 0;
  if (id === "vazirmatn") return 1;
  if (id === "sahel") return 2;
  if (id === "b-nazanin") return 3;
  return 4;
}

const selectCls =
  "h-[18px] shrink-0 bg-[#f0f0f0] px-1 text-[11px] leading-none text-black focus:outline-none";
const selectStyle: CSSProperties = {
  boxShadow: "inset 1px 1px 0 #a0a0a0, inset 2px 2px 0 #696969, inset -1px -1px 0 #fff, inset -2px -2px 0 #e3e3e3",
  border: "none",
};

export const DOCUMENT_TOOLBAR_LEADING = ["style", "spacing", "latin-font", "bold"] as const;

export default function DocumentToolbar({
  editor,
  dir,
  setDir,
  processingLanguage,
  setProcessingLanguage,
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
  const latinFonts = STUDIO_FONT_GROUPS.find((group) => group.category === "latin")?.fonts ?? [];
  const englishValue = currentFont === "Arial Unicode MS" || latinFonts.some((font) => font.value === currentFont)
    ? currentFont
    : "Arial Unicode MS";
  const spacingValue = ui.lineHeight == null || ui.lineHeight === settings.typography.lineHeight ? "auto" : String(ui.lineHeight);
  const colourValue = !ui.color || ui.color === "#000000" || ui.color === "#111111" ? "#000000" : ui.color;

  return (
    <>
      <div
        className="flex flex-col"
        dir={isUr ? "rtl" : "ltr"}
        role="toolbar"
        aria-label={isUr ? "فارمیٹنگ" : "Formatting"}
        data-studio-toolbar="true"
        data-studio-toolbar-language={isUr ? "ur" : "en"}
        data-studio-toolbar-leading={DOCUMENT_TOOLBAR_LEADING.join(",")}
        style={{ background: "#f0f0f0", color: "#000", fontSize: 11 }}
      >
        <div
          className="flex h-5 flex-nowrap items-center gap-0.5 overflow-x-auto px-1"
          data-studio-toolbar-row="format"
        >
          <select
            id="studio-block-style"
            value={ui.blockStyle}
            onChange={(e) => applyBlockStyle(editor, e.target.value as BlockStyleId)}
            className={`${selectCls} max-w-[7.25rem]`}
            style={selectStyle}
            title={isUr ? "انداز" : "Style"}
            aria-label={isUr ? "انداز" : "Style"}
            data-studio-style-control="true"
          >
            {BLOCK_STYLE_IDS.map((id) => (
              <option key={id} value={id}>
                {BLOCK_STYLES[id].labelUr && isUr ? BLOCK_STYLES[id].labelUr : BLOCK_STYLES[id].label}
              </option>
            ))}
          </select>
          <select
            aria-label={isUr ? "سطری فاصلہ" : "Line spacing"}
            data-studio-leading="true"
            className={`${selectCls} max-w-[4.5rem]`}
            style={selectStyle}
            value={spacingValue}
            onChange={(event) => {
              const raw = event.target.value;
              applyLineHeight(editor, raw === "auto" ? null : Number(raw));
            }}
          >
            <option value="auto">Auto</option>
            {LINE_SPACING_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.value}>{preset.value}</option>
            ))}
          </select>
          <select
            aria-label={isUr ? "انگریزی فونٹ" : "English font"}
            data-studio-latin-font="true"
            data-latin-control="true"
            className={`${selectCls} max-w-[9rem]`}
            style={selectStyle}
            value={englishValue}
            onChange={(event) => applyFontFamily(editor, event.target.value)}
          >
            <option value="Arial Unicode MS">Arial Unicode MS</option>
            {latinFonts.map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>
          <ToolbarButton label={isUr ? "موٹا" : "Bold"} active={ui.bold} onClick={() => toggleBold(editor)} latin>
            B
          </ToolbarButton>
          <ToolbarButton label={isUr ? "ترچھا" : "Italic"} active={ui.italic} onClick={() => toggleItalic(editor)} latin>
            I
          </ToolbarButton>
          <select
            id="studio-font-size"
            data-studio-font-size="true"
            value={currentSize}
            onChange={(e) => {
              if (e.target.value === MIXED_TOOLBAR_VALUE) return;
              applyFontSize(editor, e.target.value);
            }}
            className={`${selectCls} min-w-[3.4rem]`}
            style={selectStyle}
            title={isUr ? "سائز" : "Font size"}
            aria-label={isUr ? "سائز" : "Size"}
            data-latin-control="true"
          >
            {ui.mixed.fontSize && (
              <option value={MIXED_TOOLBAR_VALUE} disabled>
                {isUr ? "مخلوط" : "Mixed"}
              </option>
            )}
            {sizeOptions.map((pt) => (
              <option key={pt} value={pt}>{pt}pt</option>
            ))}
          </select>
          <select aria-label={isUr ? "کرننگ" : "Kerning"} data-latin-control="true" className={`${selectCls} max-w-[3.2rem]`} style={selectStyle} defaultValue="0">
            <option value="0">0%</option>
            <option value="5">5%</option>
          </select>
          <ToolbarButton
            label={isUr ? "متن کی سمت" : "Text direction"}
            active={ui.directionMode !== "auto"}
            onClick={() => applyParagraphDirection(editor, ui.directionMode === "ltr" ? "rtl" : "ltr")}
            latin
          >
            ↔
          </ToolbarButton>
          {setProcessingLanguage ? (
            <select
              className={`${selectCls} max-w-[4.5rem]`}
              style={selectStyle}
              aria-label={isUr ? "متن کی زبان" : "Language"}
              data-studio-document-language="true"
              data-latin-control="true"
              value={processingLanguage ?? "ur"}
              onChange={(event) => setProcessingLanguage(event.target.value as ProcessingLanguage)}
            >
              <option value="ur">Urdu</option>
              <option value="ar">Arabic</option>
              <option value="en">English</option>
              <option value="auto">Auto</option>
            </select>
          ) : null}
        </div>
        <div
          className="flex h-5 flex-nowrap items-center gap-0.5 overflow-x-auto px-1"
          data-studio-toolbar-row="document"
          data-studio-toolbar-secondary="true"
        >
          <ToolbarButton label={isUr ? "بائیں سیدھ" : "Align left"} active={ui.textAlign === "left"} onClick={() => setAlign(editor, "left")}><AlignIcon kind="left" /></ToolbarButton>
          <ToolbarButton label={isUr ? "درمیانی سیدھ" : "Align center"} active={ui.textAlign === "center"} onClick={() => setAlign(editor, "center")}><AlignIcon kind="center" /></ToolbarButton>
          <ToolbarButton label={isUr ? "دائیں سیدھ" : "Align right"} active={ui.textAlign === "right"} onClick={() => setAlign(editor, "right")}><AlignIcon kind="right" /></ToolbarButton>
          <ToolbarButton label={isUr ? "برابر کریں" : "Justify"} active={ui.textAlign === "justify"} onClick={() => setAlign(editor, "justify")}><AlignIcon kind="justify" /></ToolbarButton>
          <ToolbarButton label={isUr ? "تقسیم" : "Distribute"} onClick={() => setAlign(editor, "justify")}><AlignIcon kind="distribute" /></ToolbarButton>
          <ParagraphSpacingMenu editor={editor} ui={ui} settings={settings} isUr={isUr} />
          <select
            id="studio-font-family"
            data-studio-font-family="true"
            value={currentFont}
            onChange={(e) => {
              if (e.target.value === MIXED_TOOLBAR_VALUE) return;
              applyFontFamily(editor, e.target.value);
            }}
            className={`${selectCls} max-w-[11rem]`}
            style={selectStyle}
            title={isUr ? "اردو فونٹ" : "Urdu font"}
            aria-label={isUr ? "اردو فونٹ" : "Urdu font"}
          >
            {ui.mixed.fontFamily && (
              <option value={MIXED_TOOLBAR_VALUE} disabled>
                {isUr ? "مخلوط" : "Mixed"}
              </option>
            )}
            <option value="">{isUr ? "طے شدہ فونٹ" : "Default font"}</option>
            {STUDIO_FONT_GROUPS.map((group) => (
              <optgroup key={group.category} label={isUr ? group.labelUr : group.labelEn}>
                {group.fonts.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ToolbarButton label={isUr ? "بائیں سے دائیں" : "Left to right"} active={dir === "ltr"} onClick={() => { setDir("ltr"); applyParagraphDirection(editor, "ltr"); }} latin>LTR</ToolbarButton>
          <ToolbarButton label={isUr ? "دائیں سے بائیں" : "Right to left"} active={dir === "rtl"} onClick={() => { setDir("rtl"); applyParagraphDirection(editor, "rtl"); }} latin>RTL</ToolbarButton>
          <select
            aria-label={isUr ? "رنگ" : "Colour"}
            data-latin-control="true"
            className={`${selectCls} max-w-[4.5rem]`}
            style={selectStyle}
            value={colourValue}
            onChange={(event) => applyTextColor(editor, event.target.value)}
          >
            <option value="#000000">Black</option>
            <option value="#1A3A2A">Green</option>
            <option value="#7F1D1D">Maroon</option>
            <option value="#1D4ED8">Blue</option>
          </select>
          <select aria-label={isUr ? "افقی پیمانہ" : "Horizontal scale"} data-latin-control="true" className={`${selectCls} max-w-[4rem]`} style={selectStyle} defaultValue="100">
            <option value="100">100%</option>
            <option value="90">90%</option>
            <option value="110">110%</option>
          </select>
          <select
            aria-label={isUr ? "شیڈ" : "Shade"}
            data-studio-shade="true"
            className={`${selectCls} max-w-[4.2rem]`}
            style={selectStyle}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) applyHighlight(editor, event.target.value);
            }}
          >
            <option value="">Shade</option>
            <option value="#fff2a8">Yellow</option>
            <option value="#d9f2d9">Green</option>
            <option value="#d6e6ff">Blue</option>
          </select>
          <select aria-label="None" data-latin-control="true" className={`${selectCls} max-w-[4rem]`} style={selectStyle} defaultValue="none">
            <option value="none">None</option>
          </select>
          <select aria-label="K-None" data-latin-control="true" className={`${selectCls} max-w-[4.5rem]`} style={selectStyle} defaultValue="k">
            <option value="k">K-None</option>
          </select>
        </div>
      </div>
      <div className="sr-only">
        <ToolbarButton label={isUr ? "خودکار سمت" : "Automatic paragraph direction"} active={ui.directionMode === "auto"} onClick={() => applyParagraphDirection(editor, "auto")} latin>
          Auto
        </ToolbarButton>
        <ToolbarButton label={isUr ? "دائیں سے بائیں" : "Right-to-left (Urdu/Arabic/Persian)"} active={ui.directionMode === "rtl"} onClick={() => { setDir("rtl"); applyParagraphDirection(editor, "rtl"); }} latin>
          RTL
        </ToolbarButton>
        <ToolbarButton label={isUr ? "بائیں سے دائیں" : "Left-to-right (English)"} active={ui.directionMode === "ltr"} onClick={() => { setDir("ltr"); applyParagraphDirection(editor, "ltr"); }} latin>
          LTR
        </ToolbarButton>
        <ColorPaletteControl editor={editor} kind="text" colors={STUDIO_TEXT_COLORS} value={ui.color} mixed={ui.mixed.color} isUr={isUr} />
        <ColorPaletteControl editor={editor} kind="highlight" colors={STUDIO_HIGHLIGHT_COLORS} value={ui.highlight} mixed={ui.mixed.highlight} isUr={isUr} />
        <DictationControl editor={editor} docDir={dir} isUr={isUr} />
      </div>
    </>
  );
}
