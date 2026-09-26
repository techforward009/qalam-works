import { createChunks, ingestDocument } from "../../app/tools/research-studio/engine";
import { extractPdfPages } from "../../app/tools/research-studio/engine/ingestion/pdfExtract";

function utf16beHex(text: string): string {
  let hex = "";
  for (const ch of text) hex += ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
  return hex;
}

function uncompressedPdf(objects: string[]): Uint8Array {
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += obj;
  }
  const xrefPos = Buffer.byteLength(out, "latin1");
  const size = objects.length + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let i = 1; i < size; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  out += `${xref}trailer<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

function streamObj(id: number, body: string): string {
  return `${id} 0 obj<< /Length ${Buffer.byteLength(body, "latin1")} >>stream\n${body}endstream\nendobj\n`;
}

/** Glyph IDs are not the Unicode code points. ToUnicode is the only way back. */
function encodedFontPdf(): Uint8Array {
  const cmap = [
    "begincmap",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    "3 beginbfchar",
    `<0001> <${utf16beHex("Abrotanum")}>`,
    `<0002> <${utf16beHex("Southernwood")}>`,
    `<0003> <${utf16beHex("Marasmus of children")}>`,
    "endbfchar",
    "endcmap",
    "",
  ].join("\n");
  const page2 = "BT /F1 12 Tf <0001> Tj <0002> Tj <0003> Tj ET\n";
  return uncompressedPdf([
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Count 3 /Kids [3 0 R 4 0 R 5 0 R] >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 6 0 R /Resources << >> >>endobj\n",
    "4 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 7 0 R /Resources << /Font << /F1 9 0 R >> >> >>endobj\n",
    "5 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 8 0 R /Resources << >> >>endobj\n",
    streamObj(6, "BT ET\n"),
    streamObj(7, page2),
    streamObj(8, "BT (Tail page) Tj ET\n"),
    "9 0 obj<< /Type /Font /Subtype /Type0 /BaseFont /Encoded /Encoding /Identity-H /ToUnicode 10 0 R >>endobj\n",
    streamObj(10, cmap),
  ]);
}

function bfrangePdf(): Uint8Array {
  const cmap = [
    "begincmap",
    "1 beginbfrange",
    "<0100> <0102> <0041>",
    "endbfrange",
    "endcmap",
    "",
  ].join("\n");
  return uncompressedPdf([
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Count 1 /Kids [3 0 R] >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    streamObj(4, "BT /F1 12 Tf <010001010102> Tj ET\n"),
    "5 0 obj<< /Type /Font /Subtype /Type0 /BaseFont /Range /Encoding /Identity-H /ToUnicode 6 0 R >>endobj\n",
    streamObj(6, cmap),
  ]);
}

describe("encoded PDF font extraction", () => {
  test("ToUnicode bfchar restores Abrotanum on the cited page", async () => {
    const extracted = await extractPdfPages(encodedFontPdf());
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.pages).toHaveLength(3);
    expect(extracted.pages[0]).not.toContain("Abrotanum");
    expect(extracted.pages[1]).toContain("Abrotanum");
    expect(extracted.pages[1]).toContain("Southernwood");
    expect(extracted.pages[1]).toContain("Marasmus of children");
    expect(extracted.pages[1]).not.toMatch(/[\u0000-\u0008]/);
    expect(extracted.pages[2]).toContain("Tail page");

    const ingested = await ingestDocument({
      bytes: encodedFontPdf(),
      filename: "Allen_Keynotes_and_Characteristics.pdf",
      documentId: "doc_encoded",
    });
    expect(ingested.document.processingStatus).toBe("ready");
    expect(ingested.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3]);
    expect(ingested.pages[1].rawText).toContain("Abrotanum");
    const chunks = createChunks(ingested.pages);
    expect(chunks.chunks.some((chunk) => chunk.normalizedText.toLowerCase().includes("abrotanum"))).toBe(true);
  });

  test("ToUnicode bfrange maps glyph ids instead of leaving control bytes", async () => {
    const extracted = await extractPdfPages(bfrangePdf());
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;
    expect(extracted.pages).toEqual(["ABC"]);
    expect(extracted.pages[0]).not.toMatch(/[\u0000-\u0008]/);
  });
});
