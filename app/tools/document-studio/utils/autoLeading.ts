import type { DocNode } from "./extractPlainText";
import { autoLeadingPt, blockFontSizePt, blockLeading, leadingPt, migrateLeading, type Leading } from "./leading";
export function blockLeadingPt(node: DocNode, rtlFont: string, defaults: { bodyFontSizePt: number; lineHeight: number; leading?: Leading }, direction: string): number {
  const families: string[] = [];
  let latin = false;
  const visit = (part: DocNode) => {
    if (part.text && /\p{Script=Arabic}/u.test(part.text)) {
      const family = part.marks?.find(mark => mark.type === "textStyle")?.attrs?.fontFamily;
      families.push(typeof family === "string" && family.trim() ? family : rtlFont);
    } else if (part.text && /\p{Script=Latin}/u.test(part.text)) latin = true;
    part.content?.forEach(visit);
  };
  visit(node);
  const fallback = defaults.leading ?? (defaults.lineHeight === 1.5 ? { mode: "auto" } : migrateLeading(defaults.lineHeight,defaults.bodyFontSizePt));
  const leading=blockLeading(node,fallback,defaults.bodyFontSizePt),size=blockFontSizePt(node,defaults.bodyFontSizePt);
  if(leading.mode === "points") return leading.value;
  // Direction must not change Auto pitch. Arabic keeps the Urdu face; Latin-only keeps the Latin ratio.
  if (families.length) return Math.max(...families.map(family=>autoLeadingPt(family,size)));
  if (latin) return leadingPt(leading, "", size);
  return direction === "ltr" && !rtlFont ? leadingPt(leading, "", size) : autoLeadingPt(rtlFont || "Mehr Nastaliq Web", size);
}