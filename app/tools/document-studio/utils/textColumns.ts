import { normalizeSafeHex } from "./studioColors";
import { isFrameBorderPattern, type FrameBorderPattern, frameBorderVisible, frameBorderWidthMm, LEGACY_BORDER_MM } from "./frameBorder";

export const TEXT_COLUMN_MAX = 16;
/** Editor text frames already pad 2px. That length is the inset when the user has not set one. */
export const DEFAULT_TEXT_INSET_MM = 2 * 25.4 / 96;
export const DEFAULT_TEXT_INSET_MM_TEXT = "0.5291666667";
const PX_PER_MM = 96 / 25.4;

export type ColumnDirection = "ltr" | "rtl";
export type TextShape = "rect" | "ellipse";

export interface TextColumnFrame {
  wMm: number;
  hMm: number;
  singleLine?: boolean;
  columnCount?: number;
  columnGutterMm?: number;
  columnDirection?: ColumnDirection;
  columnRuleColor?: string;
  columnRuleSizeMm?: number;
  columnRulePattern?: FrameBorderPattern;
  insetMm?: number;
  borderColor?: string;
  borderWidthMm?: number;
  borderPattern?: FrameBorderPattern;
  borderPosition?: "inside" | "outside";
  backgroundColor?: string;
  textShape?: TextShape;
}

export interface TextColumnBox {
  /** 0 is the first column filled. */
  order: number;
  /** Left edge inside the content box, millimetres. */
  xMm: number;
  widthMm: number;
}

export interface TextColumnMeasure {
  count: number;
  gutterMm: number;
  direction: ColumnDirection;
  insetMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  columnWidthMm: number;
  columns: TextColumnBox[];
  rule: null | {
    color: string;
    sizeMm: number;
    pattern: Exclude<FrameBorderPattern, "none">;
    gaps: Array<{ xMm: number }>;
  };
}

export function formatInsetMm(mm: number): string {
  if (Math.abs(mm - DEFAULT_TEXT_INSET_MM) < 1e-12) return DEFAULT_TEXT_INSET_MM_TEXT;
  return String(Math.round(mm * 1e8) / 1e8);
}

export function resolvedInsetMm(frame: { insetMm?: number }): number {
  return frame.insetMm ?? DEFAULT_TEXT_INSET_MM;
}

export function resolvedColumnCount(frame: { singleLine?: boolean; columnCount?: number }): number {
  if (frame.singleLine) return 1;
  const count = frame.columnCount;
  return count === undefined ? 1 : count;
}

export function resolvedColumnDirection(frame: { columnDirection?: ColumnDirection }): ColumnDirection {
  return frame.columnDirection ?? "rtl";
}

export function validTextColumnFields(frame: {
  columnCount?: unknown;
  columnGutterMm?: unknown;
  columnDirection?: unknown;
  columnRuleColor?: unknown;
  columnRuleSizeMm?: unknown;
  columnRulePattern?: unknown;
  insetMm?: unknown;
  textShape?: unknown;
  borderPattern?: unknown;
}): boolean {
  if (frame.columnCount !== undefined && !(Number.isInteger(frame.columnCount) && (frame.columnCount as number) >= 1 && (frame.columnCount as number) <= TEXT_COLUMN_MAX)) return false;
  if (frame.columnGutterMm !== undefined && !(typeof frame.columnGutterMm === "number" && Number.isFinite(frame.columnGutterMm) && frame.columnGutterMm >= 0 && frame.columnGutterMm <= 500)) return false;
  if (frame.columnDirection !== undefined && frame.columnDirection !== "ltr" && frame.columnDirection !== "rtl") return false;
  if (frame.columnRuleColor !== undefined && !normalizeSafeHex(String(frame.columnRuleColor))) return false;
  if (frame.columnRuleSizeMm !== undefined && !(typeof frame.columnRuleSizeMm === "number" && Number.isFinite(frame.columnRuleSizeMm) && frame.columnRuleSizeMm > 0 && frame.columnRuleSizeMm <= 50)) return false;
  if (frame.columnRulePattern !== undefined && !isFrameBorderPattern(frame.columnRulePattern)) return false;
  if (frame.insetMm !== undefined && !(typeof frame.insetMm === "number" && Number.isFinite(frame.insetMm) && frame.insetMm >= 0 && frame.insetMm <= 500)) return false;
  if (frame.textShape !== undefined && frame.textShape !== "rect" && frame.textShape !== "ellipse") return false;
  if (frame.borderPattern !== undefined && !isFrameBorderPattern(frame.borderPattern)) return false;
  return true;
}

/** Column boxes inside the border and inset. Single-line frames stay one column with no gutter and no rule. */
export function measureTextColumns(frame: TextColumnFrame): TextColumnMeasure {
  const count = resolvedColumnCount(frame);
  const gutterMm = frame.singleLine || count <= 1 ? 0 : Math.max(0, frame.columnGutterMm ?? 0);
  const direction = resolvedColumnDirection(frame);
  const insetMm = resolvedInsetMm(frame);
  const borderMm = frameBorderVisible(frame) && frame.borderPosition !== "outside" ? frameBorderWidthMm(frame) : 0;
  const contentWidthMm = Math.max(0, frame.wMm - 2 * borderMm - 2 * insetMm);
  const contentHeightMm = Math.max(0, frame.hMm - 2 * borderMm - 2 * insetMm);
  const rawWidth = count <= 1 ? contentWidthMm : (contentWidthMm - gutterMm * (count - 1)) / count;
  const columnWidthMm = Number.isFinite(rawWidth) ? Math.max(0, rawWidth) : 0;
  const columns = Array.from({ length: count }, (_, order) => {
    const slot = direction === "rtl" ? count - 1 - order : order;
    return { order, xMm: slot * (columnWidthMm + gutterMm), widthMm: columnWidthMm };
  });
  const pattern = frame.columnRulePattern ?? "none";
  const rule = !frame.singleLine && count > 1 && pattern !== "none" && isFrameBorderPattern(pattern)
    ? {
        color: frame.columnRuleColor ?? "#000000",
        sizeMm: frame.columnRuleSizeMm ?? 25.4 / 72,
        pattern,
        gaps: Array.from({ length: count - 1 }, (_, index) => ({
          xMm: (index + 1) * columnWidthMm + index * gutterMm + gutterMm / 2,
        })),
      }
    : null;
  return { count, gutterMm, direction, insetMm, contentWidthMm, contentHeightMm, columnWidthMm, columns, rule };
}

export function textColumnCss(frame: TextColumnFrame): string {
  const measured = measureTextColumns(frame);
  if (frame.singleLine || measured.count <= 1) return "";
  const rule = measured.rule ? `column-rule:${formatInsetMm(measured.rule.sizeMm)}mm ${measured.rule.pattern} ${measured.rule.color};` : "";
  return `column-count:${measured.count};column-gap:${formatInsetMm(measured.gutterMm)}mm;column-fill:auto;direction:${measured.direction};${rule}`;
}

/** Screen chrome. The default guide is the existing 1px black edge and is not a stored border. */
export function textScreenChrome(frame: Partial<TextColumnFrame>): {
  border: string;
  outline?: string;
  background?: string;
  paddingPx: number;
  radius?: string;
  guide: boolean;
} {
  const paddingPx = frame.insetMm === undefined ? 2 : frame.insetMm * PX_PER_MM;
  const radius = frame.textShape === "ellipse" ? "50%" : undefined;
  const background = frame.backgroundColor || undefined;
  if (!frameBorderVisible(frame)) return { border: "1px solid #000", paddingPx, radius, background, guide: true };
  const pattern = frame.borderPattern && frame.borderPattern !== "none" ? frame.borderPattern : "solid";
  const color = frame.borderColor ?? "#000";
  if (frame.borderPosition === "outside") {
    const width = frame.borderWidthMm ?? LEGACY_BORDER_MM;
    return { border: "1px solid transparent", outline: `${width}mm ${pattern} ${color}`, paddingPx, radius, background, guide: false };
  }
  if (frame.borderWidthMm === undefined) return { border: `1px ${pattern} ${color}`, paddingPx, radius, background, guide: false };
  return { border: `${frame.borderWidthMm}mm ${pattern} ${color}`, paddingPx, radius, background, guide: false };
}

export function textColumnFlowStyle(frame: Partial<TextColumnFrame>): {
  columnCount: number;
  columnGap: string;
  columnFill: "auto";
  direction: ColumnDirection;
  columnRule?: string;
} | null {
  if (frame.singleLine || resolvedColumnCount(frame) <= 1) return null;
  const measured = measureTextColumns({ wMm: frame.wMm ?? 0, hMm: frame.hMm ?? 0, ...frame });
  return {
    columnCount: measured.count,
    columnGap: `${measured.gutterMm}mm`,
    columnFill: "auto",
    direction: measured.direction,
    ...(measured.rule ? { columnRule: `${measured.rule.sizeMm}mm ${measured.rule.pattern} ${measured.rule.color}` } : {}),
  };
}
