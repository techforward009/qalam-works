import * as CFB from "cfb";
import { INPAGE_UNITS_PER_POINT, MAX_INPAGE_BYTES } from "./parseInPage";

/** Read-only experimental recognition of the object descriptor seen in two
 * controlled InPage300 Run Around ON/OFF pairs. NOT full object import. */
export type InPageRunAroundEvidence = "explicit-on" | "explicit-off" | "omitted" | "unknown";
export type InPageObjectCandidate = {
  kind: "text-box-candidate";
  descriptorOffset: number; // position in reconstructed InPage300 stream
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  runAround: InPageRunAroundEvidence;
  unknownRunAroundValue?: number;
};
export type InPageObjectMetadata = { version: 3; candidates: InPageObjectCandidate[] };

const DESCRIPTOR_PREFIX = [0x03, 0x00, 0x06, 0x00, 0x02, 0x00, 0x00, 0x00];
const RECORD_MIN_BYTES = 58; // 12-byte header + 46-byte property body
const MAX_CANDIDATES = 64;
const MAX_COORD_MM = 2000;
const MM_PER_UNIT = 25.4 / (72 * INPAGE_UNITS_PER_POINT);

/** Strict, bounded profile recognizer for the *logical* stream; offsets are
 * not physical .INP file offsets. Does not infer text ownership or z-order. */
export function parseInPage300ObjectStream(stream: Uint8Array): InPageObjectMetadata | null {
  if (stream.length < RECORD_MIN_BYTES || stream[0] !== 0x64 || stream[1] !== 0 ||
      stream[2] !== 3 || stream[3] !== 0) return null;
  const view = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const candidates: InPageObjectCandidate[] = [];
  for (let offset = 4; offset + RECORD_MIN_BYTES <= stream.length; offset++) {
    if (!DESCRIPTOR_PREFIX.every((b, j) => stream[offset + j] === b)) continue;
    const payloadLength = view.getUint32(offset + 8, true);
    if (payloadLength !== 46 && payloadLength !== 50) continue;
    const end = offset + 12 + payloadLength;
    if (end > stream.length) continue;
    const geometryStart = offset + 34;
    if (![0, 1, 2, 3].every(j =>
      stream[geometryStart + 6 * j] === j && stream[geometryStart + 6 * j + 1] === 0x7e)) continue;
    const raw = [0, 1, 2, 3].map(j => view.getUint32(geometryStart + 6 * j + 2, true));
    const [xMm, yMm, widthMm, heightMm] = raw.map(n => n * MM_PER_UNIT);
    if (![xMm, yMm, widthMm, heightMm].every(n => Number.isFinite(n) && n <= MAX_COORD_MM) ||
        widthMm <= 0 || heightMm <= 0) continue;
    const flagOffset = geometryStart + 24;
    let runAround: InPageRunAroundEvidence = "omitted";
    let unknownRunAroundValue: number | undefined;
    if (payloadLength === 50) {
      if (stream[flagOffset] !== 0x0f || stream[flagOffset + 1] !== 0x7e) continue;
      const flag = view.getUint16(flagOffset + 2, true);
      runAround = flag === 1 ? "explicit-on" : flag === 0 ? "explicit-off" : "unknown";
      if (runAround === "unknown") unknownRunAroundValue = flag;
    }
    candidates.push({ kind: "text-box-candidate", descriptorOffset: offset,
      xMm, yMm, widthMm, heightMm, runAround,
      ...(unknownRunAroundValue === undefined ? {} : { unknownRunAroundValue }),
    });
    if (candidates.length > MAX_CANDIDATES) return null;
    offset = end - 1; // avoid re-scanning inside a validated descriptor
  }
  return { version: 3, candidates };
}

/** Optional metadata: damaged, unsupported and legacy files return null.
 * Text/story import remains controlled by parseInPage(), unchanged. */
export function parseInPageObjectMetadata(input: ArrayBuffer | Uint8Array): InPageObjectMetadata | null {
  try {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 8 || bytes.length > MAX_INPAGE_BYTES ||
        ![0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((b, i) => bytes[i] === b)) return null;
    const cfb = CFB.read(bytes, { type: "array" });
    const root = cfb.FullPaths[0];
    const streams = cfb.FileIndex.filter((entry, i) => entry.type === 2 && cfb.FullPaths[i] === root + entry.name);
    if (!streams.some(entry => entry.name === "DocumentInfo")) return null;
    const mains = streams.filter(entry => ["InPage100", "InPage200", "InPage300"].includes(entry.name));
    if (mains.length !== 1 || mains[0].name !== "InPage300") return null;
    return parseInPage300ObjectStream(Uint8Array.from(mains[0].content));
  } catch { return null; }
}
