import { isPictureBox, type FrameKind, type StudioFrame } from "../components/StudioObjectLayer";
import { normalizeSafeHex } from "./studioColors";
import { PRINT_FRAME_LIMITS } from "./printableFrames";
import { isValidBorderPattern, type BorderPatternId } from "./borderPatterns";
import { validRunAroundFields } from "./runAround";
import { isRectangularRunAroundBox } from "./runAroundFlow";

export const DEFAULT_INPAGE_BORDER_WIDTH_MM = 25.4 / 72;
export const STUDIO_PX_PER_MM = 96 / 25.4;

export function pictureReferenceSizeMm(
  frame: Pick<StudioFrame, "wMm" | "hMm" | "imageNaturalW" | "imageNaturalH">,
): { wMm: number; hMm: number } {
  if (
    typeof frame.imageNaturalW === "number" && Number.isFinite(frame.imageNaturalW) && frame.imageNaturalW > 0 &&
    typeof frame.imageNaturalH === "number" && Number.isFinite(frame.imageNaturalH) && frame.imageNaturalH > 0
  ) {
    return {
      wMm: frame.imageNaturalW / STUDIO_PX_PER_MM,
      hMm: frame.imageNaturalH / STUDIO_PX_PER_MM,
    };
  }
  return {
    wMm: Math.max(0.1, frame.wMm),
    hMm: Math.max(0.1, frame.hMm),
  };
}

export function pictureScalePercent(
  frame: Pick<StudioFrame, "wMm" | "hMm" | "imageWMm" | "imageHMm" | "imageNaturalW" | "imageNaturalH">,
): { x: number; y: number } {
  const ref = pictureReferenceSizeMm(frame);
  const effectiveW = frame.imageWMm ?? frame.wMm;
  const effectiveH = frame.imageHMm ?? frame.hMm;
  return {
    x: ref.wMm > 0 ? (effectiveW / ref.wMm) * 100 : 100,
    y: ref.hMm > 0 ? (effectiveH / ref.hMm) * 100 : 100,
  };
}

export function formatScalePercent(value: number): string {
  if (!Number.isFinite(value)) return "100%";
  const rounded = Math.round(value * 100) / 100;
  return `${Number(rounded.toFixed(2))}%`;
}

export function parseScalePercent(raw: string): number {
  const match = raw.trim().match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))\s*%?$/);
  return match ? Number(match[1]) : Number.NaN;
}

export function pictureDimensionMmFromScale(scalePct: number, refMm: number): number {
  return Number.isFinite(scalePct) && scalePct > 0 && Number.isFinite(refMm) && refMm > 0
    ? (scalePct / 100) * refMm
    : refMm;
}

export type ObjectGeometryPatch = Partial<Pick<StudioFrame, "xMm" | "yMm" | "wMm" | "hMm" | "kind" | "borderColor" | "borderWidthMm" | "borderPattern" | "backgroundColor" | "backgroundHatch" | "imageXMm" | "imageYMm" | "imageWMm" | "imageHMm" | "locked" | "dontPrint" | "template" | "roundnessMm" | "angle1Deg" | "angle2Deg" | "borderPosition" | "runAround" | "runAroundLeftMm" | "runAroundRightMm" | "runAroundTopMm" | "runAroundBottomMm">>;
const pictureKinds: readonly FrameKind[] = ["picture-rect", "picture-round-rect", "picture-ellipse"];
const shapeKinds: readonly FrameKind[] = ["rect", "round-rect", "ellipse"];

export type ShapeVariant = "rect" | "ellipse" | "round-rect";

export function shapeVariantOf(kind: FrameKind): ShapeVariant | null {
  if (kind === "picture-rect" || kind === "rect") return "rect";
  if (kind === "picture-ellipse" || kind === "ellipse") return "ellipse";
  if (kind === "picture-round-rect" || kind === "round-rect") return "round-rect";
  return null;
}

export function frameKindForShape(current: FrameKind, variant: ShapeVariant): FrameKind | null {
  if (isPictureBox(current)) {
    return variant === "rect" ? "picture-rect" : variant === "ellipse" ? "picture-ellipse" : "picture-round-rect";
  }
  if (shapeKinds.includes(current)) {
    return variant;
  }
  return null;
}

export function parseGeometryLength(raw: string): number {
  const value = raw.trim();
  if (!value) return Number.NaN;
  const match = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:mm)?$/i);
  if (!match) return Number.NaN;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function parseDegrees(raw: string): number {
  const match = raw.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*°?$/);
  return match && Number.isFinite(Number(match[1])) ? Number(match[1]) : Number.NaN;
}
export function formatDegrees(value: number): string { return `${Number.isFinite(value) ? Number(value.toFixed(6)) : 0}°`; }

export function parseBorderWidth(raw: string): number {
  const value = raw.trim();
  const match = value.match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))\s*(pt|mm)?$/i);
  if (!match) return Number.NaN;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return Number.NaN;
  return match[2]?.toLowerCase() === "mm" ? amount : amount * 25.4 / 72;
}

export function formatBorderWidth(mm: number): string {
  if (!Number.isFinite(mm)) return "";
  const points = (mm * 72) / 25.4;
  const quarterPoints = Math.round(points * 4) / 4;
  if (quarterPoints >= 0.25 && quarterPoints <= 120 && Math.abs(points - quarterPoints) < 0.01) {
    return `${Number(quarterPoints.toFixed(2))}pt`;
  }
  return `${mm.toFixed(2)}mm`;
}

export function formatGeometryLength(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)}mm` : "";
}

export function applyObjectGeometry(frame: StudioFrame, patch: ObjectGeometryPatch): StudioFrame | null {
  for (const key of ["xMm", "yMm", "wMm", "hMm"] as const) {
    const value = patch[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || ((key === "wMm" || key === "hMm") && value < 1))) return null;
  }
  for (const key of ["imageXMm", "imageYMm", "imageWMm", "imageHMm", "roundnessMm"] as const) {
    const value = patch[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || ((key === "imageWMm" || key === "imageHMm") && value <= 0) || (key === "roundnessMm" && (value < 0 || value > PRINT_FRAME_LIMITS.mm)))) return null;
  }
  for (const key of ["angle1Deg", "angle2Deg"] as const) {
    const value = patch[key];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < -3600 || value > 3600)) return null;
  }
  if (patch.borderPosition !== undefined && patch.borderPosition !== "inside" && patch.borderPosition !== "outside") return null;
  if (patch.locked !== undefined && typeof patch.locked !== "boolean") return null;
  if (patch.dontPrint !== undefined && typeof patch.dontPrint !== "boolean") return null;
  if (patch.template !== undefined && typeof patch.template !== "boolean") return null;
  if (!validRunAroundFields(patch)) return null;
  const candidate = {
    kind: patch.kind ?? frame.kind,
    angle1Deg: patch.angle1Deg ?? frame.angle1Deg,
  };
  if (patch.runAround === true && !isRectangularRunAroundBox(candidate)) return null;
  if (
    patch.kind !== undefined &&
    !(
      (isPictureBox(frame.kind) && pictureKinds.includes(patch.kind)) ||
      (shapeKinds.includes(frame.kind) && shapeKinds.includes(patch.kind))
    )
  ) return null;
  if (patch.borderColor !== undefined && !normalizeSafeHex(patch.borderColor)) return null;
  if (patch.backgroundColor !== undefined && patch.backgroundColor !== "" && !normalizeSafeHex(patch.backgroundColor)) return null;
  if (patch.borderWidthMm !== undefined && (typeof patch.borderWidthMm !== "number" || !Number.isFinite(patch.borderWidthMm) || patch.borderWidthMm <= 0 || patch.borderWidthMm > PRINT_FRAME_LIMITS.mm)) return null;
  if (patch.borderPattern !== undefined && !isValidBorderPattern(patch.borderPattern)) return null;
  if (patch.backgroundHatch !== undefined && patch.backgroundHatch !== "none") return null;
  const next: StudioFrame = { ...frame, ...patch, ...(patch.borderColor !== undefined ? { borderColor: normalizeSafeHex(patch.borderColor)! } : {}) };
  if (patch.runAround === undefined && frame.runAround === true && !isRectangularRunAroundBox(candidate)) {
    next.runAround = false;
  }
  if (patch.backgroundColor !== undefined) {
    if (patch.backgroundColor === "") delete next.backgroundColor;
    else next.backgroundColor = normalizeSafeHex(patch.backgroundColor)!;
  }
  return next;
}

export type PictureToolDefaults = {
  borderColor: string;
  borderWidthMm: number;
  borderPattern: BorderPatternId;
  borderPosition: "inside" | "outside";
  backgroundColor: string;
  backgroundHatch: "none";
  roundnessMm: number;
  angle1Deg: number;
};

export const DEFAULT_PICTURE_TOOL_DEFAULTS: PictureToolDefaults = {
  borderColor: "#000000",
  borderWidthMm: DEFAULT_INPAGE_BORDER_WIDTH_MM,
  borderPattern: "none",
  borderPosition: "inside",
  backgroundColor: "#FFFFFF",
  backgroundHatch: "none",
  roundnessMm: 6.35,
  angle1Deg: 0,
};

export function applyPictureToolDefaultsPatch(
  current: PictureToolDefaults,
  patch: ObjectGeometryPatch,
): PictureToolDefaults | null {
  const synthetic: StudioFrame = {
    id: "__picture-tool-defaults__",
    kind: "picture-rect",
    page: 1,
    xMm: 0,
    yMm: 0,
    wMm: 10,
    hMm: 10,
    flip: false,
    text: "",
    borderColor: current.borderColor,
    borderWidthMm: current.borderWidthMm,
    borderPattern: current.borderPattern,
    borderPosition: current.borderPosition,
    ...(current.backgroundColor ? { backgroundColor: current.backgroundColor } : {}),
    backgroundHatch: current.backgroundHatch,
    roundnessMm: current.roundnessMm,
    angle1Deg: current.angle1Deg,
  };
  const updated = applyObjectGeometry(synthetic, patch);
  if (!updated) return null;
  return {
    borderColor: updated.borderColor ?? current.borderColor,
    borderWidthMm: updated.borderWidthMm ?? current.borderWidthMm,
    borderPattern: updated.borderPattern ?? current.borderPattern,
    borderPosition: updated.borderPosition ?? current.borderPosition,
    backgroundColor: updated.backgroundColor ?? "",
    backgroundHatch: updated.backgroundHatch ?? "none",
    roundnessMm: updated.roundnessMm ?? current.roundnessMm,
    angle1Deg: updated.angle1Deg ?? current.angle1Deg,
  };
}
