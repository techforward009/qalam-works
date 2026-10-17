import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { GET, POST as READER_POST } from "../app/api/research/book-reader/route";
import { POST } from "../app/api/khateeb/library/route";
import { clearBookSourceCache } from "../app/lib/knowledge/sourceCache";
import { setResearchBlobClientForTests } from "../app/api/research/vercelResearchBlob";
import { createSessionToken } from "../app/api/research/auth/session";
import { BOOK_SOURCE_IDS } from "../app/lib/knowledge/bookCorpus";

const objects = new Map<string, string>();
let reads = 0;
const client = {
  putObject: async (path: string, content: string) => { objects.set(path, content); },
  getObject: async (path: string) => { reads++; return objects.get(path) ?? null; },
  listObjects: async () => [],
};
const secret = "reader-private-test-session-secret-32-characters";
const cookie = () => `qalam_research_session=${createSessionToken(secret)}`;
const req = (query = "", auth = true) => new NextRequest(
  `http://localhost:3000/api/research/book-reader${query}`,
  { headers: auth ? { cookie: cookie() } : {} },
);

beforeEach(() => {
  vi.stubEnv("QALAM_RESEARCH_ACCESS_PASSWORD", "private-test");
  vi.stubEnv("QALAM_RESEARCH_SESSION_SECRET", secret);
  objects.clear(); reads = 0; clearBookSourceCache(); setResearchBlobClientForTests(client);
});
afterEach(() => { setResearchBlobClientForTests(null); vi.unstubAllEnvs(); });

async function makeArchive() {
  const zip = new JSZip();
  const sources = BOOK_SOURCE_IDS.map(id => ({
    id, book: id.startsWith("nahj") ? "nahj" : "sahifa",
    language: id.endsWith("ar") ? "ar" : id.endsWith("ur") ? "ur" : "en",
    filename: `${id}.docx`, sha256: "a".repeat(64), translator: null,
  }));
  let count = 0;
  for (const source of sources) {
    const n = source.id === "sahifa-ar" ? 27 : 1;
    const records = Array.from({length: n}, (_, i) => {
      const id = `${source.id}:supplication:${i + 1}`;
      const paragraphs = Array.from({length: i === 0 ? 26 : 1}, (_, p) => ({
        id: `${id}:p${p + 1}`,
        text: p === 20 ? "صَبْرٌ اصل عبارت" : `${i + 1} - مکمل فرضی عربی متن ${p + 1}`,
      }));
      return {
        id, sourceId: source.id, book: source.book, language: source.language, kind: "supplication",
        number: i + 1, title: `آزمائشی دعا ${i + 1}`,
        reference: { sourceId: source.id, section: "supplication", number: i + 1,
          locator: "synthetic test", printPage: null },
        paragraphs,
        textSha256: createHash("sha256").update(paragraphs.map(p => p.text).join("\n")).digest("hex"),
      };
    });
    count += records.length;
    zip.file(`${source.id}.json.gz`, gzipSync(JSON.stringify(records)));
  }
  zip.file("manifest.json", JSON.stringify({
    format: "qalam-foundational-corpus", version: 1, sources, recordCount: count,
  }));
  return zip.generateAsync({ type: "nodebuffer" });
}
async function seed() {
  const form = new FormData();
  const sourceBytes = await makeArchive();
  const safeBytes = new Uint8Array(sourceBytes.length);
  safeBytes.set(sourceBytes);
  form.set("archive", new File([safeBytes], "test.zip", { type: "application/zip" }));
  const response = await POST(new NextRequest("http://localhost:3000/api/khateeb/library", {
    method: "POST", headers: { cookie: cookie() }, body: form,
  }));
  expect(response.status).toBe(200);
}

it("lets any reader browse, search and copy sources without a session", async () => {
  await seed();
  const cases = [
    ["", "sources"],
    ["?op=contents&sourceId=sahifa-ar", "entries"],
    ["?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:1", "paragraphs"],
    ["?op=find&sourceId=sahifa-ar&query=صبر", "hits"],
  ] as const;
  for (const [path, key] of cases) {
    const response = await GET(req(path, false));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body[key]).toBeDefined();
  }
});
it("keeps corpus-upload administrative POST protected without a session", async () => {
  const response = await POST(new NextRequest("http://localhost:3000/api/khateeb/library", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  }));
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(reads).toBe(0);
});
it("shows public shelf, source-ordered 24-item contents, unchanged reading pages and search", async () => {
  await seed();
  const shelfResponse = await GET(req("", false));
  expect(shelfResponse.headers.get("cache-control")).toBe("private, no-store");
  const shelf = await shelfResponse.json();
  expect(shelf.ready).toBe(true);
  expect(shelf.sources).toHaveLength(7);
  expect(shelf.sources[0].filename).toBeUndefined();

  const toc = await (await GET(req("?op=contents&sourceId=sahifa-ar"))).json();
  expect(toc.total).toBe(27);
  expect(toc.entries).toHaveLength(24);
  const second = await (await GET(req("?op=contents&sourceId=sahifa-ar&page=2"))).json();
  expect(second.entries).toHaveLength(3);

  const first = await (await GET(req("?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:1"))).json();
  expect(first.paragraphs).toHaveLength(26);
  expect(first.pageCount).toBe(1);
  expect(first.nextRecordId).toBe("sahifa-ar:supplication:2");
  expect(first.screenPartOnly).toBe(true);
  expect(first.reference).not.toContain("صفحہ");
  const lastPart = await (await GET(req("?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:1&part=last"))).json();
  expect(lastPart.page).toBe(1);
  expect(lastPart.paragraphs).toHaveLength(26);
  const secondPart = await (await GET(req("?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:1&part=2"))).json();
  expect(secondPart.code).toBe("not-found");

  const hits = await (await GET(req("?op=find&sourceId=sahifa-ar&query=صبر"))).json();
  expect(hits.total).toBe(1);
  expect(hits.hits[0].paragraphId).toBe("sahifa-ar:supplication:1:p21");
});
it("rejects path traversal and untrusted record/source combinations", async () => {
  await seed();
  for (const path of [
    "?op=read&sourceId=sahifa-ar&id=nahj-ar:supplication:1",
    "?op=contents&sourceId=../../private",
    "?op=contents&sourceId=sahifa-ar&page=0",
    "?op=contents&sourceId=sahifa-ar&page=NaN",
    "?op=find&sourceId=sahifa-ar&query=",
  ]) expect((await GET(req(path))).status).toBe(400);
  expect((await GET(req("?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:999"))).status).toBe(404);
  expect((await GET(req("?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:1&part=4"))).status).toBe(404);
});

const postReq = (body: unknown, authenticated = true, origin = "http://localhost:3000") => new NextRequest(
  "http://localhost:3000/api/research/book-reader", {
    method: "POST", headers: {
      "content-type": "application/json", origin,
      ...(authenticated ? { cookie: cookie() } : {}),
    },
    body: JSON.stringify(body),
  },
);
const expectedReaderSelection = async () => {
  const page = await (await GET(req("?op=read&sourceId=sahifa-ar&id=sahifa-ar:supplication:1&part=1"))).json();
  return {
    sourceId: page.sourceId, recordId: page.recordId,
    sourceSha256: page.sourceSha256, recordSha256: page.recordSha256,
    part: 1,
    paragraphIds: [page.paragraphs[20].id],
  };
};
it("rejects invalid or cross-origin excerpt selections even with no session", async () => {
  const payload = { sourceId: "sahifa-ar", recordId: "sahifa-ar:supplication:1" };
  for (const response of [
    await READER_POST(postReq(payload, false)),
    await READER_POST(postReq(payload, false, "https://evil.example")),
  ]) {
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  expect(reads).toBe(0);
});
it("returns the existing provenance-bound BookExcerpt only for source-identical page paragraphs", async () => {
  await seed();
  const selection = await expectedReaderSelection();
  const response = await READER_POST(postReq(selection, false));
  expect(response.status).toBe(200);
  const excerpt = (await response.json()).excerpt;
  expect(excerpt.paragraphs).toEqual([{id: selection.paragraphIds[0],text:"صَبْرٌ اصل عبارت"}]);
  expect(excerpt.sourceSha256).toBe(selection.sourceSha256);
  expect(excerpt.recordSha256).toBe(selection.recordSha256);
  expect(excerpt.paragraphNumbers).toEqual([21]);
  expect(excerpt.referenceLabelUr).toContain("صحیفہ");
  expect(excerpt.id).toContain(":paragraphs:21");
  expect(excerpt).not.toHaveProperty("suppliedTranslation");
});
it("blocks stale edition, wrong part, cross-record paragraph and unsupported selected IDs", async () => {
  await seed();
  const valid = await expectedReaderSelection();
  const changed = [
    {...valid, sourceSha256: "0".repeat(64)},
    {...valid, recordSha256: "0".repeat(64)},
    {...valid, part: 2},
    {...valid, paragraphIds: ["sahifa-ar:supplication:2:p1"]},
    {...valid, paragraphIds: [valid.paragraphIds[0],valid.paragraphIds[0]]},
    {...valid, paragraphIds: Array.from({length:13},(_,i)=>`sahifa-ar:supplication:1:p${i+1}`)},
  ];
  const expected = [409,409,400,400,400,400];
  for(let i=0;i<changed.length;i++) {
    const response = await READER_POST(postReq(changed[i]));
    expect(response.status).toBe(expected[i]);
  }
});
