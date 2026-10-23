import type { DocNode } from "./extractPlainText";

/** Explicit document/paragraph leading wins; 1.5 is the legacy Auto default. */
export function autoLineHeight(fontFamily: string, documentLeading = 1.5): number {
  if (documentLeading !== 1.5) return documentLeading;
  return /nastaliq|nastaleeq/i.test(fontFamily) ? 2.2 : 1.5;
}

export function blockAutoLineHeight(node: DocNode, rtlFont: string, documentLeading: number, direction: string): number {
  const explicit = node.attrs?.lineHeight;
  if (typeof explicit === "number") return explicit;
  if (direction !== "rtl") return autoLineHeight("", documentLeading);
  const families: string[] = [];
  const visit = (part: DocNode) => {
    if (part.text && /\p{Script=Arabic}/u.test(part.text)) {
      const family = part.marks?.find((mark) => mark.type === "textStyle")?.attrs?.fontFamily;
      families.push(typeof family === "string" ? family : rtlFont);
    }
    part.content?.forEach(visit);
  };
  visit(node);
  return autoLineHeight(families.length ? families.join(",") : rtlFont, documentLeading);
}
