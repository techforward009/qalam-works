import type { CalendarYearModel } from "@/app/tools/calendar-maker/utils/calendarModel";
import { MonthCalendar } from "./MonthCalendar";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function CalendarExplorer({ model }: { model: CalendarYearModel }) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{model.year}</h1>
      </header>
      {model.months.map((month) => (
        <MonthCalendar
          key={month.month}
          month={month}
          title={MONTHS[month.month - 1]}
        />
      ))}
    </div>
  );
}
