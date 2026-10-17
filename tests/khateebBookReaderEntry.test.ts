import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const main = readFileSync(resolve("app/tools/khateeb-studio/KhateebStudioContent.tsx"), "utf-8");
const reader = readFileSync(resolve("app/tools/khateeb-studio/BookReader.tsx"), "utf-8");
const libraryPage = readFileSync(resolve("app/tools/khateeb-studio/library/BookLibraryPageClient.tsx"), "utf-8");
const admin = readFileSync(resolve("app/tools/khateeb-studio/library/admin/BookAdministrationPageClient.tsx"), "utf-8");
const sermon = readFileSync(resolve("app/tools/khateeb-studio/CustomSermonWorkspace.tsx"), "utf-8");

describe("focused Book Library workspace", () => {
  it("links directly from Khateeb Studio to the standalone reader before sermon search", () => {
    const entryIndex = main.indexOf('href="/tools/khateeb-studio/library"');
    const topicIndex = main.indexOf("مجلس کا موضوع تلاش کریں");
    expect(entryIndex).toBeGreaterThan(0);
    expect(topicIndex).toBeGreaterThan(entryIndex);
    expect(main).toContain("کتاب خانہ — مکمل کتابیں پڑھیں");
    expect(main).not.toContain("readerQuickOpen");
    expect(main).not.toContain("PublicBookLibrary");
    expect(main).toContain("<CustomSermonWorkspace locale={ur ? \"ur\" : \"en\"} />");
  });

  it("keeps the reading route separate from research, preparation and administration panels", () => {
    expect(libraryPage).toContain("<BookReader locale={ur ? \"ur\" : \"en\"} onAdd={addToMySermon}/>");
    expect(reader).not.toContain("<KnowledgeAssistant");
    expect(reader).not.toContain("<BookTopicGuide");
    expect(reader).not.toContain("Book library management — owner only");
    expect(reader).not.toContain("حصے کی نوعیت");
    expect(reader).not.toContain("Topic preparation");
    expect(reader).not.toContain("Qalam Knowledge Assistant");
    expect(sermon).not.toContain("<BookLibraryPanel");
    expect(sermon).toContain('href="/tools/khateeb-studio/library"');
  });

  it("uses a temporary contents drawer and keeps its page controls inside that drawer", () => {
    expect(reader).toContain("<dialog ref={tocDialog}");
    expect(reader).toContain("className={styles.contentsDrawer}");
    expect(reader).toContain("aria-modal=\"true\"");
    expect(reader).toContain("className={styles.contentsPages}");
    expect(reader).not.toContain('aria-label={ur ? "کتاب کی فہرست" : "Book contents"}');
    expect(reader).toContain("className={styles.readingPage}");
  });

  it("keeps corpus administration behind the existing owner gate", () => {
    expect(admin).toContain("<ResearchStudioGate");
    expect(admin).toContain("uploadBookArchive(file, abort.signal");
    expect(admin).toContain("/tools/khateeb-studio/library");
  });
});
