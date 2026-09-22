import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  extractStringsFromPdfContent,
  ingestDocument,
} from "../../app/tools/research-studio/engine";
import { processText } from "../../app/utils/processing/processText";

function utf16BeHexTj(text: string): string {
  let hex = "FEFF";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp > 0xffff) continue;
    hex += cp.toString(16).toUpperCase().padStart(4, "0");
  }
  return `<${hex}>`;
}

function buildUncompressedPdf(pageTexts: string[]): Uint8Array {
  const pageCount = pageTexts.length;
  const pageObjNums = pageTexts.map((_, i) => 3 + i);
  const contentObjNums = pageTexts.map((_, i) => 3 + pageCount + i);
  const objects: string[] = [];

  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push(
    `2 0 obj<< /Type /Pages /Count ${pageCount} /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] >>endobj\n`,
  );
  pageTexts.forEach((_, i) => {
    objects.push(
      `${pageObjNums[i]} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents ${contentObjNums[i]} 0 R /Resources << >> >>endobj\n`,
    );
  });
  pageTexts.forEach((text, i) => {
    const inner = text.length === 0 ? "BT ET\n" : `BT ${utf16BeHexTj(text)} Tj ET\n`;
    objects.push(
      `${contentObjNums[i]} 0 obj<< /Length ${Buffer.byteLength(inner, "latin1")} >>stream\n${inner}endstream\nendobj\n`,
    );
  });

  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += obj;
  }
  const xrefPos = Buffer.byteLength(out, "latin1");
  const size = objects.length + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let i = 1; i < size; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `${xref}trailer<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

async function helveticaPdf(pageTexts: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = doc.addPage([200, 200]);
    if (text.length > 0) {
      page.drawText(text, { x: 20, y: 100, size: 12, font });
    }
  }
  return doc.save();
}

async function makeDocx(paragraphs: string[]): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        children: paragraphs.map((text) => new Paragraph({ children: [new TextRun(text)] })),
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

describe("PDF content string extraction", () => {
  test("reads UTF-16BE hex (Urdu / Arabic / Persian) without mutation", () => {
    const ur = extractStringsFromPdfContent(`BT ${utf16BeHexTj("یہ اردو ہے۔")} Tj ET`);
    expect(ur).toBe("یہ اردو ہے۔");
    const ar = extractStringsFromPdfContent(`BT ${utf16BeHexTj("هذا نص عربي.")} Tj ET`);
    expect(ar).toBe("هذا نص عربي.");
    const fa = extractStringsFromPdfContent(`BT ${utf16BeHexTj("این متن فارسی است.")} Tj ET`);
    expect(fa).toBe("این متن فارسی است.");
  });

  test("keeps mixed RTL/LTR URL intact", () => {
    const mixed = "اردو https://qalamworks.com دیکھیں";
    expect(extractStringsFromPdfContent(`BT ${utf16BeHexTj(mixed)} Tj ET`)).toBe(mixed);
  });
});

describe("ingestDocument — PDF page preservation", () => {
  test("3-page PDF → pages 1, 2, 3 in order", async () => {
    const bytes = await helveticaPdf(["Page one", "Page two", "Page three"]);
    const result = await ingestDocument({
      bytes,
      filename: "book.pdf",
      documentId: "book_001",
    });
    expect(result.document.processingStatus).toBe("ready");
    expect(result.document.pageCount).toBe(3);
    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(result.pages.map((p) => p.id)).toEqual(["book_001:p1", "book_001:p2", "book_001:p3"]);
    expect(result.pages[0].rawText).toContain("Page one");
    expect(result.pages[1].rawText).toContain("Page two");
    expect(result.pages[2].rawText).toContain("Page three");
    expect(result.pages.every((p) => p.extractionMethod === "pdf-text")).toBe(true);
  });

  test("blank middle page keeps pageNumber 2 (no collapse)", async () => {
    const bytes = await helveticaPdf(["Alpha", "", "Gamma"]);
    const result = await ingestDocument({ bytes, filename: "gaps.pdf", documentId: "gaps" });
    expect(result.pages).toHaveLength(3);
    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[1].rawText.trim()).toBe("");
    expect(result.pages[2].pageNumber).toBe(3);
    expect(result.pages[2].rawText).toContain("Gamma");
  });

  test("Urdu PDF page round-trips rawText including Arabic punctuation", async () => {
    const raw = "یہ اردو ہے۔";
    const bytes = buildUncompressedPdf([raw]);
    const result = await ingestDocument({ bytes, filename: "urdu.pdf", documentId: "ur" });
    expect(result.document.processingStatus).toBe("ready");
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].rawText).toBe(raw);
    expect(result.pages[0].normalizedText).toBe(processText(raw, "auto").output);
    expect(result.pages[0].rawText).toBe(raw);
  });

  test("Arabic, Persian, and mixed pages keep scripts and URLs", async () => {
    const pages = [
      "هذا نص عربي.",
      "این متن فارسی است.",
      "اردو https://qalamworks.com دیکھیں",
    ];
    const bytes = buildUncompressedPdf(pages);
    const result = await ingestDocument({ bytes, filename: "mixed.pdf" });
    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(result.pages[0].rawText).toBe(pages[0]);
    expect(result.pages[1].rawText).toBe(pages[1]);
    expect(result.pages[2].rawText).toContain("https://qalamworks.com");
    expect(result.pages[2].rawText).toContain("اردو");
  });

  test("truncated / invalid PDF → corrupt, zero pages", async () => {
    const valid = await helveticaPdf(["ok"]);
    const truncated = valid.slice(0, Math.min(24, valid.length));
    const result = await ingestDocument({ bytes: truncated, filename: "bad.pdf" });
    expect(result.document.processingStatus).toBe("failed");
    expect(result.document.failureCode).toBe("corrupt");
    expect(result.pages).toEqual([]);
  });
});

describe("ingestDocument — DOCX / TXT / MD", () => {
  test("DOCX Urdu + English stays one logical page (no fake page numbers)", async () => {
    const bytes = await makeDocx([
      "یہ اردو کا پیراگراف ہے۔",
      "This is an English paragraph.",
    ]);
    const result = await ingestDocument({ bytes, filename: "note.docx", documentId: "d1" });
    expect(result.document.processingStatus).toBe("ready");
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].extractionMethod).toBe("docx");
    expect(result.pages[0].rawText).toContain("یہ اردو کا پیراگراف ہے۔");
    expect(result.pages[0].rawText).toContain("This is an English paragraph.");
  });

  test("TXT form-feed splits real pages; MD is a single page without \\f", async () => {
    const txt = await ingestDocument({
      bytes: new TextEncoder().encode("one\ftwo\fthree"),
      filename: "a.txt",
      documentId: "t1",
    });
    expect(txt.pages.map((p) => p.rawText)).toEqual(["one", "two", "three"]);
    expect(txt.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(txt.pages[0].extractionMethod).toBe("plain");

    const md = await ingestDocument({
      bytes: new TextEncoder().encode("# Title\n\nاردو پیراگراف"),
      filename: "a.md",
    });
    expect(md.pages).toHaveLength(1);
    expect(md.pages[0].extractionMethod).toBe("markdown");
    expect(md.pages[0].rawText).toContain("اردو پیراگراف");
  });

  test("empty file / whitespace TXT → failed empty, zero pages", async () => {
    const empty = await ingestDocument({ bytes: new Uint8Array(), filename: "e.txt" });
    expect(empty.document.failureCode).toBe("empty");
    expect(empty.pages).toEqual([]);

    const spaces = await ingestDocument({
      bytes: new TextEncoder().encode("   \n\t"),
      filename: "s.txt",
    });
    expect(spaces.document.failureCode).toBe("empty");
    expect(spaces.pages).toEqual([]);
  });

  test("PNG / unknown binary → unsupported", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2]);
    const result = await ingestDocument({ bytes: png, filename: "scan.png" });
    expect(result.document.processingStatus).toBe("failed");
    expect(result.document.failureCode).toBe("unsupported");
    expect(result.pages).toEqual([]);
  });

  test("corrupt DOCX → failed corrupt, zero pages", async () => {
    const result = await ingestDocument({
      bytes: new TextEncoder().encode("not-a-docx"),
      filename: "broken.docx",
    });
    expect(result.document.processingStatus).toBe("failed");
    expect(result.document.failureCode).toBe("corrupt");
    expect(result.pages).toEqual([]);
  });

  test("Persian and Arabic TXT keep scripts; language is not forced to Urdu", async () => {
    const fa = await ingestDocument({
      bytes: new TextEncoder().encode("این گزارش پارسی است."),
      filename: "fa.txt",
    });
    expect(fa.pages[0].rawText).toContain("پارسی");
    expect(fa.document.language).toBe("fa");

    const ar = await ingestDocument({
      bytes: new TextEncoder().encode("هذا نص عربي."),
      filename: "ar.txt",
    });
    expect(ar.pages[0].rawText).toContain("عربي");
    expect(["ar", "unknown"]).toContain(ar.document.language);
  });

  test("normalizedText is processText copy; rawText is never overwritten", async () => {
    const raw = "یہ    متن ہے۔";
    const result = await ingestDocument({
      bytes: new TextEncoder().encode(raw),
      filename: "u.txt",
    });
    expect(result.pages[0].rawText).toBe(raw);
    expect(result.pages[0].normalizedText).toBe(processText(raw, "auto").output);
    expect(result.pages[0].normalizedText).not.toBe(result.pages[0].rawText);
  });
});
