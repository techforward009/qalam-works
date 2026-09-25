/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleResearchAsk } from "../../app/api/research/ask/handleAsk";
import ResearchStudioWorkspace from "../../app/tools/research-studio/components/ResearchStudioWorkspace";
import {
  createChunks,
  hydrateResearchStore,
  ingestDocument,
  makeStoredCorpus,
  researchDocumentPathname,
  saveDurableCorpus,
  type ResearchBlobClient,
  type StoredCorpus,
} from "../../app/tools/research-studio/engine";

const OLD_ID = "doc_13994cc9557d";
const ALLEN_NAME = "Allen_Keynotes_and_Characteristics.pdf";
const OLD_QUOTE = "Choudhuri records the old marasmus note.";
const ALLEN_QUOTE = "Allen keynotes record the selected marasmus note.";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mapBlob() {
  const objects = new Map<string, string>();
  const client: ResearchBlobClient = {
    async putObject(pathname, body) {
      objects.set(pathname, body);
    },
    async getObject(pathname) {
      return objects.get(pathname) ?? null;
    },
    async listObjects(prefix) {
      return [...objects.keys()].filter((key) => key.startsWith(prefix));
    },
  };
  return { client, objects };
}

async function stored(id: string, filename: string, first: string, second: string): Promise<StoredCorpus> {
  const ingested = await ingestDocument({
    bytes: new TextEncoder().encode(`${first}\f${second}`),
    filename: `${id}.txt`,
    documentId: id,
  });
  if (ingested.document.processingStatus !== "ready") throw new Error("ingest failed");
  ingested.document.filename = filename;
  const chunked = createChunks(ingested.pages);
  return makeStoredCorpus(ingested.document, ingested.pages, chunked.chunks, chunked.chunkerVersion);
}

describe("Research Studio document provenance", () => {
  it("keeps a selected upload from being answered by an older corpus", async () => {
    const blob = mapBlob();
    const older = await stored(OLD_ID, "Choudhuri.pdf", OLD_QUOTE, "Choudhuri repeats the old marasmus note.");
    const allenId = "doc_allenkeynotes01";
    const allen = await stored(
      allenId,
      ALLEN_NAME,
      ALLEN_QUOTE,
      "Allen keynotes repeat the selected marasmus note.",
    );
    expect(await saveDurableCorpus(blob.client, older)).toEqual({ ok: true, value: undefined });
    expect(await saveDurableCorpus(blob.client, allen)).toEqual({ ok: true, value: undefined });
    expect(researchDocumentPathname(OLD_ID)).not.toBe(researchDocumentPathname(allenId));
    expect(blob.objects.get(researchDocumentPathname(allenId) ?? "")).toContain(ALLEN_QUOTE);
    expect(blob.objects.get(researchDocumentPathname(allenId) ?? "")).not.toContain(OLD_QUOTE);
    expect(blob.objects.get(researchDocumentPathname(OLD_ID) ?? "")).toContain(OLD_QUOTE);

    let askBody: { query?: string; documentIds?: string[] } = {};
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/documents") && init?.body instanceof FormData) {
        return new Response(
          JSON.stringify({
            documentId: allenId,
            filename: ALLEN_NAME,
            format: "pdf",
            pageCount: 2,
            chunkCount: 2,
            processingStatus: "ready",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      askBody = JSON.parse(String(init?.body ?? "{}")) as { query?: string; documentIds?: string[] };
      const store = await hydrateResearchStore(blob.client, askBody.documentIds);
      const result = await handleResearchAsk({ body: askBody, store });
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { "content-type": "application/json" },
      });
    });

    render(<ResearchStudioWorkspace language="en" dir="ltr" />);
    fireEvent.change(screen.getByLabelText("Document"), {
      target: { files: [new File(["allen"], ALLEN_NAME, { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText(ALLEN_NAME)).toBeTruthy();
    expect(screen.getByText(/2 pages/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "marasmus note" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Answered")).toBeTruthy();

    const citedIds = [...document.querySelectorAll("ol li")].map((item) => item.textContent ?? "");
    expect({
      shownFilename: ALLEN_NAME,
      requestDocumentIds: askBody.documentIds ?? null,
      citesSelectedDocument: citedIds.some((text) => text.includes(allenId)),
      citesOlderDocument: citedIds.some((text) => text.includes(OLD_ID)),
      quoteFromSelectedCorpus: citedIds.some((text) => text.includes(ALLEN_QUOTE)),
      quoteFromOlderCorpus: citedIds.some((text) => text.includes(OLD_QUOTE)),
    }).toEqual({
      shownFilename: ALLEN_NAME,
      requestDocumentIds: [allenId],
      citesSelectedDocument: true,
      citesOlderDocument: false,
      quoteFromSelectedCorpus: true,
      quoteFromOlderCorpus: false,
    });
  });
});
