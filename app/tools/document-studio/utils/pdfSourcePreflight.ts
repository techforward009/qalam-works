import type { DocNode } from "./extractPlainText";

export const PDF_SOURCE_LIMITS = {
  bytes: 96 * 1024,
  codePoints: 60_000,
  nodes: 2_500,
  textNodes: 1_200,
  singleTextNodeCodePoints: 20_000,
} as const;

export interface PdfSourceComplexity {
  bytes: number;
  codePoints: number;
  nodes: number;
  textNodes: number;
  maxTextNodeCodePoints: number;
}

function jsonStringBytes(value: string): number {
  let bytes = 2; // quotation marks
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c || unit === 0x08 || unit === 0x09 || unit === 0x0a || unit === 0x0c || unit === 0x0d) bytes += 2;
    else if (unit < 0x20) bytes += 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index++;
    } else if (unit >= 0xd800 && unit <= 0xdfff) bytes += 6; // well-formed JSON.stringify escape
    else bytes += 3;
  }
  return bytes;
}

/** Exact UTF-8 size of JSON-compatible data, using an explicit traversal stack. */
export function measureJsonUtf8Bytes(value: unknown, limit = Number.POSITIVE_INFINITY): number {
  const pending: unknown[] = [value];
  let bytes = 0;
  const add = (amount: number) => {
    bytes += amount;
    if (bytes > limit) throw new Error(`PDF source exceeds the supported ${limit}-byte limit; export blocked`);
  };
  while (pending.length) {
    const current = pending.pop();
    if (current === null) add(4);
    else if (typeof current === "string") add(jsonStringBytes(current));
    else if (typeof current === "boolean") add(current ? 4 : 5);
    else if (typeof current === "number") add(Number.isFinite(current) ? String(current).length : 4);
    else if (Array.isArray(current)) {
      add(2 + Math.max(0, current.length - 1));
      for (let index = current.length - 1; index >= 0; index--) pending.push(current[index] ?? null);
    } else if (typeof current === "object") {
      const record = current as Record<string, unknown>;
      const keys = Object.keys(record).filter(key => {
        const item = record[key];
        return item !== undefined && typeof item !== "function" && typeof item !== "symbol";
      });
      add(2 + Math.max(0, keys.length - 1));
      for (let index = keys.length - 1; index >= 0; index--) {
        const key = keys[index];
        add(jsonStringBytes(key) + 1);
        pending.push(record[key]);
      }
    } else {
      // The export route accepts parsed JSON. This branch is defensive for
      // direct callers; top-level unsupported values match JSON.stringify.
      add(0);
    }
  }
  return bytes;
}

/** Cheap request-side bound that runs before fonts, Chromium, layout, or raster work. */
export function preflightPdfSource(doc: DocNode): PdfSourceComplexity {
  let codePoints = 0;
  let nodes = 0;
  let textNodes = 0;
  let maxTextNodeCodePoints = 0;
  const pending: DocNode[] = [doc];
  while (pending.length) {
    const node = pending.pop()!;
    nodes++;
    if (nodes > PDF_SOURCE_LIMITS.nodes) {
      throw new Error(`PDF source exceeds the supported ${PDF_SOURCE_LIMITS.nodes}-node limit; export blocked`);
    }
    if (typeof node.text === "string") {
      textNodes++;
      if (textNodes > PDF_SOURCE_LIMITS.textNodes) {
        throw new Error(`PDF source exceeds the supported ${PDF_SOURCE_LIMITS.textNodes} text-node limit; export blocked`);
      }
      const length = [...node.text].length;
      codePoints += length;
      maxTextNodeCodePoints = Math.max(maxTextNodeCodePoints, length);
      if (codePoints > PDF_SOURCE_LIMITS.codePoints) {
        throw new Error(`PDF source exceeds the supported ${PDF_SOURCE_LIMITS.codePoints} code-point limit; export blocked`);
      }
      if (maxTextNodeCodePoints > PDF_SOURCE_LIMITS.singleTextNodeCodePoints) {
        throw new Error(`PDF source exceeds the supported ${PDF_SOURCE_LIMITS.singleTextNodeCodePoints} code-point single-text-node limit; export blocked`);
      }
    }
    if (Array.isArray(node.content)) {
      for (let index = 0; index < node.content.length; index++) pending.push(node.content[index]);
    }
  }
  const bytes = measureJsonUtf8Bytes(doc, PDF_SOURCE_LIMITS.bytes);
  return { bytes, codePoints, nodes, textNodes, maxTextNodeCodePoints };
}
