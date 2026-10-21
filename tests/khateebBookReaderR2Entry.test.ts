import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Khateeb proper public Book Library entry", () => {
  const home = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
  const route = readFileSync("app/api/khateeb/book-reader/route.ts", "utf8");
  const reader = readFileSync("app/tools/khateeb-studio/BookReader.tsx", "utf8");
  const page = readFileSync("app/tools/khateeb-studio/library/BookLibraryPageClient.tsx", "utf8");
  it("links a direct dedicated book shelf before the topic search", () => {
    expect(home).toContain('href="/tools/khateeb-studio/library"');
    expect(home).toContain("کتاب خانہ — مکمل کتابیں پڑھیں");
    expect(home.indexOf('href="/tools/khateeb-studio/library"')).toBeLessThan(home.indexOf("مجلس کا موضوع تلاش کریں"));
    expect(page).toContain("<BookReader");
  });
  it("keeps exact R2-only source and the old Blob route out of the public reader", () => {
    expect(route).toContain("readBookRecordFromR2");
    expect(route).toContain("readBookSourceFromR2");
    expect(route).toContain("bookLibraryR2IsSelected");
    expect(route).not.toContain("researchBlobClientFromEnv");
    expect(reader).toContain("/api/khateeb/book-reader");
    expect(reader).not.toContain("/api/research/book-reader");
    expect(reader).toContain("paginateMeasuredFlow");
    expect(reader).toContain("document.fonts.ready");
    expect(reader).toContain("readingMode");
  });
  it("keeps bookmarks, page controls and source paragraphs separate from translation", () => {
    expect(reader).toContain("KHATEEB_READER_PROGRESS_KEY");
    expect(reader).toContain("qalam-book-reader-print");
    expect(reader).toContain("readingFlowUnits");
    expect(reader).toContain("اصل");
  });
});
