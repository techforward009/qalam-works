import * as CFB from "cfb";
import { CHAR_MAP_URDU, COMPOSITE_SEQUENCES } from "./characterMap";

export type InPageDocument = { version: 2 | 3; stories: string[][] };
export const INPAGE_UNITS_PER_POINT = 2000;
export const MAX_INPAGE_BYTES = 32 * 1024 * 1024;
const MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const utf16 = new TextDecoder("utf-16le", { fatal: true, ignoreBOM: true });

export class InPageImportError extends Error {}

export function decodeLegacyParagraph(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === 4) {
      if (++i >= bytes.length) throw new InPageImportError("Incomplete InPage glyph pair.");
      const glyph = bytes[i];
      const next = bytes[i + 1] === 4 ? bytes[i + 2] : undefined;
      const composite = next === undefined ? undefined : COMPOSITE_SEQUENCES.get(`${glyph.toString(16).toUpperCase()}_${next.toString(16).toUpperCase()}`);
      if (composite !== undefined) { text += composite; i += 2; }
      else {
        const character = CHAR_MAP_URDU.get(glyph);
        if (character === undefined) throw new InPageImportError(`Unsupported InPage glyph 0x${glyph.toString(16)}.`);
        text += character;
      }
    } else if (byte === 9 || (byte >= 0x20 && byte <= 0x7e)) text += String.fromCharCode(byte);
    else throw new InPageImportError("Invalid legacy InPage paragraph.");
  }
  // InPage's visual-order number runs must become logical-order Unicode.
  return text.replace(/[0-9\u0660-\u0669\u06f0-\u06f9]{2,}/g, (run) => [...run].reverse().join(""));
}

function unicodeStories(data: Uint8Array, view: DataView): string[][] {
  let budget = 1_000_000;
  let best: { stories: string[][]; bytes: number } | null = null;
  // Locate framing, never Urdu-looking text: metadata/font buffers may contain
  // perfectly plausible stale Urdu. Only declared paragraph slices are decoded.
  for (let marker = 8; marker + 4 <= data.length; marker++) {
    if (view.getUint32(marker, true) !== 0xffffffff || view.getUint32(marker - 4, true) !== 0) continue;
    const words: number[] = [];
    for (let p = marker - 4; p >= 4; p -= 4) {
      if (--budget <= 0) throw new InPageImportError("InPage paragraph table is too complex.");
      const n = view.getUint32(p, true);
      if (n % 2 || n > data.length - marker - 4) break;
      words.push(n);
    }
    words.reverse();
    // A metadata header may immediately precede the length table. Choose the
    // longest complete table whose EVERY paragraph ends exactly at its CR.
    for (let start = 0; start < words.length; start++) {
      let offset = marker + 4;
      const stories: string[][] = [];
      let paragraphs: string[] = [];
      let valid = true;
      for (let i = start; i < words.length; i++) {
        if (--budget <= 0) throw new InPageImportError("InPage paragraph table is too complex.");
        const length = words[i];
        if (length === 0) { stories.push(paragraphs); paragraphs = []; continue; }
        if (length < 2 || offset + length > data.length || view.getUint16(offset + length - 2, true) !== 13) { valid = false; break; }
        try { paragraphs.push(utf16.decode(data.subarray(offset, offset + length - 2))); }
        catch { valid = false; break; }
        offset += length;
      }
      const consumed = offset - marker - 4;
      if (valid && !paragraphs.length && consumed > 0) {
        if (!best || consumed > best.bytes) best = { stories, bytes: consumed };
        // Later suffixes cannot contain more declared text. Do not repeatedly
        // re-decode a long book's complete table (quadratic work).
        break;
      }
    }
  }
  if (!best) throw new InPageImportError("Invalid or truncated InPage Unicode paragraph lengths.");
  return best.stories;
}

function legacyStories(data: Uint8Array, view: DataView): string[][] {
  let budget = 1_000_000;
  for (let start = 4; start + 5 <= data.length; start++) {
    const first = view.getUint32(start, true);
    if (!first || first > data.length - start - 4 || data[start + 3 + first] !== 13) continue;
    let p = start, bytes = 0;
    const stories: string[][] = [];
    let paragraphs: string[] = [];
    while (p + 4 <= data.length) {
      if (--budget <= 0) throw new InPageImportError("InPage paragraph table is too complex.");
      const length = view.getUint32(p, true);
      if (length === 0) { stories.push(paragraphs); paragraphs = []; p += 4; continue; }
      if (length > data.length - p - 4 || data[p + 3 + length] !== 13) break;
      try { paragraphs.push(decodeLegacyParagraph(data.subarray(p + 4, p + 3 + length))); }
      catch (error) {
        // Once text framing is established, never silently drop an unsupported
        // paragraph and import only the remaining stories.
        if (paragraphs.length || stories.length || data[p + 4] === 4 || (error instanceof Error && /glyph/.test(error.message))) throw error;
        break;
      }
      bytes += length;
      p += 4 + length;
    }
    // Unterminated paragraphs are never silently imported as a complete story.
    if (!paragraphs.length && stories.length && bytes) return stories;
  }
  throw new InPageImportError("Invalid or unsupported legacy InPage paragraph data.");
}

/** Pure, browser-compatible, text-only parser. No file access or font changes. */
export function parseInPage(input: ArrayBuffer | Uint8Array): InPageDocument {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > MAX_INPAGE_BYTES) throw new InPageImportError("InPage files must be 32 MB or smaller.");
  if (!MAGIC.every((byte, i) => bytes[i] === byte)) throw new InPageImportError("This is not an OLE2 InPage file.");
  let container: CFB.CFB$Container;
  try { container = CFB.read(bytes, { type: "array" }); }
  catch { throw new InPageImportError("The InPage container is damaged or unsupported."); }
  const root = container.FullPaths[0];
  const streams = container.FileIndex.filter((entry, i) => entry.type === 2 && container.FullPaths[i] === `${root}${entry.name}`);
  if (!streams.some((entry) => entry.name === "DocumentInfo")) throw new InPageImportError("InPage DocumentInfo stream is missing.");
  const mains = streams.filter((entry) => ["InPage100", "InPage200", "InPage300"].includes(entry.name));
  if (mains.length !== 1) throw new InPageImportError("A single supported InPage main stream is required.");
  const data = Uint8Array.from(mains[0].content);
  if (data.length < 4) throw new InPageImportError("The InPage main stream is truncated.");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const version = view.getUint16(2, true);
  if (version !== 2 && version !== 3) throw new InPageImportError("Only InPage legacy v2 and Unicode v3 text are supported.");
  return { version, stories: version === 3 ? unicodeStories(data, view) : legacyStories(data, view) };
}
