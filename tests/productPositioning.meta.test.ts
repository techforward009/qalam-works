import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Product positioning metadata", () => {
  it.each([
    ["document-cleaner", "Fix Copied Urdu Text", "کاپی شدہ اردو درست کریں"],
    ["quality-checker", "Find Mistakes in Urdu Text", "اردو متن میں غلطیاں دیکھیں"],
    ["whatsapp-rtl-formatter", "Urdu for WhatsApp", "واٹس ایپ کے لیے اردو"],
    ["roman-urdu-writer", "Roman Urdu to Urdu", "رومن اردو سے اردو"],
    ["crescent-visibility", "Moon Sighting", "رؤیتِ ہلال"],
    ["invoice-generator", "Invoice Maker", "انوائس بنائیں"],
    ["date-converter", "Date Converter", "تاریخ کنورٹر"],
  ])("uses both public names in the %s title", (route, en, ur) => {
    expect(read(`app/tools/${route}/page.tsx`)).toContain(`title: "${en} | ${ur} | Qalam Works"`);
  });

  it("gives Qalam Page its own Open Graph title", () => {
    expect(read("app/tools/document-studio/page.tsx")).toContain('openGraph: { title: "Qalam Page: Urdu Editor" }');
  });

  it("Text Check title uses the plain public name", () => {
    const p = read("app/tools/quality-checker/page.tsx");
    expect(p).toMatch(/Find Mistakes in Urdu Text/);
    expect(p).not.toMatch(/Publication Quality Checker for Urdu/);
  });

  it("Unicode Fixer title includes Urdu", () => {
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
