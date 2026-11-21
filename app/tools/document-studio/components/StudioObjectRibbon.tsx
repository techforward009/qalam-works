"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import {
  applyObjectGeometry,
  formatGeometryLength,
  parseGeometryLength,
  parseBorderWidth,
  formatBorderWidth,
  parseDegrees,
  formatDegrees,
  pictureReferenceSizeMm,
  pictureScalePercent,
  formatScalePercent,
  parseScalePercent,
  pictureDimensionMmFromScale,
  shapeVariantOf,
  frameKindForShape,
  DEFAULT_PICTURE_TOOL_DEFAULTS,
  applyPictureToolDefaultsPatch,
  type PictureToolDefaults,
  type ObjectGeometryPatch,
  type ShapeVariant,
} from "../utils/objectAttributes";
import { fitPictureInBox } from "../utils/pictureFit";
import type { ObjectHistoryGroupOptions } from "../utils/objectFrameHistory";
import { normalizeSafeHex, STUDIO_TEXT_COLORS } from "../utils/studioColors";
import {
  BORDER_PATTERN_OPTIONS,
  borderPatternLabel,
  resolveBorderStrokes,
  type BorderPatternId,
} from "../utils/borderPatterns";
import { isPictureBox, isPictureDrawTool, pictureKindForTool, type FrameKind, type StudioFrame } from "./StudioObjectLayer";
import type { StudioToolId } from "./InPageToolPalette";
import { useMovableStudioDialog } from "./useMovableStudioDialog";
import { contextMenuPosition } from "../utils/textContextMenu";
import { resolvedRunAround } from "../utils/runAround";
import { isRectangularRunAroundBox } from "../utils/runAroundFlow";

export type PropertyToolbarMode = "picture-tool" | "picture" | "object" | "none";

export function resolvePropertyToolbarMode(
  canvasTool: StudioToolId,
  selectedFrames: readonly StudioFrame[],
): PropertyToolbarMode {
  if (isPictureDrawTool(canvasTool)) return "picture-tool";
  if (selectedFrames.length === 0) return "none";
  if (canvasTool === "text") {
    return selectedFrames.length === 1 && isPictureBox(selectedFrames[0].kind) ? "picture" : "none";
  }
  return "object";
}

function buildPictureToolPreviewFrame(
  defaults: PictureToolDefaults,
  creationTool: StudioToolId,
): StudioFrame {
  return {
    id: "__picture-tool-preview__",
    kind: pictureKindForTool(creationTool) ?? "picture-rect",
    page: 1,
    xMm: 0,
    yMm: 0,
    wMm: 10,
    hMm: 10,
    flip: false,
    text: "",
    borderColor: defaults.borderColor,
    borderWidthMm: defaults.borderWidthMm,
    borderPattern: defaults.borderPattern,
    borderPosition: defaults.borderPosition,
    ...(defaults.backgroundColor ? { backgroundColor: defaults.backgroundColor } : {}),
    backgroundHatch: defaults.backgroundHatch,
    roundnessMm: defaults.roundnessMm,
    angle1Deg: defaults.angle1Deg,
  };
}

const RIBBON_FONT = '11px QalamUITahoma, Tahoma, "Segoe UI", "MS Sans Serif", sans-serif';
const PIXEL_UNIT_BORDER_MM = 25.4 / 96;

const kinds = [
  ["picture-rect", "Rectangular Picture Box", "Rectangular", "▱"],
  ["picture-ellipse", "Elliptical Picture Box", "Elliptical", "◯"],
  ["picture-round-rect", "Rounded Rectangular Picture Box", "Rounded", "▢"],
] as const;
const fields = [["xMm", "X", "x"], ["yMm", "Y", "y"], ["wMm", "Width", "w"], ["hMm", "Height", "h"]] as const;
type GeometryKey = typeof fields[number][0];

type BatchBuilder = (frame: StudioFrame) => ObjectGeometryPatch | null;

type Props = {
  frame?: StudioFrame;
  frames?: StudioFrame[];
  mode?: "picture-tool" | "picture" | "object";
  creationTool?: StudioToolId;
  pictureDefaults?: PictureToolDefaults;
  onPictureDefaultsChange?: (next: PictureToolDefaults) => void;
  onSelectCreationTool?: (tool: StudioToolId) => void;
  onChange: (frameId: string, patch: ObjectGeometryPatch, historyOptions?: ObjectHistoryGroupOptions) => void;
  onApplyBatch?: (
    frameIds: string[],
    buildPatch: BatchBuilder,
    historyOptions?: ObjectHistoryGroupOptions,
  ) => void;
  disableContextMenu?: boolean;
};

type SharedResult<T> = { mixed: false; value: T } | { mixed: true };

function resolveShared<T>(
  frames: readonly StudioFrame[],
  getter: (frame: StudioFrame) => T,
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): SharedResult<T> {
  const first = getter(frames[0]);
  for (let i = 1; i < frames.length; i += 1) {
    if (!equals(first, getter(frames[i]))) return { mixed: true };
  }
  return { mixed: false, value: first };
}

function nearNumber(a: number, b: number, eps = 1e-4): boolean {
  return Math.abs(a - b) <= eps;
}

function effectiveBorderColor(frame: StudioFrame): string {
  return (normalizeSafeHex(frame.borderColor ?? "#000000") ?? "#000000").toUpperCase();
}

function effectiveBackgroundColor(frame: StudioFrame): string {
  return frame.backgroundColor ? (normalizeSafeHex(frame.backgroundColor) ?? "").toUpperCase() : "";
}

function effectiveBorderPattern(frame: StudioFrame): BorderPatternId {
  return frame.borderPattern ?? (isPictureBox(frame.kind) ? "none" : "solid");
}

function effectiveBorderWidthMm(frame: StudioFrame): number {
  return frame.borderWidthMm ?? PIXEL_UNIT_BORDER_MM;
}

function effectiveBorderPosition(frame: StudioFrame): "inside" | "outside" {
  return frame.borderPosition ?? "inside";
}

function effectiveRoundnessMm(frame: StudioFrame): number {
  return frame.roundnessMm ?? 6.35;
}

function effectiveAngle1Deg(frame: StudioFrame): number {
  return frame.angle1Deg ?? 0;
}

function effectiveAngle2Deg(frame: StudioFrame): number {
  return frame.angle2Deg ?? 0;
}

function effectiveHatch(frame: StudioFrame): "none" {
  return frame.backgroundHatch ?? "none";
}

const control: CSSProperties = {
  boxSizing: "border-box",
  height: 20,
  border: "1px solid #7f9db9",
  background: "#fff",
  padding: "1px 3px",
  color: "#000",
  font: RIBBON_FONT,
};

const ribbonFieldBox: CSSProperties = {
  boxSizing: "border-box",
  height: 19,
  border: "1px solid #7f9db9",
  borderRadius: 0,
  background: "#fff",
  padding: "0 3px",
  color: "#000",
  font: RIBBON_FONT,
  lineHeight: "17px",
  outline: "none",
};

const ribbonBevelButton = (active = false, disabled = false): CSSProperties => ({
  boxSizing: "border-box",
  width: 19,
  height: 19,
  minWidth: 19,
  minHeight: 19,
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid",
  borderColor: active ? "#646464 #ffffff #ffffff #646464" : "#ffffff #646464 #646464 #ffffff",
  background: active ? "#e2e7ee" : "#f0f0f0",
  boxShadow: active ? "inset 1px 1px 0 #a0a0a0" : "inset -1px -1px 0 #d0d0d0",
  color: disabled ? "#808080" : "#111",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.65 : 1,
  flexShrink: 0,
});

const iconTileStyle: CSSProperties = {
  width: 18,
  height: 19,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  userSelect: "none",
};

const unsupported = {
  title: "Not supported yet in Qalam Page",
  "aria-description": "Not supported yet in Qalam Page",
  disabled: true,
} as const;

const caption = (left: number, top: number, text: string, height = 20) => (
  <span style={{ position: "absolute", left, top, height, display: "flex", alignItems: "center", lineHeight: "normal", whiteSpace: "nowrap" }}>
    {text}
  </span>
);
const group = (left: number, top: number, width: number, height: number, title: string, children: React.ReactNode) => (
  <div style={{ position: "absolute", left, top, width, height, boxSizing: "border-box", border: "1px solid #a0a0a0", boxShadow: "inset 0 1px #fff" }}>
    <span style={{ position: "absolute", left: 7, top: -8, padding: "0 3px", lineHeight: "14px", background: "#f0f0f0", whiteSpace: "nowrap" }}>
      {title}
    </span>
    {children}
  </div>
);
const radio = (checked = false) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block",
      verticalAlign: "-2px",
      width: 10,
      height: 10,
      marginRight: 4,
      border: "1px solid #777",
      borderRadius: "50%",
      background: checked ? "radial-gradient(circle,#111 0 2px,#eee 2.5px)" : "#f0f0f0",
      boxShadow: "inset 0 1px #fff",
    }}
  />
);
const checkbox = (checked = false) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      verticalAlign: "-2px",
      width: 13,
      height: 13,
      marginRight: 4,
      border: "1px solid #777",
      background: "#f8f8f8",
      boxShadow: "inset 0 1px #fff",
      font: "bold 11px Arial",
    }}
  >
    {checked ? "✓" : ""}
  </span>
);

function RibbonNumericInput({
  ariaLabel,
  dataField,
  dataObjectField,
  value,
  mixed = false,
  disabled = false,
  width,
  selectionKey,
  title,
  onCommit,
  onStep,
}: {
  ariaLabel: string;
  dataField: string;
  dataObjectField?: string;
  value: string;
  mixed?: boolean;
  disabled?: boolean;
  width: number;
  selectionKey: string;
  title?: string;
  onCommit: (raw: string) => boolean;
  onStep?: (delta: 1 | -1) => void;
}) {
  const displayValue = mixed ? "" : value;
  const [draft, setDraft] = useState(displayValue);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(displayValue);
    setDirty(false);
  }, [selectionKey]);

  useEffect(() => {
    if (!dirty) setDraft(displayValue);
  }, [displayValue, dirty]);

  const attemptCommit = (raw: string): boolean => {
    if (disabled) return false;
    const trimmed = raw.trim();
    if (!trimmed) {
      setDraft(displayValue);
      setDirty(false);
      return false;
    }
    const ok = onCommit(trimmed);
    setDirty(false);
    if (!ok) setDraft(displayValue);
    return ok;
  };

  return (
    <input
      type="text"
      aria-label={ariaLabel}
      data-ribbon-field={dataField}
      data-object-field={dataObjectField}
      data-ribbon-dirty={dirty ? "true" : "false"}
      data-mixed={mixed && !dirty ? "true" : undefined}
      title={title ?? ariaLabel}
      aria-description={disabled && title === unsupported.title ? unsupported["aria-description"] : undefined}
      disabled={disabled}
      value={draft}
      onChange={(event) => {
        setDirty(true);
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          attemptCommit(event.currentTarget.value);
          event.currentTarget.select();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setDraft(displayValue);
          setDirty(false);
          return;
        }
        if ((event.key === "ArrowUp" || event.key === "ArrowDown") && onStep && !disabled) {
          event.preventDefault();
          if (dirty) attemptCommit(event.currentTarget.value);
          onStep(event.key === "ArrowUp" ? 1 : -1);
        }
      }}
      onBlur={(event) => {
        if (dirty) attemptCommit(event.currentTarget.value);
      }}
      style={{
        ...ribbonFieldBox,
        width,
        background: disabled ? "#f0f0f0" : "#fff",
        color: disabled ? "#787878" : "#000",
        cursor: disabled ? "default" : "text",
      }}
    />
  );
}

/* Classic 16x16 desktop glyphs matching InPage 2009 upper ribbons */
function ObjectXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="2" x2="2" y2="14" stroke="#111" strokeWidth="1.2" />
      <rect x="7" y="4" width="7" height="8" fill="#fff" stroke="#111" strokeWidth="1" />
      <path d="M2.5 8H6.5M5 6.2L6.8 8L5 9.8" fill="none" stroke="#111" strokeWidth="1.1" />
    </svg>
  );
}

function ObjectYIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="2" x2="14" y2="2" stroke="#111" strokeWidth="1.2" />
      <rect x="4" y="7" width="8" height="7" fill="#fff" stroke="#111" strokeWidth="1" />
      <path d="M8 2.5V6.5M6.2 5L8 6.8L9.8 5" fill="none" stroke="#111" strokeWidth="1.1" />
    </svg>
  );
}

function ObjectWIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="3" y1="2" x2="3" y2="6" stroke="#111" strokeWidth="1" />
      <line x1="13" y1="2" x2="13" y2="6" stroke="#111" strokeWidth="1" />
      <path d="M3.5 4H12.5" stroke="#111" strokeWidth="1" />
      <rect x="3" y="7" width="10" height="7" fill="#fff" stroke="#111" strokeWidth="1.1" />
    </svg>
  );
}

function ObjectHIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="3" x2="6" y2="3" stroke="#111" strokeWidth="1" />
      <line x1="2" y1="13" x2="6" y2="13" stroke="#111" strokeWidth="1" />
      <path d="M4 3.5V12.5" stroke="#111" strokeWidth="1" />
      <rect x="7" y="3" width="7" height="10" fill="#fff" stroke="#111" strokeWidth="1.1" />
    </svg>
  );
}

function BorderOutsideIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" fill="none" stroke="#111" strokeWidth="1.8" />
      <rect x="4.5" y="4.5" width="5" height="5" fill="#fff" stroke="#666" strokeWidth="0.9" strokeDasharray="1.2 1.2" />
    </svg>
  );
}

function BorderInsideIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" fill="#fff" stroke="#666" strokeWidth="0.9" strokeDasharray="1.2 1.2" />
      <rect x="4" y="4" width="6" height="6" fill="none" stroke="#111" strokeWidth="1.8" />
    </svg>
  );
}

function RunAroundIcon({ disabled = false }: { disabled?: boolean }) {
  const stroke = disabled ? "#787878" : "#111";
  const boxFill = disabled ? "#bbb" : "#888";
  const boxStroke = disabled ? "#787878" : "#333";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <line x1="1.5" y1="2.5" x2="12.5" y2="2.5" stroke={stroke} strokeWidth="1" />
      <line x1="1.5" y1="5.5" x2="4" y2="5.5" stroke={stroke} strokeWidth="1" />
      <line x1="10" y1="5.5" x2="12.5" y2="5.5" stroke={stroke} strokeWidth="1" />
      <rect x="4.8" y="4.5" width="4.4" height="4.4" fill={boxFill} stroke={boxStroke} strokeWidth="0.9" />
      <line x1="1.5" y1="8.5" x2="4" y2="8.5" stroke={stroke} strokeWidth="1" />
      <line x1="10" y1="8.5" x2="12.5" y2="8.5" stroke={stroke} strokeWidth="1" />
      <line x1="1.5" y1="11.5" x2="12.5" y2="11.5" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function InsetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" fill="none" stroke="#555" strokeWidth="1" />
      <rect x="4.5" y="4.5" width="5" height="5" fill="#fff" stroke="#777" strokeWidth="0.8" />
      <path d="M7 1V3.5M7 13V10.5M1 7H3.5M13 7H10.5" stroke="#555" strokeWidth="1" />
    </svg>
  );
}

function BorderWidthIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="4" x2="14" y2="4" stroke="#111" strokeWidth="1" />
      <line x1="2" y1="7" x2="14" y2="7" stroke="#111" strokeWidth="1.8" />
      <line x1="2" y1="11" x2="14" y2="11" stroke="#111" strokeWidth="3" />
    </svg>
  );
}

function ShapeButtonIcon({ variant }: { variant: ShapeVariant }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      {variant === "rect" ? (
        <rect x="2" y="2" width="9" height="9" fill="#fff" stroke="#111" strokeWidth="1.2" />
      ) : variant === "ellipse" ? (
        <ellipse cx="6.5" cy="6.5" rx="4.7" ry="4.7" fill="#fff" stroke="#111" strokeWidth="1.2" />
      ) : (
        <rect x="2" y="2" width="9" height="9" rx="2.5" fill="#fff" stroke="#111" strokeWidth="1.2" />
      )}
    </svg>
  );
}

function RoundnessIcon({ disabled }: { disabled: boolean }) {
  const stroke = disabled ? "#787878" : "#111";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13 4H7.5C5.2 4 4 5.2 4 7.5V13" fill="none" stroke={stroke} strokeWidth="1.4" />
      <path d="M6.5 6.5L10.5 10.5" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

function AngleWedgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 13L13 13M2 13L11.5 3.5" fill="none" stroke="#111" strokeWidth="1.3" />
      <path d="M7.5 13A5.5 5.5 0 0 0 5.9 9.1" fill="none" stroke="#111" strokeWidth="1" />
    </svg>
  );
}

function PictureHouseGlyph({ children }: { children?: React.ReactNode }) {
  return (
    <g>
      <path d="M3 13V7.5L8 3.5L13 7.5V13H9.5V9.5H6.5V13Z" fill="#f6e06e" stroke="#6c5611" strokeWidth="0.9" />
      {children}
    </g>
  );
}

function PictureOriginXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="1.5" y1="2" x2="1.5" y2="14" stroke="#111" strokeWidth="1.2" />
      <PictureHouseGlyph />
      <path d="M2.5 8H6" stroke="#111" strokeWidth="1.2" />
    </svg>
  );
}

function PictureOriginYIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="1.5" x2="14" y2="1.5" stroke="#111" strokeWidth="1.2" />
      <PictureHouseGlyph />
      <path d="M8 2V5.5" stroke="#111" strokeWidth="1.2" />
    </svg>
  );
}

function PictureScaleXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <PictureHouseGlyph />
      <path d="M2 14.2H14M3.5 12.8L2 14.2L3.5 15.3M12.5 12.8L14 14.2L12.5 15.3" fill="none" stroke="#111" strokeWidth="1" />
    </svg>
  );
}

function PictureScaleYIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <PictureHouseGlyph />
      <path d="M14.5 2V14M13.2 3.5L14.5 2L15.6 3.5M13.2 12.5L14.5 14L15.6 12.5" fill="none" stroke="#111" strokeWidth="1" />
    </svg>
  );
}

function PictureBrightnessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <PictureHouseGlyph />
      <circle cx="12.2" cy="4.2" r="1.7" fill="#fff" stroke="#666" strokeWidth="0.9" />
    </svg>
  );
}

function PictureContrastIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <PictureHouseGlyph />
      <circle cx="12.2" cy="4.2" r="1.8" fill="#fff" stroke="#666" strokeWidth="0.9" />
      <path d="M12.2 2.4A1.8 1.8 0 0 1 12.2 6Z" fill="#666" />
    </svg>
  );
}

function PictureAngleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <g transform="rotate(-18 8 9)">
        <PictureHouseGlyph />
      </g>
      <path d="M2 13.5H14" stroke="#111" strokeWidth="1" />
    </svg>
  );
}

function PictureFitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" fill="none" stroke="#444" strokeWidth="1" />
      <PictureHouseGlyph />
    </svg>
  );
}

function PictureMirrorHIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <PictureHouseGlyph />
      <path d="M3 13.5H13M5 12L3 13.5L5 15M11 12L13 13.5L11 15" fill="none" stroke="#666" strokeWidth="1.1" />
    </svg>
  );
}

function PictureMirrorVIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <PictureHouseGlyph />
      <path d="M13.5 3V13M12 5L13.5 3L15 5M12 11L13.5 13L15 11" fill="none" stroke="#666" strokeWidth="1.1" />
    </svg>
  );
}

type ColorOption = {
  id: string;
  label: string;
  hex: string;
};

const BORDER_COLOR_OPTIONS: ReadonlyArray<ColorOption> = STUDIO_TEXT_COLORS
  .filter((c) => c.hex)
  .map((c) => ({ id: c.id, label: c.label, hex: c.hex }));

const BACKGROUND_COLOR_OPTIONS: ReadonlyArray<ColorOption> = [
  { id: "none", label: "None", hex: "" },
  { id: "white", label: "White", hex: "#FFFFFF" },
  ...STUDIO_TEXT_COLORS
    .filter((c) => c.hex && c.hex.toUpperCase() !== "#FFFFFF")
    .map((c) => ({ id: c.id, label: c.label, hex: c.hex })),
];

function ColorSwatch({ hex, mixed = false }: { hex: string; mixed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-color-swatch={mixed ? "mixed" : hex || "none"}
      style={{
        display: "inline-block",
        width: 12,
        height: 10,
        flexShrink: 0,
        border: mixed ? "1px dashed #666" : "1px solid #555",
        background: mixed
          ? "#e5e5e5"
          : hex
            ? hex
            : "repeating-linear-gradient(135deg, #fff 0 3px, #d8d8d8 3px 6px)",
      }}
    />
  );
}

function PatternPreview({ pattern, mixed = false }: { pattern: BorderPatternId; mixed?: boolean }) {
  if (mixed) {
    return <span style={{ flex: 1, textAlign: "left" }} />;
  }
  if (pattern === "none") {
    return (
      <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        None
      </span>
    );
  }
  const parts = resolveBorderStrokes(pattern, 3);
  return (
    <svg width="100%" height="12" viewBox="0 0 44 12" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", flex: 1 }}>
      {parts.map((part, idx) => (
        <line
          key={idx}
          x1={1}
          y1={6 + part.insetDelta}
          x2={43}
          y2={6 + part.insetDelta}
          stroke="#111"
          strokeWidth={part.strokeWidth}
          strokeDasharray={part.dashArray}
        />
      ))}
    </svg>
  );
}

function useComboPopupPosition(open: boolean, anchorRef: React.RefObject<HTMLButtonElement | null>, width: number) {
  const [pos, setPos] = useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popupWidth = Math.max(width, rect.width || width);
    const maxLeft = typeof window !== "undefined" ? Math.max(4, window.innerWidth - popupWidth - 4) : 1024;
    const left = Math.max(4, Math.min(rect.left, maxLeft));
    const top = Math.max(4, rect.bottom + 1);
    setPos({ left, top, width: popupWidth });
  }, [open, anchorRef, width]);
  return pos;
}

function ObjectColorCombo({
  ariaLabel,
  value,
  options,
  onChange,
  style,
  mixed = false,
  disabled = false,
  dataRibbonField,
}: {
  ariaLabel: string;
  value: string;
  options: ReadonlyArray<ColorOption>;
  onChange: (hex: string) => void;
  style: CSSProperties;
  mixed?: boolean;
  disabled?: boolean;
  dataRibbonField?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const normalizedValue = (normalizeSafeHex(value) ?? value).toLowerCase();
  const currentIndex = Math.max(
    0,
    options.findIndex((opt) => (normalizeSafeHex(opt.hex) ?? opt.hex).toLowerCase() === normalizedValue),
  );
  const selected = options[currentIndex] ?? options[0];
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const pos = useComboPopupPosition(open, buttonRef, 128);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(currentIndex);
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, currentIndex]);

  const commitIndex = (idx: number) => {
    const chosen = options[idx];
    if (chosen) onChange(chosen.hex);
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      setOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(currentIndex);
      } else {
        setActiveIndex((idx) => (idx + 1) % options.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(currentIndex);
      } else {
        setActiveIndex((idx) => (idx - 1 + options.length) % options.length);
      }
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      event.stopPropagation();
      commitIndex(activeIndex);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        data-object-color-combo={ariaLabel}
        data-ribbon-field={dataRibbonField}
        data-mixed={mixed ? "true" : undefined}
        data-value={mixed ? "" : selected.hex}
        onClick={() => { if (!disabled) setOpen((prev) => !prev); }}
        onKeyDown={handleKeyDown}
        style={{
          ...control,
          ...style,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 2px 0 3px",
          textAlign: "left",
          background: disabled ? "#f0f0f0" : "#fff",
          color: disabled ? "#787878" : "#000",
        }}
      >
        <ColorSwatch hex={selected.hex} mixed={mixed} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {mixed ? "" : selected.label}
        </span>
        <span aria-hidden="true" style={{ fontSize: 8, lineHeight: "10px", marginLeft: "auto" }}>▼</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={popupRef}
              role="listbox"
              aria-label={`${ariaLabel} options`}
              data-object-combo-popup="true"
              onKeyDown={handleKeyDown}
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                width: pos.width,
                maxHeight: 220,
                overflowY: "auto",
                zIndex: 145,
                boxSizing: "border-box",
                border: "1px solid #7f9db9",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                font: RIBBON_FONT,
              }}
            >
              {options.map((opt, idx) => {
                const isSelected = !mixed && idx === currentIndex;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => commitIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      border: 0,
                      padding: "3px 6px",
                      background: isActive ? "#316ac5" : isSelected ? "#e5f1fb" : "transparent",
                      color: isActive ? "#fff" : "#000",
                      textAlign: "left",
                      cursor: "default",
                    }}
                  >
                    <ColorSwatch hex={opt.hex} />
                    <span style={{ whiteSpace: "nowrap" }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>,
            studioOverlayRoot(),
          )
        : null}
    </>
  );
}

function ObjectPatternCombo({
  ariaLabel,
  value,
  onChange,
  style,
  mixed = false,
  disabled = false,
  dataRibbonField,
}: {
  ariaLabel: string;
  value: BorderPatternId;
  onChange: (pattern: BorderPatternId) => void;
  style: CSSProperties;
  mixed?: boolean;
  disabled?: boolean;
  dataRibbonField?: string;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const currentIndex = Math.max(0, BORDER_PATTERN_OPTIONS.findIndex((opt) => opt.id === value));
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const pos = useComboPopupPosition(open, buttonRef, 138);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(currentIndex);
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, currentIndex]);

  const commitIndex = (idx: number) => {
    const chosen = BORDER_PATTERN_OPTIONS[idx];
    if (chosen) onChange(chosen.id);
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      setOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(currentIndex);
      } else {
        setActiveIndex((idx) => (idx + 1) % BORDER_PATTERN_OPTIONS.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(currentIndex);
      } else {
        setActiveIndex((idx) => (idx - 1 + BORDER_PATTERN_OPTIONS.length) % BORDER_PATTERN_OPTIONS.length);
      }
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(BORDER_PATTERN_OPTIONS.length - 1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      event.stopPropagation();
      commitIndex(activeIndex);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        data-object-pattern-combo="true"
        data-ribbon-field={dataRibbonField}
        data-mixed={mixed ? "true" : undefined}
        data-value={mixed ? "" : value}
        onClick={() => { if (!disabled) setOpen((prev) => !prev); }}
        onKeyDown={handleKeyDown}
        style={{
          ...control,
          ...style,
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: "0 2px 0 3px",
          textAlign: "left",
          background: disabled ? "#f0f0f0" : "#fff",
          color: disabled ? "#787878" : "#000",
        }}
      >
        <PatternPreview pattern={value} mixed={mixed} />
        {!mixed && value !== "none" ? <span className="sr-only">{borderPatternLabel(value)}</span> : null}
        <span aria-hidden="true" style={{ fontSize: 8, lineHeight: "10px", marginLeft: "auto" }}>▼</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={popupRef}
              role="listbox"
              aria-label={`${ariaLabel} options`}
              data-object-combo-popup="true"
              onKeyDown={handleKeyDown}
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                width: pos.width,
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 145,
                boxSizing: "border-box",
                border: "1px solid #7f9db9",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                font: RIBBON_FONT,
              }}
            >
              {BORDER_PATTERN_OPTIONS.map((opt, idx) => {
                const isSelected = !mixed && idx === currentIndex;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-label={opt.label}
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => commitIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      border: 0,
                      padding: "3px 6px",
                      background: isActive ? "#316ac5" : isSelected ? "#e5f1fb" : "transparent",
                      color: isActive ? "#fff" : "#000",
                      textAlign: "left",
                      cursor: "default",
                    }}
                  >
                    <span style={{ width: 46, display: "flex", alignItems: "center", flexShrink: 0, background: isActive ? "#fff" : "transparent", padding: "1px 2px" }}>
                      {opt.id === "none" ? <span style={{ fontSize: 10 }}>None</span> : <PatternPreview pattern={opt.id} />}
                    </span>
                    <span style={{ whiteSpace: "nowrap" }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>,
            studioOverlayRoot(),
          )
        : null}
    </>
  );
}

function RibbonShell({
  mode,
  selectionCount,
  creationTool,
  children,
}: {
  mode: "picture-tool" | "picture" | "object";
  selectionCount: number;
  creationTool?: StudioToolId;
  children: React.ReactNode;
}) {
  return (
    <div
      data-studio-object-ribbon="true"
      data-ribbon-mode={mode}
      data-ribbon-tool={creationTool}
      data-ribbon-selection-count={selectionCount}
      role="toolbar"
      aria-label={mode === "picture" ? "Picture Properties" : mode === "picture-tool" ? "Picture Box Tool Properties" : "Object Properties"}
      dir="ltr"
      className="flex flex-col"
      style={{
        background: "#f0f0f0",
        color: "#000",
        font: RIBBON_FONT,
        height: 47,
        minHeight: 47,
        maxHeight: 47,
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        data-studio-toolbar-etched="true"
        style={{ height: 3, flexShrink: 0, background: "linear-gradient(to bottom, #f0f0f0 0 1px, #a0a0a0 1px 2px, #ffffff 2px 3px)" }}
      />
      <div
        style={{
          height: 42,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 4px",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
      <div aria-hidden="true" data-studio-toolbar-edge="true" style={{ height: 2, flexShrink: 0, background: "#a0a0a0" }} />
    </div>
  );
}

function PicturePropertyRibbon({
  frame,
  applyToSelected,
}: {
  frame: StudioFrame;
  applyToSelected: (buildPatch: BatchBuilder, groupField?: string) => void;
}) {
  const locked = Boolean(frame.locked);
  const hasImage = Boolean(frame.imageSrc);
  const editable = hasImage && !locked;
  const scale = pictureScalePercent(frame);
  const refSize = pictureReferenceSizeMm(frame);
  const filename = frame.imageSrc ? frame.imageName || "Embedded picture" : "No picture";

  const commitOrigin = (axis: "imageXMm" | "imageYMm", raw: string): boolean => {
    const parsed = parseGeometryLength(raw);
    if (!Number.isFinite(parsed)) return false;
    const patch: ObjectGeometryPatch = { [axis]: parsed };
    if (!applyObjectGeometry(frame, patch)) return false;
    applyToSelected(() => patch, axis);
    return true;
  };

  const stepOrigin = (axis: "imageXMm" | "imageYMm", delta: 1 | -1) => {
    const current = axis === "imageXMm" ? (frame.imageXMm ?? 0) : (frame.imageYMm ?? 0);
    const next = Math.round((current + delta) * 100) / 100;
    const patch: ObjectGeometryPatch = { [axis]: next };
    if (applyObjectGeometry(frame, patch)) applyToSelected(() => patch, axis);
  };

  const commitScale = (axis: "x" | "y", raw: string): boolean => {
    const parsed = parseScalePercent(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return false;
    const dimMm = pictureDimensionMmFromScale(parsed, axis === "x" ? refSize.wMm : refSize.hMm);
    const patch: ObjectGeometryPatch = axis === "x" ? { imageWMm: dimMm } : { imageHMm: dimMm };
    if (!applyObjectGeometry(frame, patch)) return false;
    applyToSelected(() => patch, axis === "x" ? "imageWMm" : "imageHMm");
    return true;
  };

  const stepScale = (axis: "x" | "y", delta: 1 | -1) => {
    const nextPct = Math.max(1, Math.round((axis === "x" ? scale.x : scale.y) + delta));
    const dimMm = pictureDimensionMmFromScale(nextPct, axis === "x" ? refSize.wMm : refSize.hMm);
    const patch: ObjectGeometryPatch = axis === "x" ? { imageWMm: dimMm } : { imageHMm: dimMm };
    if (applyObjectGeometry(frame, patch)) applyToSelected(() => patch, axis === "x" ? "imageWMm" : "imageHMm");
  };

  const commitAngle2 = (raw: string): boolean => {
    const parsed = parseDegrees(raw);
    if (!Number.isFinite(parsed) || Math.abs(parsed) > 3600) return false;
    const patch: ObjectGeometryPatch = { angle2Deg: parsed };
    if (!applyObjectGeometry(frame, patch)) return false;
    applyToSelected(() => patch, "angle2Deg");
    return true;
  };

  const stepAngle2 = (delta: 1 | -1) => {
    const next = Math.max(-3600, Math.min(3600, effectiveAngle2Deg(frame) + delta));
    const patch: ObjectGeometryPatch = { angle2Deg: next };
    if (applyObjectGeometry(frame, patch)) applyToSelected(() => patch, "angle2Deg");
  };

  const fitPicture = () => {
    if (!editable) return;
    const fit =
      frame.imageNaturalW && frame.imageNaturalH
        ? fitPictureInBox(frame.wMm, frame.hMm, frame.imageNaturalW, frame.imageNaturalH)
        : { x: 0, y: 0, w: frame.wMm, h: frame.hMm };
    applyToSelected(() => ({
      imageXMm: fit.x,
      imageYMm: fit.y,
      imageWMm: fit.w,
      imageHMm: fit.h,
      angle2Deg: 0,
    }));
  };

  const colStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 };
  const rowPairStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 2, height: 19 };

  return (
    <RibbonShell mode="picture" selectionCount={1}>
      {/* Col 1: Picture Origin X / Y */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><PictureOriginXIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Origin Across"
            dataField="image-x"
            selectionKey={frame.id}
            value={formatGeometryLength(frame.imageXMm ?? 0)}
            disabled={!editable}
            width={68}
            onCommit={(raw) => commitOrigin("imageXMm", raw)}
            onStep={(delta) => stepOrigin("imageXMm", delta)}
          />
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><PictureOriginYIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Origin Down"
            dataField="image-y"
            selectionKey={frame.id}
            value={formatGeometryLength(frame.imageYMm ?? 0)}
            disabled={!editable}
            width={68}
            onCommit={(raw) => commitOrigin("imageYMm", raw)}
            onStep={(delta) => stepOrigin("imageYMm", delta)}
          />
        </div>
      </div>

      {/* Col 2: Scaling Across / Down */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><PictureScaleXIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Scaling Across"
            dataField="scale-x"
            selectionKey={frame.id}
            value={formatScalePercent(scale.x)}
            disabled={!editable}
            width={58}
            onCommit={(raw) => commitScale("x", raw)}
            onStep={(delta) => stepScale("x", delta)}
          />
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><PictureScaleYIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Scaling Down"
            dataField="scale-y"
            selectionKey={frame.id}
            value={formatScalePercent(scale.y)}
            disabled={!editable}
            width={58}
            onCommit={(raw) => commitScale("y", raw)}
            onStep={(delta) => stepScale("y", delta)}
          />
        </div>
      </div>

      {/* Col 3: Brightness / Contrast (matches InPage 2009 layout; cleanly disabled/unsupported) */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><PictureBrightnessIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Brightness"
            dataField="brightness"
            selectionKey={frame.id}
            value="0%"
            disabled={true}
            title={unsupported.title}
            width={54}
            onCommit={() => false}
          />
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><PictureContrastIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Contrast"
            dataField="contrast"
            selectionKey={frame.id}
            value="0%"
            disabled={true}
            title={unsupported.title}
            width={54}
            onCommit={() => false}
          />
        </div>
      </div>

      {/* Col 4: Angle2, Picture Actions & Filename Path Readout */}
      <div style={colStyle}>
        <div style={{ ...rowPairStyle, gap: 3 }}>
          <span style={iconTileStyle}><PictureAngleIcon /></span>
          <RibbonNumericInput
            ariaLabel="Picture Angle"
            dataField="angle2"
            selectionKey={frame.id}
            value={formatDegrees(effectiveAngle2Deg(frame))}
            disabled={!editable}
            width={62}
            onCommit={commitAngle2}
            onStep={stepAngle2}
          />
          <button
            type="button"
            aria-label="Fit Picture to Box"
            title="Fit Picture to Box"
            data-ribbon-field="fit-picture"
            disabled={!editable}
            onClick={fitPicture}
            style={ribbonBevelButton(false, !editable)}
          >
            <PictureFitIcon />
          </button>
          <button
            type="button"
            aria-label="Mirror Picture Horizontally"
            data-ribbon-field="mirror-h"
            {...unsupported}
            style={ribbonBevelButton(false, true)}
          >
            <PictureMirrorHIcon />
          </button>
          <button
            type="button"
            aria-label="Mirror Picture Vertically"
            data-ribbon-field="mirror-v"
            {...unsupported}
            style={ribbonBevelButton(false, true)}
          >
            <PictureMirrorVIcon />
          </button>
        </div>
        <div style={rowPairStyle}>
          <span
            data-ribbon-field="picture-filename"
            title={filename}
            style={{
              paddingLeft: 4,
              maxWidth: 360,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: hasImage ? "#111" : "#666",
              font: RIBBON_FONT,
              lineHeight: "19px",
            }}
          >
            {filename}
          </span>
        </div>
      </div>
    </RibbonShell>
  );
}

function ObjectPropertyRibbon({
  selectedFrames,
  applyToSelected,
  creationMode = false,
  creationTool,
  onSelectCreationTool,
}: {
  selectedFrames: readonly StudioFrame[];
  applyToSelected: (buildPatch: BatchBuilder, groupField?: string) => void;
  creationMode?: boolean;
  creationTool?: StudioToolId;
  onSelectCreationTool?: (tool: StudioToolId) => void;
}) {
  const selectionKey = creationMode
    ? `__picture-tool__:${creationTool ?? "cross-square"}`
    : selectedFrames.map((f) => f.id).join(",");
  const unlockedFrames = selectedFrames.filter((f) => !f.locked);
  const allLocked = unlockedFrames.length === 0;
  const editable = creationMode || !allLocked;
  const boundsEditable = !creationMode && editable;

  const sharedX = resolveShared(selectedFrames, (f) => f.xMm, nearNumber);
  const sharedY = resolveShared(selectedFrames, (f) => f.yMm, nearNumber);
  const sharedW = resolveShared(selectedFrames, (f) => f.wMm, nearNumber);
  const sharedH = resolveShared(selectedFrames, (f) => f.hMm, nearNumber);
  const sharedBorderPos = resolveShared(selectedFrames, effectiveBorderPosition);
  const sharedBorderColor = resolveShared(selectedFrames, effectiveBorderColor);
  const sharedBgColor = resolveShared(selectedFrames, effectiveBackgroundColor);
  const sharedBorderPattern = resolveShared(selectedFrames, effectiveBorderPattern);
  const sharedBorderWidth = resolveShared(selectedFrames, effectiveBorderWidthMm, nearNumber);
  const sharedRoundness = resolveShared(selectedFrames, effectiveRoundnessMm, nearNumber);
  const sharedAngle1 = resolveShared(selectedFrames, effectiveAngle1Deg, nearNumber);
  const sharedHatch = resolveShared(selectedFrames, effectiveHatch);

  const allPictureFamily = selectedFrames.every((f) => isPictureBox(f.kind));
  const allDrawingShapes = selectedFrames.every((f) => !isPictureBox(f.kind) && shapeVariantOf(f.kind) !== null);
  const shapeGroupEnabled = editable && (allPictureFamily || allDrawingShapes);
  const sharedVariant = resolveShared<ShapeVariant | null>(selectedFrames, (f) => shapeVariantOf(f.kind));
  const roundnessEnabled = editable && selectedFrames.some((f) => shapeVariantOf(f.kind) === "round-rect");
  const eligibleRunAroundFrames = creationMode ? [] : selectedFrames.filter((f) => isRectangularRunAroundBox(f));
  const editableRunAroundFrames = creationMode ? [] : unlockedFrames.filter((f) => isRectangularRunAroundBox(f));
  const runAroundEnabled = !creationMode && editableRunAroundFrames.length > 0;
  const sharedRunAround = eligibleRunAroundFrames.length > 0
    ? resolveShared(eligibleRunAroundFrames, resolvedRunAround)
    : ({ mixed: false, value: false } as const);
  const editableSharedRunAround = editableRunAroundFrames.length > 0
    ? resolveShared(editableRunAroundFrames, resolvedRunAround)
    : ({ mixed: false, value: false } as const);
  const runAroundActive = eligibleRunAroundFrames.length > 0 && !sharedRunAround.mixed && sharedRunAround.value;
  const runAroundPressed: boolean | "mixed" = eligibleRunAroundFrames.length === 0
    ? false
    : sharedRunAround.mixed
      ? "mixed"
      : sharedRunAround.value;
  const runAroundNextValue = editableSharedRunAround.mixed ? true : !editableSharedRunAround.value;
  const runAroundTitle = creationMode
    ? "Select a rectangular object to toggle Run Around"
    : runAroundEnabled
      ? sharedRunAround.mixed
        ? `Run Around (Mixed — click to turn ${runAroundNextValue ? "on" : "off"} for unlocked rectangular objects; Format → Runaround… for clearances)`
        : runAroundActive
          ? "Run Around: On (Format → Runaround… for clearances)"
          : "Run Around: Off (Format → Runaround… for clearances)"
      : allLocked || eligibleRunAroundFrames.length > 0
        ? "Locked objects cannot be modified"
        : "Run Around is only supported on unrotated rectangular objects";

  const commitGeometry = (key: "xMm" | "yMm" | "wMm" | "hMm", raw: string): boolean => {
    const parsed = parseGeometryLength(raw);
    if (!Number.isFinite(parsed) || ((key === "wMm" || key === "hMm") && parsed < 1)) return false;
    const patch: ObjectGeometryPatch = { [key]: parsed };
    if (!unlockedFrames.some((f) => applyObjectGeometry(f, patch) !== null)) return false;
    applyToSelected(() => patch, key);
    return true;
  };

  const stepGeometry = (key: "xMm" | "yMm" | "wMm" | "hMm", delta: 1 | -1) => {
    const base =
      key === "xMm" ? sharedX : key === "yMm" ? sharedY : key === "wMm" ? sharedW : sharedH;
    const fallback = !base.mixed ? base.value : unlockedFrames[0]?.[key] ?? selectedFrames[0][key];
    const next = Math.round((fallback + delta) * 100) / 100;
    if ((key === "wMm" || key === "hMm") && next < 1) return;
    applyToSelected(() => ({ [key]: next }), key);
  };

  const commitBorderWidth = (raw: string): boolean => {
    const parsed = parseBorderWidth(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return false;
    const patch: ObjectGeometryPatch = { borderWidthMm: parsed };
    if (!unlockedFrames.some((f) => applyObjectGeometry(f, patch) !== null)) return false;
    applyToSelected(() => patch, "borderWidthMm");
    return true;
  };

  const stepBorderWidth = (delta: 1 | -1) => {
    const current = !sharedBorderWidth.mixed
      ? sharedBorderWidth.value
      : effectiveBorderWidthMm(unlockedFrames[0] ?? selectedFrames[0]);
    const next = Math.max(25.4 / 288, current + delta * (25.4 / 288));
    applyToSelected(() => ({ borderWidthMm: next }), "borderWidthMm");
  };

  const commitRoundness = (raw: string): boolean => {
    const parsed = parseGeometryLength(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return false;
    const patch: ObjectGeometryPatch = { roundnessMm: parsed };
    if (!unlockedFrames.some((f) => applyObjectGeometry(f, patch) !== null)) return false;
    applyToSelected(() => patch, "roundnessMm");
    return true;
  };

  const stepRoundness = (delta: 1 | -1) => {
    const current = !sharedRoundness.mixed
      ? sharedRoundness.value
      : effectiveRoundnessMm(unlockedFrames[0] ?? selectedFrames[0]);
    const next = Math.max(0, Math.round((current + delta * 0.5) * 100) / 100);
    applyToSelected(() => ({ roundnessMm: next }), "roundnessMm");
  };

  const commitAngle1 = (raw: string): boolean => {
    const parsed = parseDegrees(raw);
    if (!Number.isFinite(parsed) || Math.abs(parsed) > 3600) return false;
    const patch: ObjectGeometryPatch = { angle1Deg: parsed };
    if (!unlockedFrames.some((f) => applyObjectGeometry(f, patch) !== null)) return false;
    applyToSelected(() => patch, "angle1Deg");
    return true;
  };

  const stepAngle1 = (delta: 1 | -1) => {
    const current = !sharedAngle1.mixed
      ? sharedAngle1.value
      : effectiveAngle1Deg(unlockedFrames[0] ?? selectedFrames[0]);
    const next = Math.max(-3600, Math.min(3600, current + delta));
    applyToSelected(() => ({ angle1Deg: next }), "angle1Deg");
  };

  const shapeLabels: Record<ShapeVariant, string> = allPictureFamily
    ? {
        rect: "Rectangular Picture Box",
        ellipse: "Elliptical Picture Box",
        "round-rect": "Rounded Rectangular Picture Box",
      }
    : {
        rect: "Rectangular Shape",
        ellipse: "Elliptical Shape",
        "round-rect": "Rounded Rectangular Shape",
      };

  const colStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 };
  const rowPairStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 2, height: 19 };

  return (
    <RibbonShell
      mode={creationMode ? "picture-tool" : "object"}
      selectionCount={creationMode ? 0 : selectedFrames.length}
      creationTool={creationMode ? creationTool : undefined}
    >
      {/* Col 1: Position X / Y */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><ObjectXIcon /></span>
          <RibbonNumericInput
            ariaLabel="Object Across (X)"
            dataField="x"
            dataObjectField="x"
            selectionKey={selectionKey}
            mixed={!creationMode && sharedX.mixed}
            value={creationMode || sharedX.mixed ? "" : formatGeometryLength(sharedX.value)}
            disabled={!boundsEditable}
            width={68}
            onCommit={(raw) => commitGeometry("xMm", raw)}
            onStep={(delta) => stepGeometry("xMm", delta)}
          />
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><ObjectYIcon /></span>
          <RibbonNumericInput
            ariaLabel="Object Down (Y)"
            dataField="y"
            dataObjectField="y"
            selectionKey={selectionKey}
            mixed={!creationMode && sharedY.mixed}
            value={creationMode || sharedY.mixed ? "" : formatGeometryLength(sharedY.value)}
            disabled={!boundsEditable}
            width={68}
            onCommit={(raw) => commitGeometry("yMm", raw)}
            onStep={(delta) => stepGeometry("yMm", delta)}
          />
        </div>
      </div>

      {/* Col 2: Size Width / Height */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><ObjectWIcon /></span>
          <RibbonNumericInput
            ariaLabel="Object Width"
            dataField="w"
            dataObjectField="w"
            selectionKey={selectionKey}
            mixed={!creationMode && sharedW.mixed}
            value={creationMode || sharedW.mixed ? "" : formatGeometryLength(sharedW.value)}
            disabled={!boundsEditable}
            width={68}
            onCommit={(raw) => commitGeometry("wMm", raw)}
            onStep={(delta) => stepGeometry("wMm", delta)}
          />
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><ObjectHIcon /></span>
          <RibbonNumericInput
            ariaLabel="Object Height"
            dataField="h"
            dataObjectField="h"
            selectionKey={selectionKey}
            mixed={!creationMode && sharedH.mixed}
            value={creationMode || sharedH.mixed ? "" : formatGeometryLength(sharedH.value)}
            disabled={!boundsEditable}
            width={68}
            onCommit={(raw) => commitGeometry("hMm", raw)}
            onStep={(delta) => stepGeometry("hMm", delta)}
          />
        </div>
      </div>

      {/* Col 3: 2x2 Border Position & Layout Buttons */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <button
            type="button"
            aria-label="Object Border Outside"
            title="Border Outside"
            data-ribbon-field="border-outside"
            aria-pressed={!sharedBorderPos.mixed && sharedBorderPos.value === "outside"}
            disabled={!editable}
            onClick={() => applyToSelected(() => ({ borderPosition: "outside" }))}
            style={ribbonBevelButton(!sharedBorderPos.mixed && sharedBorderPos.value === "outside", !editable)}
          >
            <BorderOutsideIcon />
          </button>
          <button
            type="button"
            aria-label="Object Border Inside"
            title="Border Inside"
            data-ribbon-field="border-inside"
            aria-pressed={!sharedBorderPos.mixed && sharedBorderPos.value === "inside"}
            disabled={!editable}
            onClick={() => applyToSelected(() => ({ borderPosition: "inside" }))}
            style={ribbonBevelButton(!sharedBorderPos.mixed && sharedBorderPos.value === "inside", !editable)}
          >
            <BorderInsideIcon />
          </button>
        </div>
        <div style={rowPairStyle}>
          <button
            type="button"
            aria-label="Object Run Around"
            title={runAroundTitle}
            data-ribbon-field="run-around"
            data-ribbon-mixed={eligibleRunAroundFrames.length > 0 && sharedRunAround.mixed ? "true" : undefined}
            aria-pressed={runAroundPressed}
            disabled={!runAroundEnabled}
            onClick={() => {
              applyToSelected((target) => (isRectangularRunAroundBox(target) ? { runAround: runAroundNextValue } : null));
            }}
            style={ribbonBevelButton(runAroundActive, !runAroundEnabled)}
          >
            <RunAroundIcon disabled={!runAroundEnabled} />
          </button>
          <button
            type="button"
            aria-label="Object Inset"
            data-ribbon-field="inset"
            {...unsupported}
            style={ribbonBevelButton(false, true)}
          >
            <InsetIcon />
          </button>
        </div>
      </div>

      {/* Col 4: Border Color / Background Color */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <ObjectColorCombo
            ariaLabel="Object Border Color"
            dataRibbonField="border-color"
            value={sharedBorderColor.mixed ? "#000000" : sharedBorderColor.value}
            mixed={sharedBorderColor.mixed}
            disabled={!editable}
            options={BORDER_COLOR_OPTIONS}
            onChange={(hex) => applyToSelected(() => ({ borderColor: hex }))}
            style={{ width: 78, height: 19 }}
          />
        </div>
        <div style={rowPairStyle}>
          <ObjectColorCombo
            ariaLabel="Object Background Color"
            dataRibbonField="background-color"
            value={sharedBgColor.mixed ? "" : sharedBgColor.value}
            mixed={sharedBgColor.mixed}
            disabled={!editable}
            options={BACKGROUND_COLOR_OPTIONS}
            onChange={(hex) => applyToSelected(() => ({ backgroundColor: hex }))}
            style={{ width: 78, height: 19 }}
          />
        </div>
      </div>

      {/* Col 5: Border Pattern / Border Width */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <ObjectPatternCombo
            ariaLabel="Object Border Pattern"
            dataRibbonField="border-pattern"
            value={sharedBorderPattern.mixed ? "none" : sharedBorderPattern.value}
            mixed={sharedBorderPattern.mixed}
            disabled={!editable}
            onChange={(pattern) => applyToSelected(() => ({ borderPattern: pattern }))}
            style={{ width: 90, height: 19 }}
          />
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><BorderWidthIcon /></span>
          <RibbonNumericInput
            ariaLabel="Object Border Width"
            dataField="border-width"
            selectionKey={selectionKey}
            mixed={sharedBorderWidth.mixed}
            value={sharedBorderWidth.mixed ? "" : formatBorderWidth(sharedBorderWidth.value)}
            disabled={!editable}
            width={60}
            onCommit={commitBorderWidth}
            onStep={stepBorderWidth}
          />
        </div>
      </div>

      {/* Col 6: Shape Buttons / Roundness */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          {(["rect", "ellipse", "round-rect"] as const).map((variant) => {
            const pressed = !sharedVariant.mixed && sharedVariant.value === variant;
            const kindLabel = shapeLabels[variant];
            return (
              <button
                key={variant}
                type="button"
                aria-label={kindLabel}
                title={kindLabel}
                data-ribbon-field={`shape-${variant}`}
                aria-pressed={pressed}
                disabled={!shapeGroupEnabled}
                onClick={() => {
                  if (creationMode) {
                    const toolMap: Record<ShapeVariant, StudioToolId> = {
                      rect: "cross-square",
                      ellipse: "cross-circle",
                      "round-rect": "cross-round",
                    };
                    onSelectCreationTool?.(toolMap[variant]);
                    return;
                  }
                  applyToSelected((target) => {
                    const nextKind = frameKindForShape(target.kind, variant);
                    return nextKind ? { kind: nextKind } : null;
                  });
                }}
                style={ribbonBevelButton(pressed, !shapeGroupEnabled)}
              >
                <ShapeButtonIcon variant={variant} />
              </button>
            );
          })}
        </div>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><RoundnessIcon disabled={!roundnessEnabled} /></span>
          <RibbonNumericInput
            ariaLabel="Object Corner Roundness"
            dataField="roundness"
            selectionKey={selectionKey}
            mixed={sharedRoundness.mixed}
            value={sharedRoundness.mixed ? "" : formatGeometryLength(sharedRoundness.value)}
            disabled={!roundnessEnabled}
            width={54}
            onCommit={commitRoundness}
            onStep={stepRoundness}
          />
        </div>
      </div>

      {/* Col 7: Object Angle / Background Hatch */}
      <div style={colStyle}>
        <div style={rowPairStyle}>
          <span style={iconTileStyle}><AngleWedgeIcon /></span>
          <RibbonNumericInput
            ariaLabel="Object Angle"
            dataField="angle1"
            selectionKey={selectionKey}
            mixed={sharedAngle1.mixed}
            value={sharedAngle1.mixed ? "" : formatDegrees(sharedAngle1.value)}
            disabled={!editable}
            width={50}
            onCommit={commitAngle1}
            onStep={stepAngle1}
          />
        </div>
        <div style={{ ...rowPairStyle, position: "relative" }}>
          <select
            aria-label="Object Background Hatch"
            data-ribbon-field="background-hatch"
            data-mixed={sharedHatch.mixed ? "true" : undefined}
            disabled={!editable}
            value={sharedHatch.mixed ? "" : sharedHatch.value}
            onChange={(event) => {
              if (event.target.value === "none") applyToSelected(() => ({ backgroundHatch: "none" }));
            }}
            style={{
              ...ribbonFieldBox,
              appearance: "none",
              WebkitAppearance: "none",
              width: 70,
              padding: "0 16px 0 3px",
              background: !editable ? "#f0f0f0" : "#fff",
              color: !editable ? "#787878" : "#000",
            }}
          >
            {sharedHatch.mixed ? <option value="" /> : null}
            <option value="none">None</option>
          </select>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              right: 2,
              top: 2,
              width: 13,
              height: 15,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              borderLeft: "1px solid #d0d0d0",
              background: "#efefef",
              fontSize: 8,
              color: !editable ? "#787878" : "#111",
            }}
          >
            ▼
          </span>
        </div>
      </div>
    </RibbonShell>
  );
}

export function StudioObjectRibbon({
  frame,
  frames,
  mode = "object",
  creationTool = "cross-square",
  pictureDefaults = DEFAULT_PICTURE_TOOL_DEFAULTS,
  onPictureDefaultsChange,
  onSelectCreationTool,
  onChange,
  onApplyBatch,
  disableContextMenu = false,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const menuReturnFocus = useRef<HTMLElement | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; frame: StudioFrame } | null>(null);
  const [dialogFrame, setDialogFrame] = useState<StudioFrame | null>(null);
  const resolvedPreview = mode === "picture-tool" ? buildPictureToolPreviewFrame(pictureDefaults, creationTool) : null;
  const selectedFrames =
    mode === "picture-tool"
      ? [resolvedPreview!]
      : frames && frames.length > 0
        ? frames
        : frame
          ? [frame]
          : [];

  useEffect(() => {
    if (disableContextMenu || mode === "picture-tool" || !frame) return;
    const open = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const box = target?.closest<HTMLElement>('[data-studio-frame^="picture-"][data-studio-frame-id]');
      if (!box) return;
      event.preventDefault();
      const current = box.dataset.studioFrameId === frame.id ? frame : null;
      if (current) {
        menuReturnFocus.current = document.activeElement as HTMLElement;
        setMenu({ x: event.clientX, y: event.clientY, frame: current });
      }
    };
    const selected = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; x: number; y: number }>).detail;
      if (detail.id === frame.id) {
        menuReturnFocus.current = document.activeElement as HTMLElement;
        setMenu({ x: detail.x, y: detail.y, frame });
        delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest;
      }
    };
    document.addEventListener("contextmenu", open);
    window.addEventListener("studio-picture-context", selected);
    const pending = (window as Window & { __studioPictureContextRequest?: { id: string; x: number; y: number } }).__studioPictureContextRequest;
    if (pending?.id === frame.id) {
      menuReturnFocus.current = document.activeElement as HTMLElement;
      setMenu({ ...pending, frame });
      delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest;
    }
    return () => {
      document.removeEventListener("contextmenu", open);
      window.removeEventListener("studio-picture-context", selected);
    };
  }, [disableContextMenu, frame, mode]);

  useEffect(() => {
    if (!menu) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const close = () => setMenu(null);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        menuReturnFocus.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [menu]);

  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pos = contextMenuPosition(menu.x, menu.y, rect.width, rect.height, window.innerWidth, window.innerHeight);
    menuRef.current.style.left = `${pos.left}px`;
    menuRef.current.style.top = `${pos.top}px`;
    menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [menu]);

  useEffect(() => {
    if (dialogFrame && (!frame || dialogFrame.id !== frame.id)) setDialogFrame(null);
  }, [dialogFrame, frame]);

  if (selectedFrames.length === 0) return null;

  const applyToSelected = (buildPatch: BatchBuilder, groupField?: string) => {
    if (mode === "picture-tool") {
      const patch = buildPatch(selectedFrames[0]);
      if (!patch || !onPictureDefaultsChange) return;
      const next = applyPictureToolDefaultsPatch(pictureDefaults, patch);
      if (next) onPictureDefaultsChange(next);
      return;
    }
    const unlocked = selectedFrames.filter((item) => !item.locked);
    if (!unlocked.length) return;
    const ids = unlocked.map((item) => item.id);
    const historyOptions: ObjectHistoryGroupOptions | undefined = groupField
      ? { groupKey: `ribbon:${ids.join(",")}:${groupField}` }
      : undefined;
    if (onApplyBatch) {
      onApplyBatch(ids, buildPatch, historyOptions);
      return;
    }
    const targetFrame = frame ?? selectedFrames[0];
    const patch = buildPatch(targetFrame);
    if (patch) onChange(targetFrame.id, patch, historyOptions);
  };

  return (
    <>
      {mode === "picture" ? (
        <PicturePropertyRibbon frame={selectedFrames[0]} applyToSelected={applyToSelected} />
      ) : (
        <ObjectPropertyRibbon
          selectedFrames={selectedFrames}
          applyToSelected={applyToSelected}
          creationMode={mode === "picture-tool"}
          creationTool={creationTool}
          onSelectCreationTool={onSelectCreationTool}
        />
      )}
      {menu
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Object context menu"
              data-object-menu-root="true"
              className="fixed z-[120] border border-[#808080] bg-[#f0f0f0] p-1 shadow-md"
              style={{ left: menu.x, top: menu.y }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                data-object-menu="format"
                className="px-4 py-1 text-left text-[11px] hover:bg-[#d6dff2]"
                onClick={() => {
                  dialogReturnFocus.current = menuReturnFocus.current;
                  setDialogFrame(menu.frame);
                  setMenu(null);
                }}
              >
                Format Object...
              </button>
            </div>,
            studioOverlayRoot(),
          )
        : null}
      {dialogFrame ? (
        <FormatDialog
          frame={dialogFrame}
          returnFocus={dialogReturnFocus}
          onCancel={() => setDialogFrame(null)}
          onApply={(patch) => {
            onChange(dialogFrame.id, patch);
            setDialogFrame(null);
          }}
        />
      ) : null}
    </>
  );
}

export function FormatDialog({ frame, onCancel, onApply, returnFocus }: { frame: StudioFrame; onCancel: () => void; onApply: (patch: ObjectGeometryPatch) => void; returnFocus: React.MutableRefObject<HTMLElement | null> }) {
  const drag = useMovableStudioDialog<HTMLFormElement>();
  const formRef = useRef<HTMLFormElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const [patch, setPatch] = useState<ObjectGeometryPatch>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const [borderWidth, setBorderWidth] = useState(() => formatBorderWidth(frame.borderWidthMm ?? 25.4 / 96));
  const [borderColor, setBorderColor] = useState(frame.borderColor ?? "#000000");
  const [borderPattern, setBorderPattern] = useState<BorderPatternId>(effectiveBorderPattern(frame));
  const [backgroundColor, setBackgroundColor] = useState(frame.backgroundColor ?? "");
  const [origin, setOrigin] = useState({ x: formatGeometryLength(frame.imageXMm ?? 0), y: formatGeometryLength(frame.imageYMm ?? 0) });
  const initialScale = pictureScalePercent(frame);
  const [scale, setScale] = useState({ x: formatScalePercent(initialScale.x), y: formatScalePercent(initialScale.y) });
  const [roundness, setRoundness] = useState(formatGeometryLength(frame.roundnessMm ?? 6.35));
  const [angle1, setAngle1] = useState(formatDegrees(frame.angle1Deg ?? 0));
  const [angle2, setAngle2] = useState(formatDegrees(frame.angle2Deg ?? 0));
  const [borderPosition, setBorderPosition] = useState<"inside" | "outside" | undefined>(frame.borderPosition);
  const [draft, setDraft] = useState<Record<GeometryKey, string>>(() => Object.fromEntries(fields.map(([key]) => [key, formatGeometryLength(frame[key])])) as Record<GeometryKey, string>);
  const preview = { ...frame, ...patch };
  const parsedPreviewAngle1 = parseDegrees(angle1);
  const effectivePreviewAngle1 = Number.isFinite(parsedPreviewAngle1) ? parsedPreviewAngle1 : (frame.angle1Deg ?? 0);
  const runAroundSupported = isRectangularRunAroundBox({
    kind: preview.kind,
    angle1Deg: effectivePreviewAngle1,
  });
  const runAroundChecked = runAroundSupported && (patch.runAround ?? frame.runAround ?? false);
  useEffect(() => { firstField.current?.focus({ preventScroll: true }); return () => returnFocus.current?.focus({ preventScroll: true }); }, [returnFocus]);
  useEffect(() => { const escape = (event: KeyboardEvent) => { if (event.defaultPrevented) return; if (event.key === "Escape") onCancel(); }; document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape); }, [onCancel]);
  return createPortal(<div style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", background: "rgba(0,0,0,.25)", padding: 12 }}><form ref={node => { drag.dialogRef.current = node; formRef.current = node; }} role="dialog" aria-modal="true" aria-label="Modify Object" data-studio-format-object-dialog="true" data-inpage2009-dialog="true" data-modify-object-window="true" dir="ltr" onSubmit={e => { e.preventDefault(); const current = Object.fromEntries(fields.map(([key]) => [key, parseGeometryLength(draft[key])] )) as ObjectGeometryPatch; const style: ObjectGeometryPatch = {};
      const originX = parseGeometryLength(origin.x), originY = parseGeometryLength(origin.y);
      if (Number.isFinite(originX) && Math.abs(originX - (frame.imageXMm ?? 0)) > 1e-6) current.imageXMm = originX;
      if (Number.isFinite(originY) && Math.abs(originY - (frame.imageYMm ?? 0)) > 1e-6) current.imageYMm = originY;
      const scaleX = parseScalePercent(scale.x), scaleY = parseScalePercent(scale.y);
      const shownScale = pictureScalePercent(frame);
      const refSize = pictureReferenceSizeMm(frame);
      if (Number.isFinite(scaleX) && Math.abs(scaleX - parseScalePercent(formatScalePercent(shownScale.x))) > 1e-6) {
        current.imageWMm = pictureDimensionMmFromScale(scaleX, refSize.wMm);
      }
      if (Number.isFinite(scaleY) && Math.abs(scaleY - parseScalePercent(formatScalePercent(shownScale.y))) > 1e-6) {
        current.imageHMm = pictureDimensionMmFromScale(scaleY, refSize.hMm);
      }
      const roundMm = parseGeometryLength(roundness);
      if (Number.isFinite(roundMm) && Math.abs(roundMm - (frame.roundnessMm ?? 6.35)) > 1e-6) current.roundnessMm = roundMm;
      const parsedAngle1 = parseDegrees(angle1), parsedAngle2 = parseDegrees(angle2);
      if (Number.isFinite(parsedAngle1) && Math.abs(parsedAngle1 - (frame.angle1Deg ?? 0)) > 1e-6) current.angle1Deg = parsedAngle1;
      if (Number.isFinite(parsedAngle2) && Math.abs(parsedAngle2 - (frame.angle2Deg ?? 0)) > 1e-6) current.angle2Deg = parsedAngle2;
      if (borderPosition !== undefined && borderPosition !== frame.borderPosition) current.borderPosition = borderPosition;
      if (patch.locked !== undefined && patch.locked !== (frame.locked ?? false)) current.locked = patch.locked;
      if (patch.dontPrint !== undefined && patch.dontPrint !== (frame.dontPrint ?? false)) current.dontPrint = patch.dontPrint;
      if (patch.template !== undefined && patch.template !== (frame.template ?? false)) current.template = patch.template;
      const submitSupported = isRectangularRunAroundBox({
        kind: patch.kind ?? frame.kind,
        angle1Deg: current.angle1Deg ?? frame.angle1Deg,
      });
      if (submitSupported) {
        if (patch.runAround !== undefined && patch.runAround !== (frame.runAround ?? false)) {
          current.runAround = patch.runAround;
        }
      } else if (frame.runAround === true) {
        current.runAround = false;
      }
      const parsedWidth = parseBorderWidth(borderWidth);
      if (Number.isFinite(parsedWidth) && Math.abs(parsedWidth - (frame.borderWidthMm ?? 25.4 / 96)) > 1e-6) style.borderWidthMm = parsedWidth;
      if ((normalizeSafeHex(borderColor) ?? borderColor).toLowerCase() !== (normalizeSafeHex(frame.borderColor ?? "#000000") ?? "#000000").toLowerCase()) style.borderColor = borderColor;
      if ((normalizeSafeHex(backgroundColor) ?? backgroundColor).toLowerCase() !== (normalizeSafeHex(frame.backgroundColor ?? "") ?? (frame.backgroundColor ?? "")).toLowerCase()) style.backgroundColor = backgroundColor;
      if (borderPattern !== effectiveBorderPattern(frame) || frame.borderPattern !== undefined) style.borderPattern = borderPattern;
      if (frame.backgroundHatch !== undefined) style.backgroundHatch = frame.backgroundHatch;
      const selection = { ...patch }; delete selection.locked; delete selection.dontPrint; delete selection.template; delete selection.runAround; onApply({ ...current, ...selection, ...style }); }} style={{ ...drag.style, position: "relative", boxSizing: "border-box", width: 352, height: 322, flex: "none", padding: 0, overflow: "hidden", border: "1px solid #252c33", background: "#b8dbfd", color: "#000", font: '11px QalamUITahoma, Tahoma, "Segoe UI", Arial, sans-serif', boxShadow: "0 2px 8px #555" }}>
    <div {...drag.handleProps} style={{ ...drag.handleProps.style, position: "absolute", left: 0, top: 0, right: 0, height: 29, boxSizing: "border-box", paddingLeft: 7, display: "flex", alignItems: "center", fontWeight: "normal", fontSize: 11, borderBottom: "1px solid #5d6c7a", background: "linear-gradient(#e9f5ff,#c6e2fc 70%,#b8dbfd)" }}>Modify Object</div>
    <button type="button" aria-label="Close" onClick={onCancel} style={{ position: "absolute", right: 3, top: 2, width: 43, height: 18, padding: 0, border: "1px solid #9e382d", borderRadius: "0 0 4px 4px", color: "white", font: 'bold 13px QalamUIArial, Arial, sans-serif', lineHeight: "15px", textShadow: "0 1px #6b1915", background: "linear-gradient(#f7a08f,#ce392c 55%,#a51d18)", zIndex: 2 }}>×</button>
    <div style={{ position: "absolute", left: 7, top: 29, width: 336, height: 284, boxSizing: "border-box", border: "1px solid #5d6c7a", background: "#f0f0f0" }}>
      {group(3, 6, 116, 126, "Bounds", <>
        {caption(6, 14, "Across[x]:")}{caption(6, 37, "Down[y]:")}{caption(6, 60, "Width:")}{caption(6, 83, "Height:")}{caption(6, 102, "Angle1:")}
        {fields.map(([key, label, data], i) => <label key={key} style={{ position: "absolute", left: 50, top: [14, 37, 60, 83][i], height: 20 }}><span className="sr-only">{label}</span><input ref={i === 0 ? firstField : undefined} aria-label={label} data-object-field={data} value={draft[key]} onChange={e => { const raw = e.target.value; setDraft(prev => ({ ...prev, [key]: raw })); setPatch(prev => ({ ...prev, [key]: parseGeometryLength(raw) })); }} style={{ ...control, width: 64 }} /></label>)}
        <input aria-label="Angle1" value={angle1} onChange={e => setAngle1(e.target.value)} style={{ ...control, position: "absolute", left: 50, top: 102, width: 64 }} /><span style={{ position: "absolute", left: 98, top: 102, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Angle1" onClick={() => setAngle1(formatDegrees((parseDegrees(angle1) || 0) + 1))} style={{ height: 10, padding: 0, lineHeight: "8px" }}>▲</button><button type="button" aria-label="Decrease Angle1" onClick={() => setAngle1(formatDegrees((parseDegrees(angle1) || 0) - 1))} style={{ height: 10, padding: 0, lineHeight: "8px" }}>▼</button></span>
      </>)}
      {group(123, 6, 122, 126, "Border", <>
        {caption(5, 14, "Color:")}{caption(5, 37, "Width:")}{caption(5, 60, "Pattern:")}
        <ObjectColorCombo ariaLabel="Border Color" value={borderColor} options={BORDER_COLOR_OPTIONS} onChange={setBorderColor} style={{ position: "absolute", left: 44, top: 14, width: 70, height: 20 }} />
        <input aria-label="Border Width" value={borderWidth} onChange={e => setBorderWidth(e.target.value)} style={{ ...control, position: "absolute", left: 44, top: 37, width: 52 }} />
        <span style={{ position: "absolute", left: 98, top: 37, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Border Width" onClick={() => setBorderWidth(formatBorderWidth(parseBorderWidth(borderWidth) + 25.4 / 288))} style={{height:10,padding:0,lineHeight:"8px"}}>▲</button><button type="button" aria-label="Decrease Border Width" onClick={() => setBorderWidth(formatBorderWidth(Math.max(0.01, parseBorderWidth(borderWidth) - 25.4 / 288)))} style={{height:10,padding:0,lineHeight:"8px"}}>▼</button></span>
        <ObjectPatternCombo ariaLabel="Border Pattern" value={borderPattern} onChange={setBorderPattern} style={{ position: "absolute", left: 44, top: 60, width: 70, height: 20 }} />
        <label style={{ position: "absolute", left: 5, top: 83 }}>{radio(borderPosition === "inside")}Inside<input type="radio" name="border-position" aria-label="Inside" checked={borderPosition === "inside"} onChange={() => setBorderPosition("inside")} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label><label style={{ position: "absolute", left: 58, top: 83 }}>{radio(borderPosition === "outside")}Outside<input type="radio" name="border-position" aria-label="Outside" checked={borderPosition === "outside"} onChange={() => setBorderPosition("outside")} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label>
        {caption(5, 102, "Roundness:")}<input aria-label="Roundness" value={roundness} onChange={e => setRoundness(e.target.value)} style={{ ...control, position: "absolute", left: 62, top: 102, width: 52 }} />
      </>)}
      {group(3, 139, 242, 99, "Picture", <>
        {group(3, 12, 113, 58, "Origin", <>{caption(4, 14, "Across:")}{caption(4, 34, "Down:")}<input aria-label="Origin Across" value={origin.x} onChange={e => setOrigin(v => ({ ...v, x: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 14, width: 62 }} /><input aria-label="Origin Down" value={origin.y} onChange={e => setOrigin(v => ({ ...v, y: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 34, width: 62 }} /></>)}
        {group(120, 12, 119, 58, "Scaling", <>{caption(4, 14, "Across:")}{caption(4, 34, "Down:")}<input aria-label="Scaling Across" value={scale.x} onChange={e => setScale(v => ({ ...v, x: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 14, width: 58 }} /><input aria-label="Scaling Down" value={scale.y} onChange={e => setScale(v => ({ ...v, y: e.target.value }))} style={{ ...control, position: "absolute", left: 45, top: 34, width: 58 }} /><span style={{ position: "absolute", left: 103, top: 14, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Scaling Across" onClick={() => setScale(v => ({ ...v, x: formatScalePercent((Number.isFinite(parseScalePercent(v.x)) ? parseScalePercent(v.x) : initialScale.x) + 1) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▲</button><button type="button" aria-label="Decrease Scaling Across" onClick={() => setScale(v => ({ ...v, x: formatScalePercent(Math.max(0.01, (Number.isFinite(parseScalePercent(v.x)) ? parseScalePercent(v.x) : initialScale.x) - 1)) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▼</button></span><span style={{ position: "absolute", left: 103, top: 34, width: 16, height: 20, display: "flex", flexDirection: "column" }}><button type="button" aria-label="Increase Scaling Down" onClick={() => setScale(v => ({ ...v, y: formatScalePercent((Number.isFinite(parseScalePercent(v.y)) ? parseScalePercent(v.y) : initialScale.y) + 1) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▲</button><button type="button" aria-label="Decrease Scaling Down" onClick={() => setScale(v => ({ ...v, y: formatScalePercent(Math.max(0.01, (Number.isFinite(parseScalePercent(v.y)) ? parseScalePercent(v.y) : initialScale.y) - 1)) }))} style={{height:10,padding:0,lineHeight:"8px"}}>▼</button></span></>)}
        {caption(4, 76, "Angle2:")}<input aria-label="Angle2" value={angle2} onChange={e => setAngle2(e.target.value)} style={{ ...control, position: "absolute", left: 45, top: 76, width: 62 }} /><label style={{ position: "absolute", left: 121, top: 76, whiteSpace: "nowrap" }}>{checkbox()}White Transparent(q)<input type="checkbox" aria-label="Not supported" {...unsupported} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label>
      </>)}
      {group(3, 245, 242, 35, "Background", <>{caption(5, 13, "Color(z):")}<ObjectColorCombo ariaLabel="Background Color" value={backgroundColor} options={BACKGROUND_COLOR_OPTIONS} onChange={setBackgroundColor} style={{ position: "absolute", left: 47, top: 13, width: 74, height: 20 }} />{caption(126, 13, "Hatch:")}<select aria-label="Background Hatch" defaultValue="none" style={{ ...control, position: "absolute", left: 164, top: 13, width: 72, height: 20 }}><option value="none">None</option></select></>)}
      <div data-object-shape-group="true" style={{ position: "absolute", left: 250, top: 140, width: 83, height: 65, boxSizing: "border-box", border: "1px solid #a0a0a0", boxShadow: "inset 0 1px #fff" }}><span style={{ position: "absolute", left: 7, top: -6, padding: "0 3px", lineHeight: "12px", background: "#f0f0f0", whiteSpace: "nowrap" }}>Shape</span>{kinds.map(([kind, label, short], i) => <label key={kind} style={{ position: "absolute", left: 4, top: 17 + i * 16, width: 77, maxWidth: 77, height: 10, display: "flex", alignItems: "center", whiteSpace: "nowrap", cursor: "default" }}>{radio(preview.kind === kind)}{short}<input type="radio" name="object-shape" aria-label={label} checked={preview.kind === kind} onChange={() => setPatch(prev => ({ ...prev, kind }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} /></label>)}</div>
      {caption(250, 115, "Number:", 19)}<input data-object-number-field="true" aria-label="Not supported" {...unsupported} value="" readOnly style={{ ...control, position: "absolute", left: 295, top: 115, width: 38, height: 19, textAlign: "left", lineHeight: "17px" }} />
      <button type="submit" style={{ ...classicButton, position: "absolute", left: 257, top: 7, width: 75, height: 22, outline: "1px solid #59636b", outlineOffset: 1 }}>OK</button>
      <button type="button" onClick={onCancel} style={{ ...classicButton, position: "absolute", left: 257, top: 34, width: 75, height: 22 }}>Cancel</button>
      <button type="button" onClick={() => setHelpOpen(true)} style={{ ...classicButton, position: "absolute", left: 257, top: 60, width: 75, height: 22 }}>Help</button>
      <label
        title={runAroundSupported ? undefined : "Run Around is only supported for unrotated rectangular objects"}
        style={{ position: "absolute", left: 250, top: 213, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap", color: runAroundSupported ? "#000" : "#808080", opacity: runAroundSupported ? 1 : 0.75 }}
      >
        <input
          aria-label="Run Around"
          type="checkbox"
          checked={runAroundChecked}
          disabled={!runAroundSupported}
          readOnly={!runAroundSupported}
          onChange={(e) => {
            if (!runAroundSupported) return;
            setPatch((v) => ({ ...v, runAround: e.target.checked }));
          }}
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        />
        {checkbox(runAroundChecked)}
        Run Around
      </label>
      <label style={{ position: "absolute", left: 250, top: 230, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input aria-label="Template" type="checkbox" checked={patch.template ?? frame.template ?? false} onChange={e => setPatch(v => ({ ...v, template: e.target.checked }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(patch.template ?? frame.template ?? false)}Template</label>
      <label style={{ position: "absolute", left: 250, top: 246, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input aria-label="Lock" type="checkbox" checked={patch.locked ?? frame.locked ?? false} onChange={e => setPatch(v => ({ ...v, locked: e.target.checked }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(patch.locked ?? frame.locked ?? false)}Lock</label>
      <label style={{ position: "absolute", left: 250, top: 262, height: 13, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}><input aria-label="Don't Print" type="checkbox" checked={patch.dontPrint ?? frame.dontPrint ?? false} onChange={e => setPatch(v => ({ ...v, dontPrint: e.target.checked }))} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />{checkbox(patch.dontPrint ?? frame.dontPrint ?? false)}Don't Print</label>
    </div>
    {helpOpen ? <div role="dialog" aria-label="Format Object help" style={{ position: "absolute", left: 7, top: 29, zIndex: 5, boxSizing: "border-box", width: 336, height: 284, overflow: "auto", padding: 10, border: "1px solid #5d6c7a", background: "#fff", color: "#111", font: '12px QalamUITahoma, Tahoma, "Segoe UI", Arial, sans-serif' }}><button type="button" aria-label="Close help" onClick={() => setHelpOpen(false)} style={{ ...classicButton, position: "sticky", float: "right", top: 0, width: 55, height: 22 }}>Close</button><h2 style={{ margin: "0 0 8px", fontSize: 14 }}>Format Object</h2><p><strong>Bounds:</strong> Across/Down contain the object Origin; change them to move the object. Width and Height resize it.</p><p><strong>Picture Origin and Scaling:</strong> Origin sets the picture’s left/top position. Scaling changes picture width and height by percentage.</p><p><strong>Border:</strong> Set color, width and pattern. Inside borders reduce the available text/picture bounds; Outside keeps those bounds constant.</p><p><strong>Template:</strong> “You can mark an object as a template object, in which case, when you drag the object then a copy of the template object is peeled off.”</p><p><strong>Lock:</strong> A locked object cannot be deleted or modified with the mouse; unlock it first.</p><p><strong>Don’t Print:</strong> Check this to disable printing for the selected objects.</p><p><strong>Runaround:</strong> The help describes enabling runaround for selected objects and setting distances along the four sides in the Runaround dialog.</p><p style={{ fontSize: 10, color: "#555" }}>Source: Official InPage Help, Menu Format:Object.</p></div> : null}
  </form></div>, studioOverlayRoot());
}

const classicButton: CSSProperties = {
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: "normal",
  border: "1px solid #70777d",
  borderTopColor: "#fff",
  borderLeftColor: "#fff",
  borderRadius: 0,
  background: "#efefef",
  color: "#111",
  font: RIBBON_FONT,
  boxShadow: "inset -1px -1px #b5b5b5",
  textAlign: "center",
};
