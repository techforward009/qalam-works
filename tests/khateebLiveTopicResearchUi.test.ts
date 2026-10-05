import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Khateeb live topic research UI", () => {
  const studio = readFileSync(
    "app/tools/khateeb-studio/KhateebStudioContent.tsx",
    "utf8",
  );

  test("queries Khateeb research when no prepared topic matches", () => {
    expect(studio).toContain('fetch("/api/khateeb/research"');
    expect(studio).toContain("topicResults.length > 0");
    expect(studio).toContain("window.setTimeout");
    expect(studio).toContain("800");
  });

  test("keeps the user inside Khateeb Studio while showing source-grounded results", () => {
    expect(studio).toContain("براہِ راست ماخذی تحقیق");
    expect(studio).toContain("ای شیعہ سے");
    expect(studio).toContain("item.citationUr");
    expect(studio).toContain("item.arabic");
    expect(studio).not.toContain('target="_blank" rel="noreferrer" href={item.sourceUrl}');
  });

  test("fails closed instead of inventing material when no source text is found", () => {
    expect(studio).toContain("قلم کوئی عبارت یا حوالہ گھڑ کر شامل نہیں کرے گا");
  });
});
