import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Wiring regression guard: public Khateeb Studio landing view must expose a
 * single-click first-class reader above the long sermon-topic form.
 * Visual/mobile confirmation is performed on the protected Vercel preview.
 */
const main = readFileSync(resolve("app/tools/khateeb-studio/KhateebStudioContent.tsx"), "utf-8");
const library = readFileSync(resolve("app/tools/khateeb-studio/BookLibraryPanel.tsx"), "utf-8");

describe("discoverable Khateeb reader entry", () => {
  it("shows the direct reader button above the long topic search", () => {
    const buttonIndex = main.indexOf('data-testid="khateeb-reader-direct-entry"');
    const topicIndex = main.indexOf('مجلس کا موضوع تلاش کریں');
    expect(buttonIndex).toBeGreaterThan(0);
    expect(topicIndex).toBeGreaterThan(buttonIndex);
    expect(main).toContain('کتاب خانہ — مکمل کتابیں پڑھیں');
    expect(main).toMatch(/aria-expanded=\{readerQuickOpen\}/);
  });
  it("opens the reading interface directly, without two nested manual clicks", () => {
    expect(main).toContain('id="khateeb-direct-book-reader"');
    expect(main).toContain('<PublicBookLibrary\n                  readerInitiallyOpen');
    expect(library).toContain("readerInitiallyOpen = false");
    expect(library).toContain("useState(readerInitiallyOpen)");
    expect(library).toContain("<details open={readerOpen}");
    expect(library).toContain('<BookReader locale={locale}');
    expect(library).not.toContain("<ResearchStudioGate");
    expect(library).toContain("کتاب خانہ ہر قاری کے لیے کھلا ہے");
    expect(library).not.toContain("نجی مطالعے کے لیے مالک کی رسائی ضروری ہے");
  });
  it("keeps existing sermon and source-search workflows available", () => {
    expect(main).toContain('id="khateeb-public-book-library"');
    expect(main).toContain("<CustomSermonWorkspace");
    expect(main).toContain("setBookDraft(project)");
    expect(main).toContain("setCustomWorkspaceOpen(true)");
  });
});
