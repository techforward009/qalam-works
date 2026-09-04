import Link from "next/link";
import {
  deriveHijriMonthContexts,
  formatHijriContextYear,
  type HijriMonthContext,
} from "@/app/tools/calendar-maker/utils/calendarPresentation";
import {
  weekdayLabels,
  type CalendarLanguage,
  type CalendarMonth,
  type WeekStart,
} from "@/app/tools/calendar-maker/utils/calendarModel";
import { CalendarDayCell } from "./CalendarDayCell";

const premiumPattern = {
  backgroundColor: "#1A3A2A",
  backgroundImage:
    "linear-gradient(30deg, rgba(184,147,90,.10) 12%, transparent 12.5%, transparent 87%, rgba(184,147,90,.10) 87.5%), linear-gradient(150deg, rgba(184,147,90,.06) 12%, transparent 12.5%, transparent 87%, rgba(184,147,90,.06) 87.5%)",
  backgroundSize: "34px 20px",
};

function HijriContextBlock({
  contexts,
  language,
  align,
  compact,
}: {
  contexts: HijriMonthContext[];
  language: CalendarLanguage;
  align: "start" | "end";
  compact: boolean;
}) {
  if (!contexts.length) return <div />;

  return (
    <div className={`${align === "start" ? "text-start" : "text-end"} min-w-0`}>
      <div className={`flex flex-wrap items-baseline gap-x-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
        {contexts.map((context, index) => (
          <span key={`${context.year}-${context.month}`} className="inline-flex items-baseline gap-1">
            {index > 0 && <span className="text-white/45">/</span>}
            <span className={`${compact ? "text-[10px] sm:text-[11px]" : "text-xs sm:text-sm"} font-bold text-[#F3E6CF]`}>
              {context.label}
            </span>
          </span>
        ))}
      </div>
      <div className={`mt-0.5 flex flex-wrap gap-x-1 ${align === "end" ? "justify-end" : "justify-start"}`}>
        {contexts.map((context, index) => (
          <span key={`year-${context.year}-${context.month}`} className="inline-flex items-baseline gap-1">
            {index > 0 && <span className="text-white/30">/</span>}
            <span className={`${compact ? "text-[8px]" : "text-[10px]"} text-white/65`}>
              {formatHijriContextYear(context, language)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MonthCalendar({
  month,
  title,
  titleHref,
  language = "en",
  weekStart = "monday",
  hijriOffset = 0,
  interactive = true,
  compact = false,
}: {
  month: CalendarMonth;
  title?: string;
  titleHref?: string;
  language?: CalendarLanguage;
  weekStart?: WeekStart;
  hijriOffset?: number;
  interactive?: boolean;
  compact?: boolean;
}) {
  const isUr = language === "ur";
  const effectiveWeekStart: WeekStart = isUr ? "monday" : weekStart;
  const labels = weekdayLabels(language, effectiveWeekStart);
  const contexts = deriveHijriMonthContexts(month, language, hijriOffset);
  const startContexts = contexts.slice(0, 1);
  const endContexts = contexts.slice(1);

  const titleNode = titleHref ? (
    <Link
      href={titleHref}
      className={`block truncate text-center font-black text-white transition-colors hover:text-[#F1DEC0] ${
        compact ? "text-sm sm:text-[15px]" : "text-lg sm:text-xl"
      } ${isUr ? "font-naskh" : ""}`}
    >
      {title}
    </Link>
  ) : (
    <h2 className={`truncate text-center font-black text-white ${compact ? "text-sm sm:text-[15px]" : "text-lg sm:text-xl"} ${isUr ? "font-naskh" : ""}`}>
      {title}
    </h2>
  );

  return (
    <section
      className="overflow-hidden rounded-xl border border-[#1A3A2A]/15 bg-[#FFFDF8] shadow-sm dark:border-[#2a3d30] dark:bg-[#162a1e]"
      dir={isUr ? "rtl" : "ltr"}
    >
      {title && (
        <div className="border-b-2 border-[#B8935A] px-3 py-3" style={premiumPattern}>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,1.15fr)_minmax(0,1fr)] items-center gap-2">
            <HijriContextBlock contexts={startContexts} language={language} align="start" compact={compact} />
            {titleNode}
            <HijriContextBlock contexts={endContexts} language={language} align="end" compact={compact} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 border-b border-[#1A3A2A]/10 bg-[#E8EFE8] dark:border-[#2a3d30] dark:bg-[#0e1c15]" dir={isUr ? "rtl" : "ltr"}>
        {labels.map((day) => {
          const sunday = day === "Sun" || day === "اتوار";
          return (
            <div
              key={day}
              className={`${compact ? "py-1.5 text-[10px]" : "py-2.5 text-xs sm:text-sm"} text-center font-bold ${
                sunday ? "text-[#9A4D3A] dark:text-[#D88A76]" : "text-[#31533d] dark:text-[#b8d4bc]"
              } ${isUr ? "font-naskh" : ""}`}
            >
              {day}
            </div>
          );
        })}
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
