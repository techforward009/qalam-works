import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Final Calendar regression fix", () => {
  it("keeps explicit Convert/Find setMode calls in click handlers", () => {
    const source = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(source).toMatch(/setMode\("convert"\)/);
    expect(source).toMatch(/setMode\("find"\)/);
    expect(source).toMatch(/setToolMode\("convert"\)/);
    expect(source).toMatch(/setToolMode\("find"\)/);
    expect(source).toMatch(/requestedMode === "find" \|\| requestedMode === "convert"/);
    expect(source).toMatch(/setMode\(requestedMode\)/);
    expect(source).toMatch(/addEventListener\("popstate", syncFromUrl\)/);
  });

  it("keeps outside-month branch isolated before all active-cell reads", () => {
    const source = read("app/components/date-studio/CalendarDayCell.tsx");
    const guard = source.indexOf("if (!cell.inCurrentMonth)");
    const content = source.indexOf("const content");
    const outsideBranch = source.slice(guard, content);

    expect(guard).toBeGreaterThan(-1);
    expect(content).toBeGreaterThan(guard);
    expect(outsideBranch).toMatch(/aria-hidden="true"/);
    expect(outsideBranch).not.toMatch(/cell\.hijri/);
    expect(outsideBranch).not.toMatch(/cell\.gregorian\.day/);
    expect(outsideBranch).not.toMatch(/<Link/);

    expect(source.indexOf("cell.hijri")).toBeGreaterThan(content);
    expect(source.indexOf("cell.gregorian.day")).toBeGreaterThan(content);
  });
});
