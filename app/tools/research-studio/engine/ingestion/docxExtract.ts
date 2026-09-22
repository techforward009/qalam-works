import mammoth from "mammoth";

export type DocxExtractOk = { ok: true; text: string };
export type DocxExtractErr = { ok: false; code: "corrupt" | "empty" };
export type DocxExtractResult = DocxExtractOk | DocxExtractErr;

/**
 * DOCX has no reliable visual page tree. One logical document unless `\f`
 * page breaks appear in extracted text. Do not invent page 1..N.
 */
export async function extractDocxText(bytes: Uint8Array): Promise<DocxExtractResult> {
  if (bytes.length === 0) return { ok: false, code: "empty" };
  try {
    const buffer = Buffer.from(bytes);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ?? "";
    if (text.trim().length === 0) return { ok: false, code: "empty" };
    return { ok: true, text };
  } catch {
    return { ok: false, code: "corrupt" };
  }
}
