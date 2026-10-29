import { describe, expect, it } from "vitest";
import { inpageContainer, unicodeInpage, legacyInpage } from "./fixtures/inpage";
import { parseInPageObjectMetadata, parseInPage300ObjectStream } from "../app/tools/document-studio/utils/inpage/parseInPageObjectMetadata";

const header = Buffer.from([0x64, 0, 3, 0]);
const geometry = [408568, 153768, 396850, 170078];

function descriptor({ flag = "omitted", dims = geometry, length }: {
  flag?: "omitted" | "on" | "off" | "unknown"; dims?: number[]; length?: number;
} = {}): Buffer {
  const parts = Buffer.alloc(flag === "omitted" ? 58 : 62);
  Buffer.from([3, 0, 6, 0, 2, 0, 0, 0]).copy(parts);
  parts.writeUInt32LE(length ?? (flag === "omitted" ? 46 : 50), 8);
  Buffer.from([0x80, 0, 255, 255, 255, 255, 0x82, 0, 7, 0, 0, 0, 5, 3, 1, 0, 8, 3, 0x4c, 0, 0, 0]).copy(parts, 12);
  for (let i = 0; i < 4; i++) {
    parts[34 + 6 * i] = i;
    parts[35 + 6 * i] = 0x7e;
    parts.writeUInt32LE(dims[i], 36 + 6 * i);
  }
  if (flag !== "omitted") {
    parts[58] = 15; parts[59] = 0x7e;
    parts.writeUInt16LE(flag === "on" ? 1 : flag === "off" ? 0 : 5, 60);
  }
  return parts;
}
function logical(records: Buffer[]): Buffer { return Buffer.concat([header, Buffer.alloc(50), ...records, Buffer.alloc(16)]); }
function nativeStyle(records: Buffer[]) { return inpageContainer(logical(records), "InPage300"); }
const mm = (u: number) => u * 25.4 / (72 * 2000);

describe("read-only InPage300 object metadata", () => {
  it.each([
    ["on", "explicit-on"], ["off", "explicit-off"],
    ["omitted", "omitted"], ["unknown", "unknown"],
  ] as const)("recognises %s run-around without guessing other values", (flag, status) => {
    const result = parseInPageObjectMetadata(nativeStyle([descriptor({ flag })]));
    expect(result?.version).toBe(3);
    expect(result?.candidates).toHaveLength(1);
    const box = result!.candidates[0];
    expect(box.runAround).toBe(status);
    expect(box.xMm).toBeCloseTo(mm(408568), 8);
    expect(box.yMm).toBeCloseTo(mm(153768), 8);
    expect(box.widthMm).toBeCloseTo(mm(396850), 8);
    expect(box.heightMm).toBeCloseTo(mm(170078), 8);
    if (flag === "unknown") expect(box.unknownRunAroundValue).toBe(5);
    else expect(box.unknownRunAroundValue).toBeUndefined();
  });
  it("reads two candidates but does not infer their story or z-order", () => {
    const output = parseInPageObjectMetadata(nativeStyle([
      descriptor({ flag: "on" }),
      descriptor({ flag: "off", dims: [170068, 93768, 396850, 170078] }),
    ]));
    expect(output?.candidates.map(x => x.runAround)).toEqual(["explicit-on", "explicit-off"]);
    expect(output?.candidates[1].xMm).toBeCloseTo(30, 2);
  });
  it("does not mistake an unrelated 7E sequence for the exact descriptor", () => {
    const bad = descriptor({ flag: "off" }); bad[0] = 0;
    expect(parseInPageObjectMetadata(nativeStyle([bad]))?.candidates).toEqual([]);
  });
  it("rejects unproven record lengths and missing flags", () => {
    const badLength = descriptor({ flag: "on", length: 80 });
    const missingFlag = descriptor({ flag: "off" }); missingFlag[58] = 0;
    expect(parseInPageObjectMetadata(nativeStyle([badLength, missingFlag]))?.candidates).toEqual([]);
  });
  it("rejects invalid sizes and out-of-bounds coordinates", () => {
    const zero = descriptor({ dims: [408568, 153768, 0, 170078] });
    const giant = descriptor({ dims: [0xffffffff, 1, 396850, 170078] });
    expect(parseInPageObjectMetadata(nativeStyle([zero, giant]))?.candidates).toEqual([]);
  });
  it("does not read outside a truncated flag-bearing descriptor", () => {
    const stream = Buffer.concat([header, Buffer.alloc(8), descriptor({ flag: "off" }).subarray(0, 59)]);
    expect(parseInPage300ObjectStream(stream)?.candidates).toEqual([]);
  });
  it("leaves legacy, damaged, text-only and oversized files unsupported", () => {
    expect(parseInPageObjectMetadata(legacyInpage([[4, 0x81]]))).toBeNull();
    expect(parseInPageObjectMetadata(unicodeInpage([["سلام"]]))?.candidates).toEqual([]);
    expect(parseInPageObjectMetadata(new Uint8Array([0, 0, 3, 0]))).toBeNull();
    expect(parseInPageObjectMetadata(new Uint8Array(33 * 1024 * 1024))).toBeNull();
  });
  it("bounds an unexpectedly large number of matching descriptors", () => {
    expect(parseInPage300ObjectStream(logical(Array.from({ length: 65 }, () => descriptor())))).toBeNull();
  });
});
