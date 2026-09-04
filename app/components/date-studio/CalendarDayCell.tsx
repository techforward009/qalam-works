import Link from "next/link";
import { HIJRI_MONTHS_EN, HIJRI_MONTHS_UR } from "@/app/tools/date-converter/utils/dateEngine";
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
  const minHeight = compact ? "min-h-[43px]" : "min-h-[72px] sm:min-h-[84px]";
  const isUr = language === "ur";

  if (!cell.inCurrentMonth) {
    return <div aria-hidden="true" className={`${minHeight} border-b border-e border-[#1A3A2A]/7 bg-[#F7F5EF]/45 dark:border-[#2a3d30] dark:bg-white/[0.015]`} />;
  }

  const content = (
    <div dir={isUr ? "rtl" : "ltr"} className={isUr ? "text-right" : "text-left"}>
      <span className={`${compact ? "text-[11px]" : "text-base sm:text-lg"} block font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "text-right" : "text-left"}`} dir="ltr">
        {cell.gregorian.day}
      </span>
      {cell.hijri && (
        <span className={`${compact ? "text-[9px]" : "text-[10px] sm:text-xs"} mt-1 block font-medium text-[#9A6A30] dark:text-[#D3B274] ${isUr ? "text-right font-naskh" : "text-left"}`} dir={isUr ? "rtl" : "ltr"}>
          <span dir="ltr">{cell.hijri.day}</span>{" "}
          {compact
            ? HIJRI_MONTH_SHORT_LABELS[language][cell.hijri.month - 1]
            : (isUr ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN)[cell.hijri.month - 1]}
        </span>
      )}
    </div>
  );

  const className = `${minHeight} block border-b border-e border-[#1A3A2A]/7 bg-white p-2 transition-colors dark:border-[#2a3d30] dark:bg-[#162a1e] ${isUr ? "text-right" : "text-left"}`;

  return interactive ? (
    <Link href={`/date/${cell.gregorianIso}`} className={`${className} hover:bg-[#F7F5EF] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B8935A] dark:hover:bg-[#1e3527]`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
