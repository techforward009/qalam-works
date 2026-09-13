"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLanguage } from "../../lib/language-context";
import { convert, formatDate, validateDate, type DateParts } from "../date-converter/utils/dateEngine";
import { PAKISTAN_YALLOP_OBSERVERS, yallopObserver } from "../date-converter/utils/yallop/observerLocations";
import { evaluateDateStudioYallopPrediction } from "../date-converter/utils/yallop/dateStudioPrediction";
import { evaluateDateStudioPakistanCrescentPrediction } from "../date-converter/utils/pakistan-crescent/dateStudioPrediction";
import { resolvePakistanOfficialHijriDate } from "../date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { resolvePakistanOfficialSightingDecisionForEvening } from "../date-converter/utils/hijri-authority/resolveOfficialSightingDecision";
import { interpretDateStudioMonthStart } from "../date-converter/utils/yallop/dateStudioMonthStart";
import { PakistanVisibilityMap } from "./components/PakistanVisibilityMap";

const pakistanToday = (): DateParts => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts().filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
  return { year: values.year, month: values.month, day: values.day } as DateParts;
};
const iso = (d: DateParts) => `${d.year}-${String(d.month).padStart(2,"0")}-${String(d.day).padStart(2,"0")}`;
const parse = (s: string): DateParts => { const [year, month, day] = s.split("-").map(Number); return { year, month, day }; };
const urduNames: Record<string,string> = { karachi:"کراچی", islamabad:"اسلام آباد", lahore:"لاہور", hyderabad:"حیدرآباد", rawalpindi:"راولپنڈی", multan:"ملتان", peshawar:"پشاور", quetta:"کوئٹہ", muzaffarabad:"مظفرآباد", gilgit:"گلگت", skardu:"سکردو" };

export default function CrescentVisibilityContent() {
  const { language: lang } = useLanguage(); const ur = lang === "ur";
  const [dateInput, setDateInput] = useState(() => iso(pakistanToday())); const [observerId, setObserverId] = useState("karachi");
  const date = parse(dateInput); const dateError = validateDate("gregorian", date); const isValidDate = dateError === null;
  const observer = yallopObserver(observerId) ?? yallopObserver("karachi")!;
  const yallop = useMemo(() => isValidDate ? evaluateDateStudioYallopPrediction(date, observer) : null, [isValidDate,date.year,date.month,date.day,observer]);
  const pakistan = useMemo(() => isValidDate ? evaluateDateStudioPakistanCrescentPrediction(date, observer) : null, [isValidDate,date.year,date.month,date.day,observer]);
  const authority = useMemo(() => isValidDate ? resolvePakistanOfficialHijriDate(date) : null, [isValidDate,date.year,date.month,date.day]);
  const decision = useMemo(() => isValidDate ? resolvePakistanOfficialSightingDecisionForEvening(date) : null, [isValidDate,date.year,date.month,date.day]);
  const calculated = useMemo(() => isValidDate ? convert("gregorian", date).hijri : null, [isValidDate,date.year,date.month,date.day]);
  const controls = <div className="mt-5 flex flex-wrap gap-2"><button aria-label="Karachi" onClick={()=>setObserverId("karachi")} className="rounded-lg bg-[#1A3A2A] px-4 py-2 text-white">{ur?"کراچی":"Karachi"}</button><button aria-label="Islamabad" onClick={()=>setObserverId("islamabad")} className="rounded-lg border px-4 py-2">{ur?"اسلام آباد":"Islamabad"}</button><select aria-label={ur?"دیگر شہر":"Other cities"} value={observerId} onChange={e=>setObserverId(e.target.value)} className="rounded-lg border px-3 py-2"><option value="karachi">{ur?"دیگر شہر":"Other cities"}</option>{PAKISTAN_YALLOP_OBSERVERS.filter(x=>x.id!=="karachi"&&x.id!=="islamabad").map(x=><option key={x.id} value={x.id}>{ur?(urduNames[x.id]??x.name):x.name}</option>)}</select><label className="sr-only" htmlFor="dashboard-date">{ur?"تاریخ تبدیل کریں":"Change date"}</label><input id="dashboard-date" aria-label={ur?"تاریخ تبدیل کریں":"Change date"} type="date" min="1900-01-01" max="2100-12-31" value={dateInput} onChange={e=>setDateInput(e.target.value)} className="rounded-lg border px-3 py-2" /></div>;
  if (!isValidDate || !yallop || !pakistan || !calculated) return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}><h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "رؤیتِ ہلال" : "Crescent visibility"}</h1>{controls}<p role="alert" className={`mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 ${ur ? "font-naskh" : ""}`}>{ur ? "براہِ کرم 1900 سے 2100 کے درمیان عیسوی تاریخ منتخب کریں۔" : "Please select a Gregorian date between 1900 and 2100."}</p></main>;
  const yf = yallop.status === "evaluated" && yallop.acceptedByPolicy, pf = pakistan.status === "evaluated" && pakistan.criterion.qualifies;
  const context = authority ?? { hijri: calculated, authority: "qalam-tabular" as const };
  const month = interpretDateStudioMonthStart(context.hijri.day, yf, context.authority);
  const city = ur ? (urduNames[observer.id] ?? observer.name) : observer.name;
  const summary = yf === pf ? (yf ? (ur ? `${city} میں دونوں سائنسی طریقوں کے مطابق رؤیت کے حالات موافق ہیں` : `For ${city}, both scientific methods indicate favorable crescent-visibility conditions.`) : (ur ? `${city} میں دونوں سائنسی طریقوں کے مطابق رؤیت کے حالات موافق نہیں ہیں` : `For ${city}, both scientific methods indicate unfavorable crescent-visibility conditions.`)) : (ur ? `${city} کے لیے سائنسی طریقوں کے نتائج مختلف ہیں` : `For ${city}, the scientific methods give different results.`);
  return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}>
    <h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "رؤیتِ ہلال" : "Crescent visibility"}</h1>
    {controls}
    <p className="mt-5 text-sm">{ur?"منتخب تاریخ":"Selected evening"}: <span dir="ltr">{iso(date)}</span> · {ur?"مقام":"Observer"}: {city}</p>
    <section className="mt-4 rounded-2xl bg-[#F7F5EF] p-5 dark:bg-[#162a1e]"><p className="text-sm font-semibold">{authority ? (authority.authority === "official" ? (ur?"پاکستان کی سرکاری ہجری تاریخ":"Pakistan official Hijri date") : (ur?"رپورٹ شدہ سرکاری پاکستانی ہجری تاریخ":"Reported official Pakistan Hijri date")) : (ur?"حسابی ہجری تاریخ":"Calculated Hijri date")}</p><p className={`text-2xl font-bold ${ur?"font-naskh":""}`}>{formatDate(context.hijri,"hijri",lang)}</p><p className={`mt-4 text-xl font-bold ${ur?"font-naskh":""}`}>{summary}</p><p className={`mt-3 text-sm text-[#4a6a4a] ${ur?"font-naskh":""}`}>{ur?"حتمی سرکاری اعلان پاکستان کے کسی بھی مقام سے موصول ہونے والی معتبر شہادت کی بنیاد پر ہوسکتا ہے۔":"The final official declaration may be based on credible accepted sighting testimony from any location in Pakistan."}</p></section>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Card title="Pakistan 5-Year Calendar Criterion"><p>{pf ? (ur?"معیار پر پورا اترتا ہے":"Criterion conditions are met.") : (ur?"معیار پر پورا نہیں اترتا":"Criterion conditions are not met.")}</p>{pakistan.status === "evaluated"&&<p className="mt-3 text-sm" dir="ltr">Altitude {pakistan.snapshot.altitudeDeg.toFixed(2)}° · Width {pakistan.snapshot.widthArcMin.toFixed(3)}′ · Illumination {pakistan.snapshot.illuminationPercent.toFixed(2)}% · Elongation {pakistan.snapshot.elongationDeg.toFixed(2)}° · Lag {pakistan.snapshot.lagMinutes.toFixed(1)} min</p>}</Card><Card title="Yallop Crescent Visibility"><p>{yf ? (ur?"رؤیت کے حالات موافق ہیں":"Visibility conditions are favorable.") : (ur?"رؤیت کے حالات موافق نہیں ہیں":"Visibility conditions are unfavorable.")}</p>{yallop.status === "evaluated"&&<p className="mt-3 text-sm" dir="ltr">Class {yallop.criterion.visibilityClass} · q {yallop.criterion.q.toFixed(3)}</p>}</Card></div>
    <section className="mt-4 rounded-xl border p-4"><h2 className="font-bold">{ur?"آغازِ ماہ کا امکان":"Month-start implication"}</h2><p>{month.state === "day30_forced_next_month" ? (authority ? (ur?"سرکاری قمری سیاق کے مطابق کل نئے مہینے کی پہلی تاریخ ہے۔":"Authoritative calendar context makes tomorrow the first day of the next month.") : (ur?"حسابی قمری سیاق کے مطابق اگلی تاریخ نئے مہینے کی پہلی ہے۔":"Calculated context places the next calculated Hijri day in the next month.")) : month.state === "day29_qualifies" && authority ? (ur?"سائنسی نتائج کے مطابق کل آغازِ ماہ ہو سکتا ہے؛ حتمی فیصلہ سرکاری ہوگا۔":"Scientific visibility may support next-day month start; an official decision remains required.") : (ur?"کوئی سرکاری آغازِ ماہ کا نتیجہ اخذ نہیں کیا گیا۔":"No official month-start conclusion is inferred.")}</p></section>
    <PakistanVisibilityMap date={date} selectedObserver={observer} decision={decision} lang={lang} />
    <details className="mt-4"><summary className="font-bold">{ur?"مزید سائنسی تفصیلات":"Scientific details"}</summary><p className="mt-2">{ur?"سائنسی پیش گوئیاں سرکاری رویتِ ہلال کا اعلان نہیں ہیں۔":"Scientific predictions are not official moon-sighting declarations."}</p></details>
  </main>;
}
function Card({title,children}:{title:string;children:ReactNode}) { return <section className="rounded-2xl border p-5"><h2 className="font-bold">{title}</h2>{children}</section>; }
