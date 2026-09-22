import { chunkId, generateDocumentId, pageId } from "../../app/tools/research-studio/engine";

describe("Research Engine Phase A types", () => {
  test("page id is {documentId}:p{page}", () => {
    expect(pageId("book_001", 137)).toBe("book_001:p137");
  });

  test("chunk id is {documentId}:p{page}:c{chunk} and is stable", () => {
    const id = chunkId("book_001", 137, 2);
    expect(id).toBe("book_001:p137:c2");
    expect(chunkId("book_001", 137, 2)).toBe(id);
  });

  test("generateDocumentId is unique doc_ prefix", () => {
    const a = generateDocumentId();
    const b = generateDocumentId();
    expect(a).toMatch(/^doc_[0-9a-f]{12}$/);
    expect(b).not.toBe(a);
  });
});
