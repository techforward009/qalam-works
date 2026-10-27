"use client";
import { LeadingInput } from "./LeadingInput";
import { parseLeading } from "../utils/leading";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { ProcessingLanguage } from "../../../utils/processing/types";
import { listEditorFonts } from "../utils/fontRegistry";
import { LINE_SPACING_PRESETS, parseNumericField, type DocumentStudioSettings, defaultDocumentSettings } from "../utils/documentSettings";
import { BLOCK_STYLES, type BlockStyleId } from "../utils/documentStyles";
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
  applyLineGap,
  applyParagraphDirection,
  applyCustomParagraphSpacing,
  applyFontFamily,
  applyEnglishFont,
  applyFontSize,
  applyHighlight,
  applyLineHeight,
  applyScale,
  applyTextColor,
  applyTextEffect,
  applyTracking,
  redo,
  removeSpaceAfterParagraph,
  removeSpaceBeforeParagraph,
  setAlign,
  toggleBold,
  toggleBulletList,
  toggleItalic,
  toggleOrderedList,
  toggleTextOutline,
  toggleUnderline,
  undo,
} from "../utils/documentCommands";
import { INPAGE_TEXT_COLOURS, TEXT_EFFECTS, TEXT_EFFECT_LABELS, TOOLBAR_FONT_SIZE_PRESETS, mapToolbarLanguage, parseLineGap, parseToolbarFontSize, parseToolbarPercent, studioOverlayRoot, type PercentKind, type TextEffect } from "../utils/inpageToolbar";

function ToolbarButton({
  onClick,
  active,
  children,
  label,
  latin = false,
  raised = false,
  width,
  gap = 0,
  disabledTip,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
  latin?: boolean;
  raised?: boolean;
  width?: number;
  gap?: number;
  disabledTip?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={disabledTip ?? label}
      disabled={Boolean(disabledTip)}
      data-studio-coming-soon={disabledTip ? "true" : undefined}
      aria-label={label}
      aria-pressed={active}
      data-latin-control={latin ? "true" : undefined}
      className="inline-flex h-[18px] min-w-[20px] shrink-0 items-center justify-center bg-[#f0f0f0] px-1 text-[11px] font-bold leading-none text-black focus-visible:outline focus-visible:outline-1 focus-visible:outline-black"
      style={{ color: disabledTip ? "#808080" : "#000", width, minWidth: width ?? 20, paddingInline: width ? 0 : undefined, marginInlineStart: gap, height: 18, minHeight: 18, position: "relative", boxShadow: active && !raised ? CLASSIC_SUNKEN : BUTTON_RAISED }}
    >
      {children}
    </button>
  );
}

const RIBBON_FONT = 'Arial, "Liberation Sans", sans-serif';

function art(rows: string[], ox = 0, oy = 0): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "#") points.push([ox + x, oy + y]);
    });
  });
  return points;
}

function raisedColor(x: number, y: number, w: number, h: number): string | null {
  const right = w - 1;
  const bottom = h - 1;
  if ((y === 0 && (x === 0 || x === right)) || (y === bottom && (x === 0 || x === right))) return null;
  if (y === 0) return x <= right - 3 ? "#000000" : "#646464";
  if (x === 0) return y >= bottom - 2 ? "#646464" : "#000000";
  if (x === right || y === bottom) return "#646464";
  if ((y === 1 && x < right - 1) || (x === 1 && y <= bottom - 2)) return "#ffffff";
  if (x >= right - 2 || y >= bottom - 2) return "#a0a0a0";
  return "#f0f0f0";
}

function pressedColor(x: number, y: number, w: number, h: number): string | null {
  const right = w - 1;
  const bottom = h - 1;
  if ((y === 0 && (x === 0 || x === right)) || (y === bottom && (x === 0 || x === right))) return null;
  if (x === 0 || y === 0 || x === right || y === bottom) return "#646464";
  if (y === 1 && x === 1) return "#f0f0f0";
  if (y === 1 && x >= 2 && x <= right - 2) return "#000000";
  if (y === 1 && x === right - 1) return "#a0a0a0";
  if (x === 1 && y === bottom - 1) return "#a0a0a0";
  if (x === 1) return "#000000";
  if (x === right - 1 || y >= bottom - 1) return "#f0f0f0";
  return (x + y) % 2 === 0 ? "#f0f0f0" : "#ffffff";
}

function tileColor(x: number, y: number): string | null {
  const last = 18;
  if (x === last && y === last) return null;
  if (y === 0) return x >= last - 2 ? "#646464" : "#000000";
  if (x === last || y === last) return "#646464";
  if (x === 0 && y >= last - 2) return "#646464";
  if (x === 0) return "#000000";
  return "#f0f0f0";
}

function PixelFace({
  w, h, colorAt, glyph, light = [], shift = 0,
}: {
  w: number;
  h: number;
  colorAt: (x: number, y: number) => string | null;
  glyph: Array<[number, number]>;
  light?: Array<[number, number]>;
  shift?: number;
}) {
  const groups = new Map<string, string[]>();
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const color = colorAt(x, y);
      if (!color) continue;
      const bucket = groups.get(color) ?? [];
      bucket.push(`M${x} ${y}h1v1H${x}z`);
      groups.set(color, bucket);
    }
  }
  const paper = light.map(([x, y]) => `M${x + shift} ${y + shift}h1v1H${x + shift}z`).join("");
  const ink = glyph.map(([x, y]) => `M${x + shift} ${y + shift}h1v1H${x + shift}z`).join("");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block" }}>
      {[...groups].map(([color, parts]) => <path key={color} d={parts.join("")} fill={color} />)}
      {paper ? <path d={paper} fill="#ffffff" /> : null}
      {ink ? <path d={ink} fill="#000" /> : null}
    </svg>
  );
}

const BUTTON_BOX: CSSProperties = {
  position: "absolute", padding: 0, margin: 0, border: "none", borderRadius: 0,
  background: "transparent", boxShadow: "none", overflow: "hidden", lineHeight: 0, fontSize: 0,
  minHeight: 0, maxHeight: 18,
};

function RaisedButton({
  x, y = 0, w = 20, h = 18, glyph, pressed = false, label, onClick, geom, align,
}: {
  x: number;
  y?: number;
  w?: number;
  h?: number;
  glyph: Array<[number, number]>;
  pressed?: boolean;
  label: string;
  onClick: () => void;
  geom: string;
  align?: string;
}) {
  return (
    <button
      type="button"
      data-studio-geom={geom}
      data-studio-align={align}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      style={{ ...BUTTON_BOX, left: x, top: y, width: w, height: h, minHeight: h, maxHeight: h }}
    >
      <PixelFace w={w} h={h} colorAt={(px, py) => pressed ? pressedColor(px, py, w, h) : raisedColor(px, py, w, h)} glyph={placeGlyph(glyph, pressed)} />
    </button>
  );
}

function FlatTile({
  x, y = 0, glyph, light = [], label, onClick, geom,
}: {
  x: number;
  y?: number;
  glyph: Array<[number, number]>;
  light?: Array<[number, number]>;
  label: string;
  onClick?: () => void;
  geom: string;
}) {
  return (
    <button
      type="button"
      data-studio-geom={geom}
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      style={{ ...BUTTON_BOX, left: x, top: y, width: 19, height: 19, minHeight: 19, maxHeight: 19 }}
    >
      <PixelFace w={19} h={19} colorAt={tileColor} glyph={glyph} light={light} />
    </button>
  );
}

const LEADING_GLYPH = [
  ...art(["#"], 9, 2), ...art(["#"], 9, 3), ...art(["#"], 9, 4),
  ...art(["#.#.#"], 7, 5), ...art(["###"], 8, 6), ...art(["#"], 9, 7),
  ...art(["#############"], 3, 8), ...art(["#"], 3, 9), ...art(["#"], 15, 9), ...art(["#############"], 3, 10),
  ...art(["#"], 9, 11), ...art(["###"], 8, 12), ...art(["#.#.#"], 7, 13),
  ...art(["#"], 9, 14), ...art(["#"], 9, 15),
];
const LEADING_LIGHT = art(["###########"], 4, 9);
const INTERLINE_GLYPH = [
  ...art(["#############", "#           #", "#############"], 3, 3),
  ...art(["#"], 9, 6), ...art(["###"], 8, 7), ...art(["#.#.#"], 7, 8),
  ...art(["#"], 9, 9),
  ...art(["#.#.#"], 7, 10), ...art(["###"], 8, 11), ...art(["#"], 9, 12),
  ...art(["#############", "#           #", "#############"], 3, 13),
];
const INTERLINE_LIGHT = [...art(["###########"], 4, 4), ...art(["###########"], 4, 14)];
const TRACKING_GLYPH = [
  ...art(["#####", "#   #", "#   #", "#   #", "#####"], 3, 5),
  ...art(["#####", "#   #", "#   #", "#   #", "#####"], 11, 5),
  ...art(["#"], 6, 11), ...art(["####"], 4, 12), ...art(["#"], 6, 13),
  ...art(["#"], 12, 11), ...art(["####"], 11, 12), ...art(["#"], 12, 13),
];
const SCALE_GLYPH = [
  ...art(["#####", "#   #", "#   #", "#####"], 7, 5),
  ...art(["#"], 4, 9), ...art(["#"], 14, 9),
  ...art(["#.#"], 5, 10), ...art(["#.#"], 11, 10),
  ...art(["######"], 2, 11), ...art(["#####"], 11, 11),
  ...art(["#.#"], 5, 12), ...art(["#.#"], 11, 12),
  ...art(["#"], 4, 13), ...art(["#"], 14, 13),
];
const BOLD_GLYPH = art([
  "",
  "     #######",
  "      ##   ##",
  "      ##   ##",
  "      ##  ##",
  "      ######",
  "      ##   ##",
  "      ##   ##",
  "      ##   ##",
  "     #######",
], 0, 0);
const ITALIC_GLYPH = art([
  "..####",
  "...##.",
  "..##..",
  "..##..",
  "..##..",
  "..##..",
  ".##...",
  ".##...",
  "####..",
], 7, 1);
function directionArrow(dir: "ltr" | "rtl"): Array<[number, number]> {
  const rows = dir === "ltr"
    ? [[12], [5, 6, 7, 8, 9, 10, 11, 12, 13], [5, 6, 7, 8, 9, 10, 11, 12, 13, 14], [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [5, 6, 7, 8, 9, 10, 11, 12, 13, 14], [5, 6, 7, 8, 9, 10, 11, 12, 13], [12]]
    : [[6], [6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [6]];
  const points: Array<[number, number]> = [];
  rows.forEach((xs, index) => xs.forEach((x) => points.push([x, 2 + index])));
  return points;
}
const LTR_GLYPH = directionArrow("ltr");
const RTL_GLYPH = directionArrow("rtl");
const OUTLINE_GLYPH = [
  ...art(["###"], 8, 1),
  ...art(["##"], 6, 2), ...art(["##"], 11, 2),
  ...art(["#"], 6, 3), ...art(["#"], 12, 3),
  ...art(["#"], 5, 4), ...art(["#"], 13, 4),
  ...art(["#"], 5, 5), ...art(["#"], 13, 5),
  ...art(["#"], 5, 6), ...art(["#"], 13, 6),
  ...art(["#"], 6, 7), ...art(["#"], 12, 7),
  ...art(["##"], 6, 8), ...art(["##"], 11, 8),
  ...art(["###"], 8, 9),
];
const TABS_GLYPH = [
  ...art(["#"], 9, 1),
  ...art(["###"], 8, 2),
  ...art(["#.#.#"], 7, 3),
  ...art(["#"], 9, 4), ...art(["#"], 9, 5), ...art(["#"], 9, 6), ...art(["#"], 9, 7), ...art(["#"], 9, 8), ...art(["#"], 9, 9),
  ...art(["###"], 9, 10),
];

function placeGlyph(glyph: Array<[number, number]>, pressed: boolean): Array<[number, number]> {
  const dx = pressed ? 1 : 0;
  const dy = pressed ? 4 : 3;
  return glyph.map(([x, y]) => [x + dx, y + dy]);
}

function alignGlyph(kind: "left" | "right" | "center" | "justify" | "full"): Array<[number, number]> {
  const widths = kind === "justify" ? [13, 13, 13, 13, 13, 8]
    : kind === "full" ? [13, 13, 13, 13, 13, 13]
      : [12, 11, 13, 8, 11, 13];
  const points: Array<[number, number]> = [];
  widths.forEach((width, index) => {
    const y = index * 2;
    const x0 = kind === "right" ? 16 - width : kind === "center" ? 3 + Math.floor((13 - width) / 2) : 3;
    for (let x = 0; x < width; x += 1) points.push([x0 + x, y]);
  });
  return points;
}

function bevelColor(
  x: number, y: number, w: number, h: number,
  outerTL: string, outerBR: string, innerTL: string, innerBR: string, face: string | null,
): string | null {
  if ((y === 0 && x < w - 1) || (x === 0 && y < h - 1)) return outerTL;
  if (x === w - 1 || y === h - 1) return outerBR;
  if ((y === 1 && x < w - 2) || (x === 1 && y < h - 2)) return innerTL;
  if (x === w - 2 || y === h - 2) return innerBR;
  return face;
}

function SunkenBox({
  geom, x, y = 0, w, h, children,
}: {
  geom: string;
  x: number;
  y?: number;
  w: number;
  h: number;
  children: React.ReactNode;
}) {
  return (
    <span data-studio-geom={geom} style={{ position: "absolute", left: x, top: y, width: w, height: h, background: "#fff", boxSizing: "border-box" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <PixelFace w={w} h={h} glyph={[]} colorAt={(px, py) => bevelColor(px, py, w, h, "#a0a0a0", "#ffffff", "#696969", "#e3e3e3", null)} />
      </span>
      {children}
    </span>
  );
}

const ARROW_GLYPH = art(["#######", ".#####.", "..###..", "...#..."], 4, 6);

function ComboArrow() {
  return (
    <span aria-hidden="true" data-studio-combo-arrow="true" style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, pointerEvents: "none", zIndex: 2 }}>
      <PixelFace w={16} h={16} glyph={ARROW_GLYPH} colorAt={(px, py) => bevelColor(px, py, 16, 16, "#e3e3e3", "#696969", "#ffffff", "#a0a0a0", "#f0f0f0")} />
    </span>
  );
}

const COMBO_TEXT: CSSProperties = {
  position: "absolute", inset: 0, zIndex: 1, boxSizing: "border-box", width: "100%", height: "100%",
  margin: 0, border: 0, borderRadius: 0, outline: "none", boxShadow: "none", background: "transparent",
  color: "#000", fontFamily: RIBBON_FONT, fontSize: 9, lineHeight: "9px", padding: "2px 20px 0 4px",
  transform: "translateY(-1px)", minWidth: 0, minHeight: 0, maxHeight: "100%",
  appearance: "none", WebkitAppearance: "none", textAlign: "left", direction: "ltr",
};
const EDIT_TEXT: CSSProperties = { ...COMBO_TEXT, padding: "0 4px 0 4px" };

function openToolbarCombo(input: HTMLSelectElement | null) {
  if (!input) return;
  input.focus();
  try { input.showPicker?.(); } catch { /* Keyboard navigation remains available. */ }
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
  compact = false,
}: {
  editor: Editor;
  kind: "text" | "highlight";
  colors: readonly StudioSwatch[];
  value: string | null;
  mixed: boolean;
  isUr: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = mixed ? null : (value ?? "");
  const triggerLabel = compact ? (isUr ? "شیڈ" : "Shade") : kind === "text" ? (isUr ? "متن کا رنگ" : "Text color") : (isUr ? "نمایاں رنگ" : "Highlight");

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
    <div ref={rootRef} className="relative shrink-0" style={compact ? { width: 20, marginInlineStart: 3 } : undefined}>
      <button
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-studio-text-color={kind === "text" ? "palette" : undefined}
        data-studio-shade={compact ? "true" : undefined}
        data-studio-highlight={kind === "highlight" ? "palette" : undefined}
        data-studio-text-color-button={kind === "text" ? "true" : undefined}
        data-studio-highlight-button={kind === "highlight" ? "true" : undefined}
        onMouseDown={keepFocus}
        onClick={() => setOpen((next) => !next)}
        style={compact ? { width: 20, minWidth: 20, height: 18, minHeight: 18, padding: 0, border: "none", background: "#f0f0f0", boxShadow: BUTTON_RAISED } : undefined}
        className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-none border border-[#b5b5b5] bg-white px-1 leading-none text-[#1c1c1c] hover:bg-[#f3f3f3]"
      >
        {compact ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#000" strokeWidth="1.5" /></svg> : kind === "text" ? (
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
          popover={compact ? "manual" : undefined}
          ref={(node) => { if (compact && node?.showPopover && !node.matches(":popover-open")) node.showPopover(); }}
          style={compact ? { position: "fixed", inset: "auto", margin: 0, left: rootRef.current?.getBoundingClientRect().left ?? 0, top: rootRef.current?.getBoundingClientRect().bottom ?? 0 } : undefined}
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

function LineGapField({ editor, value }: { editor: Editor; value: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tabbing = useRef(false);
  const cancelling = useRef(false);
  const label = `${value}pt`;
  const [text, setText] = useState(label);
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setText(label);
  }, [label]);
  const commit = (raw: string, focus = true) => {
    const next = parseLineGap(raw);
    if (next === null) { setText(label); return; }
    setText(`${next}pt`);
    applyLineGap(editor, next, focus);
  };
  return <SunkenBox geom="gap" x={122} w={60} h={19}>
    <input ref={inputRef} aria-label="Interline gap" data-studio-line-gap="true" value={text} onChange={(event) => setText(event.target.value)} onBlur={(event) => {
      if (cancelling.current) { cancelling.current = false; tabbing.current = false; setText(label); return; }
      const next = event.relatedTarget;
      const toolbar = event.currentTarget.closest("[data-studio-toolbar]");
      const inToolbar = next instanceof HTMLElement && !!toolbar?.contains(next);
      commit(event.currentTarget.value, !(inToolbar || tabbing.current));
      tabbing.current = false;
      if (inToolbar) next.focus();
    }} onKeyDown={(event) => {
      if (event.key === "Tab") tabbing.current = true;
      if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value, true); event.currentTarget.closest("[data-studio-shell]")?.querySelector<HTMLElement>(".ProseMirror")?.focus(); }
      if (event.key === "Escape") { event.preventDefault(); cancelling.current = true; setText(label); event.currentTarget.closest("[data-studio-shell]")?.querySelector<HTMLElement>(".ProseMirror")?.focus(); }
    }} style={EDIT_TEXT} />
  </SunkenBox>;
}

/** Fixed list inside the fullscreen element, so ribbon overflow cannot clip it. */
function StudioList({ anchor, children, onClose, passthrough = false }: { anchor: HTMLElement | null; children: React.ReactNode; onClose?: () => void; passthrough?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      setRoot(studioOverlayRoot());
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setBox({ top: rect.bottom, left: rect.left });
    };
    place();
    document.addEventListener("fullscreenchange", place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("fullscreenchange", place);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);
  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchor?.contains(target) || panelRef.current?.contains(target)) return;
      closeRef.current?.();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current?.();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor]);
  if (!root || !box) return null;
  return createPortal(
    <div ref={panelRef} data-studio-overlay-list="true" style={{ position: "fixed", top: box.top, left: box.left, zIndex: 420, pointerEvents: passthrough ? "none" : "auto" }}>
      {children}
    </div>,
    root,
  );
}

function refocusRibbon(event: { currentTarget: EventTarget & Element; relatedTarget: EventTarget | null }) {
  const next = event.relatedTarget;
  if (!(next instanceof HTMLElement)) return;
  if (event.currentTarget.closest("[data-studio-toolbar]")?.contains(next)) next.focus();
}

function untabbableTools(node: HTMLDivElement | null) {
  node?.querySelectorAll<HTMLElement>("button, select, input, textarea, a").forEach((el) => {
    el.tabIndex = -1;
    el.setAttribute("aria-hidden", "true");
  });
}

function SizeField({ editor, value }: { editor: Editor; value: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const messageRef = useRef("");
  const [text, setText] = useState(value);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const showError = (next: string) => {
    messageRef.current = next;
    setMessage(next);
  };
  const clearError = () => {
    if (!messageRef.current) return;
    messageRef.current = "";
    setMessage("");
  };
  useEffect(() => {
    if (dirtyRef.current || document.activeElement === inputRef.current) return;
    setText(value);
  }, [value]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(clearError, 8000);
    const onPointer = (event: MouseEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      clearError();
    };
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [message]);
  const commit = (raw: string, fromBlur = false) => {
    if (fromBlur && !dirtyRef.current) {
      setText(value);
      return;
    }
    if (!dirtyRef.current && raw.trim() === value) return;
    const parsed = parseToolbarFontSize(raw);
    if (!parsed.ok) {
      showError(parsed.message);
      dirtyRef.current = false;
      setText(value);
      return;
    }
    clearError();
    dirtyRef.current = false;
    setText(parsed.label);
    applyFontSize(editor, String(parsed.pt));
    setOpen(false);
  };
  return <SunkenBox geom="size" x={430} w={80} h={20}>
    <span ref={anchorRef} style={{ position: "absolute", inset: 0 }}>
    <input ref={inputRef} id="studio-font-size" data-studio-font-size="true" aria-label="Size" title="Font size" value={text} onChange={(event) => { dirtyRef.current = true; setText(event.target.value); }} onFocus={clearError} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value); } if (event.key === "Escape") { dirtyRef.current = false; setText(value); clearError(); setOpen(false); } }} onBlur={(event) => { const alreadyShowing = messageRef.current !== ""; commit(event.currentTarget.value, true); if (alreadyShowing) clearError(); refocusRibbon(event); }} style={COMBO_TEXT} />
    <button type="button" tabIndex={-1} aria-label="Size presets" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((next) => !next)} style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, padding: 0, border: 0, background: "transparent", zIndex: 3 }} />
    <ComboArrow />
    {open ? <StudioList anchor={anchorRef.current} onClose={() => setOpen(false)}>
      <div role="listbox" aria-label="Size" data-studio-size-list="true" style={{ background: "#fff", border: "1px solid #808080", width: 72 }}>
        {TOOLBAR_FONT_SIZE_PRESETS.map((pt) => <button key={pt} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => commit(`${pt}pt`)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, fontSize: 11, padding: "2px 4px", color: "#000" }}>{pt}pt</button>)}
      </div>
    </StudioList> : null}
    {message ? <StudioList anchor={anchorRef.current} passthrough>
      <span role="alert" data-studio-size-error="true" style={{ width: 240, background: "#fff", border: "1px solid #000", color: "#000", fontSize: 11, padding: 4 }}>{message}</span>
    </StudioList> : <span data-studio-size-error="true" className="sr-only" />}
    </span>
  </SunkenBox>;
}

function ColourField({ editor, value }: { editor: Editor; value: string }) {
  const known = INPAGE_TEXT_COLOURS.find((colour) => colour.hex.toLowerCase() === value.toLowerCase());
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const entries = known || !value ? INPAGE_TEXT_COLOURS : [{ label: value, hex: value }, ...INPAGE_TEXT_COLOURS];
  return <SunkenBox geom="colour" x={430} w={80} h={20}>
    <div ref={anchorRef} data-studio-colour="true" style={{ position: "absolute", inset: 0 }}>
    <button type="button" aria-label="Colour" aria-haspopup="listbox" aria-expanded={open} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((next) => !next)} style={{ ...COMBO_TEXT, padding: 0, transform: "none" }}>
      <span data-studio-colour-swatch="true" style={{ position: "absolute", left: 4, top: 4, width: 12, height: 12, boxSizing: "border-box", background: value || "#000", border: "1px solid #646464" }} />
      <span style={{ position: "absolute", left: 18, top: 6, fontFamily: RIBBON_FONT, fontSize: 9, lineHeight: "9px", color: "#000" }}>{known?.label ?? (value || "Black")}</span>
    </button>
    <ComboArrow />
    {open ? <StudioList anchor={anchorRef.current} onClose={() => setOpen(false)}>
      <div role="listbox" aria-label="Colour" data-studio-colour-list="true" style={{ width: 120, background: "#fff", border: "1px solid #808080" }}>
        {entries.map((colour) => <button key={colour.hex + colour.label} type="button" role="option" data-studio-colour-option={colour.label} onMouseDown={(event) => event.preventDefault()} onClick={() => { applyTextColor(editor, colour.hex); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "transparent", border: 0, fontSize: 11, padding: "2px 4px", color: "#000" }}>
          <span style={{ width: 10, height: 10, background: colour.hex, border: "1px solid #000" }} />{colour.label}
        </button>)}
      </div>
    </StudioList> : null}
    </div>
  </SunkenBox>;
}

function TextStyleField({ editor, value }: { editor: Editor; value: string }) {
  const effect = (TEXT_EFFECTS as readonly string[]).includes(value) ? value as TextEffect : "none";
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return <SunkenBox geom="text-style" x={618} w={100} h={20}>
    <button ref={buttonRef} type="button" aria-label="Text style" aria-haspopup="listbox" aria-expanded={open} data-studio-text-style="true" data-latin-control="true" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((next) => !next)} style={{ ...COMBO_TEXT, textAlign: "left" }}>
      {TEXT_EFFECT_LABELS[effect]}
    </button>
    <ComboArrow />
    {open ? <StudioList anchor={buttonRef.current} onClose={() => setOpen(false)}>
      <div role="listbox" aria-label="Text style" data-studio-text-style-list="true" style={{ width: 100, background: "#fff", border: "1px solid #808080" }}>
        {TEXT_EFFECTS.map((item) => <button key={item} type="button" role="option" data-studio-text-style-option={item} onMouseDown={(event) => event.preventDefault()} onClick={() => { applyTextEffect(editor, item); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: item === effect ? "#d6dff2" : "transparent", border: 0, fontSize: 11, padding: "2px 4px", color: "#000" }}>{TEXT_EFFECT_LABELS[item]}</button>)}
      </div>
    </StudioList> : null}
  </SunkenBox>;
}

function ParagraphSpacingMenu({
  openRequest = 0,
  editor,
  ui,
  settings,
  isUr,
}: {
  editor: Editor;
  openRequest?: number;
  ui: NonNullable<ReturnType<typeof resolveActiveToolbarFormatting>>;
  settings: DocumentStudioSettings;
  isUr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  useEffect(()=>{if(!openRequest)return;setOpen(false);setCustomOpen(true);const raf=requestAnimationFrame(()=>rootRef.current?.querySelector<HTMLInputElement>("[data-studio-custom-spacing-dialog] input")?.focus());return()=>cancelAnimationFrame(raf);},[openRequest]);
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

  const applyPreset = (value: number | null) => {
    applyLineHeight(editor, value);
    setOpen(false);
  };

  const applyCustom = (form: HTMLFormElement) => {
    const read = (name: string, kind: "line" | "pt" | "mm") => {
      const raw = String(new FormData(form).get(name) ?? "").trim();
      if (!raw) return undefined;
      return parseNumericField(raw, kind);
    };
    const leadingRaw = String(new FormData(form).get("lineHeight") ?? "").trim();
    const leading = leadingRaw ? parseLeading(leadingRaw) : undefined;
    if (leading === null) return;
    const lineHeight = leading?.mode === "points" ? leading.value : undefined;
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
    if (leading?.mode === "auto") applyLineHeight(editor,null);
    setCustomOpen(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} data-studio-geom="interline-icon" style={{ position: "absolute", left: 103, top: 0, width: 19, height: 19 }}>
      <button type="button" data-studio-spacing-button="true" aria-label={isUr ? "سطروں کے درمیان فاصلہ" : "Interline gap"} title={isUr ? "سطروں کے درمیان فاصلہ" : "Interline gap"} onMouseDown={(event) => event.preventDefault()} onClick={() => { setCustomOpen(false); setOpen((next) => !next); }} style={{ ...BUTTON_BOX, left: 0, top: 0, width: 19, height: 19, minHeight: 19, maxHeight: 19 }}>
        <PixelFace w={19} h={19} colorAt={tileColor} glyph={INTERLINE_GLYPH} light={INTERLINE_LIGHT} />
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
          {[{ id:"auto", value:null, labelEn:"Auto", labelUr:"خودکار" }, ...LINE_SPACING_PRESETS].map((preset) => {
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
            { name: "lineHeight", label: isUr ? "لائن اسپیسنگ" : "Line spacing", kind: "line" as const, value: ui.mixed.lineHeight ? "" : ui.lineHeight, step: "0.5" },
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
                type={field.kind === "line" ? "text" : "number"}
                step={field.step}
                defaultValue={field.name === "lineHeight" ? field.value == null || field.value === "" ? "Auto" : `${field.value}pt` : field.value ?? ""}
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
              type="button"
              data-studio-spacing-apply="true"
              onPointerDown={(event) => event.preventDefault()}
              onPointerUp={(event) => {
                event.preventDefault();
                const form = event.currentTarget.closest("form");
                if (form) applyCustom(form);
              }}
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

const BUTTON_RAISED = "inset 1px 1px 0 #000, inset 2px 2px 0 #fff, inset -1px -1px 0 #646464, inset -2px -2px 0 #a0a0a0, inset -3px -3px 0 #a0a0a0";
const CLASSIC_RAISED = "inset 1px 1px 0 #000000, inset 2px 2px 0 #ffffff, inset -1px -1px 0 #696969, inset -2px -2px 0 #a0a0a0";
const CLASSIC_SUNKEN = "inset 1px 1px 0 #696969, inset 2px 2px 0 #a0a0a0, inset -1px -1px 0 #ffffff";
const selectCls = "shrink-0";

/** Keep native keyboard/option handling behind a classic field and arrow face. */
function ClassicCombo({ className, style, width, gap = 0, leadingIcon, entryField = false, ...props }: ComponentProps<"select"> & { width?: number; gap?: number; leadingIcon?: React.ReactNode; entryField?: boolean }) {
  return (
    <span className={`relative inline-grid h-[20px] shrink-0 ${className ?? ""}`} data-studio-combo="true" title={props.title} dir="ltr" style={{ width, marginInlineStart: gap }}>
      <select
        {...props}
        className="h-[20px] min-w-0 w-full appearance-none rounded-none bg-white text-left text-[11px] text-black focus:outline-none"
        style={{ ...style, border: "none", padding: `2px ${entryField ? 4 : 23}px 2px ${leadingIcon ? 24 : 4}px`, fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "16px", color: props.disabled ? "#808080" : "#000", backgroundColor: "#fff", textAlign: "left", direction: "ltr", minWidth: 0, minHeight: 20, maxHeight: 20, boxShadow: "inset 1px 1px 0 #a0a0a0, inset 2px 2px 0 #696969, inset -1px -1px 0 #fff, inset -2px -2px 0 #f0f0f0" }}
      />
      {leadingIcon ? <span aria-hidden="true" className="pointer-events-none absolute left-[4px] top-[2px] flex h-[16px] w-[18px] items-center justify-center text-black">{leadingIcon}</span> : null}
      {!entryField ? <span aria-hidden="true" className="pointer-events-none absolute right-[2px] top-[2px] grid h-[16px] w-[17px] place-items-center bg-[#f0f0f0]" style={{ boxShadow: CLASSIC_RAISED }}>
        <svg width="7" height="4" viewBox="0 0 7 4" fill={props.disabled ? "#808080" : "#000"}><path d="M0 0H7L3.5 4Z" /></svg>
      </span> : null}
    </span>
  );
}

function PercentField({ editor, value, kind, geom, label, attr }: { editor: Editor; value: string; kind: PercentKind; geom: string; label: string; attr: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const messageRef = useRef("");
  const [text, setText] = useState(value);
  const [message, setMessage] = useState("");
  const showError = (next: string) => { messageRef.current = next; setMessage(next); };
  const clearError = () => { if (!messageRef.current) return; messageRef.current = ""; setMessage(""); };
  useEffect(() => {
    if (dirtyRef.current || document.activeElement === inputRef.current) return;
    setText(value);
  }, [value]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(clearError, 8000);
    const onPointer = (event: MouseEvent) => { if (anchorRef.current?.contains(event.target as Node)) return; clearError(); };
    document.addEventListener("mousedown", onPointer);
    return () => { window.clearTimeout(timer); document.removeEventListener("mousedown", onPointer); };
  }, [message]);
  const commit = (raw: string, fromBlur = false) => {
    if (fromBlur && !dirtyRef.current) { setText(value); return; }
    if (!dirtyRef.current && raw.trim() === value) return;
    const parsed = parseToolbarPercent(raw, kind);
    if (!parsed.ok) { showError(parsed.message); dirtyRef.current = false; setText(value); return; }
    clearError();
    dirtyRef.current = false;
    setText(parsed.label);
    if (kind === "tracking") applyTracking(editor, parsed.value);
    else applyScale(editor, parsed.value);
  };
  return <SunkenBox geom={geom} x={531} w={60} h={19}>
    <span ref={anchorRef} style={{ position: "absolute", inset: 0 }}>
      <input ref={inputRef} aria-label={label} data-studio-metric={attr} data-studio-tracking={kind === "tracking" ? "true" : undefined} data-studio-scale={kind === "scale" ? "true" : undefined} value={text} onChange={(event) => { dirtyRef.current = true; setText(event.target.value); }} onFocus={clearError} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value); } if (event.key === "Escape") { dirtyRef.current = false; setText(value); clearError(); } }} onBlur={(event) => { const already = messageRef.current !== ""; commit(event.currentTarget.value, true); if (already) clearError(); refocusRibbon(event); }} style={EDIT_TEXT} />
      {message ? <StudioList anchor={anchorRef.current} passthrough>
        <span role="alert" data-studio-field-error={attr} style={{ width: 280, background: "#fff", border: "1px solid #000", color: "#000", fontSize: 11, padding: 4 }}>{message}</span>
      </StudioList> : null}
    </span>
  </SunkenBox>;
}

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
  englishFont = "Arial Unicode MS",
  onEnglishFontChange,
  paragraphRequest = 0,
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
  englishFont?: string;
  onEnglishFontChange?: (family: string) => void;
  paragraphRequest?: number;
}) {
  const leadingRef = useRef<HTMLInputElement>(null);
  const settings = documentSettings ?? defaultDocumentSettings();
  void zoom;
  void onZoomChange;
  void onEnglishFontChange;
  void englishFont;
  const ui = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? resolveActiveToolbarFormatting(current, settings, dir) : null,
  });
  if (!editor || !ui) return null;

  const currentFont = ui.mixed.fontFamily ? MIXED_TOOLBAR_VALUE : ui.fontFamily;
  const latinFonts = STUDIO_FONT_GROUPS.find((group) => group.category === "latin")?.fonts ?? [];
  const englishValue = ui.mixed.latinFontFamily ? MIXED_TOOLBAR_VALUE : ui.latinFontFamily;
  const spacingValue = ui.lineHeight == null ? { mode: "auto" as const } : { mode: "points" as const, value: ui.lineHeight };
  const colourValue = !ui.color || ui.color === "#000000" || ui.color === "#111111" ? "#000000" : ui.color;
  const rowStyle: CSSProperties = { position: "relative", height: 21, overflow: "visible" };
  const urduKnown = STUDIO_FONT_GROUPS.some((group) => group.fonts.some((font) => font.value === currentFont));

  return (
    <>
      <div
        className="flex flex-col"
        dir="ltr"
        role="toolbar"
        aria-label={isUr ? "فارمیٹنگ" : "Formatting"}
        data-studio-toolbar="true"
        data-studio-toolbar-language={isUr ? "ur" : "en"}
        data-studio-toolbar-leading={DOCUMENT_TOOLBAR_LEADING.join(",")}
        style={{ background: "#f0f0f0", color: "#000", fontFamily: RIBBON_FONT, fontSize: 9, height: 47, minWidth: 810, boxSizing: "border-box", position: "relative" }}
      >
        <style>{`@media (max-width:719px){
          [data-studio-shell] [data-studio-sticky-chrome]{min-width:0 !important;max-width:100% !important;}
          [data-studio-shell] [data-studio-chrome="toolbar"]{min-width:0 !important;width:100% !important;max-width:100% !important;overflow-x:auto !important;overflow-y:hidden !important;touch-action:pan-x !important;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;}
          [data-studio-toolbar],[data-studio-toolbar] *{touch-action:pan-x;}
          [data-studio-toolbar]{height:auto !important;min-width:0 !important;width:max-content !important;}
          [data-studio-toolbar] [data-studio-toolbar-row]{display:flex !important;align-items:center !important;position:relative !important;height:32px !important;min-height:32px !important;max-height:32px !important;width:max-content !important;flex-wrap:nowrap !important;overflow:visible !important;gap:4px !important;padding:0 4px !important;box-sizing:border-box !important;}
          [data-studio-toolbar] [data-studio-geom]{position:relative !important;left:auto !important;top:auto !important;right:auto !important;margin:0 !important;flex:0 0 auto !important;min-width:24px !important;min-height:24px !important;height:26px !important;max-height:26px !important;}
          [data-studio-toolbar] [data-studio-geom] > button{position:relative !important;left:auto !important;top:auto !important;width:100% !important;height:26px !important;min-width:24px !important;min-height:24px !important;max-height:26px !important;}
          [data-studio-toolbar] button[data-studio-geom]{min-width:24px !important;min-height:24px !important;height:26px !important;max-height:26px !important;}
        }`}</style>
        <div aria-hidden="true" data-studio-toolbar-etched="true" className="h-[3px] shrink-0" style={{ background: "linear-gradient(to bottom, #f0f0f0 0 1px, #a0a0a0 1px 2px, #ffffff 2px 3px)" }} />
        <div className="relative h-[21px] shrink-0 overflow-x-auto flex-nowrap" data-studio-toolbar-row="format" style={rowStyle}>
          <SunkenBox geom="style" x={2} w={100} h={20}>
            <select id="studio-block-style" value="normal" onChange={(event) => applyBlockStyle(editor, event.target.value as BlockStyleId)} aria-label={isUr ? "انداز" : "Style"} title={isUr ? "انداز" : "Style"} data-studio-style-control="true" style={COMBO_TEXT}>
              <option value="normal">{isUr ? BLOCK_STYLES.normal.labelUr : BLOCK_STYLES.normal.label}</option>
            </select>
            <ComboArrow />
          </SunkenBox>
          <FlatTile geom="leading-icon" x={103} label={isUr ? "سطری فاصلے کے اختیارات" : "Line spacing options"} glyph={LEADING_GLYPH} light={LEADING_LIGHT} onClick={() => leadingRef.current?.focus()} />
          <SunkenBox geom="leading" x={122} w={60} h={19}>
            <LeadingInput ref={leadingRef} aria-label="Line spacing" data-studio-leading="true" value={spacingValue} onChange={(value, meta) => applyLineHeight(editor, value.mode === "points" ? value.value : null, meta?.focus !== false)} style={EDIT_TEXT} />
          </SunkenBox>
          <SunkenBox geom="english-font" x={184} w={202} h={20}>
            <span aria-hidden="true" style={{ position: "absolute", left: 7, top: 5, zIndex: 2, width: 13, height: 12, pointerEvents: "none" }}>
              <svg width="13" height="12" viewBox="0 0 13 12" shapeRendering="crispEdges">
                <path fill="#808080" d={["gggggggg", "gg.gg.gg", "g..gg..g", "g..g", "...g", "...g", "...g", "...gg", ".gggggg"].map((row, y) => [...row].map((cell, x) => cell === "g" ? `M${x} ${y}h1v1H${x}z` : "").join("")).join("")} />
                <path fill="#000" d={["", "", "", "....########", "....##.##.##", "....#..##..#", "....#..##..#", ".......##", ".......##", ".......##", ".......##", ".....######"].map((row, y) => [...row].map((cell, x) => cell === "#" ? `M${x} ${y}h1v1H${x}z` : "").join("")).join("")} />
              </svg>
            </span>
            <select aria-label={isUr ? "انگریزی فونٹ" : "English font"} data-studio-latin-font="true" data-latin-control="true" value={englishValue} onChange={(event) => { if (event.target.value !== MIXED_TOOLBAR_VALUE) applyEnglishFont(editor, event.target.value); }} style={{ ...COMBO_TEXT, paddingLeft: 22 }}>
              {ui.mixed.latinFontFamily ? <option value={MIXED_TOOLBAR_VALUE}>{isUr ? "مخلوط" : "Mixed"}</option> : null}
              {englishValue && englishValue !== MIXED_TOOLBAR_VALUE && englishValue !== "Arial Unicode MS" && !latinFonts.some((font) => font.value === englishValue) ? <option value={englishValue}>{englishValue}</option> : null}
              <option value="Arial Unicode MS">Arial Unicode MS</option>
              {latinFonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
            </select>
            <ComboArrow />
          </SunkenBox>
          <RaisedButton geom="bold" x={388} label={isUr ? "موٹا" : "Bold"} pressed={ui.bold} glyph={BOLD_GLYPH} onClick={() => toggleBold(editor)} />
          <RaisedButton geom="italic" x={408} label={isUr ? "ترچھا" : "Italic"} pressed={ui.italic} glyph={ITALIC_GLYPH} onClick={() => toggleItalic(editor)} />
          <SizeField editor={editor} value={ui.mixed.fontSize ? "" : `${ui.fontSizePt ?? settings.typography.bodyFontSizePt}pt`} />
          <FlatTile geom="tracking-icon" x={512} label={isUr ? "ٹریکنگ" : "Tracking"} glyph={TRACKING_GLYPH} />
          <PercentField editor={editor} kind="tracking" geom="tracking" attr="tracking" label={isUr ? "ٹریکنگ" : "Tracking"} value={ui.mixed.tracking || ui.trackingPercent == null ? "" : `${ui.trackingPercent}%`} />
          <RaisedButton geom="tabs" x={594} label={isUr ? "ٹیبز اور انڈینٹ" : "Tabs & Indent"} glyph={TABS_GLYPH} onClick={() => {
            // TODO: toggle the page ruler. rulerVisible lives in DocumentStudioEditor and is not passed into this toolbar.
          }} />
          <SunkenBox geom="language" x={618} w={68} h={20}>
            <select aria-label={isUr ? "متن کی زبان" : "Language"} data-studio-document-language="true" data-latin-control="true" value={mapToolbarLanguage(processingLanguage)} onChange={(event) => setProcessingLanguage?.(mapToolbarLanguage(event.target.value))} style={COMBO_TEXT}>
              <option value="ur">Urdu</option>
              <option value="en">English</option>
            </select>
            <ComboArrow />
          </SunkenBox>
        </div>
        <div className="relative h-[21px] shrink-0 overflow-x-auto flex-nowrap" data-studio-toolbar-row="document" data-studio-toolbar-secondary="true" style={rowStyle}>
          <RaisedButton geom="align-left" align="left" x={2} label={isUr ? "بائیں سیدھ" : "Align left"} pressed={ui.textAlign === "left"} glyph={alignGlyph("left")} onClick={() => setAlign(editor, "left")} />
          <RaisedButton geom="align-right" align="right" x={22} label={isUr ? "دائیں سیدھ" : "Align right"} pressed={ui.textAlign === "right"} glyph={alignGlyph("right")} onClick={() => setAlign(editor, "right")} />
          <RaisedButton geom="align-center" align="center" x={42} label={isUr ? "درمیانی سیدھ" : "Align center"} pressed={ui.textAlign === "center"} glyph={alignGlyph("center")} onClick={() => setAlign(editor, "center")} />
          <RaisedButton geom="align-justify" align="justify" x={62} label={isUr ? "برابر کریں" : "Justify"} pressed={ui.textAlign === "justify"} glyph={alignGlyph("justify")} onClick={() => setAlign(editor, "justify")} />
          <RaisedButton geom="align-full" align="justify-all" x={82} label={isUr ? "مکمل برابر" : "Full justify"} pressed={ui.textAlign === "justify-all"} glyph={alignGlyph("full")} onClick={() => setAlign(editor, "justify-all")} />
          <ParagraphSpacingMenu openRequest={paragraphRequest} editor={editor} ui={ui} settings={settings} isUr={isUr} />
          <LineGapField editor={editor} value={ui.lineGapPt ?? 0} />
          <SunkenBox geom="urdu-font" x={184} w={202} h={20}>
            <select id="studio-font-family" data-studio-font-family="true" aria-label={isUr ? "اردو فونٹ" : "Urdu font"} title={isUr ? "اردو فونٹ" : "Urdu font"} value={currentFont} onChange={(event) => { if (event.target.value !== MIXED_TOOLBAR_VALUE) applyFontFamily(editor, event.target.value); }} style={COMBO_TEXT}>
              {ui.mixed.fontFamily ? <option value={MIXED_TOOLBAR_VALUE}>{isUr ? "مخلوط" : "Mixed"}</option> : null}
              {!urduKnown && currentFont && currentFont !== MIXED_TOOLBAR_VALUE ? <option value={currentFont}>{currentFont}</option> : null}
              <option value="">{isUr ? "طے شدہ فونٹ" : "Default font"}</option>
              {STUDIO_FONT_GROUPS.map((group) => (
                <optgroup key={group.category} label={isUr ? group.labelUr : group.labelEn}>
                  {group.fonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                </optgroup>
              ))}
            </select>
            <ComboArrow />
          </SunkenBox>
          <RaisedButton geom="ltr" x={388} label={isUr ? "بائیں سے دائیں" : "Left to right"} pressed={editor.state.selection.$from.parent.attrs.dir === "ltr"} glyph={LTR_GLYPH} onClick={() => applyParagraphDirection(editor, "ltr")} />
          <RaisedButton geom="rtl" x={408} label={isUr ? "دائیں سے بائیں" : "Right to left"} pressed={editor.state.selection.$from.parent.attrs.dir !== "ltr"} glyph={RTL_GLYPH} onClick={() => applyParagraphDirection(editor, "rtl")} />
          <ColourField editor={editor} value={colourValue} />
          <FlatTile geom="scale-icon" x={512} label={isUr ? "افقی پیمانہ" : "Horizontal scale"} glyph={SCALE_GLYPH} />
          <PercentField editor={editor} kind="scale" geom="scale" attr="scale" label={isUr ? "افقی پیمانہ" : "Horizontal scale"} value={ui.mixed.scale || ui.scalePercent == null ? "" : `${ui.scalePercent}%`} />
          <RaisedButton geom="outline" x={594} label={isUr ? "خاکہ" : "Outline"} pressed={ui.textOutline} glyph={OUTLINE_GLYPH} onClick={() => toggleTextOutline(editor)} />
          <TextStyleField editor={editor} value={ui.textEffect} />
          <SunkenBox geom="kashida" x={721} w={80} h={20}>
            <select aria-label="K-None" data-studio-kashida="true" data-latin-control="true" value="k" onChange={() => undefined} style={COMBO_TEXT}>
              <option value="k">K-None</option>
            </select>
            <ComboArrow />
          </SunkenBox>
        </div>
        <div aria-hidden="true" data-studio-toolbar-edge="true" className="h-[2px] shrink-0" style={{ background: "#a0a0a0" }} />
      </div>
      <div className="sr-only" aria-hidden="true" ref={untabbableTools}>
        <ColorPaletteControl editor={editor} kind="text" colors={STUDIO_TEXT_COLORS} value={ui.color} mixed={ui.mixed.color} isUr={isUr} />
        <ColorPaletteControl editor={editor} kind="highlight" colors={STUDIO_HIGHLIGHT_COLORS} value={ui.highlight} mixed={ui.mixed.highlight} isUr={isUr} compact />
        <DictationControl editor={editor} docDir={dir} isUr={isUr} />
      </div>
    </>
  );
}
