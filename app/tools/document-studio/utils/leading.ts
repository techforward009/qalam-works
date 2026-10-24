import type { DocNode } from "./extractPlainText";
import { BLOCK_STYLES, type BlockStyleId } from "./documentStyles";

export type Leading = { mode: "auto" } | { mode: "points"; value: number };
export const AUTO_LEADING: Leading = { mode: "auto" };
export const AUTO_FONT_RATIOS: Readonly<Record<string,number>> = {
  "Mehr Nastaliq Web": 1.65, "Jameel Noori Nastaleeq": 1.65, "Noto Nastaliq Urdu": 1.65,
  Gulzar: 1.65, Arial: 1.25, Inter: 1.25, Amiri: 1.25, "Scheherazade New": 1.25,
};
export function parseLeading(raw: unknown): Leading | null {
  if (raw && typeof raw === "object") {
    const value = raw as Record<string, unknown>;
    if (value.mode === "auto") return AUTO_LEADING;
    return value.mode === "points" ? parseLeading(value.value) : null;
  }
  if (typeof raw === "string" && /^auto$/i.test(raw.trim())) return AUTO_LEADING;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  if (typeof raw === "string" && !/^\d+(?:\.\d+)?\s*(?:pt)?$/i.test(raw.trim())) return null;
  const value = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(value) && value >= 1 && value <= 9999 ? { mode: "points", value } : null;
}
export function formatLeading(leading: Leading): string { return leading.mode === "auto" ? "Auto" : `${leading.value}pt`; }
/** Only untagged old numbers are multipliers. Never reinterpret a new 1pt value. */
export function migrateLeading(value: unknown, fontSizePt: number): Leading {
  if (typeof value === "number") return Number.isFinite(value) && value >= .5 && value <= 4
    ? { mode: "points", value: Math.round(value * fontSizePt * 2) / 2 } : AUTO_LEADING;
  return parseLeading(value) ?? AUTO_LEADING;
}
export function autoLeadingPt(family: string, sizePt: number): number {
  const name=family.replace(/["']/g, "").split(",")[0].trim();
  return sizePt * (AUTO_FONT_RATIOS[name] ?? (/nastaliq|nastaleeq/i.test(family) ? 1.65 : 1.25));
}
export function leadingPt(leading: Leading, family: string, sizePt: number): number {
  return leading.mode === "points" ? leading.value : autoLeadingPt(family, sizePt);
}
export function blockFontSizePt(node: DocNode, defaultSize: number): number {
  const id = node.type === "heading" ? `heading-${node.attrs?.level}` : node.attrs?.blockStyle;
  let size = BLOCK_STYLES[id as BlockStyleId]?.defaultFontSizePt ?? defaultSize;
  let marked = 0, unmarked = false;
  const visit = (part: DocNode) => {
    const raw = part.marks?.find(mark => mark.type === "textStyle")?.attrs?.fontSize;
    const n = typeof raw === "string" && /pt$/.test(raw) ? parseFloat(raw) : typeof raw === "number" ? raw : 0;
    if (part.text) { if (n > 0 && Number.isFinite(n)) marked = Math.max(marked,n); else unmarked = true; }
    part.content?.forEach(visit);
  };
  visit(node); if (marked) size = unmarked ? Math.max(size,marked) : marked;
  return size;
}
export function blockLeading(node: DocNode, fallback: Leading, defaultSize: number): Leading {
  if (node.attrs?.leading != null) return parseLeading(node.attrs.leading) ?? fallback;
  if (typeof node.attrs?.lineHeight === "number") return migrateLeading(node.attrs.lineHeight,blockFontSizePt(node,defaultSize));
  return fallback;
}
export function migrateDocumentLeading(node: DocNode, defaultSize: number): DocNode {
  const attrs = node.attrs && typeof node.attrs.lineHeight === "number" && node.attrs.leading == null
    ? { ...node.attrs, lineHeight: null, leading: migrateLeading(node.attrs.lineHeight,blockFontSizePt(node,defaultSize)) } : node.attrs;
  return { ...node, ...(attrs ? { attrs } : {}), ...(node.content ? { content: node.content.map(child => migrateDocumentLeading(child,defaultSize)) } : {}) };
}
