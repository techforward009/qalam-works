import Link from "next/link";
import type { CalendarCell } from "@/app/tools/calendar-maker/utils/calendarModel";

export function CalendarDayCell({ cell }: { cell: CalendarCell }) {
  if (!cell.inCurrentMonth) {
    return <div className="p-2 text-sm opacity-40">{cell.gregorian.day}</div>;
  }

  return (
    <Link href={`/date/${cell.gregorianIso}`} className="rounded border p-2 block">
      {cell.gregorian.day}
    </Link>
  );
}
