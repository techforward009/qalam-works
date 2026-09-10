/** Safe document colors — hex only, no arbitrary CSS. */

export const STUDIO_TEXT_COLORS = [
  { id: "default", label: "Default", hex: "" },
  { id: "ink", label: "Ink", hex: "#111111" },
  { id: "qalam", label: "Qalam", hex: "#1A3A2A" },
  { id: "amber", label: "Amber", hex: "#B45309" },
  { id: "crimson", label: "Crimson", hex: "#991B1B" },
  { id: "navy", label: "Navy", hex: "#1E3A8A" },
  { id: "slate", label: "Slate", hex: "#374151" },
] as const;

export const STUDIO_HIGHLIGHT_COLORS = [
  { id: "none", label: "None", hex: "" },
  { id: "yellow", label: "Yellow", hex: "#FEF3C7" },
  { id: "mint", label: "Mint", hex: "#D1FAE5" },
  { id: "sky", label: "Sky", hex: "#DBEAFE" },
  { id: "pink", label: "Pink", hex: "#FCE7F3" },
  { id: "gray", label: "Gray", hex: "#F3F4F6" },
  { id: "gold", label: "Gold", hex: "#FDE68A" },
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
