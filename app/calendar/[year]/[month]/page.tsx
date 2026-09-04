import { notFound } from "next/navigation";
import { buildCalendarMonth, GREGORIAN_MONTH_LABELS, parseCalendarYearInput } from "@/app/tools/calendar-maker/utils/calendarModel";
import { MonthCalendar } from "@/app/components/date-studio/MonthCalendar";

export default async function CalendarMonthPage({params}:{params:Promise<{year:string;month:string}>}) {
 const {year,month}=await params;
 const y=parseCalendarYearInput(year);
 const m=Number(month);

 if(!y || !Number.isInteger(m) || m<1 || m>12) notFound();

 let calendar;
 try {
  calendar=buildCalendarMonth(y,m,"gregorian","sunday");
 } catch {
  notFound();
 }

 return (
  <main className="p-6">
   <MonthCalendar month={calendar} title={`${GREGORIAN_MONTH_LABELS.en[m-1]} ${y}`} />
  </main>
 );
}
