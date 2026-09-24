/**
 * GET /api/research/documents/:id/pages/:page
 * Read-only. Returns the stored page rawText unchanged.
 */
import type { ResearchEngineStore } from "../../../tools/research-studio/engine";

const DOCUMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const PAGE_NUMBER = /^[1-9]\d*$/;

export type ResearchPageResult = {
  documentId: string;
  pageNumber: number;
  rawText: string;
};

export type ResearchPageError = {
  error: string;
  code: "invalid" | "not_found" | "failed";
};

function invalid(): { status: 400; body: ResearchPageError } {
  return { status: 400, body: { error: "Malformed request.", code: "invalid" } };
}

function missing(): { status: 404; body: ResearchPageError } {
  return { status: 404, body: { error: "Not found.", code: "not_found" } };
}

function failed(): { status: 500; body: ResearchPageError } {
  return { status: 500, body: { error: "Research page fetch failed.", code: "failed" } };
}

export function parseResearchPageParams(
  documentId: string,
  page: string,
): { documentId: string; pageNumber: number } | null {
  if (!DOCUMENT_ID.test(documentId)) return null;
  if (!PAGE_NUMBER.test(page)) return null;
  const pageNumber = Number(page);
  if (!Number.isSafeInteger(pageNumber)) return null;
  return { documentId, pageNumber };
}

export async function handleResearchPage(input: {
  documentId: string;
  page: string;
  store: ResearchEngineStore;
}): Promise<{ status: number; body: ResearchPageResult | ResearchPageError }> {
  const parsed = parseResearchPageParams(input.documentId, input.page);
  if (!parsed) return invalid();

  try {
    const loaded = input.store.get(parsed.documentId);
    if (!loaded.ok) {
      return loaded.error === "not_found" ? missing() : failed();
    }
    const page = loaded.value.pages.find((item) => item.pageNumber === parsed.pageNumber);
    if (!page || page.documentId !== parsed.documentId) return missing();
    return {
      status: 200,
      body: {
        documentId: page.documentId,
        pageNumber: page.pageNumber,
        rawText: page.rawText,
      },
    };
  } catch {
    return failed();
  }
}
