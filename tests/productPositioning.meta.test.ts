import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Product positioning metadata", () => {
  it("Quality Audit title is clear", () => {
    const p = read("app/tools/quality-checker/page.tsx");
    expect(p).toMatch(/Quality Audit/);
    expect(p).not.toMatch(/Publication Quality Checker for Urdu/);
  });

  it("Unicode Standardizer title includes Urdu", () => {
    expect(read("app/tools/unicode-standardizer/page.tsx")).toMatch(/Urdu Unicode Fixer/);
  });

  it("Document Cleaner does not claim PDF upload", () => {
    const p = read("app/tools/document-cleaner/page.tsx").toLowerCase();
    expect(p).not.toMatch(/upload.*pdf|pdf upload/);
  });

  it("Document Studio does not claim AI translation", () => {
    const p = read("app/tools/document-studio/page.tsx");
    expect(p.toLowerCase()).not.toMatch(/\bai-powered\b/);
    expect(p).toMatch(/not a translator/i);
  });

  it("no double brand suffix in tool titles", () => {
    for (const f of [
      "app/tools/document-cleaner/page.tsx",
      "app/tools/quality-checker/page.tsx",
      "app/tools/unicode-standardizer/page.tsx",
      "app/tools/document-studio/page.tsx",
    ]) {
      const p = read(f);
      expect(p).not.toMatch(/Qalam Works — Qalam Works/);
    }
  });
});
