import { describe, expect, it } from "vitest";
import {
  applyObjectGeometry,
  formatGeometryLength,
  parseGeometryLength,
  formatBorderWidth,
  parseBorderWidth,
  parseDegrees,
  formatDegrees,
  shapeVariantOf,
  frameKindForShape,
} from "../app/tools/document-studio/utils/objectAttributes";
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

  it("allows intra-family shape switches and blocks cross-family or line/text switches", () => {
    expect(applyObjectGeometry(frame, { kind: "picture-ellipse" })?.kind).toBe("picture-ellipse");
    expect(applyObjectGeometry(frame, { kind: "picture-round-rect" })?.kind).toBe("picture-round-rect");
    expect(applyObjectGeometry(frame, { kind: "rect" })).toBeNull();
    expect(applyObjectGeometry(frame, { kind: "text" })).toBeNull();

    const rectFrame: StudioFrame = { id: "rect-1", kind: "rect", page: 1, xMm: 10, yMm: 20, wMm: 30, hMm: 40, flip: false, text: "" };
    expect(applyObjectGeometry(rectFrame, { kind: "ellipse" })?.kind).toBe("ellipse");
    expect(applyObjectGeometry(rectFrame, { kind: "round-rect" })?.kind).toBe("round-rect");
    expect(applyObjectGeometry(rectFrame, { kind: "picture-rect" })).toBeNull();

    const lineFrame: StudioFrame = { id: "line-1", kind: "line", page: 1, xMm: 10, yMm: 20, wMm: 30, hMm: 2, flip: false, text: "" };
    expect(applyObjectGeometry(lineFrame, { kind: "rect" })).toBeNull();

    expect(shapeVariantOf("picture-round-rect")).toBe("round-rect");
    expect(shapeVariantOf("ellipse")).toBe("ellipse");
    expect(shapeVariantOf("line")).toBeNull();
    expect(shapeVariantOf("text")).toBeNull();
    expect(frameKindForShape("picture-rect", "ellipse")).toBe("picture-ellipse");
    expect(frameKindForShape("round-rect", "rect")).toBe("rect");
    expect(frameKindForShape("text", "rect")).toBeNull();
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
  it.each([{ borderColor: "red" }, { backgroundColor: "transparent" }, { borderWidthMm: 0 }, { borderWidthMm: Infinity }, { borderPattern: "zig-zag" }, { backgroundHatch: "cross" }])("rejects invalid style patch $patch", patch => {
    expect(applyObjectGeometry(frame, patch as never)).toBeNull();
  });
});

describe("Run Around eligibility and transitions", () => {
  it("allows Run Around and clearances on unrotated rectangular picture, text, and shape frames", () => {
    for (const kind of ["picture-rect", "text", "rect"] as const) {
      const target: StudioFrame = { ...frame, kind, angle1Deg: 0 };
      const updated = applyObjectGeometry(target, {
        runAround: true,
        runAroundLeftMm: 3.5,
        runAroundRightMm: 4,
        runAroundTopMm: 1.5,
        runAroundBottomMm: 2.5,
      });
      expect(updated).toMatchObject({
        runAround: true,
        runAroundLeftMm: 3.5,
        runAroundRightMm: 4,
        runAroundTopMm: 1.5,
        runAroundBottomMm: 2.5,
      });
    }
  });

  it.each([
    { kind: "picture-ellipse", angle1Deg: 0 },
    { kind: "picture-round-rect", angle1Deg: 0 },
    { kind: "ellipse", angle1Deg: 0 },
    { kind: "round-rect", angle1Deg: 0 },
    { kind: "line", angle1Deg: 0 },
    { kind: "picture-rect", angle1Deg: 15 },
    { kind: "text", angle1Deg: -5 },
    { kind: "rect", angle1Deg: 10 },
  ] as const)("rejects enabling Run Around on unsupported shape $kind at angle $angle1Deg", ({ kind, angle1Deg }) => {
    const target: StudioFrame = { ...frame, kind, angle1Deg };
    expect(applyObjectGeometry(target, { runAround: true })).toBeNull();
  });

  it("clears active Run Around when a rectangular box is switched to an ellipse or rotated", () => {
    const wrapping: StudioFrame = { ...frame, kind: "picture-rect", angle1Deg: 0, runAround: true };
    const asEllipse = applyObjectGeometry(wrapping, { kind: "picture-ellipse" });
    expect(asEllipse).toMatchObject({ kind: "picture-ellipse", runAround: false });

    const asRotated = applyObjectGeometry(wrapping, { angle1Deg: 15 });
    expect(asRotated).toMatchObject({ kind: "picture-rect", angle1Deg: 15, runAround: false });
  });
});
