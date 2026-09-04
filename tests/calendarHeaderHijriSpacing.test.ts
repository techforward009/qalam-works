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
    expect(CALENDAR_VISUAL_SPEC.print.monthHeaderPortraitMm).toBe(16.5);
    expect(CALENDAR_VISUAL_SPEC.print.monthHeaderLandscapeMm).toBe(16.0);

    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/\.month-head\{[\s\S]*?align-items:center/);
    expect(pdf).toMatch(/\.ctx\{[^}]*height:100%;display:flex;align-items:center/);
    expect(pdf).toMatch(/\.ctx-stack\{[^}]*height:100%[^}]*justify-content:center/);
  });

  it("increases Hijri day typography and anchors it lower in web cells", () => {
    expect(CALENDAR_VISUAL_SPEC.web.compact.hijriFont).toBe("clamp(10px, 1.3vw, 12px)");
    expect(CALENDAR_VISUAL_SPEC.web.detail.hijriFont).toBe("clamp(13px, 1.9vw, 16px)");

    const cell = read("app/components/date-studio/CalendarDayCell.tsx");
    expect(cell).toMatch(/grid-cols-2 grid-rows-2/);
    expect(cell).toMatch(/pb-\[2px\]/);
    expect(cell).toMatch(/col-start-2 row-start-2/);
    expect(cell).toMatch(/self-end justify-self-end/);
  });

  it("increases Hijri PDF typography and reduces bottom inset without changing grid anchoring", () => {
    expect(CALENDAR_VISUAL_SPEC.print.hijriFontPortrait).toBe("16px");
    expect(CALENDAR_VISUAL_SPEC.print.hijriFontLandscape).toBe("16px");

    const pdf = read("app/tools/calendar-maker/utils/buildCalendarHtml.ts");
    expect(pdf).toMatch(/padding:4px 6px !important/);
    expect(pdf).toMatch(/\.hijri-day\{[\s\S]*?right:6px !important;[\s\S]*?bottom:8px !important/);
  });
});
