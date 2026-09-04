import Link from "next/link";
import type { CalendarCell, CalendarLanguage } from "@/app/tools/calendar-maker/utils/calendarModel";
import { isSunday, toUrduDigits } from "@/app/tools/calendar-maker/utils/calendarPresentation";

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
  const minHeight = compact ? "min-h-[54px]" : "min-h-[96px] sm:min-h-[108px]";

  if (!cell.inCurrentMonth) {
    return (
      <div
        aria-hidden="true"
        className={`${minHeight} border-b border-e border-[#1A3A2A]/10 bg-[#F7F5EF]/55 dark:border-[#2a3d30] dark:bg-white/[0.015]`}
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
        dir={isUr ? "rtl" : "ltr"}
        className={`flex h-full flex-col justify-between ${isUr ? "items-end text-right" : "items-start text-left"}`}
      >
        <span
          data-role="gregorian-day"
          className={`${compact ? "text-[17px] sm:text-lg" : "text-2xl sm:text-[28px]"} block font-black leading-none ${
            sunday ? "text-[#9A4D3A] dark:text-[#D88A76]" : "text-[#17251d] dark:text-[#f2f5f2]"
          } ${isUr ? "self-end text-right" : ""}`}
          dir="ltr"
        >
          {gregorianDay}
        </span>

        {hijriDay && (
          <span
            data-role="hijri-day"
            className={`${compact ? "text-[11px]" : "text-sm"} mt-2 block font-bold leading-none text-[#496C52] dark:text-[#9FC5A7] ${
              isUr ? "self-end text-right font-naskh" : ""
            }`}
            dir={isUr ? "rtl" : "ltr"}
          >
            {hijriDay}
          </span>
        )}
      </div>
    );
  })();

  const className = `${minHeight} block border-b border-e border-[#1A3A2A]/10 bg-[#FFFDF8] p-2.5 transition-colors dark:border-[#2a3d30] dark:bg-[#162a1e] ${
    isUr ? "text-right" : "text-left"
  }`;

  return interactive ? (
    <Link
      href={`/date/${cell.gregorianIso}`}
      className={`${className} hover:bg-[#F7F5EF] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B8935A] dark:hover:bg-[#1e3527]`}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
