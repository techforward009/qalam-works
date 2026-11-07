import { isPictureBox, type FrameKind, type StudioFrame } from "../components/StudioObjectLayer";
import { normalizeSafeHex } from "./studioColors";
import { PRINT_FRAME_LIMITS } from "./printableFrames";

export type ObjectGeometryPatch = Partial<Pick<StudioFrame, "xMm" | "yMm" | "wMm" | "hMm" | "kind" | "borderColor" | "borderWidthMm" | "borderPattern" | "backgroundColor" | "backgroundHatch" | "imageXMm" | "imageYMm" | "imageWMm" | "imageHMm" | "locked" | "dontPrint" | "template" | "roundnessMm" | "angle1Deg" | "angle2Deg" | "borderPosition">>;
const pictureKinds: readonly FrameKind[] = ["picture-rect", "picture-round-rect", "picture-ellipse"];

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
  const legacy = 25.4 / 96;
  if (Math.abs(mm - legacy) < 0.005) return "0.75pt";
  const points = mm * 72 / 25.4;
  const rounded = Math.round(points);
  if (rounded >= 1 && rounded <= 12 && Math.abs(points - rounded) < 0.005) return `${rounded}pt`;
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
  if (patch.kind !== undefined && (!isPictureBox(frame.kind) || !pictureKinds.includes(patch.kind))) return null;
  if (patch.borderColor !== undefined && !normalizeSafeHex(patch.borderColor)) return null;
  if (patch.backgroundColor !== undefined && patch.backgroundColor !== "" && !normalizeSafeHex(patch.backgroundColor)) return null;
  if (patch.borderWidthMm !== undefined && (typeof patch.borderWidthMm !== "number" || !Number.isFinite(patch.borderWidthMm) || patch.borderWidthMm <= 0 || patch.borderWidthMm > PRINT_FRAME_LIMITS.mm)) return null;
  if (patch.borderPattern !== undefined && patch.borderPattern !== "none") return null;
  if (patch.backgroundHatch !== undefined && patch.backgroundHatch !== "none") return null;
  const next: StudioFrame = { ...frame, ...patch, ...(patch.borderColor !== undefined ? { borderColor: normalizeSafeHex(patch.borderColor)! } : {}) };
  if (patch.backgroundColor !== undefined) {
    if (patch.backgroundColor === "") delete next.backgroundColor;
    else next.backgroundColor = normalizeSafeHex(patch.backgroundColor)!;
  }
  return next;
}
