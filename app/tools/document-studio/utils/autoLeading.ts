import type { DocNode } from "./extractPlainText";
import { autoLeadingPt, blockFontSizePt, blockLeading, leadingPt, migrateLeading, type Leading } from "./leading";
export function blockLeadingPt(node: DocNode, rtlFont: string, defaults: { bodyFontSizePt: number; lineHeight: number; leading?: Leading }, direction: string): number {
  const families: string[] = [];
  const visit = (part: DocNode) => {
    if (part.text && /\p{Script=Arabic}/u.test(part.text)) {
      const family = part.marks?.find(mark => mark.type === "textStyle")?.attrs?.fontFamily;
      families.push(typeof family === "string" ? family : rtlFont);
    }
    part.content?.forEach(visit);
  };
  visit(node);
  const fallback = defaults.leading ?? (defaults.lineHeight === 1.5 ? { mode: "auto" } : migrateLeading(defaults.lineHeight,defaults.bodyFontSizePt));
  const leading=blockLeading(node,fallback,defaults.bodyFontSizePt),size=blockFontSizePt(node,defaults.bodyFontSizePt);
  if(leading.mode === "points") return leading.value;
  return direction === "rtl" ? Math.max(...(families.length ? families : [rtlFont]).map(family=>autoLeadingPt(family,size))) : leadingPt(leading,"",size);
}
