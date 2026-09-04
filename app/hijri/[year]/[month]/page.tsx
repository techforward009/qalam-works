import Link from "next/link";
import { notFound } from "next/navigation";
import { convert } from "@/app/tools/date-converter/utils/dateEngine";

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

 return (
  <main className="p-6">
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
