import type { CSSProperties } from "react";
import Link from "next/link";
import type { CalendarCell, CalendarLanguage } from "@/app/tools/calendar-maker/utils/calendarModel";
import { isSunday, toUrduDigits } from "@/app/tools/calendar-maker/utils/calendarPresentation";
import { CALENDAR_VISUAL_SPEC } from "@/app/tools/calendar-maker/utils/calendarVisualSpec";

export function CalendarDayCell({
  cell,
  language = "en",
  interactive = true,
  compact = false,
}: {
  cell: CalendarCell;
  language?: CalendarLanguage;
  interactive?: boolean;
  compact?: boolean;
}) {
  const isUr = language === "ur";
  const cellSpec = compact ? CALENDAR_VISUAL_SPEC.web.compact : CALENDAR_VISUAL_SPEC.web.detail;
  const cellStyle: CSSProperties = { minHeight: `${cellSpec.cellMinPx}px` };

  if (!cell.inCurrentMonth) {
    return (
      <div
        aria-hidden="true"
        className="border-b border-e border-[var(--calendar-grid)] bg-[var(--calendar-filler)]"
        style={cellStyle}
      />
    );
  }

  // Active-cell reads begin only after outside-month cells have returned.
  const content = (() => {
    const sunday = isSunday(cell.gregorian);
    const gregorianDay = String(cell.gregorian.day);
    const hijriDay = cell.hijri
      ? (isUr ? toUrduDigits(cell.hijri.day) : String(cell.hijri.day))
      : null;

    return (
      <div
        className="absolute inset-0 flex flex-col justify-between ps-1.5 pe-1 pt-1 pb-[3px]"
        dir="ltr"
      >
        <span
          data-role="gregorian-day"
          className={`self-start whitespace-nowrap text-left font-bold leading-none ${
            sunday ? "text-[var(--calendar-month-title)]" : "text-[var(--calendar-text)]"
          }`}
          style={{ fontSize: cellSpec.gregorianFont }}
        >
          {gregorianDay}
        </span>

        {hijriDay && (
          <span
            data-role="hijri-day"
            className={`self-end whitespace-nowrap text-right font-bold leading-none text-[var(--calendar-hijri-day)] ${
              isUr ? "font-naskh" : ""
            }`}
            dir={isUr ? "rtl" : "ltr"}
            style={{ fontSize: cellSpec.hijriFont }}
          >
            {hijriDay}
          </span>
        )}
      </div>
    );
  })();

  const className =
    "relative block overflow-visible border-b border-e border-[var(--calendar-grid)] bg-[var(--calendar-cell)] p-0 transition-colors";

  return interactive ? (
    <Link
      href={`/date/${cell.gregorianIso}`}
      className={`${className} hover:brightness-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--calendar-frame)]`}
      style={cellStyle}
      aria-label={cell.gregorianIso}
    >
      {content}
    </Link>
  ) : (
    <div className={className} style={cellStyle}>
      {content}
    </div>
  );
}
