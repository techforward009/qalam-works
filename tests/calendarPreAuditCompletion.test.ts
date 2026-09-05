import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar pre-audit completion", () => {
  it("renders Explore row with both Gregorian and Hijri controls", () => {
    const nav = read("app/components/date-studio/DateStudioRouteNav.tsx");
    expect(nav).toMatch(/explore: "Explore:"/);
    expect(nav).toMatch(/explore: "دیکھیں:"/);
    expect(nav).toMatch(/gregorian: "Gregorian Calendar"/);
    expect(nav).toMatch(/hijri: "Hijri Calendar"/);
    expect(nav).toMatch(/gregorian: "عیسوی کیلنڈر"/);
    expect(nav).toMatch(/hijri: "ہجری کیلنڈر"/);
    expect(nav).toMatch(/data-calendar="gregorian"/);
    expect(nav).toMatch(/data-calendar="hijri"/);
  });

  it("marks the current calendar active and uses counterpartHref for the other calendar", () => {
    const nav = read("app/components/date-studio/DateStudioRouteNav.tsx");
    expect(nav).toMatch(/currentCalendar === "gregorian"/);
    expect(nav).toMatch(/currentCalendar === "hijri"/);
    expect(nav).toMatch(/aria-current="page"/);
    expect(nav).toMatch(/href=\{counterpartHref\}/);
  });

  it("applies Explore row contract to all four explorer routes", () => {
    const cases = [
      ["app/calendar/[year]/page.tsx", 'currentCalendar="gregorian"', /counterpartHref=\{`\/hijri\//],
      ["app/calendar/[year]/[month]/page.tsx", 'currentCalendar="gregorian"', /counterpartHref=\{`\/hijri\//],
      ["app/hijri/[year]/page.tsx", 'currentCalendar="hijri"', /counterpartHref=\{`\/calendar\//],
      ["app/hijri/[year]/[month]/page.tsx", 'currentCalendar="hijri"', /counterpartHref=\{`\/calendar\//],
    ] as const;

    for (const [path, active, counterpart] of cases) {
      const source = read(path);
      expect(source).toContain("DateStudioRouteNav");
      expect(source).toContain(active);
      expect(source).toMatch(counterpart);
      expect(source).toMatch(/previousHref=/);
      expect(source).toMatch(/nextHref=/);
    }
  });

  it("adds an optional research/local sighting note that can print under the banner", () => {
    const maker = read("app/tools/calendar-maker/CalendarMakerContent.tsx");
    expect(maker).toMatch(/Printed sighting note \(optional\)/);
    expect(maker).toMatch(/چھاپی جانے والی نوٹ \(اختیاری\)/);
    expect(maker).toMatch(/useState\(""\)/);
    expect(maker).toMatch(/maxLength=\{240\}/);
    expect(maker).toMatch(/researchNote: researchNote\.trim\(\)/);
  });

  it("escapes research note safely in PDF HTML", () => {
    const model = buildCalendarYearModel({
      year: 2026,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffset: 1,
    });

    const html = buildCalendarHtml(model, {
      researchNote: `<script>alert("x")</script> & local sighting`,
    });

    expect(html).toContain('data-research-note="true"');
    expect(html).toContain('data-research-note-footer="true"');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; local sighting");
    expect(html).not.toContain(`<script>alert("x")</script>`);
  });

  it("empty research note produces no note markup", () => {
    const model = buildCalendarYearModel({
      year: 2026,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffset: 1,
    });

    const html = buildCalendarHtml(model, { researchNote: "   " });
    expect(html).not.toContain('data-research-note="true"');
    expect(html).not.toContain('data-research-note-footer="true"');
  });
});
