import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarExplorer } from "@/app/components/date-studio/CalendarExplorer";
import { buildCalendarYearModel, parseCalendarYearInput } from "@/app/tools/calendar-maker/utils/calendarModel";
import { isGregorianLeap } from "@/app/tools/date-converter/utils/dateEngine";

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

 return (
  <main className="p-6 space-y-4">
   <p>{isGregorianLeap(parsed) ? "Leap year" : "Common year"}</p>
   <CalendarExplorer model={model}/>
   <div className="grid grid-cols-3 gap-2">
    {model.months.map(m=><Link key={m.month} href={`/calendar/${parsed}/${m.month}`}>Month {m.month}</Link>)}
   </div>
  </main>
 );
}
