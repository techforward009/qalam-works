import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Khateeb Studio navigation after retiring duplicate public book search", () => {
  const studio = readFileSync("app/tools/khateeb-studio/KhateebStudioContent.tsx", "utf8");
  const sermon = readFileSync("app/tools/khateeb-studio/CustomSermonWorkspace.tsx", "utf8");
  const library = readFileSync("app/tools/khateeb-studio/BookLibraryPanel.tsx", "utf8");
  const ask = readFileSync("app/components/knowledge/KnowledgeAssistant.tsx", "utf8");
  const api = readFileSync("app/api/khateeb/library/route.ts", "utf8");

  it("removes only the redundant standalone book search/topic panel", () => {
    expect(studio).not.toContain("PublicBookLibrary");
    expect(studio).not.toContain("publicLibraryOpen");
    expect(studio).not.toContain("khateeb-public-book-library");
    expect(studio).not.toContain("کتابی ذخیرہ — تلاش، حوالہ اور موضوعاتی تیاری");
    expect(studio).not.toContain('Book library — search, sources and topic preparation');
    expect(studio).toContain("کتاب سے سوال کریں");
    expect(studio).toContain("<AskBooks");
  });
  it("retains selecting verified book excerpts into My Sermon", () => {
    expect(studio).toContain("<CustomSermonWorkspace");
    expect(sermon).toContain('dynamic(() => import("./BookLibraryPanel")');
    expect(sermon).toContain("<BookLibraryPanel");
    expect(sermon).toContain("کتابی ذخیرہ — تلاش اور اقتباس");
    expect(library).toContain("createBookExcerpt");
    expect(library).toContain("مکمل عبارت اور انتخاب");
    expect(library).toContain("منتخب عبارت مجلس میں شامل کریں");
  });
  it("preserves Quran/other references and original library API for Ask Books", () => {
    expect(ask).toContain("/api/knowledge/ask");
    expect(api).toContain("searchBookRecords");
    expect(api).toContain("readBookRecordFromR2");
    expect(api).toContain('op === "record"');
  });
});
