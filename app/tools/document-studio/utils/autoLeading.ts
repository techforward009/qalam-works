import type { DocNode } from "./extractPlainText";
import { STUDIO_FONTS } from "./fontRegistry";
import { autoLeadingPt, blockFontSizePt, blockLeading, leadingPt, migrateLeading, type Leading } from "./leading";
export function blockLeadingPt(node: DocNode, rtlFont: string, defaults: { bodyFontSizePt: number; lineHeight: number; leading?: Leading }, direction: string): number {
  const families: string[] = [];
  const textByFamily = new Map<string, number>();
  const bareFamily = (family: string) => family.replace(/["']/g, "").split(",")[0].trim();
  let latin = false;
  const visit = (part: DocNode) => {
    if (part.text) {
      const arabic = /\p{Script=Arabic}/u.test(part.text);
      const marked = part.marks?.find(mark => mark.type === "textStyle")?.attrs?.fontFamily;
      const family = typeof marked === "string" && marked.trim() ? marked : arabic ? rtlFont : "";
      // A marked Digital Khatt symbol/harakat run still participates in the
      // old highest-ratio fallback, even without Arabic-script letters.
      if (arabic || bareFamily(family) === "Digital Khatt Indo-Pak") families.push(family);
      else if (/\p{Script=Latin}/u.test(part.text)) latin = true;
      // Count text, not marked runs: splitting a word with bold must not change
      // its paragraph's main font. Harakat and whitespace don't inflate votes.
      const length = part.text.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
      const name = bareFamily(family);
      if (name && length > 0) textByFamily.set(name, (textByFamily.get(name) ?? 0) + length);
    }
    part.content?.forEach(visit);
  };
  visit(node);
  const fallback = defaults.leading ?? (defaults.lineHeight === 1.5 ? { mode: "auto" } : migrateLeading(defaults.lineHeight,defaults.bodyFontSizePt));
  const leading=blockLeading(node,fallback,defaults.bodyFontSizePt),size=blockFontSizePt(node,defaults.bodyFontSizePt);
  if(leading.mode === "points") return leading.value;
  // Direction must not change Auto pitch. Arabic keeps the Urdu face; Latin-only keeps the Latin ratio.
  if (families.some(family => bareFamily(family) === "Digital Khatt Indo-Pak")) {
    // Only a Digital Khatt-led paragraph gets its larger pitch. Preserve the
    // existing policy for paragraphs without Digital Khatt entirely.
    let main = "", most = 0;
    for (const [family, count] of textByFamily) {
      if (count > most || (count === most && main === "Digital Khatt Indo-Pak" && family !== main)) {
        main = family; most = count;
      }
    }
    const arabicOrUrdu = STUDIO_FONTS.some(font =>
      bareFamily(font.editorFamily) === main && (font.category === "arabic" || font.category === "urdu"));
    if (most > 0 && arabicOrUrdu) return autoLeadingPt(main, size);
    // No counted font, or a Latin/unknown winner: retain the old highest ratio.
  }
  if (families.length) return Math.max(...families.map(family=>autoLeadingPt(family,size)));
  if (latin) return leadingPt(leading, "", size);
  return direction === "ltr" && !rtlFont ? leadingPt(leading, "", size) : autoLeadingPt(rtlFont || "Mehr Nastaliq Web", size);
}
