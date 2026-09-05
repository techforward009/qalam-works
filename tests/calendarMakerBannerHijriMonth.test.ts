import { describe, expect, it } from "vitest";
import { buildCalendarYearModel } from "../app/tools/calendar-maker/utils/calendarModel";
import { buildCalendarHtml } from "../app/tools/calendar-maker/utils/buildCalendarHtml";
import {
  BUILTIN_SIGHTING_PROFILES,
  isSightingProfile,
  listSightingProfiles,
} from "../app/tools/calendar-maker/utils/hijriSightingArchive";
import { CALENDAR_PDF_HIJRI_SHORT_EN } from "../app/tools/calendar-maker/utils/calendarVisualSpec";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

describe("Calendar banner, Jamadi labels, and per-month Hijri offset", () => {
  it("uses Jamadi-I and Jamadi-II on the English calendar", () => {
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Jamadi-I");
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).toContain("Jamadi-II");
    expect(CALENDAR_PDF_HIJRI_SHORT_EN).not.toContain("Jumada I");
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }));
    expect(html).toContain("Jamadi-I");
    expect(html).not.toContain("Jumada");
  });

  it("keeps Hijri year centered under the month name while the pair stays in the corner", () => {
    const pdf = source("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/\.ctx-left\{[^}]*justify-content:left/);
    expect(pdf).toMatch(/\.ctx-right\{[^}]*justify-content:right/);
    expect(pdf).toMatch(/\.ctx-stack\{[^}]*align-items:center/);
    expect(pdf).toMatch(/\.ctx-year\{[\s\S]*?text-align:center/);
  });

  it("gives English month titles room for descenders like j", () => {
    const pdf = source("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/month-title-name[\s\S]*?line-height:1\.5/);
    expect(pdf).toMatch(/overflow:visible !important/);
    expect(pdf).toMatch(/padding-bottom:0\.12em/);
  });

  it("keeps Hijri days consecutive when adjacent months have different moon-sighting offsets", () => {
    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "ur",
      weekStart: "monday",
      page: "a4-portrait",
      hijriOffsets: [-1, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    const day = (month: number, gregorianDay: number) =>
      model.months[month - 1].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === gregorianDay)?.hijri;

    expect(day(1, 31)).toMatchObject({ month: 8, day: 22 });
    expect(day(2, 1)).toMatchObject({ month: 8, day: 23 });
    expect(day(2, 8)).toMatchObject({ month: 8, day: 30 });
    expect(day(2, 9)).toMatchObject({ month: 9, day: 1 });

    const sequence = model.months.flatMap((month) =>
      month.weeks.flatMap((week) => week.cells).filter((cell) => cell.inCurrentMonth && cell.hijri),
    );
    for (let index = 1; index < sequence.length; index++) {
      const previous = sequence[index - 1].hijri!;
      const current = sequence[index].hijri!;
      const sameDay = previous.year === current.year && previous.month === current.month && previous.day === current.day;
      expect(sameDay).toBe(false);
      expect(current.day).toBeGreaterThanOrEqual(1);
      expect(current.day).toBeLessThanOrEqual(30);
    }
  });

  it("does not change calculated Hijri dates when every month stays at offset 0", () => {
    const model = buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    });
    expect(model.months[0].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1)?.hijri).toMatchObject({ month: 7, day: 23 });
    expect(model.months[1].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 1)?.hijri).toMatchObject({ month: 8, day: 24 });
    expect(model.months[1].weeks.flatMap((week) => week.cells).find((cell) => cell.inCurrentMonth && cell.gregorian.day === 9)?.hijri).toMatchObject({ month: 9, day: 3 });
  });

  it("keeps an empty banner name empty and omits Gregorian+Hijri from the footer", () => {
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }), {
      bannerName: "",
      bannerTitle: "School Calendar 2027",
      bannerSideText: "City Campus",
    });
    expect(html).not.toMatch(/class="brand-name">Qalam Works/);
    expect(html).toContain("School Calendar 2027");
    expect(html).toContain("City Campus");
    expect(html).toContain("qalamworks.com");
    expect(html).not.toMatch(/<footer class="footer">[\s\S]*Gregorian \+ Hijri/);
  });

  it("embeds a custom banner without touching the year grid", () => {
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }), {
      bannerName: "Al-Noor School",
      bannerTitle: "Ramadan Calendar 2027",
      bannerLogo: "data:image/png;base64,aaa",
    });
    expect(html).toContain("Al-Noor School");
    expect(html).toContain("Ramadan Calendar 2027");
    expect(html).toContain('class="brand-logo"');
    expect(html).toContain("year-grid");
    expect(html).not.toContain("javascript:");
  });

  it("paints Sunday Gregorian dates in the same red as the Sunday header", () => {
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "ur",
      weekStart: "monday",
      page: "a4-portrait",
    }));
    expect(html).toContain('class="weekday sun"');
    expect(html).toContain("اتوار");
    expect(html).toMatch(/class="day current sunday"[\s\S]*?color:#EF2B2F/);
    expect(html).toMatch(/color:#EF2B2F !important;">3</);
  });

  it("sets Noto Nastaliq as the default banner and month-title face", () => {
    const pdf = source("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "en",
      weekStart: "monday",
      page: "a4-portrait",
    }), {
      titlePadYMm: 2.4,
      bannerName: "Line one\nLine two",
      bannerSideText: "Right one\nRight two",
      naskhFonts: {
        regularBase64: "naskhReg",
        boldBase64: "naskhBold",
        nastaliqRegularBase64: "nastArReg",
        nastaliqBoldBase64: "nastArBold",
        nastaliqLatinRegularBase64: "nastLatReg",
        nastaliqLatinBoldBase64: "nastLatBold",
      },
    });
    expect(pdf).toMatch(/font-family:'QalamNastaliq'/);
    expect(pdf).toMatch(/nastaliqLatinRegularBase64/);
    expect(html).toContain("base64,nastLatReg");
    expect(html).toContain("January");
    expect(html).toMatch(/poster-title[\s\S]*QalamNastaliq/);
    expect(html).toContain("padding:2.4mm 5mm");
    expect(html).toContain("Line one<br>Line two");
    expect(html).toContain("Right one<br>Right two");
    expect(html).toMatch(/\.brand-name\{[\s\S]*text-align:center/);
    expect(html).toMatch(/\.poster-mode\{[\s\S]*text-align:center/);
  });

  it("keeps Pakistan 2027 moon-sighting as an editable archive", () => {
    const profile = BUILTIN_SIGHTING_PROFILES[0];
    expect(profile.id).toBe("pk-2027-provisional");
    expect(profile.year).toBe(2027);
    expect(profile.offsets).toEqual([-1, -2, -2, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(isSightingProfile(profile)).toBe(true);

    const overridden = listSightingProfiles([{
      ...profile,
      builtin: false,
      offsets: [-1, -2, -2, -1, -1, 0, 0, 0, 0, 0, 0, 0],
      note: "Corrected after confirmation",
    }]);
    expect(overridden[0].offsets[5]).toBe(0);
    expect(overridden[0].note).toBe("Corrected after confirmation");
    expect(overridden[0].builtin).toBe(true);

    const restored = listSightingProfiles([]);
    expect(restored[0].offsets).toEqual(profile.offsets);

    const maker = source("app/tools/calendar-maker/CalendarMakerContent.tsx");
    expect(maker).toContain("sightingArchive");
    expect(maker).toContain("listSightingProfiles");
  });

  it("prints Urdu weekday names on the Urdu calendar", () => {
    const html = buildCalendarHtml(buildCalendarYearModel({
      year: 2027,
      content: "gregorian-hijri",
      language: "ur",
      weekStart: "monday",
      page: "a4-portrait",
    }));
    expect(html).toContain("پیر");
    expect(html).toContain("اتوار");
    expect(html).not.toMatch(/>Mon</);
    const preview = source("app/components/date-studio/MonthCalendar.tsx");
    expect(preview).toMatch(/weekdayLabels/);
    expect(preview).toContain("اتوار");
  });
});
