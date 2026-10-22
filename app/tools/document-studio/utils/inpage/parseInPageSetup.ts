import * as CFB from "cfb";
import { INPAGE_UNITS_PER_POINT, MAX_INPAGE_BYTES } from "./parseInPage";

export type InPageSetup = {
  widthPt: number;
  heightPt: number;
  marginsPt: { inside: number; top: number; outside: number; bottom: number };
  firstPageNumber: number;
};

/** Optional setup metadata: corrupt/missing setup must never prevent text import. */
export function parseInPageSetup(input: ArrayBuffer | Uint8Array): InPageSetup | null {
  try {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length > MAX_INPAGE_BYTES) return null;
    const container = CFB.read(bytes, { type: "array" });
    const root = container.FullPaths[0];
    const streams = container.FileIndex.filter((entry, i) => entry.type === 2 && container.FullPaths[i] === `${root}${entry.name}` && ["InPage100", "InPage200", "InPage300"].includes(entry.name));
    if (streams.length !== 1) return null;
    const data = Uint8Array.from(streams[0].content);
    const view = new DataView(data.buffer);
    if (data.length < 4 || ![2, 3].includes(view.getUint16(2, true))) return null;
    for (let widthOffset = 4; widthOffset + 6 <= data.length; widthOffset++) {
      if (view.getUint16(widthOffset, true) !== 0x0106) continue;
      // Walk the small property block by tags, not a file-specific byte offset.
      let start = widthOffset;
      while (start >= 10 && view.getUint16(start - 6, true) >= 0x0106 && view.getUint16(start - 6, true) <= 0x010b) start -= 6;
      const values = new Map<number, number>();
      for (let p = start; p + 6 <= data.length; p += 6) {
        const tag = view.getUint16(p, true);
        if (tag < 0x0106 || tag > 0x010b || values.has(tag)) break;
        values.set(tag, view.getUint32(p + 2, true) / INPAGE_UNITS_PER_POINT);
      }
      if (values.size !== 6) continue;
      let firstPageNumber: number | null = null;
      for (let p = Math.max(4, start - 64); p + 6 <= start; p++) {
        if (view.getUint16(p, true) !== 0x0104) continue;
        // Real 2009/3.x headers also use compact u16 values for tags 0104/0105.
        const compact = p + 8 === start && view.getUint16(p + 4, true) === 0x0105;
        firstPageNumber = compact ? view.getUint16(p + 2, true) : view.getUint32(p + 2, true);
      }
      const widthPt = values.get(0x0106)!, heightPt = values.get(0x0107)!;
      const marginsPt = { inside: values.get(0x0108)!, top: values.get(0x0109)!, outside: values.get(0x010a)!, bottom: values.get(0x010b)! };
      const mm = (pt: number) => pt * 25.4 / 72;
      if (mm(widthPt) < 1 || mm(widthPt) > 2000 || mm(heightPt) < 1 || mm(heightPt) > 2000 ||
          marginsPt.inside < 0 || marginsPt.inside >= widthPt / 2 || marginsPt.outside < 0 || marginsPt.outside >= widthPt / 2 ||
          marginsPt.top < 0 || marginsPt.top >= heightPt / 2 || marginsPt.bottom < 0 || marginsPt.bottom >= heightPt / 2 ||
          firstPageNumber === null || firstPageNumber < 1) return null;
      return { widthPt, heightPt, marginsPt, firstPageNumber };
    }
  } catch { /* Optional metadata is deliberately fail-soft. */ }
  return null;
}
