import type { DocNode } from "./extractPlainText";
import { PDF_SOURCE_LIMITS } from "./pdfSourcePreflight";

const RUN_LENGTHS = "__qalamPdfRunLengths";

/** Compact the export copy without changing the live editor document. */
export function normalizePdfDocument(root: DocNode): DocNode {
  const copies = new Map<DocNode, DocNode>();
  const stack: Array<{ node: DocNode; visited: boolean }> = [{ node: root, visited: false }];
  while (stack.length) {
    const { node, visited } = stack.pop()!;
    if (!visited) {
      stack.push({ node, visited: true });
      node.content?.forEach(child => stack.push({ node: child, visited: false }));
      continue;
    }
    const copy: DocNode = { ...node };
    if (node.marks) {
      copy.marks = node.marks.flatMap(mark => {
        if (mark.type !== "textStyle" || !mark.attrs) return [{ ...mark }];
        const defaults: Record<string, unknown> = { textEffect: "none", textOutline: false, trackingPercent: 0, scalePercent: 100, baselineShift: 0, hatch: "none", kashida: "none" };
        const attrs = Object.fromEntries(Object.entries(mark.attrs).filter(([key, value]) => value !== null && value !== undefined && value !== "" && (!Object.hasOwn(defaults, key) || value !== defaults[key])));
        return Object.keys(attrs).length ? [{ ...mark, attrs }] : [];
      });
      if (!copy.marks.length) delete copy.marks;
    }
    if (node.content) {
      copy.content = [];
      const lengths = new Map<DocNode, number[]>();
      for (const child of node.content) {
        const next = copies.get(child)!;
        const previous = copy.content.at(-1);
        if (previous?.type === "text" && next.type === "text" && typeof previous.text === "string" && previous.text.length > 0 && typeof next.text === "string" && next.text.length > 0 &&
            JSON.stringify(previous.marks ?? []) === JSON.stringify(next.marks ?? []) &&
            JSON.stringify(previous.attrs ?? {}) === JSON.stringify(next.attrs ?? {}) &&
            !(RUN_LENGTHS in (previous.attrs ?? {})) && !(RUN_LENGTHS in (next.attrs ?? {})) &&
            [...previous.text, ...next.text].length <= PDF_SOURCE_LIMITS.singleTextNodeCodePoints) {
          const pieces = lengths.get(previous) ?? [previous.text.length];
          pieces.push(next.text.length);
          lengths.set(previous, pieces);
          previous.text += next.text;
        } else copy.content.push(next);
      }
      for (const [text, pieces] of lengths) text.attrs = { ...text.attrs, [RUN_LENGTHS]: pieces };
    }
    copies.set(node, copy);
  }
  return copies.get(root)!;
}

/** Recreate original PDF run boundaries before shaping and line measurement. */
export function restorePdfTextRuns(root: DocNode): DocNode {
  const copies = new Map<DocNode, DocNode>();
  const stack: Array<{ node: DocNode; visited: boolean }> = [{ node: root, visited: false }];
  let restoredCount = 0;
  while (stack.length) {
    const { node, visited } = stack.pop()!;
    if (!visited) {
      stack.push({ node, visited: true });
      node.content?.forEach(child => stack.push({ node: child, visited: false }));
      continue;
    }
    const copy: DocNode = { ...node };
    if (node.content) {
      copy.content = [];
      for (const child of node.content) {
        const next = copies.get(child)!;
        const pieces = next.attrs?.[RUN_LENGTHS];
        if (next.type !== "text" || typeof next.text !== "string" || pieces === undefined) {
          copy.content.push(next); continue;
        }
        if (!Array.isArray(pieces) || pieces.length < 2 || pieces.some(n => !Number.isSafeInteger(n) || n <= 0) || pieces.reduce((a, b) => a + b, 0) !== next.text.length) throw new Error("Invalid PDF text run boundaries; export blocked");
        restoredCount += pieces.length;
        if (restoredCount > PDF_SOURCE_LIMITS.textNodes) throw new Error(`PDF source exceeds the supported ${PDF_SOURCE_LIMITS.textNodes} text-node limit; export blocked`);
        const attrs = { ...next.attrs }; delete attrs[RUN_LENGTHS];
        let offset = 0;
        for (const size of pieces as number[]) {
          const part: DocNode = { ...next, text: next.text.slice(offset, offset + size) };
          if (Object.keys(attrs).length) part.attrs = attrs; else delete part.attrs;
          copy.content.push(part); offset += size;
        }
      }
    }
    copies.set(node, copy);
  }
  return copies.get(root)!;
}
