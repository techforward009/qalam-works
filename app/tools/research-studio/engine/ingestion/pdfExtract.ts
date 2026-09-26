import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";

function asBytes(data: Uint8Array | Uint8ClampedArray): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function streamToBytes(stream: PDFStream): Uint8Array {
  if (stream instanceof PDFRawStream) {
    try {
      return asBytes(decodePDFRawStream(stream).decode());
    } catch {
      return stream.getContents();
    }
  }
  try {
    return stream.getContents();
  } catch {
    return new Uint8Array();
  }
}

function collectStreams(contents: unknown, lookup: (ref: PDFRef) => unknown): PDFStream[] {
  if (!contents) return [];
  if (contents instanceof PDFRef) {
    return collectStreams(lookup(contents), lookup);
  }
  if (contents instanceof PDFArray) {
    const out: PDFStream[] = [];
    for (let i = 0; i < contents.size(); i++) {
      out.push(...collectStreams(contents.get(i), lookup));
    }
    return out;
  }
  if (contents instanceof PDFStream) return [contents];
  return [];
}

function readLiteral(src: string, start: number): { text: string; end: number } {
  let i = start + 1;
  let out = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === ")") return { text: out, end: i + 1 };
    if (ch === "\\") {
      const n = src[i + 1];
      if (n === "n") {
        out += "\n";
        i += 2;
        continue;
      }
      if (n === "r") {
        out += "\r";
        i += 2;
        continue;
      }
      if (n === "t") {
        out += "\t";
        i += 2;
        continue;
      }
      if (n === "b") {
        out += "\b";
        i += 2;
        continue;
      }
      if (n === "f") {
        out += "\f";
        i += 2;
        continue;
      }
      if (n === "(" || n === ")" || n === "\\") {
        out += n;
        i += 2;
        continue;
      }
      if (n >= "0" && n <= "7") {
        let oct = n;
        let j = i + 2;
        while (oct.length < 3 && j < src.length && src[j] >= "0" && src[j] <= "7") {
          oct += src[j];
          j++;
        }
        out += String.fromCharCode(parseInt(oct, 8));
        i = j;
        continue;
      }
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return { text: out, end: src.length };
}

function readHex(src: string, start: number): { text: string; end: number } {
  let i = start + 1;
  let hex = "";
  while (i < src.length && src[i] !== ">") {
    if (!/\s/.test(src[i])) hex += src[i];
    i++;
  }
  const end = i < src.length ? i + 1 : src.length;
  if (hex.length % 2 === 1) hex += "0";
  const bytes = new Uint8Array(hex.length / 2);
  for (let b = 0; b < bytes.length; b++) {
    bytes[b] = parseInt(hex.slice(b * 2, b * 2 + 2), 16);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), end };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), end };
  }
  return { text: new TextDecoder("latin1").decode(bytes), end };
}

/** Pull literal / hex strings from a PDF content stream (born-digital text layer). */
export function extractStringsFromPdfContent(src: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "(") {
      const read = readLiteral(src, i);
      parts.push(read.text);
      i = read.end;
      continue;
    }
    if (ch === "<" && src[i + 1] !== "<") {
      const read = readHex(src, i);
      parts.push(read.text);
      i = read.end;
      continue;
    }
    i++;
  }
  return parts.join(" ").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}

type GlyphMap = {
  codes: Map<string, string>;
  widths: number[];
};

type ContentTok =
  | { k: "str"; bytes: Uint8Array }
  | { k: "name"; name: string }
  | { k: "num" }
  | { k: "arr"; items: ContentTok[] }
  | { k: "op"; op: string };

function latin1(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).toUpperCase().padStart(2, "0");
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const norm = hex.replace(/\s+/g, "");
  const even = norm.length % 2 === 1 ? `0${norm}` : norm;
  const bytes = new Uint8Array(even.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(even.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function normHex(hex: string): string {
  const cleaned = hex.replace(/\s+/g, "").toUpperCase();
  return cleaned.length % 2 === 1 ? `0${cleaned}` : cleaned;
}

function utf16beHex(hex: string): string {
  let bytes = hexToBytes(normHex(hex));
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) bytes = bytes.subarray(2);
  if (bytes.length < 2) return "";
  if (bytes.length % 2 === 1) bytes = bytes.subarray(0, bytes.length - 1);
  return new TextDecoder("utf-16be").decode(bytes);
}

function hexToUnits(hex: string): number[] {
  const bytes = hexToBytes(normHex(hex));
  const units: number[] = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) units.push((bytes[i] << 8) | bytes[i + 1]);
  return units;
}

function isHexToken(token: string): boolean {
  return /^[0-9A-F]+$/.test(token) && token.length % 2 === 0;
}

function tokenizeCmap(src: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "%") {
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "<") {
      let j = i + 1;
      let hex = "";
      while (j < src.length && src[j] !== ">") {
        if (!/\s/.test(src[j])) hex += src[j];
        j++;
      }
      tokens.push(normHex(hex));
      i = j < src.length ? j + 1 : src.length;
      continue;
    }
    if (ch === "[" || ch === "]") {
      tokens.push(ch);
      i++;
      continue;
    }
    let j = i + 1;
    while (j < src.length && !/\s/.test(src[j]) && src[j] !== "<" && src[j] !== "[" && src[j] !== "]") j++;
    tokens.push(src.slice(i, j));
    i = j;
  }
  return tokens;
}

function addInclusiveRange(codes: Map<string, string>, startHex: string, endHex: string, destHex: string): void {
  const startKey = normHex(startHex);
  const width = startKey.length / 2;
  const src = parseInt(startKey, 16);
  const end = parseInt(normHex(endHex), 16);
  const units = hexToUnits(destHex);
  if (!Number.isFinite(src) || !Number.isFinite(end) || end < src || units.length === 0) return;
  if (end - src > 65535) return;
  for (let n = src; n <= end; n++) {
    codes.set(n.toString(16).toUpperCase().padStart(width * 2, "0"), String.fromCharCode(...units));
    units[units.length - 1] = (units[units.length - 1] + 1) & 0xffff;
  }
}

function addArrayRange(codes: Map<string, string>, startHex: string, endHex: string, dests: string[]): void {
  const startKey = normHex(startHex);
  const width = startKey.length / 2;
  const src = parseInt(startKey, 16);
  const end = parseInt(normHex(endHex), 16);
  if (!Number.isFinite(src) || !Number.isFinite(end) || end < src) return;
  const count = Math.min(end - src, dests.length - 1, 65535);
  for (let n = 0; n <= count; n++) {
    const text = utf16beHex(dests[n] ?? "");
    if (text.length > 0) codes.set((src + n).toString(16).toUpperCase().padStart(width * 2, "0"), text);
  }
}

function parseToUnicode(cmapText: string): GlyphMap | null {
  const tokens = tokenizeCmap(cmapText);
  const codes = new Map<string, string>();
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === "beginbfchar") {
      i++;
      while (i < tokens.length && tokens[i] !== "endbfchar") {
        const src = tokens[i];
        const dst = tokens[i + 1];
        if (src && dst && isHexToken(src) && isHexToken(dst)) {
          const text = utf16beHex(dst);
          if (text.length > 0) codes.set(src, text);
          i += 2;
        } else {
          i++;
        }
      }
      continue;
    }
    if (token === "beginbfrange") {
      i++;
      while (i < tokens.length && tokens[i] !== "endbfrange") {
        const start = tokens[i];
        const end = tokens[i + 1];
        const third = tokens[i + 2];
        if (!start || !end || !isHexToken(start) || !isHexToken(end)) {
          i++;
          continue;
        }
        if (third === "[") {
          i += 3;
          const dests: string[] = [];
          while (i < tokens.length && tokens[i] !== "]") {
            const dest = tokens[i];
            if (dest && isHexToken(dest)) dests.push(dest);
            i++;
          }
          if (tokens[i] === "]") i++;
          addArrayRange(codes, start, end, dests);
        } else if (third && isHexToken(third)) {
          addInclusiveRange(codes, start, end, third);
          i += 3;
        } else {
          i++;
        }
      }
      continue;
    }
    i++;
  }
  if (codes.size === 0) return null;
  const widths = [...new Set([...codes.keys()].map((key) => key.length / 2))].filter((width) => width >= 1);
  widths.sort((a, b) => b - a);
  return { codes, widths };
}

function applyGlyphMap(bytes: Uint8Array, map: GlyphMap): string {
  let i = 0;
  let out = "";
  let hits = 0;
  const min = map.widths[map.widths.length - 1] ?? 1;
  while (i < bytes.length) {
    let hit = "";
    let used = 0;
    for (const width of map.widths) {
      if (i + width > bytes.length) continue;
      const text = map.codes.get(bytesToHex(bytes.subarray(i, i + width)));
      if (text !== undefined) {
        hit = text;
        used = width;
        break;
      }
    }
    if (used > 0) {
      out += hit;
      hits++;
      i += used;
    } else {
      i += Math.min(min, bytes.length - i);
    }
  }
  return hits > 0 ? out : "";
}

function legacyBytesToText(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  return latin1(bytes);
}

function jsStringToBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function readHexBytes(src: string, start: number): { bytes: Uint8Array; end: number } {
  let i = start + 1;
  let hex = "";
  while (i < src.length && src[i] !== ">") {
    if (!/\s/.test(src[i])) hex += src[i];
    i++;
  }
  return { bytes: hexToBytes(hex), end: i < src.length ? i + 1 : src.length };
}

function readName(src: string, start: number): { name: string; end: number } {
  let i = start + 1;
  let name = "";
  while (i < src.length) {
    const ch = src[i];
    if (/[\s()<>[\]{}/%]/.test(ch)) break;
    if (ch === "#" && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) {
      name += String.fromCharCode(parseInt(src.slice(i + 1, i + 3), 16));
      i += 3;
      continue;
    }
    name += ch;
    i++;
  }
  return { name, end: i };
}

function readNumber(src: string, start: number): { end: number } | null {
  const match = /^[+-]?(?:\d+\.\d+|\d+\.|\.\d+|\d+)/.exec(src.slice(start));
  if (!match) return null;
  return { end: start + match[0].length };
}

function skipDict(src: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < src.length) {
    if (src[i] === "<" && src[i + 1] === "<") {
      depth++;
      i += 2;
      continue;
    }
    if (src[i] === ">" && src[i + 1] === ">") {
      depth--;
      i += 2;
      if (depth === 0) return i;
      continue;
    }
    if (src[i] === "(") {
      i = readLiteral(src, i).end;
      continue;
    }
    if (src[i] === "<") {
      i = readHexBytes(src, i).end;
      continue;
    }
    i++;
  }
  return src.length;
}

function readArray(src: string, start: number): { tok: ContentTok; end: number } {
  const items: ContentTok[] = [];
  let i = start + 1;
  while (i < src.length && src[i] !== "]") {
    const ch = src[i];
    if (ch === "%") {
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      const read = readLiteral(src, i);
      items.push({ k: "str", bytes: jsStringToBytes(read.text) });
      i = read.end;
      continue;
    }
    if (ch === "<" && src[i + 1] !== "<") {
      const read = readHexBytes(src, i);
      items.push({ k: "str", bytes: read.bytes });
      i = read.end;
      continue;
    }
    if (ch === "[") {
      const nested = readArray(src, i);
      items.push(nested.tok);
      i = nested.end;
      continue;
    }
    if (ch === "-" || ch === "+" || ch === "." || (ch >= "0" && ch <= "9")) {
      const num = readNumber(src, i);
      if (num) {
        items.push({ k: "num" });
        i = num.end;
        continue;
      }
    }
    i++;
  }
  return { tok: { k: "arr", items }, end: i < src.length ? i + 1 : src.length };
}

function tokenizeContent(src: string): ContentTok[] {
  const tokens: ContentTok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "%") {
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      const read = readLiteral(src, i);
      tokens.push({ k: "str", bytes: jsStringToBytes(read.text) });
      i = read.end;
      continue;
    }
    if (ch === "<" && src[i + 1] === "<") {
      i = skipDict(src, i);
      continue;
    }
    if (ch === "<") {
      const read = readHexBytes(src, i);
      tokens.push({ k: "str", bytes: read.bytes });
      i = read.end;
      continue;
    }
    if (ch === "[") {
      const arr = readArray(src, i);
      tokens.push(arr.tok);
      i = arr.end;
      continue;
    }
    if (ch === "/") {
      const name = readName(src, i);
      tokens.push({ k: "name", name: name.name });
      i = name.end;
      continue;
    }
    if (ch === "-" || ch === "+" || ch === "." || (ch >= "0" && ch <= "9")) {
      const num = readNumber(src, i);
      if (num) {
        tokens.push({ k: "num" });
        i = num.end;
        continue;
      }
    }
    let j = i + 1;
    while (j < src.length && /[A-Za-z*'"]/.test(src[j])) j++;
    if (j > i) {
      tokens.push({ k: "op", op: src.slice(i, j) });
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

function decodeShown(bytes: Uint8Array, map: GlyphMap | undefined): string {
  if (map) {
    const mapped = applyGlyphMap(bytes, map);
    if (mapped.length > 0) return mapped;
  }
  return legacyBytesToText(bytes);
}

function cmapFromStream(stream: PDFStream): GlyphMap | null {
  try {
    return parseToUnicode(latin1(streamToBytes(stream)));
  } catch {
    return null;
  }
}

function cmapForFont(font: PDFDict): GlyphMap | null {
  const direct = font.lookupMaybe(PDFName.of("ToUnicode"), PDFStream);
  if (direct) return cmapFromStream(direct);
  const kids = font.lookupMaybe(PDFName.of("DescendantFonts"), PDFArray);
  if (!kids) return null;
  for (let i = 0; i < kids.size(); i++) {
    const kid = kids.lookup(i);
    if (!(kid instanceof PDFDict)) continue;
    const stream = kid.lookupMaybe(PDFName.of("ToUnicode"), PDFStream);
    if (stream) return cmapFromStream(stream);
  }
  return null;
}

function directFontMaps(resources: PDFDict | undefined): Map<string, GlyphMap> {
  const maps = new Map<string, GlyphMap>();
  if (!resources) return maps;
  const fonts = resources.lookupMaybe(PDFName.of("Font"), PDFDict);
  if (!fonts) return maps;
  for (const [key, value] of fonts.entries()) {
    const resolved = fonts.context.lookup(value);
    if (!(resolved instanceof PDFDict)) continue;
    const map = cmapForFont(resolved);
    if (map) maps.set(key.decodeText(), map);
  }
  return maps;
}

function resourceTreeHasCmap(resources: PDFDict | undefined, seen: Set<PDFDict>): boolean {
  if (!resources || seen.has(resources)) return false;
  seen.add(resources);
  if (directFontMaps(resources).size > 0) return true;
  const xobjects = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!xobjects) return false;
  for (const [, value] of xobjects.entries()) {
    const resolved = xobjects.context.lookup(value);
    if (!(resolved instanceof PDFStream)) continue;
    const subtype = resolved.dict.lookupMaybe(PDFName.of("Subtype"), PDFName);
    if (!subtype || subtype.decodeText() !== "Form") continue;
    const nested = resolved.dict.lookupMaybe(PDFName.of("Resources"), PDFDict);
    if (resourceTreeHasCmap(nested, seen)) return true;
  }
  return false;
}

function formText(resources: PDFDict, name: string, depth: number): string {
  if (depth > 4) return "";
  const xobjects = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!xobjects || name.length === 0) return "";
  const key = xobjects.get(PDFName.of(name));
  if (!key) return "";
  const resolved = xobjects.context.lookup(key);
  if (!(resolved instanceof PDFStream)) return "";
  const subtype = resolved.dict.lookupMaybe(PDFName.of("Subtype"), PDFName);
  if (!subtype || subtype.decodeText() !== "Form") return "";
  const nested = resolved.dict.lookupMaybe(PDFName.of("Resources"), PDFDict);
  return extractShownText(latin1(streamToBytes(resolved)), directFontMaps(nested), nested, depth);
}

function extractShownText(
  src: string,
  fonts: Map<string, GlyphMap>,
  resources: PDFDict | undefined,
  depth: number,
): string {
  const parts: string[] = [];
  let fontName = "";
  const stack: ContentTok[] = [];
  for (const token of tokenizeContent(src)) {
    if (token.k !== "op") {
      stack.push(token);
      continue;
    }
    if (token.op === "Tf") {
      const name = [...stack].reverse().find((item) => item.k === "name");
      if (name && name.k === "name") fontName = name.name;
      stack.length = 0;
      continue;
    }
    if (token.op === "Tj" || token.op === "'" || token.op === '"') {
      const shown = [...stack].reverse().find((item) => item.k === "str");
      if (shown && shown.k === "str") parts.push(decodeShown(shown.bytes, fonts.get(fontName)));
      stack.length = 0;
      continue;
    }
    if (token.op === "TJ") {
      const arr = [...stack].reverse().find((item) => item.k === "arr");
      if (arr && arr.k === "arr") {
        let word = "";
        for (const item of arr.items) {
          if (item.k === "str") word += decodeShown(item.bytes, fonts.get(fontName));
        }
        if (word.length > 0) parts.push(word);
      }
      stack.length = 0;
      continue;
    }
    if (token.op === "Do" && resources) {
      const name = [...stack].reverse().find((item) => item.k === "name");
      if (name && name.k === "name") {
        const nested = formText(resources, name.name, depth + 1);
        if (nested.length > 0) parts.push(nested);
      }
      stack.length = 0;
      continue;
    }
    stack.length = 0;
  }
  return parts.join(" ").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}

function legacyStreamText(streams: PDFStream[]): string {
  return streams
    .map((stream) => extractStringsFromPdfContent(latin1(streamToBytes(stream))))
    .filter(Boolean)
    .join("\n");
}

export type PdfExtractOk = { ok: true; pages: string[] };
export type PdfExtractErr = { ok: false; code: "corrupt" | "empty" };
export type PdfExtractResult = PdfExtractOk | PdfExtractErr;

/**
 * One string per PDF page, 1-based order preserved (blank pages stay).
 */
export async function extractPdfPages(bytes: Uint8Array): Promise<PdfExtractResult> {
  if (bytes.length === 0) return { ok: false, code: "empty" };

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    return { ok: false, code: "corrupt" };
  }

  const pdfPages = doc.getPages();
  if (pdfPages.length === 0) return { ok: false, code: "empty" };

  const lookup = (ref: PDFRef) => doc.context.lookup(ref);
  const pages: string[] = [];

  for (const page of pdfPages) {
    try {
      const streams = collectStreams(page.node.Contents(), lookup);
      const legacy = legacyStreamText(streams);
      const resources = page.node.Resources();
      const fonts = directFontMaps(resources);
      if (fonts.size === 0 && !resourceTreeHasCmap(resources, new Set())) {
        pages.push(legacy);
        continue;
      }
      const decoded = streams
        .map((stream) => extractShownText(latin1(streamToBytes(stream)), fonts, resources, 0))
        .filter(Boolean)
        .join("\n");
      pages.push(decoded.trim().length > 0 ? decoded : legacy);
    } catch {
      pages.push("");
    }
  }

  return { ok: true, pages };
}
