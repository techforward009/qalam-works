import { describe, expect, it } from "vitest";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { applyObjectGeometry } from "../app/tools/document-studio/utils/objectAttributes";
import { renderPrintFrame, validatePrintFrames } from "../app/tools/document-studio/utils/printableFrames";
import { deserializeQpg, serializeQpg, type QpgDocument } from "../app/tools/document-studio/utils/qpgFile";
import { measureTextColumns, validTextColumnFields } from "../app/tools/document-studio/utils/textColumns";

const box = { id: "frame", page: 1, xMm: 10, yMm: 12, wMm: 80, hMm: 40, flip: false, text: "سلام دنیا" };
const text = { ...box, kind: "text" as const };
const picture = { ...box, kind: "picture-rect" as const };

function documentWith(frame: StudioFrame): QpgDocument {
  return {
    title: "columns",
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] },
    frames: [frame],
    documentSettings: defaultDocumentSettings(),
    minimumPages: 1,
    columns: { count: 1, gutterMm: 4.23 },
    viewMode: "pages",
  } as QpgDocument;
}

describe("text column fields", () => {
  it("accepts a real column setup and rejects values outside the saved range", () => {
    expect(validTextColumnFields({ columnCount: 2, columnGutterMm: 4, columnDirection: "rtl", insetMm: 1.5, textShape: "ellipse", borderPattern: "dashed", columnRulePattern: "dotted" })).toBe(true);
    expect(validTextColumnFields({})).toBe(true);
    expect(validTextColumnFields({ columnCount: 0 })).toBe(false);
    expect(validTextColumnFields({ columnCount: 1.5 })).toBe(false);
    expect(validTextColumnFields({ columnCount: 17 })).toBe(false);
    expect(validTextColumnFields({ columnGutterMm: -1 })).toBe(false);
    expect(validTextColumnFields({ columnDirection: "up" })).toBe(false);
    expect(validTextColumnFields({ insetMm: 501 })).toBe(false);
    expect(validTextColumnFields({ textShape: "round" })).toBe(false);
    expect(validTextColumnFields({ borderPattern: "zigzag" })).toBe(false);
    expect(validTextColumnFields({ columnRuleColor: "red" })).toBe(false);
  });

  it("persists columns on multiline text, strips them from single-line patches, and refuses them on pictures", () => {
    const stored = applyObjectGeometry(text, { columnCount: 3, columnGutterMm: 4, columnDirection: "ltr", insetMm: 2, columnRulePattern: "solid", columnRuleColor: "#123456", columnRuleSizeMm: 0.4, textShape: "ellipse", borderPattern: "dashed" });
    expect(stored).toMatchObject({ columnCount: 3, columnGutterMm: 4, columnDirection: "ltr", insetMm: 2, columnRulePattern: "solid", textShape: "ellipse", borderPattern: "dashed" });
    const title = applyObjectGeometry({ ...text, singleLine: true, hMm: 8.5725, columnCount: 2 }, { hMm: 40, columnCount: 4, columnGutterMm: 3, wMm: 50, insetMm: 1 });
    expect(title?.hMm).toBe(8.5725);
    expect(title?.wMm).toBe(50);
    expect(title?.columnCount).toBe(2);
    expect(title?.columnGutterMm).toBeUndefined();
    expect(title?.insetMm).toBe(1);
    expect(applyObjectGeometry(picture, { columnCount: 2 })).toBeNull();
    expect(applyObjectGeometry(picture, { textShape: "ellipse" })).toBeNull();
    expect(applyObjectGeometry(picture, { borderPattern: "dotted", borderColor: "#111111" })).toMatchObject({ borderPattern: "dotted", borderColor: "#111111" });
  });

  it("measures right-first columns, gutter, inset and a rule, and prints the same geometry", () => {
    const frame = { ...text, columnCount: 2, columnGutterMm: 4, insetMm: 2, columnRulePattern: "solid" as const, columnRuleColor: "#112233", columnRuleSizeMm: 0.3 };
    const measured = measureTextColumns(frame);
    expect(measured.count).toBe(2);
    expect(measured.direction).toBe("rtl");
    expect(measured.gutterMm).toBe(4);
    expect(measured.insetMm).toBe(2);
    expect(measured.columns[0].xMm).toBeGreaterThan(measured.columns[1].xMm);
    expect(measured.rule?.gaps).toHaveLength(1);
    expect(measured.rule?.color).toBe("#112233");
    const ltr = measureTextColumns({ ...frame, columnDirection: "ltr" });
    expect(ltr.columns[0].xMm).toBeLessThan(ltr.columns[1].xMm);
    expect(measureTextColumns({ ...frame, singleLine: true }).count).toBe(1);
    expect(measureTextColumns({ ...frame, singleLine: true }).rule).toBeNull();

    const html = renderPrintFrame(validatePrintFrames([frame])[0]);
    expect(html).toContain('data-print-text-columns="2"');
    expect(html).toContain('data-print-column-direction="rtl"');
    expect(html).toContain("column-count:2;");
    expect(html).toContain("column-gap:4mm;");
    expect(html).toContain("direction:rtl;");
    expect(html).toContain("column-rule:0.3mm solid #112233;");
    expect(html).toContain("padding:2mm;");
    expect(html).not.toContain("border:");
    const left = renderPrintFrame({ ...frame, columnDirection: "ltr" });
    expect(left).toContain('data-print-column-direction="ltr"');
    expect(left).toContain("direction:ltr;");
    expect(left).toContain('<div style="direction:rtl">');
    const plain = renderPrintFrame(text);
    expect(plain).not.toContain("data-print-text-columns");
    expect(plain).not.toContain("border:");
    expect(plain).toContain("padding:0.5291666667mm;");
    expect(renderPrintFrame({ ...text, borderPattern: "none", borderColor: "#123456" })).not.toContain("border:");
    expect(renderPrintFrame({ ...text, borderColor: "#123456", borderPosition: "outside" })).toContain("outline:0.2645833333mm solid #123456;");
    expect(renderPrintFrame({ ...text, textShape: "ellipse", borderPattern: "solid", borderColor: "#000000" })).toContain("border-radius:50%;");
    expect(renderPrintFrame({ ...text, singleLine: true, columnCount: 3, columnGutterMm: 4 })).not.toContain("data-print-text-columns");
    expect(renderPrintFrame({ ...box, kind: "line" })).toContain('stroke="#000"');
    expect(() => validatePrintFrames([{ ...frame, columnCount: 0 }])).toThrow();
  });

  it("round-trips column, inset and border fields and leaves old boxes without them", () => {
    const frame = { ...text, columnCount: 2, columnGutterMm: 3.5, columnDirection: "ltr" as const, columnRuleColor: "#ABCDEF", columnRuleSizeMm: 0.4, columnRulePattern: "dashed" as const, insetMm: 1.25, textShape: "ellipse" as const, borderPattern: "dotted" as const, borderColor: "#123456", borderWidthMm: 0.5, borderPosition: "inside" as const };
    const restored = deserializeQpg(serializeQpg(documentWith(frame))).frames[0];
    expect(restored).toMatchObject({ columnCount: 2, columnGutterMm: 3.5, columnDirection: "ltr", columnRuleColor: "#ABCDEF", columnRuleSizeMm: 0.4, columnRulePattern: "dashed", insetMm: 1.25, textShape: "ellipse", borderPattern: "dotted", borderPosition: "inside" });
    const legacy = serializeQpg(documentWith(text));
    expect(legacy).not.toContain("columnCount");
    expect(legacy).not.toContain("insetMm");
    expect(legacy).not.toContain("textShape");
    expect(deserializeQpg(legacy).frames[0]).not.toHaveProperty("columnCount");
    const broken = documentWith({ ...text, columnCount: 99 } as StudioFrame);
    expect(() => deserializeQpg(serializeQpg(broken))).toThrow();
  });
});
