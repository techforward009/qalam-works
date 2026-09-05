import type { CSSProperties } from "react";
import Link from "next/link";
import {
  deriveHijriMonthContexts,
  formatHijriContextYear,
  type HijriMonthContext,
} from "@/app/tools/calendar-maker/utils/calendarPresentation";
import {
  CALENDAR_VISUAL_SPEC,
  CALENDAR_MONTH_DAY_CELLS,
  CALENDAR_MONTH_WEEK_ROWS,
  calendarCssVariables,
} from "@/app/tools/calendar-maker/utils/calendarVisualSpec";
import {
  weekdayLabels,
  type CalendarLanguage,
  type CalendarMonth,
  type WeekStart,
} from "@/app/tools/calendar-maker/utils/calendarModel";
import { CalendarDayCell } from "./CalendarDayCell";

function HijriContextBlock({
  contexts,
  language,
  side,
  compact,
}: {
  contexts: HijriMonthContext[];
  language: CalendarLanguage;
  side: "start" | "end";
  compact: boolean;
}) {
  if (!contexts.length) return <div aria-hidden="true" />;

  return (
    <div
      className={`flex min-w-0 items-center gap-1 ${
        side === "end" ? "justify-end text-end" : "justify-start text-start"
      }`}
    >
      {contexts.map((context, index) => (
        <span key={`${context.year}-${context.month}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 && (
            <span className={`${compact ? "text-[10px]" : "text-xs"} font-bold text-[var(--calendar-hijri-context)] opacity-70`}>
              /
            </span>
          )}
          <span className="inline-flex min-w-0 flex-col items-center text-center">
            <span
              className={`${compact ? "text-[11px] sm:text-xs" : "text-sm sm:text-base"} truncate font-bold leading-tight text-[var(--calendar-hijri-context)] ${
                language === "ur" ? "font-naskh" : ""
              }`}
            >
              {context.label}
            </span>
            <span
              className={`${compact ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-xs"} mt-0.5 font-semibold leading-none text-[var(--calendar-context-year)] ${
                language === "ur" ? "font-naskh" : ""
              }`}
            >
              {formatHijriContextYear(context, language)}
            </span>
          </span>
        </span>
      ))}
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
  showHijri = true,
  interactive = true,
  compact = false,
}: {
  month: CalendarMonth;
  title?: string;
  titleHref?: string;
  language?: CalendarLanguage;
  weekStart?: WeekStart;
  hijriOffset?: number;
  showHijri?: boolean;
  interactive?: boolean;
  compact?: boolean;
}) {
  const isUr = language === "ur";
  const effectiveWeekStart: WeekStart = isUr ? "monday" : weekStart;
  const labels = weekdayLabels(language, effectiveWeekStart);
  const hasHijriData = month.weeks
    .flatMap((week) => week.cells)
    .some((cell) => cell.inCurrentMonth && cell.hijri !== null);
  const hijriEnabled = showHijri && hasHijriData;
  const contexts = hijriEnabled
    ? deriveHijriMonthContexts(month, language, hijriOffset)
    : [];
  const startContexts = contexts.slice(0, 1);
  const endContexts = contexts.slice(1);
  const style = calendarCssVariables(month.month) as CSSProperties;
  const webSpec = compact ? CALENDAR_VISUAL_SPEC.web.compact : CALENDAR_VISUAL_SPEC.web.detail;

  const titleStyle: CSSProperties = {
    fontSize: compact ? "clamp(16px, 2vw, 18px)" : "clamp(22px, 3vw, 28px)",
  };

  const titleClass = `whitespace-nowrap text-center font-black leading-snug font-nastaliq text-[var(--calendar-month-title)]`;

  const titleNode = titleHref ? (
    <Link href={titleHref} className={`${titleClass} transition-opacity hover:opacity-80`} style={titleStyle}>
      {title}
    </Link>
  ) : (
    <h2 className={titleClass} style={titleStyle}>
      {title}
    </h2>
  );

  return (
    <section
      className="overflow-hidden rounded-[2px] border border-[var(--calendar-grid-strong)] bg-[var(--calendar-cell)] shadow-none"
      dir={isUr ? "rtl" : "ltr"}
      style={style}
      data-calendar-month={month.month}
    >
      {title && (
        <header
          className="flex items-center border-b border-[var(--calendar-grid-strong)] bg-[var(--calendar-header)] px-2 py-2 sm:px-3"
          style={{ minHeight: `${webSpec.monthHeaderMinPx}px` }}
        >
          <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <HijriContextBlock contexts={startContexts} language={language} side="start" compact={compact} />
            {titleNode}
            <HijriContextBlock contexts={endContexts} language={language} side="end" compact={compact} />
          </div>
        </header>
      )}

      <div
        className="grid grid-cols-7 border-b border-[var(--calendar-grid-strong)] bg-[var(--calendar-weekday)]"
        dir={isUr ? "rtl" : "ltr"}
      >
        {labels.map((day) => {
          const sunday = day === "Sun" || day === "اتوار";
          return (
            <div
              key={day}
              className={`${compact ? "py-1.5 text-[11px] sm:text-xs" : "py-2.5 text-sm sm:text-base"} border-e border-[var(--calendar-weekday-grid)] text-center font-black ${
                isUr ? "font-naskh" : ""
              } ${
                sunday ? "text-[var(--calendar-month-title)]" : "text-[var(--calendar-text)]"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-7"
        dir={isUr ? "rtl" : "ltr"}
        data-week-rows={CALENDAR_MONTH_WEEK_ROWS}
        style={{ gridTemplateRows: `repeat(${CALENDAR_MONTH_WEEK_ROWS}, minmax(0, 1fr))` }}
      >
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
        {Array.from({ length: Math.max(0, CALENDAR_MONTH_DAY_CELLS - month.weeks.reduce((count, week) => count + week.cells.length, 0)) }, (_, index) => (
          <div
            key={`empty-week-slot-${index}`}
            aria-hidden="true"
            className="border-b border-e border-[var(--calendar-grid)] bg-[var(--calendar-filler)]"
            style={{ minHeight: `${webSpec.cellMinPx}px` }}
          />
        ))}
      </div>
    </section>
  );
}
