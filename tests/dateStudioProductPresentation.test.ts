import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDateProfile } from "../app/tools/date-converter/utils/dateProfile";
import { convert, todayGregorian } from "../app/tools/date-converter/utils/dateEngine";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Date Studio product presentation", () => {
  it("keeps explorer title between Previous and Next in one contained bar", () => {
    const source = read("app/components/date-studio/DateStudioRouteNav.tsx");
    const previous = source.indexOf("{t.previous}");
    const title = source.indexOf("{title}");
    const next = source.indexOf("{t.next}");
    expect(previous).toBeGreaterThan(-1);
    expect(previous).toBeLessThan(title);
    expect(title).toBeLessThan(next);
    expect(source).toMatch(/rounded-2xl/);
  });

  it("Hijri year is a responsive card dashboard, not a raw list", () => {
    const page = read("app/hijri/[year]/page.tsx");
    const dashboard = read("app/components/date-studio/HijriYearDashboard.tsx");
    expect(page).toMatch(/HijriYearDashboard/);
    expect(dashboard).toMatch(/grid-cols-1/);
    expect(dashboard).toMatch(/md:grid-cols-2/);
    expect(dashboard).toMatch(/xl:grid-cols-3/);
    expect(dashboard).toMatch(/Explore month/);
    expect(page).not.toMatch(/name} —/);
  });

  it("Hijri month uses a seven-column calendar grid, not a raw numbered list", () => {
    const page = read("app/hijri/[year]/[month]/page.tsx");
    const calendar = read("app/components/date-studio/HijriMonthCalendar.tsx");
    expect(page).toMatch(/HijriMonthCalendar/);
    expect(calendar).toMatch(/grid-cols-7/);
    expect(calendar).toMatch(/weekdayLabels/);
    expect(page).not.toMatch(/\{day\}: \{date\.year\}/);
  });

  it("Hijri month detail uses full Hijri month labels", () => {
    const source = read("app/components/date-studio/HijriMonthCalendar.tsx");
    expect(source).toMatch(/HIJRI_MONTHS_EN/);
    expect(source).toMatch(/HIJRI_MONTHS_UR/);
  });

  it("combined month detail uses full Hijri labels while year cards remain compact", () => {
    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    const explorer = read("app/components/date-studio/CalendarExplorer.tsx");
    expect(cell).toMatch(/HIJRI_MONTH_SHORT_LABELS/);
    expect(cell).toMatch(/HIJRI_MONTHS_EN/);
    expect(cell).toMatch(/HIJRI_MONTHS_UR/);
    expect(explorer).toMatch(/compact/);
  });

  it("Urdu calendar cells explicitly right-align content", () => {
    const source = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(source).toMatch(/text-right/);
    const hijriMonth = read("app/components/date-studio/HijriMonthCalendar.tsx");
    expect(hijriMonth).toMatch(/text-right font-naskh/);
  });

  it("Date Profile uses Today instead of zero age for today's date", () => {
    const today = buildDateProfile(todayGregorian());
    expect(today.futureState).toBe("today");
    const source = read("app/components/date-studio/DateProfileCard.tsx");
    expect(source).toMatch(/profile\.futureState === "today"/);
    expect(source).toMatch(/today: "Today"/);
    expect(source).toMatch(/today: "آج"/);
  });

  it("Date Profile has future and past semantic status presentation", () => {
    expect(buildDateProfile({ year: 2099, month: 1, day: 1 }).futureState).toBe("future");
    expect(buildDateProfile({ year: 1976, month: 11, day: 28 }).futureState).toBe("past");
    const source = read("app/components/date-studio/DateProfileCard.tsx");
    expect(source).toMatch(/t\.future\(Math\.abs\(profile\.elapsedDays\)\)/);
    expect(source).toMatch(/t\.ago/);
  });

  it("Regional Context has a concise empty state", () => {
    const source = read("app/components/date-studio/RegionalContextCard.tsx");
    expect(source).toMatch(/No verified regional historical reference is available for this date\./);
    expect(source).not.toMatch(/No verified difference available/);
    expect(source).not.toMatch(/confidence \?\? "None"/);
  });

  it("Date Profile related calendars are action cards", () => {
    const source = read("app/components/date-studio/CalendarLinksCard.tsx");
    expect(source).toMatch(/View Gregorian month/);
    expect(source).toMatch(/View Gregorian year/);
    expect(source).toMatch(/View Hijri month/);
    expect(source).toMatch(/View Hijri year/);
    expect(source).toMatch(/rounded-xl/);
  });

  it("preserves existing deterministic Date Profile values", () => {
    const date = { year: 1976, month: 11, day: 28 };
    const profile = buildDateProfile(date);
    const converted = convert("gregorian", date);
    expect(profile.hijri).toEqual(converted.hijri);
    expect(profile.solar).toEqual(converted.solar);
    expect(profile.weekday.en).toBe("Sunday");
  });

  it("keeps Date Profile constrained and renders Historical Context", () => {
    const route = read("app/date/[date]/page.tsx");
    expect(route).toMatch(/max-w-5xl/);
    expect(route).toMatch(/getDateEvents\(parsed\)/);
    expect(read("app/components/date-studio/DateProfileCard.tsx")).toMatch(/HistoricalContext/);
  });

  it("Date Studio active action state follows the actual target mode and browser history", () => {
    const page = read("app/tools/date-converter/page.tsx");
    const converter = read("app/tools/date-converter/DateConverterContent.tsx");

    expect(page).toMatch(/requestedMode === "find" \? "find" : "convert"/);
    expect(page).toMatch(/initialMode=\{initialMode\}/);

    expect(converter).toMatch(/const requestedMode = p\.get\("mode"\)/);
    expect(converter).toMatch(/requestedMode === "find" \|\| requestedMode === "convert"/);
    expect(converter).toMatch(/setMode\(requestedMode\)/);
    expect(converter).toMatch(/setMode\("convert"\)/);

    expect(converter).toMatch(/useState<ToolMode>\(initialMode\)/);
    expect(converter).toMatch(/setToolMode\("convert"\)/);
    expect(converter).toMatch(/setToolMode\("find"\)/);
    expect(converter).toMatch(/aria-pressed=\{mode === "convert"\}/);
    expect(converter).toMatch(/aria-pressed=\{mode === "find"\}/);
    expect(converter).toMatch(/mode === "convert"[\s\S]*?bg-\[#1A3A2A\]/);
    expect(converter).toMatch(/mode === "find"[\s\S]*?bg-\[#1A3A2A\]/);

    expect(converter).toMatch(/p\.set\("mode", nextMode\)/);
    expect(converter).toMatch(/addEventListener\("popstate", syncFromUrl\)/);
    expect(converter).toMatch(/removeEventListener\("popstate", syncFromUrl\)/);
  });
});
