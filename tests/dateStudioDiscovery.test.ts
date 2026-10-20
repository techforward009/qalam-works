import { describe, expect, it } from "vitest";
import { TOOL_GROUPS, ALL_TOOLS_GROUPS, toolsInGroup } from "../app/lib/toolCatalog";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Date Studio discovery surfaces", () => {
  it("surfaces Date Studio actions on Date Converter", () => {
    const source = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(source).toMatch(/studioTitle: "Date Converter"/);
    expect(source).toMatch(/id="date-studio"/);
    expect(source).toMatch(/\/tools\/calendar-maker/);
    expect(source).toMatch(/\/calendar\//);
    expect(source).toMatch(/\/hijri\//);
  });

  it("returns to Date Studio at the heading and keeps Urdu results on the start edge", () => {
    const source = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(source).toMatch(/id="date-studio"/);
    expect(source).toMatch(/scroll-mt-\[97px\]/);
    expect(source).toMatch(/scrollIntoView\(\{ block: "start", behavior: "auto" \}\)/);
    expect(source).not.toMatch(/<section id="date-studio"/);
    expect(source).not.toMatch(/isUr \? "sm:flex-row-reverse"/);
    expect(source).toMatch(/row\.numeric \? <span dir="ltr" className="inline-block">\{row\.value\}<\/span>/);
    expect(source).toMatch(/<span dir="ltr" className="inline-block">\{iso\}<\/span>/);
    expect(source).toMatch(/grid grid-cols-1 md:grid-cols-3 gap-3" dir="ltr"/);
  });

  it("adds homepage Date Studio discovery", () => {
    expect(read("app/page.tsx")).toMatch(/DateStudioDiscoverySection/);
    const source = read("app/components/DateStudioDiscoverySection.tsx");
    expect(source).toMatch(/Convert a Date/);
    expect(source).toMatch(/Explore Calendars/);
    expect(source).toMatch(/Make a Calendar/);
  });

  it("groups date and calendar tools on All Tools", () => {
    const tools = toolsInGroup(TOOL_GROUPS.find(group => group.id === "dates")!);
    expect(tools.map(tool => tool.route)).toEqual(expect.arrayContaining([
      "/tools/date-converter", "/tools/calendar-maker", "/today",
    ]));
    expect(tools.some(tool => tool.route.startsWith("/calendar/"))).toBe(true);
    expect(tools.some(tool => tool.route.startsWith("/hijri/"))).toBe(true);
    expect(read("app/tools/AllToolsContent.tsx")).toContain("toolsInGroup(group)");
  });

  it("Find Date discovery opens the Find Date task page on All Tools", () => {
    const tools = toolsInGroup(ALL_TOOLS_GROUPS.find(group => group.id === "dates")!);
    expect(tools.some(tool => tool.route === "/tools/date-converter?mode=find#date-studio")).toBe(true);
  });

  it("makes Date Profile four related calendar routes explicit", () => {
    const source = read("app/components/date-studio/CalendarLinksCard.tsx");
    expect(source).toMatch(/profile\.gregorian\.year/);
    expect(source).toMatch(/profile\.gregorian\.month/);
    expect(source).toMatch(/profile\.hijri\.year/);
    expect(source).toMatch(/profile\.hijri\.month/);
    expect((source.match(/href: `/g) ?? []).length).toBe(4);
  });

  it("adds previous, next and counterpart navigation to both explorers", () => {
    const sources = [
      read("app/calendar/[year]/page.tsx"),
      read("app/calendar/[year]/[month]/page.tsx"),
      read("app/hijri/[year]/page.tsx"),
      read("app/hijri/[year]/[month]/page.tsx"),
    ];
    for (const source of sources) {
      expect(source).toMatch(/DateStudioRouteNav/);
      expect(source).toMatch(/previousHref=/);
      expect(source).toMatch(/nextHref=/);
      expect(source).toMatch(/counterpartHref=/);
    }
  });

  it("uses expanded Historical Context empty state without regressing event fields", () => {
    const source = read("app/components/date-studio/HistoricalContext.tsx");
    expect(source).toMatch(/Historical references for this date are being expanded\./);
    expect(source).toMatch(/اس تاریخ کے تاریخی حوالوں میں توسیع کی جا رہی ہے۔/);
    expect(source).toMatch(/event\.category/);
    expect(source).toMatch(/event\.importance/);
    expect(source).toMatch(/event\.tags/);
    expect(source).toMatch(/event\.source/);
    expect(source).toMatch(/value\.ur \?\? value\.en/);
  });

  it("exposes one bilingual date converter in Dates", () => {
    const group = TOOL_GROUPS.find(group => group.id === "dates")!;
    expect(group.name).toEqual({ en: "Dates", ur: "تاریخیں" });
    expect(toolsInGroup(group).filter(tool => tool.route === "/tools/date-converter")).toHaveLength(1);
  });

  it("keeps Moon Sighting last in Dates and in the sitemap", () => {
    const group = TOOL_GROUPS.find(group=>group.id==="dates")!;
    expect(group.ids.at(-1)).toBe("crescent_visibility");
    expect(toolsInGroup(group).map(tool => tool.route)).toContain("/tools/crescent-visibility");
    expect(read("app/sitemap.ts")).toContain("${BASE}/tools/crescent-visibility");
  });
});
