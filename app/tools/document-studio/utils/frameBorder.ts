/** Shared picture/text border. Absent settings mean None: a screen guide may show, and print stays unbordered. */

export const FRAME_BORDER_PATTERNS = ["none", "solid", "dashed", "dotted", "double"] as const;
export type FrameBorderPattern = (typeof FRAME_BORDER_PATTERNS)[number];

/** 1 CSS px at 96dpi. Color-only borders keep this width until the user sets one. */
export const LEGACY_BORDER_MM = 25.4 / 96;
export const LEGACY_BORDER_MM_TEXT = "0.2645833333";

export function isFrameBorderPattern(value: unknown): value is FrameBorderPattern {
  return typeof value === "string" && (FRAME_BORDER_PATTERNS as readonly string[]).includes(value);
}

export function formatBorderMm(mm: number): string {
  if (Math.abs(mm - LEGACY_BORDER_MM) < 1e-12) return LEGACY_BORDER_MM_TEXT;
  const rounded = Math.round(mm * 1e10) / 1e10;
  return String(rounded);
}

type BorderFrame = {
  borderColor?: string;
  borderWidthMm?: number;
  borderPattern?: string;
  borderPosition?: string;
};

/** A border the user stored. Pattern None wins. Color, width, placement, or a drawn pattern turns it on. */
export function frameBorderVisible(frame: BorderFrame): boolean {
  if (frame.borderPattern === "none") return false;
  if (frame.borderPattern && frame.borderPattern !== "none") return true;
  return frame.borderColor !== undefined || frame.borderWidthMm !== undefined || frame.borderPosition !== undefined;
}

export function frameBorderWidthMm(frame: BorderFrame): number {
  return frame.borderWidthMm ?? LEGACY_BORDER_MM;
}

export function frameBorderPattern(frame: BorderFrame): Exclude<FrameBorderPattern, "none"> {
  const pattern = frame.borderPattern;
  if (isFrameBorderPattern(pattern) && pattern !== "none") return pattern;
  return "solid";
}

/** CSS border (inside, eats the content box) or outline (outside, bounds stay put). Empty when None. */
export function frameBorderCss(frame: BorderFrame): string {
  if (!frameBorderVisible(frame)) return "";
  const width = formatBorderMm(frameBorderWidthMm(frame));
  const pattern = frameBorderPattern(frame);
  const color = frame.borderColor ?? "#000";
  if (frame.borderPosition === "outside") return `outline:${width}mm ${pattern} ${color};outline-offset:0;`;
  return `border:${width}mm ${pattern} ${color};`;
}

/** SVG presentation attributes. Empty when the frame has no user border. */
export function svgStrokeAttributes(frame: BorderFrame): string {
  if (!frameBorderVisible(frame)) return "";
  const color = (frame.borderColor ?? "#000").replace(/[&<>"']/g, "");
  const widthMm = frameBorderWidthMm(frame);
  const width = formatBorderMm(widthMm);
  const pattern = frameBorderPattern(frame);
  let dash = "";
  if (pattern === "dashed") dash = ` stroke-dasharray="${formatBorderMm(widthMm * 3)} ${formatBorderMm(widthMm * 1.6)}"`;
  else if (pattern === "dotted") dash = ` stroke-dasharray="${formatBorderMm(Math.max(widthMm * 0.5, 0.15))} ${formatBorderMm(widthMm * 1.5)}" stroke-linecap="round"`;
  else if (pattern === "double") dash = ` data-stroke-style="double"`;
  return `fill="none" stroke="${color}" stroke-width="${width}"${dash}`;
}
