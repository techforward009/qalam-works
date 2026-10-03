import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("Khateeb Studio print pagination", () => {
  test("allows large cards and sections to flow across A4 pages", () => {
    const source = readFileSync(
      "app/tools/khateeb-studio/KhateebStudioContent.tsx",
      "utf8",
    );

    expect(source).toContain("break-inside: auto");
    expect(source).toContain("page-break-inside: auto");
    expect(source).toContain("orphans: 3");
    expect(source).toContain("widows: 3");
    expect(source).toContain(".khateeb-print-keep");
    expect(source).not.toContain(`.rounded-lg {
            break-inside: avoid;`);
  });
});
