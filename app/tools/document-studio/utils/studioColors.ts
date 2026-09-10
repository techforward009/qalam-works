/** Safe document colors — hex only, no arbitrary CSS. */

export const STUDIO_TEXT_COLORS = [
  { id: "default", label: "Default", hex: "" },
  { id: "black", label: "Black", hex: "#000000" },
  { id: "ink", label: "Ink", hex: "#111111" },
  { id: "charcoal", label: "Charcoal", hex: "#1F2937" },
  { id: "slate", label: "Slate", hex: "#374151" },
  { id: "gray", label: "Gray", hex: "#4B5563" },
  { id: "steel", label: "Steel", hex: "#6B7280" },
  { id: "maroon", label: "Maroon", hex: "#7F1D1D" },
  { id: "crimson", label: "Crimson", hex: "#991B1B" },
  { id: "red", label: "Red", hex: "#B91C1C" },
  { id: "scarlet", label: "Scarlet", hex: "#DC2626" },
  { id: "rust", label: "Rust", hex: "#9A3412" },
  { id: "amber", label: "Amber", hex: "#B45309" },
  { id: "orange", label: "Orange", hex: "#C2410C" },
  { id: "tangerine", label: "Tangerine", hex: "#EA580C" },
  { id: "olive", label: "Olive", hex: "#3F6212" },
  { id: "gold", label: "Gold", hex: "#854D0E" },
  { id: "ochre", label: "Ochre", hex: "#A16207" },
  { id: "yellow", label: "Yellow", hex: "#CA8A04" },
  { id: "forest", label: "Forest", hex: "#14532D" },
  { id: "qalam", label: "Qalam", hex: "#1A3A2A" },
  { id: "green", label: "Green", hex: "#166534" },
  { id: "emerald", label: "Emerald", hex: "#15803D" },
  { id: "teal-dark", label: "Dark teal", hex: "#115E59" },
  { id: "teal", label: "Teal", hex: "#0F766E" },
  { id: "cyan", label: "Cyan", hex: "#0E7490" },
  { id: "aqua", label: "Aqua", hex: "#0891B2" },
  { id: "navy", label: "Navy", hex: "#1E3A8A" },
  { id: "blue", label: "Blue", hex: "#1D4ED8" },
  { id: "royal", label: "Royal", hex: "#2563EB" },
  { id: "indigo-dark", label: "Dark indigo", hex: "#312E81" },
  { id: "indigo", label: "Indigo", hex: "#3730A3" },
  { id: "violet", label: "Violet", hex: "#4F46E5" },
  { id: "grape", label: "Grape", hex: "#581C87" },
  { id: "purple", label: "Purple", hex: "#6B21A8" },
  { id: "amethyst", label: "Amethyst", hex: "#7C3AED" },
  { id: "magenta", label: "Magenta", hex: "#9D174D" },
  { id: "rose", label: "Rose", hex: "#BE185D" },
  { id: "pink", label: "Pink", hex: "#DB2777" },
  { id: "fuchsia", label: "Fuchsia", hex: "#C026D3" },
] as const;

export const STUDIO_HIGHLIGHT_COLORS = [
  { id: "none", label: "None", hex: "" },
  { id: "yellow", label: "Yellow", hex: "#FEF3C7" },
  { id: "gold", label: "Gold", hex: "#FDE68A" },
  { id: "lemon", label: "Lemon", hex: "#FEF9C3" },
  { id: "orange", label: "Orange", hex: "#FFEDD5" },
  { id: "peach", label: "Peach", hex: "#FED7AA" },
  { id: "red", label: "Red", hex: "#FECACA" },
  { id: "pink", label: "Pink", hex: "#FCE7F3" },
  { id: "rose", label: "Rose", hex: "#FECDD3" },
  { id: "mint", label: "Mint", hex: "#D1FAE5" },
  { id: "green", label: "Green", hex: "#BBF7D0" },
  { id: "lime", label: "Lime", hex: "#ECFCCB" },
  { id: "cyan", label: "Cyan", hex: "#CFFAFE" },
  { id: "sky", label: "Sky", hex: "#DBEAFE" },
  { id: "blue", label: "Blue", hex: "#BFDBFE" },
  { id: "lavender", label: "Lavender", hex: "#E9D5FF" },
  { id: "purple", label: "Purple", hex: "#DDD6FE" },
  { id: "magenta", label: "Magenta", hex: "#F5D0FE" },
  { id: "gray", label: "Gray", hex: "#F3F4F6" },
  { id: "silver", label: "Silver", hex: "#E5E7EB" },
] as const;

const HEX = /^#([0-9A-Fa-f]{6})$/;

export function normalizeSafeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = HEX.exec(trimmed);
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

export function hexToDocxColor(value: unknown): string | undefined {
  const hex = normalizeSafeHex(value);
  return hex ? hex.slice(1) : undefined;
}

export function parseCustomColorInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return normalizeSafeHex(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
}
