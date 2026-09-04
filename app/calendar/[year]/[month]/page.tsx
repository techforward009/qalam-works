import { notFound } from "next/navigation";
import { buildCalendarMonth, GREGORIAN_MONTH_LABELS, parseCalendarYearInput } from "@/app/tools/calendar-maker/utils/calendarModel";
import { MonthCalendar } from "@/app/components/date-studio/MonthCalendar";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";
import { convert } from "@/app/tools/date-converter/utils/dateEngine";

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

 const previousMonth = m === 1 ? {year:y-1,month:12} : {year:y,month:m-1};
 const nextMonth = m === 12 ? {year:y+1,month:1} : {year:y,month:m+1};
 const hijriStart = convert("gregorian",{year:y,month:m,day:1}).hijri;

 return (
  <main className="p-6">
   <DateStudioRouteNav previousHref={`/calendar/${previousMonth.year}/${previousMonth.month}`} nextHref={`/calendar/${nextMonth.year}/${nextMonth.month}`} counterpartHref={`/hijri/${hijriStart.year}/${hijriStart.month}`} counterpartLabel={{en:"Explore Hijri month",ur:"ہجری مہینہ دیکھیں"}} />
   <MonthCalendar month={calendar} title={`${GREGORIAN_MONTH_LABELS.en[m-1]} ${y}`} />
  </main>
 );
}
