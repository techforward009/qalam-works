import Link from "next/link";
import { weekdayLabels, type CalendarLanguage, type CalendarMonth } from "@/app/tools/calendar-maker/utils/calendarModel";
import { CalendarDayCell } from "./CalendarDayCell";

const premiumPattern = {
  backgroundColor: "#1A3A2A",
  backgroundImage:
    "linear-gradient(30deg, rgba(184,147,90,.12) 12%, transparent 12.5%, transparent 87%, rgba(184,147,90,.12) 87.5%, rgba(184,147,90,.12)), linear-gradient(150deg, rgba(184,147,90,.08) 12%, transparent 12.5%, transparent 87%, rgba(184,147,90,.08) 87.5%, rgba(184,147,90,.08))",
  backgroundSize: "34px 20px",
};

export function MonthCalendar({
  month,
  title,
  titleHref,
  language = "en",
  interactive = true,
  compact = false,
}: {
  month: CalendarMonth;
  title?: string;
  titleHref?: string;
  language?: CalendarLanguage;
  interactive?: boolean;
  compact?: boolean;
}) {
  const isUr = language === "ur";
  const labels = weekdayLabels(language, isUr ? "monday" : "sunday");

  return (
    <section className="overflow-hidden rounded-xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] shadow-sm" dir={isUr ? "rtl" : "ltr"}>
      {title && (
        <div className="relative border-b-2 border-[#B8935A]" style={premiumPattern}>
          {titleHref ? (
            <Link href={titleHref} className={`block px-4 py-3 text-center font-bold text-white hover:text-[#F1DEC0] transition-colors ${compact ? "text-sm" : "text-lg sm:text-xl"} ${isUr ? "font-naskh" : ""}`}>
              {title}
            </Link>
          ) : (
            <h2 className={`px-4 py-3 text-center font-bold text-white ${compact ? "text-sm" : "text-lg sm:text-xl"} ${isUr ? "font-naskh" : ""}`}>{title}</h2>
          )}
        </div>
      )}
      <div className="grid grid-cols-7 bg-[#E7EFE8] dark:bg-[#0e1c15]" dir={isUr ? "rtl" : "ltr"}>
        {labels.map((day) => (
          <div key={day} className={`${compact ? "py-1 text-[10px]" : "py-2 text-xs sm:text-sm"} text-center font-semibold text-[#31533d] dark:text-[#b8d4bc] ${isUr ? "font-naskh" : ""}`}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" dir={isUr ? "rtl" : "ltr"}>
        {month.weeks.flatMap((week) =>
          week.cells.map((cell) => (
            <CalendarDayCell
              key={cell.gregorianIso}
              cell={cell}
              language={language}
              interactive={interactive}
              compact={compact}
            />
          )),
        )}
      </div>
    </section>
  );
}
