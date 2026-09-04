import Link from "next/link";
import { notFound } from "next/navigation";
import { convert } from "@/app/tools/date-converter/utils/dateEngine";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";

function getHijriMonthDays(year:number, month:number) {
 const days:number[]=[];
 for(let day=1; day<=30; day++){
  try {
   const result=convert("hijri",{year,month,day});
   if(result.hijri.year===year && result.hijri.month===month) days.push(day);
  } catch {}
 }
 return days;
}

export default async function HijriMonthPage({params}:{params:Promise<{year:string;month:string}>}) {
 const {year,month}=await params;
 const y=Number(year);
 const m=Number(month);

 if(!Number.isInteger(y)||y<=0||!Number.isInteger(m)||m<1||m>12) notFound();

 const days=getHijriMonthDays(y,m);
 if(!days.length) notFound();

 const previousMonth = m === 1 ? {year:y-1,month:12} : {year:y,month:m-1};
 const nextMonth = m === 12 ? {year:y+1,month:1} : {year:y,month:m+1};
 const gregorianStart = convert("hijri",{year:y,month:m,day:1}).gregorian;

 return (
  <main className="p-6">
   <DateStudioRouteNav previousHref={`/hijri/${previousMonth.year}/${previousMonth.month}`} nextHref={`/hijri/${nextMonth.year}/${nextMonth.month}`} counterpartHref={`/calendar/${gregorianStart.year}/${gregorianStart.month}`} counterpartLabel={{en:"Explore Gregorian month",ur:"عیسوی مہینہ دیکھیں"}} />
   <h1 className="text-2xl font-bold">Hijri {m}/{y}</h1>
   {days.map(day=>{
    const date=convert("hijri",{year:y,month:m,day}).gregorian;
    return <Link key={day} className="block" href={`/date/${date.year}-${String(date.month).padStart(2,"0")}-${String(date.day).padStart(2,"0")}`}>
      {day}: {date.year}-{date.month}-{date.day}
    </Link>
   })}
  </main>
 );
}
