import type { ProcessingLanguage } from "../../../../utils/processing/types";
import {
  generateDocumentId,
  pageId,
  type DocumentPage,
  type ExtractionMethod,
  type FailureCode,
  type ResearchDocument,
} from "../types/document";
import { extractDocxText } from "./docxExtract";
import { detectDocumentLanguage, normalizePageText } from "./normalizePages";
import { extractPdfPages } from "./pdfExtract";
import { decodeTextBytes, plainExtractionMethod, splitPlainPages } from "./plainExtract";
import { mimeForKind, sniffKind } from "./sniffKind";

export type IngestInput = {
  bytes: Uint8Array;
  filename: string;
  mimeType?: string;
  languageMode?: ProcessingLanguage;
  documentId?: string;
};

export type IngestResult = {
  document: ResearchDocument;
  pages: DocumentPage[];
};

function failedDoc(
  input: IngestInput,
  id: string,
  mimeType: string,
  code: FailureCode,
  createdAt: string,
): IngestResult {
  return {
    document: {
      id,
      filename: input.filename,
      mimeType,
      language: "unknown",
      pageCount: 0,
      createdAt,
      processingStatus: "failed",
      failureCode: code,
    },
    pages: [],
  };
}

function buildPages(
  documentId: string,
  rawPages: string[],
  method: ExtractionMethod,
  mode: ProcessingLanguage,
): DocumentPage[] {
  return rawPages.map((rawText, i) => {
    const pageNumber = i + 1;
    return {
      id: pageId(documentId, pageNumber),
      documentId,
      pageNumber,
      rawText,
      normalizedText: normalizePageText(rawText, mode),
      extractionMethod: method,
    };
  });
}

/**
 * Phase A: file bytes → ResearchDocument + DocumentPage[].
 * No LLM. Does not rewrite rawText.
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const createdAt = new Date().toISOString();
  const id = input.documentId ?? generateDocumentId();
  const mode = input.languageMode ?? "auto";
  const bytes = input.bytes;

  try {
    if (bytes.length === 0) {
      return failedDoc(input, id, input.mimeType ?? "application/octet-stream", "empty", createdAt);
    }

    const kind = sniffKind(input.filename, input.mimeType, bytes);
    const mimeType = mimeForKind(kind, input.mimeType);

    if (kind === "unsupported") {
      return failedDoc(input, id, mimeType, "unsupported", createdAt);
    }

    let rawPages: string[] = [];
    let method: ExtractionMethod = "plain";

    if (kind === "pdf") {
      const extracted = await extractPdfPages(bytes);
      if (!extracted.ok) return failedDoc(input, id, mimeType, extracted.code, createdAt);
      rawPages = extracted.pages;
      method = "pdf-text";
    } else if (kind === "docx") {
      const extracted = await extractDocxText(bytes);
      if (!extracted.ok) return failedDoc(input, id, mimeType, extracted.code, createdAt);
      rawPages = splitPlainPages(extracted.text);
      method = "docx";
    } else {
      const text = decodeTextBytes(bytes);
      rawPages = splitPlainPages(text);
      method = plainExtractionMethod(kind);
      if (rawPages.every((p) => p.trim().length === 0)) {
        return failedDoc(input, id, mimeType, "empty", createdAt);
      }
    }

    const pages = buildPages(id, rawPages, method, mode);
    const hasVisible = pages.some((p) => p.rawText.trim().length > 0);

    if (!hasVisible && kind !== "pdf") {
      return failedDoc(input, id, mimeType, "empty", createdAt);
    }

    // PDF: keep blank pages so numbers never collapse. All-blank still `ready`.
    return {
      document: {
        id,
        filename: input.filename,
        mimeType,
        language: detectDocumentLanguage(rawPages, mode),
        pageCount: pages.length,
        createdAt,
        processingStatus: "ready",
      },
      pages,
    };
  } catch {
    return failedDoc(
      input,
      id,
      input.mimeType ?? "application/octet-stream",
      "internal",
      createdAt,
    );
  }
}
