import { brotliDecompressSync } from "node:zlib";

const WOFF2_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep",
  "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE",
  "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt",
  "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty", "just", "lcar",
  "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
];

/** Letters, vowel marks, eastern digits and waqf signs. ASCII punctuation is not Quranic. */
export function isQuranicCodePoint(codePoint: number): boolean {
  return (codePoint >= 0x0610 && codePoint <= 0x061A)
    || (codePoint >= 0x0621 && codePoint <= 0x063A)
    || codePoint === 0x0640
    || (codePoint >= 0x0641 && codePoint <= 0x064A)
    || (codePoint >= 0x064B && codePoint <= 0x065F)
    || (codePoint >= 0x0660 && codePoint <= 0x0669)
    || codePoint === 0x0670
    || codePoint === 0x0671
    || (codePoint >= 0x06D6 && codePoint <= 0x06ED)
    || (codePoint >= 0x08D3 && codePoint <= 0x08FF)
    || (codePoint >= 0xFB50 && codePoint <= 0xFDFF)
    || (codePoint >= 0xFE70 && codePoint <= 0xFEFF);
}

export function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Keep Quranic clusters together. Peel Latin and non-Quranic punctuation into their own runs. */
export function splitQuranicRuns(text: string): Array<{ text: string; quranic: boolean }> {
  const runs: Array<{ text: string; quranic: boolean }> = [];
  let buffer = "";
  let quranic = false;
  const flush = () => {
    if (!buffer) return;
    runs.push({ text: buffer, quranic });
    buffer = "";
  };
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    const glue = codePoint === 0x20 || codePoint === 0xA0 || codePoint === 0x200C || codePoint === 0x200D;
    if (glue) {
      buffer += char;
      continue;
    }
    const next = isQuranicCodePoint(codePoint);
    if (!buffer) {
      buffer = char;
      quranic = next;
      continue;
    }
    if (next === quranic) buffer += char;
    else {
      flush();
      buffer = char;
      quranic = next;
    }
  }
  flush();
  return runs;
}

function readBase128(bytes: Buffer, cursor: { offset: number }): number {
  let result = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = bytes[cursor.offset];
    cursor.offset += 1;
    if (byte === undefined || (result & 0xfe000000) !== 0) throw new Error("Invalid WOFF2 number");
    result = (result << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return result;
  }
  throw new Error("Invalid WOFF2 number");
}

function parseCmap(table: Buffer): Set<number> {
  const view = new DataView(table.buffer, table.byteOffset, table.byteLength);
  const tables = view.getUint16(2);
  const points = new Set<number>();
  for (let index = 0; index < tables; index += 1) {
    const platform = view.getUint16(4 + index * 8);
    const encoding = view.getUint16(6 + index * 8);
    if (!((platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0)) continue;
    const start = view.getUint32(8 + index * 8);
    const format = view.getUint16(start);
    if (format === 12) {
      const groups = view.getUint32(start + 12);
      for (let group = 0; group < groups; group += 1) {
        const base = start + 16 + group * 12;
        const from = view.getUint32(base);
        const to = view.getUint32(base + 4);
        for (let codePoint = from; codePoint <= to; codePoint += 1) points.add(codePoint);
      }
    } else if (format === 4) {
      const segCount = view.getUint16(start + 6) / 2;
      const endStart = start + 14;
      const startStart = endStart + segCount * 2 + 2;
      const deltaStart = startStart + segCount * 2;
      const offsetStart = deltaStart + segCount * 2;
      for (let seg = 0; seg < segCount; seg += 1) {
        const end = view.getUint16(endStart + seg * 2);
        const first = view.getUint16(startStart + seg * 2);
        const delta = view.getInt16(deltaStart + seg * 2);
        const rangeOffset = view.getUint16(offsetStart + seg * 2);
        for (let codePoint = first; codePoint <= end && codePoint !== 0xffff; codePoint += 1) {
          let glyph = 0;
          if (rangeOffset === 0) glyph = (codePoint + delta) & 0xffff;
          else {
            const glyphPos = offsetStart + seg * 2 + rangeOffset + (codePoint - first) * 2;
            glyph = view.getUint16(glyphPos);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) points.add(codePoint);
        }
      }
    }
  }
  if (points.size === 0) throw new Error("Digital Khatt cmap is empty");
  return points;
}

/** Read the cmap of an untransformed WOFF2 table. Does not alter the font. */
export function readWoff2Cmap(bytes: Buffer): Set<number> {
  if (bytes.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error("Digital Khatt font is not a WOFF2");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numTables = view.getUint16(12);
  const cursor = { offset: 48 };
  const tables: Array<{ tag: string; length: number; transformed: boolean }> = [];
  for (let index = 0; index < numTables; index += 1) {
    const flags = bytes[cursor.offset];
    cursor.offset += 1;
    const known = flags & 0x3f;
    const tag = known === 63 ? bytes.subarray(cursor.offset, cursor.offset + 4).toString("latin1") : WOFF2_TAGS[known];
    if (known === 63) cursor.offset += 4;
    const origLength = readBase128(bytes, cursor);
    const transformed = tag === "glyf" || tag === "loca" ? (flags >> 6) !== 3 : (flags >> 6) !== 0;
    const length = transformed ? readBase128(bytes, cursor) : origLength;
    tables.push({ tag, length, transformed });
  }
  const decoded = brotliDecompressSync(bytes.subarray(cursor.offset));
  let offset = 0;
  for (const table of tables) {
    const slice = decoded.subarray(offset, offset + table.length);
    offset += table.length;
    if (table.tag !== "cmap") continue;
    if (table.transformed) throw new Error("Digital Khatt cmap is transformed");
    return parseCmap(slice);
  }
  throw new Error("Digital Khatt cmap is missing");
}

export function missingQuranicCodePoints(text: string, cmap: Set<number>): number[] {
  const missing = new Set<number>();
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (isQuranicCodePoint(codePoint) && !cmap.has(codePoint)) missing.add(codePoint);
  }
  return [...missing];
}

export function digitalKhattCoverageError(text: string, font: Buffer): string | null {
  const missing = missingQuranicCodePoints(text, readWoff2Cmap(font));
  if (!missing.length) return null;
  return `PDF font Digital Khatt Indo-Pak did not render Quranic text ${missing.map(formatCodePoint).join(", ")} (absent from DigitalKhattIndoPakRegular); Noto was not substituted; export blocked`;
}
