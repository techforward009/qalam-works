import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CALENDAR_VISUAL_SPEC } from "../app/tools/calendar-maker/utils/calendarVisualSpec";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Calendar header and Hijri digit spacing", () => {
  it("gives month headers more vertical room while retaining centered context alignment", () => {
    expect(CALENDAR_VISUAL_SPEC.web.compact.monthHeaderMinPx).toBe(68);
    expect(CALENDAR_VISUAL_SPEC.web.detail.monthHeaderMinPx).toBe(90);
    expect(CALENDAR_VISUAL_SPEC.print.monthHeaderPortraitMm).toBe(9.0);
    expect(CALENDAR_VISUAL_SPEC.print.monthHeaderLandscapeMm).toBe(8.5);

    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/\.month-head\{[\s\S]*?align-items:center/);
    expect(pdf).toMatch(/\.ctx\{[^}]*height:100%;display:flex;align-items:center/);
    expect(pdf).toMatch(/\.ctx-stack\{[^}]*height:100%[^}]*justify-content:center/);
  });

  it("increases Hijri day typography and anchors it lower in web cells", () => {
    expect(CALENDAR_VISUAL_SPEC.web.compact.hijriFont).toBe("clamp(10px, 1.3vw, 12px)");
    expect(CALENDAR_VISUAL_SPEC.web.detail.hijriFont).toBe("clamp(13px, 1.9vw, 16px)");

    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(cell).toMatch(/flex flex-col justify-between/);
    expect(cell).toMatch(/pb-\[3px\]/);
    expect(cell).toMatch(/self-end/);
  });

  it("keeps Hijri PDF typography secondary and anchored in the bottom-right", () => {
    expect(CALENDAR_VISUAL_SPEC.print.hijriFontPortrait).toBe("9px");
    expect(CALENDAR_VISUAL_SPEC.print.hijriFontLandscape).toBe("9px");

    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/align-self:flex-end !important/);
    expect(pdf).toMatch(/color:#15803d !important/);
  });
});
