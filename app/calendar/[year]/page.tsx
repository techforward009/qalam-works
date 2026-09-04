import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarExplorer } from "@/app/components/date-studio/CalendarExplorer";
import { buildCalendarYearModel, parseCalendarYearInput } from "@/app/tools/calendar-maker/utils/calendarModel";
import { convert, isGregorianLeap } from "@/app/tools/date-converter/utils/dateEngine";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";

export default async function CalendarYearPage({params}:{params:Promise<{year:string}>}) {
 const {year}=await params;
 const parsed=parseCalendarYearInput(year);
 if(!parsed) notFound();

 const model=buildCalendarYearModel({
  year: parsed,
  content:"gregorian",
  language:"en",
  weekStart:"sunday",
  page:"a4-portrait",
 });

 const hijriStart = convert("gregorian",{year:parsed,month:1,day:1}).hijri;

 return (
  <main className="p-6 space-y-4">
   <DateStudioRouteNav previousHref={`/calendar/${parsed-1}`} nextHref={`/calendar/${parsed+1}`} counterpartHref={`/hijri/${hijriStart.year}`} counterpartLabel={{en:"Explore Hijri year",ur:"ہجری سال دیکھیں"}} />
   <p>{isGregorianLeap(parsed) ? "Leap year" : "Common year"}</p>
   <CalendarExplorer model={model}/>
   <div className="grid grid-cols-3 gap-2">
    {model.months.map(m=><Link key={m.month} href={`/calendar/${parsed}/${m.month}`}>Month {m.month}</Link>)}
   </div>
  </main>
 );
}
