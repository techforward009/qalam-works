import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Date Studio discovery surfaces", () => {
  it("surfaces Date Studio actions on Date Converter", () => {
    const source = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(source).toMatch(/Date Studio/);
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

  it("groups Date Studio on All Tools", () => {
    const source = read("app/tools/AllToolsContent.tsx");
    expect(source).toMatch(/dateStudioTitle/);
    expect(source).toMatch(/\/tools\/date-converter/);
    expect(source).toMatch(/\/tools\/calendar-maker/);
    expect(source).toMatch(/\/tools\/crescent-visibility/);
    expect(source).toMatch(/crescentVisibility/);
    expect(source).toMatch(/\/tools\/crescent-visibility/);
    expect(source).toMatch(/crescentVisibility/);
    expect(source).toMatch(/\/calendar\//);
    expect(source).toMatch(/\/hijri\//);
  });

  it("Find Date discovery opens Date Converter in Find mode", () => {
    const tools = read("app/tools/AllToolsContent.tsx");
    const converter = read("app/tools/date-converter/DateConverterContent.tsx");
    expect(tools).toMatch(/\/tools\/date-converter\?mode=find#date-studio/);
    expect(converter).toMatch(/const requestedMode = p\.get\("mode"\)/);
    expect(converter).toMatch(/requestedMode === "find" \|\| requestedMode === "convert"/);
    expect(converter).toMatch(/setMode\(requestedMode\)/);
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

  it("exposes exactly one localized Date Studio entry in Utilities", () => {
    const header = read("app/components/Header.tsx");
    const translations = read("app/lib/translations.ts");
    const routeEntries = header.match(/label: t\.dateStudio, href: "\/tools\/date-converter"/g) ?? [];

    expect(routeEntries).toHaveLength(1);
    expect(header).toMatch(/dateStudio: translations\[language\]\.nav\.dateStudio/);
    expect(header).not.toMatch(/label: "Date Studio", href: "\/tools\/date-converter"/);
    expect(translations).toMatch(/dateStudio: "Date Studio"/);
    expect(translations).toMatch(/dateStudio: "ڈیٹ اسٹوڈیو"/);
  });

  it("publishes Crescent Visibility through shared navigation and sitemap surfaces", () => {
    const header = read("app/components/Header.tsx");
    const footer = read("app/components/Footer.tsx");
    const sitemap = read("app/sitemap.ts");

    expect(header).toMatch(/label: language === "ur" \? "رؤیتِ ہلال" : "Crescent Visibility", href: "\/tools\/crescent-visibility"/);
    expect(header).toMatch(/links=\{utilitiesLinks\}/);
    expect((header.match(/href: "\/tools\/crescent-visibility"/g) ?? []).length).toBe(1);
    expect(footer).toMatch(/href: "\/tools\/crescent-visibility"/);
    expect(sitemap).toMatch(/\$\{BASE\}\/tools\/crescent-visibility/);
  });
});
