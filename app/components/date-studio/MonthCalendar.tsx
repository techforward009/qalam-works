import type { CalendarMonth } from "@/app/tools/calendar-maker/utils/calendarModel";
import { CalendarDayCell } from "./CalendarDayCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({ month, title }: { month: CalendarMonth; title?: string }) {
  return (
    <section className="space-y-3">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => <div key={day} className="font-medium">{day}</div>)}
        {month.weeks.flatMap((week) =>
          week.cells.map((cell) => <CalendarDayCell key={cell.gregorianIso} cell={cell} />)
        )}
      </div>
    </section>
  );
}
