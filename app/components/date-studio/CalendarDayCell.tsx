import Link from "next/link";
import { HIJRI_MONTH_SHORT_LABELS, type CalendarCell, type CalendarLanguage } from "@/app/tools/calendar-maker/utils/calendarModel";

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
  const minHeight = compact ? "min-h-[43px]" : "min-h-[64px] sm:min-h-[72px]";

  if (!cell.inCurrentMonth) {
    return (
      <div
        aria-hidden="true"
        className={`${minHeight} border-b border-e border-[#1A3A2A]/7 dark:border-[#2a3d30] bg-[#F7F5EF]/45 dark:bg-white/[0.015]`}
      />
    );
  }

  const content = (
    <>
      <span className={`${compact ? "text-[11px]" : "text-base sm:text-lg"} block font-bold text-[#1A3A2A] dark:text-[#e8ede9]`} dir="ltr">
        {cell.gregorian.day}
      </span>
      {cell.hijri && (
        <span
          className={`${compact ? "text-[9px]" : "text-[10px] sm:text-xs"} mt-1 block font-medium text-[#9A6A30] dark:text-[#D3B274]`}
          dir={language === "ur" ? "rtl" : "ltr"}
        >
          <span dir="ltr">{cell.hijri.day}</span>{" "}
          {HIJRI_MONTH_SHORT_LABELS[language][cell.hijri.month - 1]}
        </span>
      )}
    </>
  );

  const className = `${minHeight} block border-b border-e border-[#1A3A2A]/7 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-2 text-start transition-colors`;

  return interactive ? (
    <Link href={`/date/${cell.gregorianIso}`} className={`${className} hover:bg-[#F7F5EF] dark:hover:bg-[#1e3527] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B8935A]`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
