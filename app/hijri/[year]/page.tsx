import Link from "next/link";
import { notFound } from "next/navigation";
import { convert } from "@/app/tools/date-converter/utils/dateEngine";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";

const MONTHS = [
 "Muharram","Safar","Rabi al-Awwal","Rabi al-Thani",
 "Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban",
 "Ramadan","Shawwal","Dhu al-Qadah","Dhu al-Hijjah"
];

function isSupportedHijriYear(year:number) {
 if (!Number.isInteger(year) || year <= 0) return false;
 try {
  const result=convert("hijri",{year,month:1,day:1});
  return Boolean(result.gregorian);
 } catch {
  return false;
 }
}

export default async function HijriYearPage({params}:{params:Promise<{year:string}>}) {
 const {year}=await params;
 const y=Number(year);
 if(!isSupportedHijriYear(y)) notFound();

 const gregorianStart=convert("hijri",{year:y,month:1,day:1}).gregorian;

 return (
  <main className="p-6 space-y-4">
   <DateStudioRouteNav previousHref={`/hijri/${y-1}`} nextHref={`/hijri/${y+1}`} counterpartHref={`/calendar/${gregorianStart.year}`} counterpartLabel={{en:"Explore Gregorian year",ur:"عیسوی سال دیکھیں"}} />
   <h1 className="text-3xl font-bold">Hijri {y}</h1>
   {MONTHS.map((name,index)=>{
    const start=convert("hijri",{year:y,month:index+1,day:1}).gregorian;
    return <Link key={name} href={`/hijri/${y}/${index+1}`} className="block border p-3">
      {name} — {start.year}-{start.month}-{start.day}
    </Link>
   })}
  </main>
 );
}
