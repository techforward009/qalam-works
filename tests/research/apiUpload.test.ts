import { Document, Packer, Paragraph, TextRun } from "docx";
import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { POST } from "../../app/api/research/documents/route";
import {
  MAX_RESEARCH_UPLOAD_PAGES,
  handleResearchUpload,
} from "../../app/api/research/documents/handleUpload";
import { handleResearchAsk } from "../../app/api/research/ask/handleAsk";
import {
  createMemoryResearchEngineStore,
  type AsyncAnswerAdapter,
  type ResearchEngineStore,
} from "../../app/tools/research-studio/engine";

function file(name: string, bytes: Uint8Array | string, type = ""): File {
  const body = typeof bytes === "string" ? bytes : Buffer.from(bytes);
  return new File([body], name, { type });
}

function formWith(entries: Array<[string, string | File]>): FormData {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
}

async function pdf(pages: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pages) {
    const page = doc.addPage([200, 200]);
    page.drawText(text, { x: 20, y: 100, size: 12, font });
  }
  return doc.save();
}

async function docx(paragraphs: string[]): Promise<Uint8Array> {
  const packed = await Packer.toBuffer(
    new Document({
      sections: [
        { children: paragraphs.map((text) => new Paragraph({ children: [new TextRun(text)] })) },
      ],
    }),
  );
  return new Uint8Array(packed);
}

async function upload(store: ResearchEngineStore, entries: Array<[string, string | File]>) {
  return handleResearchUpload({ form: formWith(entries), store });
}

describe("POST /api/research/documents", () => {
  test("TXT, MD, DOCX, and PDF uploads are stored without raw text in the response", async () => {
    const store = createMemoryResearchEngineStore();
    const txt = await upload(store, [["file", file("note.txt", "alpha marker\fbeta marker")]]);
    expect(txt.status).toBe(200);
    expect(txt.body).toMatchObject({
      filename: "note.txt",
      format: "txt",
      pageCount: 2,
      chunkCount: 2,
      processingStatus: "ready",
    });
    expect(JSON.stringify(txt.body)).not.toContain("alpha marker");

    const md = await upload(store, [["file", file("note.md", "# سرخی\n\nیہ متن ہے۔", "text/plain")]]);
    expect(md.body).toMatchObject({ format: "md", processingStatus: "ready" });

    const word = await upload(store, [["file", file("note.docx", await docx(["یہ اردو کا پیراگراف ہے۔"]))]]);
    expect(word.body).toMatchObject({ format: "docx", pageCount: 1, processingStatus: "ready" });

    const book = await upload(store, [["file", file("book.pdf", await pdf(["marker one", "marker two"]), "text/plain")]]);
    expect(book.body).toMatchObject({ format: "pdf", pageCount: 2, processingStatus: "ready" });
    expect(store.list()).toHaveLength(4);
  });

  test("missing, empty, unsupported, corrupt, oversized, and injected fields are rejected", async () => {
    const store = createMemoryResearchEngineStore();
    expect((await upload(store, [])).status).toBe(400);
    expect((await upload(store, [["file", file("e.txt", "")]])).body).toEqual({
      error: "Malformed request.",
      code: "invalid",
    });
    expect((await upload(store, [["file", file("scan.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))]])).status).toBe(400);
    expect((await upload(store, [["file", file("bad.pdf", "%PDF-1.4\nnot a pdf")]])).status).toBe(400);

    const pages = Array.from({ length: MAX_RESEARCH_UPLOAD_PAGES + 1 }, () => "صفحہ").join("\f");
    expect((await upload(store, [["file", file("many.txt", pages)]])).status).toBe(400);

    const injected = await upload(store, [
      ["file", file("note.txt", "اصل متن")],
      ["rawText", "جعلی متن"],
      ["chunks", "[]"],
    ]);
    expect(injected.body).toMatchObject({ code: "invalid" });
    expect(store.list()).toEqual([]);
  });

  test("an uploaded document is askable and upload itself does not call a model", async () => {
    const store = createMemoryResearchEngineStore();
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      throw new Error("upload must not call a provider");
    }) as typeof fetch;
    const uploaded = await upload(store, [["file", file("../../secret/note.txt", "alpha marker\fbeta marker")]]);
    globalThis.fetch = original;
    expect(fetches).toBe(0);
    expect(uploaded.status).toBe(200);
    if (!("documentId" in uploaded.body)) throw new Error("expected document");
    expect(uploaded.body.filename).toBe("note.txt");

    let adapterCalls = 0;
    const adapter: AsyncAnswerAdapter = async (input) => {
      adapterCalls += 1;
      const hit = input.evidence[0];
      return {
        kind: "draft",
        draft: {
          answer: "دستاویز سے",
          citations: [
            {
              documentId: hit.chunk.documentId,
              pageNumber: hit.chunk.pageNumber,
              chunkId: hit.chunk.id,
              quote: hit.chunk.rawText,
            },
          ],
        },
      };
    };
    const asked = await handleResearchAsk({
      body: { query: "marker", documentIds: [uploaded.body.documentId] },
      store,
      adapter,
    });
    expect(asked.status).toBe(200);
    expect(asked.body).toMatchObject({ answered: true, answer: "دستاویز سے" });
    expect(adapterCalls).toBe(1);
    if (!("citations" in asked.body)) throw new Error("expected citations");
    expect(asked.body.citations[0]?.quote).toContain("marker");
  });

  test("unexpected store failure is a safe 500", async () => {
    const store = createMemoryResearchEngineStore();
    const broken: ResearchEngineStore = {
      list: () => store.list(),
      get: (id) => store.get(id),
      remove: (id) => store.remove(id),
      save: () => {
        throw new Error("stack /tmp/secret CLOUDFLARE_AUTH_TOKEN");
      },
    };
    const result = await handleResearchUpload({
      form: formWith([["file", file("note.txt", "اصل متن")]]),
      store: broken,
    });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Research upload failed.", code: "failed" });
    expect(JSON.stringify(result.body)).not.toContain("secret");
    expect(JSON.stringify(result.body)).not.toContain("stack");
  });

  test("the route rejects a missing file and an oversized content length", async () => {
    const missing = await POST(
      new NextRequest("http://localhost/api/research/documents", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "Malformed request.", code: "invalid" });

    const oversized = await POST(
      new NextRequest("http://localhost/api/research/documents", {
        method: "POST",
        headers: { "content-length": String(26 * 1024 * 1024) },
        body: new FormData(),
      }),
    );
    expect(oversized.status).toBe(400);
  });
});
