import { describe, expect, it, vi } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { serializeQpg, deserializeQpg, shareOrDownloadQpg, QPG_FILE_ACCEPT } from "../app/tools/document-studio/utils/qpgFile";
import type { QpgDocument } from "../app/tools/document-studio/utils/qpgFile";

const example = (): QpgDocument => {
  const documentSettings = defaultDocumentSettings();
  documentSettings.page.size = "a5";
  documentSettings.page.orientation = "landscape";
  documentSettings.page.firstPageNumber = 7;
  documentSettings.page.margins = { preset: "custom", topMm: 15, bottomMm: 19, startMm: 17, endMm: 18 };
  documentSettings.typography.preferences = { firstSpaceWidth: 120, subsequentSpaceWidth: 70, reduceLatinFontsize: 12 };
  return {
    title: "اردو and English",
    content: { type: "doc", content: [
      { type: "paragraph", attrs: { textAlign: "justify", dir: "rtl", styleId: "body" }, content: [
        { type: "text", text: "اردو", marks: [{ type: "bold" }, { type: "textStyle", attrs: { fontFamily: "Mehr Nastaliq Web", fontSize: "20pt", color: "#f00000" } }] },
        { type: "text", text: " English", marks: [{ type: "italic" }, { type: "textStyle", attrs: { fontFamily: "Arial", fontSize: "12pt", color: "#123456" } }] },
      ] },
      { type: "paragraph", content: [{ type: "image", attrs: { src: "data:image/png;base64,iVBORw0KGgo=", width: 60, height: 60, alt: "Embedded" } }] },
    ] },
    frames: [
      { id: "frame-a", kind: "text", page: 1, xMm: 4, yMm: 5, wMm: 40, hMm: 15, flip: false, text: "متن A", nextFrameId: "frame-b" },
      { id: "frame-b", kind: "text", page: 1, xMm: 44, yMm: 5, wMm: 40, hMm: 15, flip: false, text: "متن B", previousFrameId: "frame-a" },
    ],
    documentSettings,
    minimumPages: 2,
    columns: { count: 2, gutterMm: 6.5 },
    viewMode: "facing",
  } as unknown as QpgDocument;
};
describe("Qalam Page portable files", () => {
  it("round-trips the complete existing model without dropping marks, embedded images, frames, layout or F11 values", () => {
    const original = example();
    const restored = deserializeQpg(serializeQpg(original));
    expect(restored).toEqual(original);
    expect(serializeQpg(original)).toContain('"version":1');
  });
  it.each(['{', '{"format":"wrong","version":1}', '{"format":"qalam-page","version":2}'])("rejects damaged, foreign and future documents without changing the current document", value => {
    const current = example();
    const before = structuredClone(current);
    expect(() => deserializeQpg(value)).toThrow();
    expect(current).toEqual(before);
  });
  it("refuses image URLs that would not travel with the file", () => {
    const doc = example();
    doc.content.content![1].content![0].attrs!.src = "https://example.org/lost.png";
    expect(() => serializeQpg(doc)).toThrow();
  });
  it("offers the .qpg Open filter alongside the existing extensions", () => {
    expect(QPG_FILE_ACCEPT).toContain(".qpg");
    expect(QPG_FILE_ACCEPT).toContain(".inp");
    expect(QPG_FILE_ACCEPT).toContain(".txt");
    expect(QPG_FILE_ACCEPT).toContain(".docx");
  });
  it("shares when supported and downloads otherwise", async () => {
    const file = new File([serializeQpg(example())], "test.qpg", { type: "application/octet-stream" });
    const download = vi.fn();
    const share = vi.fn().mockResolvedValue(undefined);
    await shareOrDownloadQpg(file, { canShare: () => true, share }, download);
    expect(share).toHaveBeenCalledWith({ files: [file] });
    expect(download).not.toHaveBeenCalled();
    await shareOrDownloadQpg(file, { canShare: () => false, share }, download);
    expect(download).toHaveBeenCalledWith(file);
  });
});
