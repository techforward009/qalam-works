import { describe, expect, it } from "vitest";
import { PDF_SOURCE_LIMITS, measureJsonUtf8Bytes, preflightPdfSource } from "../app/tools/document-studio/utils/pdfSourcePreflight";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const nested = (depth: number) => {
  let node = { type: "text", text: "x" } as { type: string; text?: string; content?: typeof node[] };
  for (let index = 0; index < depth; index++) node = { type: "container", content: [node] };
  return node;
};

describe("PDF source complexity preflight", () => {
  it("allows normal and representative 300-line sources with measured headroom", () => {
    expect(preflightPdfSource({ type: "doc", content: [paragraph("کراچی Document Studio 2026")] }).bytes).toBeLessThan(PDF_SOURCE_LIMITS.bytes);
    const result = preflightPdfSource({ type: "doc", content: Array.from({ length: 300 }, (_, i) => paragraph(`Performance row ${i + 1}: deterministic layout content.`)) });
    expect(result).toMatchObject({ textNodes: 300 });
    expect(result.bytes).toBeLessThan(PDF_SOURCE_LIMITS.bytes);
    expect(result.codePoints).toBeLessThan(PDF_SOURCE_LIMITS.codePoints);
  });

  it("rejects oversized bytes and aggregate characters deterministically", () => {
    const byteHeavy = Array.from({ length: 3 }, () => paragraph("ی".repeat(18_000)));
    expect(() => preflightPdfSource({ type: "doc", content: byteHeavy })).toThrow(`${PDF_SOURCE_LIMITS.bytes}-byte limit`);
    const chunks = Array.from({ length: 4 }, () => paragraph("x".repeat(15_001)));
    expect(() => preflightPdfSource({ type: "doc", content: chunks })).toThrow(`${PDF_SOURCE_LIMITS.codePoints} code-point limit`);
  });

  it("rejects a pathological single text node before layout", () => {
    expect(() => preflightPdfSource({ type: "doc", content: [paragraph("x".repeat(PDF_SOURCE_LIMITS.singleTextNodeCodePoints + 1))] }))
      .toThrow(`${PDF_SOURCE_LIMITS.singleTextNodeCodePoints} code-point single-text-node limit`);
  });

  it("enforces the 2,500/2,501 total-node boundary before recursive serialization", () => {
    const flat = (children: number) => ({ type: "doc", content: Array.from({ length: children }, () => ({ type: "paragraph" })) });
    expect(preflightPdfSource(flat(PDF_SOURCE_LIMITS.nodes - 1)).nodes).toBe(PDF_SOURCE_LIMITS.nodes);
    expect(() => preflightPdfSource(flat(PDF_SOURCE_LIMITS.nodes))).toThrow(`${PDF_SOURCE_LIMITS.nodes}-node limit`);
  });

  it.each([PDF_SOURCE_LIMITS.nodes + 1, 200_000])("rejects %i wide children explicitly without argument expansion", children => {
    const doc = { type: "doc", content: Array.from({ length: children }, () => ({ type: "paragraph" })) };
    expect(() => preflightPdfSource(doc)).toThrow(`${PDF_SOURCE_LIMITS.nodes}-node limit`);
  });

  it("allows 2,500 deeply nested nodes without recursive serialization", () => {
    expect(preflightPdfSource(nested(PDF_SOURCE_LIMITS.nodes - 1)).nodes).toBe(PDF_SOURCE_LIMITS.nodes);
    expect(preflightPdfSource(nested(2_400)).nodes).toBe(2_401);
  });

  it("enforces the 1,200/1,201 text-node boundary", () => {
    const textNodes = (count: number) => ({ type: "doc", content: Array.from({ length: count }, () => ({ type: "text", text: "x" })) });
    expect(preflightPdfSource(textNodes(PDF_SOURCE_LIMITS.textNodes)).textNodes).toBe(PDF_SOURCE_LIMITS.textNodes);
    expect(() => preflightPdfSource(textNodes(PDF_SOURCE_LIMITS.textNodes + 1))).toThrow(`${PDF_SOURCE_LIMITS.textNodes} text-node limit`);
  });

  it.each([2_501, 3_000, 4_000])("rejects depth %i explicitly without a stack overflow", depth => {
    expect(() => preflightPdfSource(nested(depth))).toThrow(`${PDF_SOURCE_LIMITS.nodes}-node limit`);
  });

  it("matches JSON UTF-8 semantics and enforces the byte boundary exactly", () => {
    const samples = [null, true, false, 1.25, -0, "Urdu اردو\n\"\\", "\ud800", [1, "ی", null], { b: "😀", a: 2 }];
    for (const sample of samples) expect(measureJsonUtf8Bytes(sample)).toBe(new TextEncoder().encode(JSON.stringify(sample)).byteLength);
    const sized = (target: number) => {
      const doc = { type: "doc", attrs: { padding: "" } };
      const base = measureJsonUtf8Bytes(doc);
      doc.attrs.padding = "x".repeat(target - base);
      return doc;
    };
    expect(preflightPdfSource(sized(PDF_SOURCE_LIMITS.bytes - 1)).bytes).toBe(PDF_SOURCE_LIMITS.bytes - 1);
    expect(preflightPdfSource(sized(PDF_SOURCE_LIMITS.bytes)).bytes).toBe(PDF_SOURCE_LIMITS.bytes);
    expect(() => preflightPdfSource(sized(PDF_SOURCE_LIMITS.bytes + 1))).toThrow(`${PDF_SOURCE_LIMITS.bytes}-byte limit`);
  });

  it("handles deeply nested input near the byte limit deterministically", () => {
    const doc = nested(PDF_SOURCE_LIMITS.nodes - 1) as ReturnType<typeof nested> & { padding?: string };
    doc.padding = "";
    const base = measureJsonUtf8Bytes(doc);
    doc.padding = "x".repeat(PDF_SOURCE_LIMITS.bytes - base);
    expect(preflightPdfSource(doc).bytes).toBe(PDF_SOURCE_LIMITS.bytes);
    doc.padding += "x";
    expect(() => preflightPdfSource(doc)).toThrow(`${PDF_SOURCE_LIMITS.bytes}-byte limit`);
  });
});
