import {
  RESEARCH_BLOB_PREFIX,
  ResearchPersistenceError,
  createChunks,
  createMemoryResearchEngineStore,
  documentIdFromResearchPathname,
  hydrateResearchStore,
  ingestDocument,
  loadDurableCorpus,
  makeStoredCorpus,
  researchDocumentPathname,
  saveDurableCorpus,
  searchKeywords,
  type ResearchBlobClient,
  type StoredCorpus,
} from "../../app/tools/research-studio/engine";
import { handleResearchAsk } from "../../app/api/research/ask/handleAsk";
import { handleResearchPage } from "../../app/api/research/documents/handlePage";
import { handleResearchUpload } from "../../app/api/research/documents/handleUpload";
import {
  createVercelResearchBlobClient,
  researchBlobAuth,
  researchBlobClientFromEnv,
  type ResearchBlobSdk,
} from "../../app/api/research/vercelResearchBlob";

function mapClient() {
  const objects = new Map<string, string>();
  const gets: string[] = [];
  let lists = 0;
  const client: ResearchBlobClient = {
    async putObject(pathname, body) {
      objects.set(pathname, body);
    },
    async getObject(pathname) {
      gets.push(pathname);
      return objects.has(pathname) ? objects.get(pathname)! : null;
    },
    async listObjects(prefix) {
      lists += 1;
      return [...objects.keys()].filter((key) => key.startsWith(prefix));
    },
  };
  return {
    client,
    objects,
    gets,
    listCount: () => lists,
  };
}

async function corpus(id: string, text: string, filename = `${id}.txt`): Promise<StoredCorpus> {
  const ingested = await ingestDocument({
    bytes: new TextEncoder().encode(text),
    filename,
    documentId: id,
  });
  const { chunks } = createChunks(ingested.pages);
  return makeStoredCorpus(ingested.document, ingested.pages, chunks);
}

describe("durable research blob storage", () => {
  test("persists a corpus and reloads it into a fresh store", async () => {
    const blob = mapClient();
    const original = await corpus("doc_alpha", "  alpha   keep  ");
    const saved = await saveDurableCorpus(blob.client, original);
    expect(saved.ok).toBe(true);
    expect(blob.objects.has("research/v1/documents/doc_alpha.json")).toBe(true);

    const fresh = await hydrateResearchStore(blob.client);
    expect(fresh).not.toBe(createMemoryResearchEngineStore());
    const loaded = fresh.get("doc_alpha");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.document.id).toBe(original.document.id);
    expect(loaded.value.pages.map((page) => page.id)).toEqual(original.pages.map((page) => page.id));
    expect(loaded.value.chunks.map((chunk) => chunk.id)).toEqual(original.chunks.map((chunk) => chunk.id));
    expect(loaded.value.pages[0].rawText).toBe(original.pages[0].rawText);
    expect(loaded.value.pages[0].normalizedText).toBe(original.pages[0].normalizedText);
    expect(loaded.value.pages[0].rawText).toBe("  alpha   keep  ");
  });

  test("keeps multiple documents and does not drop one on a later write", async () => {
    const blob = mapClient();
    await saveDurableCorpus(blob.client, await corpus("doc_a", "alphaunique first.\n\nalphaunique second."));
    await saveDurableCorpus(blob.client, await corpus("doc_b", "betaunique only."));
    await saveDurableCorpus(blob.client, await corpus("doc_a", "alphaunique revised.\n\nalphaunique still."));

    const fresh = await hydrateResearchStore(blob.client);
    expect(fresh.list().sort()).toEqual(["doc_a", "doc_b"]);
    const revised = fresh.get("doc_a");
    const other = fresh.get("doc_b");
    expect(revised.ok && revised.value.pages[0].rawText.includes("revised")).toBe(true);
    expect(other.ok && other.value.pages[0].rawText).toBe("betaunique only.");
  });

  test("all-document search loads every durable document", async () => {
    const blob = mapClient();
    await saveDurableCorpus(blob.client, await corpus("doc_a", "alphaunique shared.\n\nalphaunique shared again."));
    await saveDurableCorpus(blob.client, await corpus("doc_b", "betaunique shared.\n\nbetaunique shared again."));
    const fresh = await hydrateResearchStore(blob.client);
    const hits = searchKeywords(fresh, "shared");
    expect(new Set(hits.map((hit) => hit.chunk.documentId))).toEqual(new Set(["doc_a", "doc_b"]));
    expect(blob.listCount()).toBe(1);
  });

  test("scoped search reads only the requested document", async () => {
    const blob = mapClient();
    await saveDurableCorpus(blob.client, await corpus("doc_a", "alphaunique shared.\n\nalphaunique shared again."));
    await saveDurableCorpus(blob.client, await corpus("doc_b", "betaunique shared.\n\nbetaunique shared again."));
    blob.gets.length = 0;
    const scoped = await hydrateResearchStore(blob.client, ["doc_a"]);
    expect(scoped.list()).toEqual(["doc_a"]);
    expect(blob.gets).toEqual(["research/v1/documents/doc_a.json"]);
    expect(blob.listCount()).toBe(0);
    const hits = searchKeywords(scoped, "shared");
    expect(hits.every((hit) => hit.chunk.documentId === "doc_a")).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
  });

  test("upload, reload, ask, and page fetch keep the exact page text", async () => {
    const blob = mapClient();
    const text = "  alphaunique marker  \n\nalphaunique second paragraph.";
    const form = new FormData();
    form.set("file", new File([text], "note.txt", { type: "text/plain" }));
    const working = createMemoryResearchEngineStore();
    const uploaded = await handleResearchUpload({ form, store: working });
    expect(uploaded.status).toBe(200);
    if (!("documentId" in uploaded.body)) return;
    const stored = working.get(uploaded.body.documentId);
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect((await saveDurableCorpus(blob.client, stored.value)).ok).toBe(true);

    const fresh = await hydrateResearchStore(blob.client);
    const asked = await handleResearchAsk({
      body: { query: "alphaunique" },
      store: fresh,
    });
    expect(asked.status).toBe(200);
    if (!("answered" in asked.body)) return;
    expect(asked.body.answered).toBe(true);
    expect(asked.body.citations.length).toBeGreaterThan(0);

    const page = await handleResearchPage({
      documentId: uploaded.body.documentId,
      page: "1",
      store: fresh,
    });
    expect(page.status).toBe(200);
    if (!("rawText" in page.body)) return;
    expect(page.body.rawText).toBe(text);
  });

  test("rejects invalid JSON, the wrong schema, and a pathname mismatch", async () => {
    const blob = mapClient();
    const path = researchDocumentPathname("doc_a");
    expect(path).toBe(`${RESEARCH_BLOB_PREFIX}doc_a.json`);
    expect(documentIdFromResearchPathname(path!)).toBe("doc_a");
    blob.objects.set(path!, "{");
    expect((await loadDurableCorpus(blob.client, "doc_a")).ok).toBe(false);

    blob.objects.set(path!, JSON.stringify({ schemaVersion: 2, document: {}, pages: [], chunks: [] }));
    const wrongVersion = await loadDurableCorpus(blob.client, "doc_a");
    expect(wrongVersion.ok).toBe(false);

    const other = await corpus("doc_b", "betaunique only.\n\nbetaunique again.");
    blob.objects.set(path!, JSON.stringify(other));
    const mismatch = await loadDurableCorpus(blob.client, "doc_a");
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.error).toBe("corrupt");

    const fresh = await hydrateResearchStore(blob.client);
    expect(fresh.list()).toEqual([]);
  });

  test("missing configuration and a failed write do not fall back to memory", async () => {
    await expect(researchBlobAuth({})).rejects.toBeInstanceOf(ResearchPersistenceError);
    await expect(researchBlobClientFromEnv({ BLOB_READ_WRITE_TOKEN: "font-token" })).rejects.toBeInstanceOf(
      ResearchPersistenceError,
    );
    try {
      await researchBlobAuth({ QALAM_RESEARCH_STORE_ID: "store_research" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ResearchPersistenceError);
      expect(String(err)).not.toMatch(/blob\.vercel|font-token|\/tmp/i);
    }

    const blob = mapClient();
    blob.client.putObject = async () => {
      throw new Error("https://secret.blob.vercel-storage.com/research/v1/documents/doc_a.json");
    };
    await expect(saveDurableCorpus(blob.client, await corpus("doc_a", "alphaunique.\n\nalphaunique two."))).rejects.toMatchObject({
      code: "failed",
      message: "failed",
    });
    expect(blob.objects.size).toBe(0);
    const fresh = await hydrateResearchStore(mapClient().client);
    expect(fresh.list()).toEqual([]);
  });

  test("the Vercel client uses the research store, private access, and fresh reads", async () => {
    const puts: Array<Record<string, unknown>> = [];
    const gets: Array<Record<string, unknown>> = [];
    const lists: Array<Record<string, unknown>> = [];
    const body = JSON.stringify(await corpus("doc_a", "alphaunique.\n\nalphaunique two."));
    let listCalls = 0;
    const sdk: ResearchBlobSdk = {
      async put(_pathname, _body, options) {
        puts.push(options);
        return { url: "https://secret.private.blob.vercel-storage.com/research/v1/documents/doc_a.json" };
      },
      async get(_pathname, options) {
        gets.push(options);
        return {
          statusCode: 200,
          stream: new Blob([body]).stream(),
          blob: { pathname: "research/v1/documents/doc_a.json" },
        };
      },
      async list(options) {
        lists.push(options);
        listCalls += 1;
        if (listCalls === 1) {
          return {
            blobs: [{ pathname: "research/v1/documents/doc_a.json", url: "https://secret.example/a" } as { pathname: string }],
            hasMore: true,
            cursor: "next",
          };
        }
        return {
          blobs: [{ pathname: "research/v1/documents/doc_b.json" }],
          hasMore: false,
        };
      },
    };

    const previousFont = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "font-store-token";
    try {
      const client = createVercelResearchBlobClient(
        { storeId: "store_research", oidcToken: "oidc-research" },
        sdk,
      );
      await client.putObject("research/v1/documents/doc_a.json", body);
      const text = await client.getObject("research/v1/documents/doc_a.json");
      const paths = await client.listObjects(RESEARCH_BLOB_PREFIX);
      expect(text).toBe(body);
      expect(paths).toEqual([
        "research/v1/documents/doc_a.json",
        "research/v1/documents/doc_b.json",
      ]);
      expect(puts[0]).toMatchObject({
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        storeId: "store_research",
        oidcToken: "oidc-research",
      });
      expect(puts[0]?.token).toBeUndefined();
      expect(JSON.stringify(puts[0])).not.toContain("font-store-token");
      expect(JSON.stringify(puts[0])).not.toContain("secret.private");
      expect(gets[0]).toMatchObject({ access: "private", useCache: false, storeId: "store_research" });
      expect(lists).toHaveLength(2);
      expect(lists[1]?.cursor).toBe("next");

      const tokenClient = await researchBlobClientFromEnv(
        {
          QALAM_RESEARCH_STORE_ID: "store_research",
          QALAM_RESEARCH_READ_WRITE_TOKEN: "research-token",
          BLOB_READ_WRITE_TOKEN: "font-store-token",
        },
        sdk,
      );
      await tokenClient.putObject("research/v1/documents/doc_a.json", body);
      expect(puts.at(-1)?.token).toBe("research-token");
      expect(puts.at(-1)?.storeId).toBeUndefined();
    } finally {
      if (previousFont === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
      else process.env.BLOB_READ_WRITE_TOKEN = previousFont;
    }
  });
});
