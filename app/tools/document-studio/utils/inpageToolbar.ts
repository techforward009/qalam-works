import { FONT_SIZE_MAX_PT, FONT_SIZE_MIN_PT } from "./documentSettings";

/** InPage 3 size list. Custom values outside this list stay valid. */
export const TOOLBAR_FONT_SIZE_PRESETS = [10, 12, 14, 18, 24, 36, 48, 60, 72] as const;

const PT_PER_IN = 72;
const PT_PER_CM = 72 / 2.54;
const PT_PER_MM = 72 / 25.4;

export type FontSizeCommit =
  | { ok: true; pt: number; label: string }
  | { ok: false; message: string };

export function formatToolbarFontSize(pt: number): string {
  const rounded = Math.round(pt * 10) / 10;
  return `${rounded}pt`;
}

/** Accept 13.5, 13.5pt, and mm/cm/in. Blank and junk are invalid, not zero. */
export function parseToolbarFontSize(raw: string): FontSizeCommit {
  const text = raw.trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(pt|mm|cm|in)?$/i);
  if (!match) return { ok: false, message: "Value not typed properly." };
  const amount = parseFloat(match[1]);
  const unit = (match[2] ?? "pt").toLowerCase();
  const pt = unit === "in" ? amount * PT_PER_IN : unit === "cm" ? amount * PT_PER_CM : unit === "mm" ? amount * PT_PER_MM : amount;
  const rounded = Math.round(pt * 10) / 10;
  if (!Number.isFinite(rounded) || rounded < FONT_SIZE_MIN_PT || rounded > FONT_SIZE_MAX_PT) {
    return { ok: false, message: `Value out of range. Minimum allowed is ${FONT_SIZE_MIN_PT} and Maximum allowed is ${FONT_SIZE_MAX_PT}.` };
  }
  return { ok: true, pt: rounded, label: formatToolbarFontSize(rounded) };
}

export const INPAGE_TEXT_COLOURS = [
  { label: "White", hex: "#FFFFFF" },
  { label: "Black", hex: "#000000" },
  { label: "Gray", hex: "#808080" },
  { label: "Red", hex: "#FF0000" },
  { label: "Yellow", hex: "#FFFF00" },
  { label: "Green", hex: "#00FF00" },
  { label: "Cyan", hex: "#00FFFF" },
  { label: "Blue", hex: "#0000FF" },
  { label: "Magenta", hex: "#FF00FF" },
] as const;

export const TEXT_EFFECTS = ["none", "single", "double", "overline", "box", "pattern", "reverse"] as const;
export type TextEffect = (typeof TEXT_EFFECTS)[number];
export const TEXT_EFFECT_LABELS: Record<TextEffect, string> = {
  none: "None",
  single: "Single",
  double: "Double",
  overline: "Overline",
  box: "Box",
  pattern: "Pattern",
  reverse: "Reverse",
};

export function textEffectDeclarations(effect: unknown): string {
  switch (effect) {
    case "single": return "text-decoration-line:underline;text-decoration-style:solid;";
    case "double": return "text-decoration-line:underline;text-decoration-style:double;";
    case "overline": return "text-decoration-line:overline;text-decoration-style:solid;";
    case "box": return "border:0.6pt solid currentColor;padding:0 0.5px;";
    case "pattern": return "background-image:repeating-linear-gradient(135deg,rgba(0,0,0,.12) 0 1px,transparent 1px 4px);";
    case "reverse": return "color:#fff;background-color:#000;";
    default: return "";
  }
}

export function textOutlineDeclarations(on: unknown): string {
  return on === true || on === "true" ? "-webkit-text-stroke:0.6pt currentColor;-webkit-text-fill-color:transparent;" : "";
}

/** Letters that do not join onward, so a tatweel after them is illegal. */
const NO_KASHIDA_AFTER = new Set(["ا", "أ", "إ", "آ", "د", "ذ", "ر", "ز", "و", "ؤ", "ء", "ة", "ى", "ی"]);

export function kashidaSlots(text: string): number[] {
  const chars = [...text];
  const slots: number[] = [];
  for (let index = 0; index < chars.length - 1; index += 1) {
    const current = chars[index];
    const next = chars[index + 1];
    if (current === "\u0640" || next === "\u0640" || /\s/u.test(next)) continue;
    if (!/\p{Script=Arabic}/u.test(current) || !/\p{Script=Arabic}/u.test(next)) continue;
    if (NO_KASHIDA_AFTER.has(current)) continue;
    slots.push(index + 1);
  }
  return slots;
}

/** Insert tatweel at cursive joins. Returns the original string when Urdu cannot elongate. */
export function insertKashida(text: string, count: number): string {
  if (count <= 0) return text;
  const slots = kashidaSlots(text);
  if (!slots.length) return text;
  const chars = [...text];
  const extra = slots.map(() => 0);
  for (let index = 0; index < count; index += 1) extra[index % slots.length] += 1;
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if (extra[index] > 0) chars.splice(slots[index], 0, "\u0640".repeat(extra[index]));
  }
  return chars.join("");
}

export function mapToolbarLanguage(value: unknown): "ur" | "en" {
  return value === "en" ? "en" : "ur";
}

export function parseLineGap(raw: string): number | null {
  const text = raw.trim();
  // Unit is optional as a whole. "pt?" would make only the t optional and accept "6p".
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(?:pt)?$/i);
  if (!match) return null;
  const value = Math.round(parseFloat(match[1]) * 10) / 10;
  if (!Number.isFinite(value) || value < 0 || value > 200) return null;
  return value;
}

/** Portal target inside the element that Full Screen promotes, so menus stay visible. */
export function studioOverlayRoot(): HTMLElement {
  if (typeof document === "undefined") throw new Error("studioOverlayRoot requires document");
  const full = document.fullscreenElement as HTMLElement | null;
  if (full?.isConnected) return full;
  return document.querySelector<HTMLElement>("[data-studio-shell]") ?? document.body;
}
