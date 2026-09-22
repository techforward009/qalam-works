import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";

function asBytes(data: Uint8Array | Uint8ClampedArray): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function streamToBytes(stream: PDFStream): Uint8Array {
  if (stream instanceof PDFRawStream) {
    try {
      return asBytes(decodePDFRawStream(stream).decode());
    } catch {
      return stream.getContents();
    }
  }
  try {
    return stream.getContents();
  } catch {
    return new Uint8Array();
  }
}

function collectStreams(contents: unknown, lookup: (ref: PDFRef) => unknown): PDFStream[] {
  if (!contents) return [];
  if (contents instanceof PDFRef) {
    return collectStreams(lookup(contents), lookup);
  }
  if (contents instanceof PDFArray) {
    const out: PDFStream[] = [];
    for (let i = 0; i < contents.size(); i++) {
      out.push(...collectStreams(contents.get(i), lookup));
    }
    return out;
  }
  if (contents instanceof PDFStream) return [contents];
  return [];
}

function readLiteral(src: string, start: number): { text: string; end: number } {
  let i = start + 1;
  let out = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === ")") return { text: out, end: i + 1 };
    if (ch === "\\") {
      const n = src[i + 1];
      if (n === "n") {
        out += "\n";
        i += 2;
        continue;
      }
      if (n === "r") {
        out += "\r";
        i += 2;
        continue;
      }
      if (n === "t") {
        out += "\t";
        i += 2;
        continue;
      }
      if (n === "b") {
        out += "\b";
        i += 2;
        continue;
      }
      if (n === "f") {
        out += "\f";
        i += 2;
        continue;
      }
      if (n === "(" || n === ")" || n === "\\") {
        out += n;
        i += 2;
        continue;
      }
      if (n >= "0" && n <= "7") {
        let oct = n;
        let j = i + 2;
        while (oct.length < 3 && j < src.length && src[j] >= "0" && src[j] <= "7") {
          oct += src[j];
          j++;
        }
        out += String.fromCharCode(parseInt(oct, 8));
        i = j;
        continue;
      }
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return { text: out, end: src.length };
}

function readHex(src: string, start: number): { text: string; end: number } {
  let i = start + 1;
  let hex = "";
  while (i < src.length && src[i] !== ">") {
    if (!/\s/.test(src[i])) hex += src[i];
    i++;
  }
  const end = i < src.length ? i + 1 : src.length;
  if (hex.length % 2 === 1) hex += "0";
  const bytes = new Uint8Array(hex.length / 2);
  for (let b = 0; b < bytes.length; b++) {
    bytes[b] = parseInt(hex.slice(b * 2, b * 2 + 2), 16);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), end };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), end };
  }
  return { text: new TextDecoder("latin1").decode(bytes), end };
}

/** Pull literal / hex strings from a PDF content stream (born-digital text layer). */
export function extractStringsFromPdfContent(src: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "(") {
      const read = readLiteral(src, i);
      parts.push(read.text);
      i = read.end;
      continue;
    }
    if (ch === "<" && src[i + 1] !== "<") {
      const read = readHex(src, i);
      parts.push(read.text);
      i = read.end;
      continue;
    }
    i++;
  }
  return parts.join(" ").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}

export type PdfExtractOk = { ok: true; pages: string[] };
export type PdfExtractErr = { ok: false; code: "corrupt" | "empty" };
export type PdfExtractResult = PdfExtractOk | PdfExtractErr;

/**
 * One string per PDF page, 1-based order preserved (blank pages stay).
 */
export async function extractPdfPages(bytes: Uint8Array): Promise<PdfExtractResult> {
  if (bytes.length === 0) return { ok: false, code: "empty" };

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch {
    return { ok: false, code: "corrupt" };
  }

  const pdfPages = doc.getPages();
  if (pdfPages.length === 0) return { ok: false, code: "empty" };

  const lookup = (ref: PDFRef) => doc.context.lookup(ref);
  const pages: string[] = [];

  for (const page of pdfPages) {
    try {
      const streams = collectStreams(page.node.Contents(), lookup);
      const texts = streams.map((stream) => {
        const raw = streamToBytes(stream);
        return extractStringsFromPdfContent(new TextDecoder("latin1").decode(raw));
      });
      pages.push(texts.filter(Boolean).join("\n"));
    } catch {
      pages.push("");
    }
  }

  return { ok: true, pages };
}
