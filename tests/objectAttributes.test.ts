import { describe, expect, it } from "vitest";
import { applyObjectGeometry, formatGeometryLength, parseGeometryLength, formatBorderWidth, parseBorderWidth, parseDegrees, formatDegrees } from "../app/tools/document-studio/utils/objectAttributes";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";

const frame: StudioFrame = { id: "pic-1", kind: "picture-rect", page: 3, xMm: 10, yMm: 20, wMm: 30, hMm: 40, flip: false, text: "", imageSrc: "data:image/png;base64,abc" };

describe("geometry length text", () => {
  it.each([["12", 12], ["12.5", 12.5], ["12.50", 12.5], ["12.5mm", 12.5], ["12.5 mm", 12.5], [" 12.5 MM ", 12.5]] as const)("parses %s", (raw, expected) => {
    expect(parseGeometryLength(raw)).toBe(expected);
  });

  it.each(["", "   ", "abc", "mm", "12px"])("rejects %j without coercing it to zero", raw => {
    expect(Number.isNaN(parseGeometryLength(raw))).toBe(true);
    expect(parseGeometryLength(raw)).not.toBe(0);
  });

  it("formats finite lengths with two decimals and an mm suffix", () => {
    expect(formatGeometryLength(26.46)).toBe("26.46mm");
  });
});

describe("degree values", () => {
  it.each([["0°", 0], ["90°", 90], ["-15°", -15], ["12", 12]] as const)("parses %s as degrees", (raw, value) => expect(parseDegrees(raw)).toBe(value));
  it("rejects non-finite text and formats degree suffix", () => { expect(Number.isNaN(parseDegrees("Infinity"))).toBe(true); expect(formatDegrees(90)).toBe("90°"); });
});

describe("applyObjectGeometry", () => {
  it("updates numeric geometry while preserving frame identity and image data", () => {
    expect(applyObjectGeometry(frame, { xMm: 12.5, wMm: 55 })).toEqual({ ...frame, xMm: 12.5, wMm: 55 });
  });

  it.each([{ xMm: "bad" }, { wMm: 0 }, { hMm: 0.5 }])("rejects invalid geometry $patch", (patch) => {
    expect(applyObjectGeometry(frame, patch as never)).toBeNull();
  });

  it("accepts sparse picture attributes and rejects invalid ones", () => {
    expect(applyObjectGeometry(frame, { imageXMm: 3, locked: true, dontPrint: true, roundnessMm: 3 })).toMatchObject({ imageXMm: 3, locked: true, dontPrint: true, roundnessMm: 3 });
    expect(applyObjectGeometry(frame, { imageWMm: Number.NaN })).toBeNull();
    expect(applyObjectGeometry(frame, { roundnessMm: Infinity })).toBeNull();
    expect(applyObjectGeometry(frame, { locked: "yes" as never })).toBeNull();
  });
  it("accepts bounded rotation and border position, rejecting invalid values", () => {
    expect(applyObjectGeometry(frame, { angle1Deg: 15, angle2Deg: -15, borderPosition: "outside" })).toMatchObject({ angle1Deg: 15, angle2Deg: -15, borderPosition: "outside" });
    expect(applyObjectGeometry(frame, { angle1Deg: Infinity })).toBeNull();
    expect(applyObjectGeometry(frame, { angle2Deg: 3601 })).toBeNull();
    expect(applyObjectGeometry(frame, { borderPosition: "center" as never })).toBeNull();
  });

  it("allows only picture kind switches", () => {
    expect(applyObjectGeometry(frame, { kind: "picture-ellipse" })?.kind).toBe("picture-ellipse");
    expect(applyObjectGeometry(frame, { kind: "text" })).toBeNull();
  });

  it("ignores height on a single-line frame and still applies width", () => {
    const title: StudioFrame = { ...frame, kind: "text", singleLine: true, text: "عنوان", hMm: 8.5725 };
    expect(applyObjectGeometry(title, { hMm: 40 })?.hMm).toBe(8.5725);
    expect(applyObjectGeometry(title, { wMm: 70, hMm: 40 })).toMatchObject({ wMm: 70, hMm: 8.5725 });
    expect(applyObjectGeometry(title, { wMm: 70, hMm: 0.5 })).toMatchObject({ wMm: 70, hMm: 8.5725 });
    const multi: StudioFrame = { ...frame, kind: "text", text: "سطر", hMm: 25 };
    expect(applyObjectGeometry(multi, { hMm: 40 })?.hMm).toBe(40);
  });
});


describe("border width units", () => {
  it("parses points and millimetres and formats the legacy width honestly", () => {
    expect(parseBorderWidth("1pt")).toBeCloseTo(25.4 / 72);
    expect(parseBorderWidth("0.75pt")).toBeCloseTo(25.4 / 96);
    expect(parseBorderWidth("0.35mm")).toBeCloseTo(0.35);
    expect(parseBorderWidth("1")).toBeCloseTo(25.4 / 72);
    expect(formatBorderWidth(25.4 / 72)).toBe("1pt");
    expect(formatBorderWidth(25.4 / 96)).toBe("0.75pt");
  });
});

describe("appearance patches", () => {
  it("applies valid colors, width, pattern and hatch", () => {
    expect(applyObjectGeometry(frame, { borderColor: "#123456", borderWidthMm: 1, borderPattern: "none", backgroundColor: "#FFFFFF", backgroundHatch: "none" })).toMatchObject({ borderColor: "#123456", borderWidthMm: 1, backgroundColor: "#FFFFFF" });
    expect(applyObjectGeometry({ ...frame, backgroundColor: "#FFFFFF" }, { backgroundColor: "" })?.backgroundColor).toBeUndefined();
  });
  it.each([{ borderColor: "red" }, { backgroundColor: "transparent" }, { borderWidthMm: 0 }, { borderWidthMm: Infinity }, { borderPattern: "dashed" }, { backgroundHatch: "cross" }])("rejects invalid style patch $patch", patch => {
    expect(applyObjectGeometry(frame, patch as never)).toBeNull();
  });
});
