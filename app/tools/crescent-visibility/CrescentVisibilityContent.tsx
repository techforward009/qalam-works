"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "../../lib/language-context";
import { convert, formatDate, validateDate, type DateParts } from "../date-converter/utils/dateEngine";
import { PAKISTAN_YALLOP_OBSERVERS, yallopObserver } from "../date-converter/utils/yallop/observerLocations";
import { evaluateDateStudioYallopPrediction } from "../date-converter/utils/yallop/dateStudioPrediction";
import { evaluateDateStudioPakistanCrescentPrediction } from "../date-converter/utils/pakistan-crescent/dateStudioPrediction";
import { resolvePakistanOfficialHijriDate } from "../date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { resolvePakistanOfficialSightingDecisionForEvening } from "../date-converter/utils/hijri-authority/resolveOfficialSightingDecision";
import { interpretDateStudioMonthStart } from "../date-converter/utils/yallop/dateStudioMonthStart";
import { PakistanVisibilityMap } from "./components/PakistanVisibilityMap";
import { NationalEvidencePanel } from "./components/NationalEvidencePanel";

// Presentation safeguard: re-enable only after an approved Pakistan boundary/mask is available.
const PAKISTAN_VISIBILITY_MAP_ENABLED = false;

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
  const city = ur ? (urduNames[observer.id] ?? observer.name) : observer.name;
  const dateControl = <div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-sm font-semibold" htmlFor="dashboard-date">{ur?"تاریخ":"Date"}</label><input id="dashboard-date" aria-label={ur?"تاریخ تبدیل کریں":"Change date"} type="date" min="1900-01-01" max="2100-12-31" value={dateInput} onChange={e=>setDateInput(e.target.value)} className="rounded-lg border px-3 py-2" /></div>;
  const quickCityClass = (active: boolean) => `rounded-lg border px-4 py-2 font-medium ${active ? "border-[#1A3A2A] bg-[#1A3A2A] text-white hover:bg-[#244e38] dark:border-[#4f8b61] dark:bg-[#2a5a3a] dark:text-white dark:hover:bg-[#356c48]" : "border-[#1A3A2A] bg-[#F7F5EF] text-[#173b26] hover:bg-[#e4eee5] dark:border-[#b7d8bd] dark:bg-[#1f452e] dark:text-[#f5faf5] dark:hover:bg-[#2b5a3b]"}`;
  const cityControls = <div className="mt-3 flex flex-wrap gap-2"><button aria-label="Karachi" aria-pressed={observerId === "karachi"} onClick={()=>setObserverId("karachi")} className={quickCityClass(observerId === "karachi")}>{ur?"کراچی":"Karachi"}</button><button aria-label="Islamabad" aria-pressed={observerId === "islamabad"} onClick={()=>setObserverId("islamabad")} className={quickCityClass(observerId === "islamabad")}>{ur?"اسلام آباد":"Islamabad"}</button><OtherCitiesDropdown observerId={observerId} setObserverId={setObserverId} ur={ur} /></div>;
  if (!isValidDate || !yallop || !pakistan || !calculated) return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}><h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان میں رؤیتِ ہلال" : "Pakistan crescent visibility"}</h1>{dateControl}<p role="alert" className={`mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 ${ur ? "font-naskh" : ""}`}>{ur ? "براہِ کرم 1900 سے 2100 کے درمیان عیسوی تاریخ منتخب کریں۔" : "Please select a Gregorian date between 1900 and 2100."}</p></main>;
  const yf = yallop.status === "evaluated" && yallop.acceptedByPolicy, pf = pakistan.status === "evaluated" && pakistan.criterion.qualifies;
  const context = authority ?? { hijri: calculated, authority: "qalam-tabular" as const };
  const month = interpretDateStudioMonthStart(context.hijri.day, yf, context.authority);
  const summary = yf === pf ? (yf ? (ur ? `${city} میں دونوں سائنسی طریقوں کے مطابق رؤیت کے حالات موافق ہیں` : `For ${city}, both scientific methods indicate favorable crescent-visibility conditions.`) : (ur ? `${city} میں دونوں سائنسی طریقوں کے مطابق رؤیت کے حالات موافق نہیں ہیں` : `For ${city}, both scientific methods indicate unfavorable crescent-visibility conditions.`)) : (ur ? `${city} کے لیے سائنسی طریقوں کے نتائج مختلف ہیں` : `For ${city}, the scientific methods give different results.`);
  return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}>
    <h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان میں رؤیتِ ہلال" : "Pakistan crescent visibility"}</h1>
    <section className="mt-3">
      <h2 className={`text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان بھر کا تناظر" : "Pakistan-wide context"}</h2>
      <p className={`mt-1 text-sm ${ur ? "font-naskh" : ""}`}>{ur ? "قومی سرکاری فیصلہ پورے پاکستان سے موصول ہونے والی معتبر شہادت کو دیکھتا ہے؛ مقامی سائنسی حسابات منتخب مقام کی کیفیت بتاتے ہیں۔" : "The national official decision considers credible accepted testimony from across Pakistan; local scientific calculations describe the selected location."}</p>
    </section>
    {dateControl}
    <section className="mt-4 rounded-2xl bg-[#F7F5EF] p-5 dark:bg-[#162a1e]"><p className="text-sm font-semibold">{authority ? (authority.authority === "official" ? (ur?"پاکستان کی سرکاری ہجری تاریخ":"Pakistan official Hijri date") : (ur?"رپورٹ شدہ سرکاری پاکستانی ہجری تاریخ":"Reported official Pakistan Hijri date")) : (ur?"حسابی ہجری تاریخ":"Calculated Hijri date")}</p><p className={`text-2xl font-bold ${ur?"font-naskh":""}`}>{formatDate(context.hijri,"hijri",lang)}</p><p className={`mt-3 text-sm text-[#335a3d] dark:text-[#d7eadb] ${ur?"font-naskh":""}`}>{ur?"حتمی سرکاری اعلان پاکستان کے کسی بھی مقام سے موصول ہونے والی معتبر شہادت کی بنیاد پر ہوسکتا ہے۔":"The final official declaration may be based on credible accepted sighting testimony from any location in Pakistan."}</p></section>
    <section className="mt-4 rounded-xl border p-4"><h2 className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "منتخب مقام کی تفصیل" : "Selected location details"}</h2><p className={`mt-1 text-sm ${ur ? "font-naskh" : ""}`}>{ur ? `${city} کے مقامی سائنسی حالات` : `Local scientific conditions for ${city}`}</p>{cityControls}<p className={`mt-4 text-xl font-bold ${ur?"font-naskh":""}`}>{summary}</p><p className={`mt-2 text-sm text-muted-foreground ${ur?"font-naskh":""}`}>{ur ? "یہ سائنسی نتیجہ صرف منتخب مقام کے لیے ہے، پورے پاکستان کے سرکاری فیصلے کے لیے نہیں۔" : "This scientific result applies to the selected location only; it is not the nationwide official decision."}</p></section>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Card title={ur ? "پاکستان پانچ سالہ تقویمی معیار" : "Pakistan 5-Year Calendar Criterion"}><p>{pf ? (ur?"معیار پر پورا اترتا ہے":"Criterion conditions are met.") : (ur?"معیار پر پورا نہیں اترتا":"Criterion conditions are not met.")}</p>{pakistan.status === "evaluated"&&<p className="mt-3 text-sm" dir="ltr">Altitude {pakistan.snapshot.altitudeDeg.toFixed(2)}° · Width {pakistan.snapshot.widthArcMin.toFixed(3)}′ · Illumination {pakistan.snapshot.illuminationPercent.toFixed(2)}% · Elongation {pakistan.snapshot.elongationDeg.toFixed(2)}° · Lag {pakistan.snapshot.lagMinutes.toFixed(1)} min</p>}</Card><Card title={ur ? "یالوپ رؤیتِ ہلال" : "Yallop Crescent Visibility"}><p>{yf ? (ur?"رؤیت کے حالات موافق ہیں":"Visibility conditions are favorable.") : (ur?"رؤیت کے حالات موافق نہیں ہیں":"Visibility conditions are unfavorable.")}</p>{yallop.status === "evaluated"&&<p className="mt-3 text-sm" dir="ltr">Class {yallop.criterion.visibilityClass} · q {yallop.criterion.q.toFixed(3)}</p>}</Card></div>
    <section className="mt-4 rounded-xl border p-4"><h2 className="font-bold">{ur?"آغازِ ماہ کا امکان":"Month-start implication"}</h2><p>{month.state === "day30_forced_next_month" ? (authority ? (ur?"سرکاری قمری سیاق کے مطابق کل نئے مہینے کی پہلی تاریخ ہے۔":"Authoritative calendar context makes tomorrow the first day of the next month.") : (ur?"حسابی قمری سیاق کے مطابق اگلی تاریخ نئے مہینے کی پہلی ہے۔":"Calculated context places the next calculated Hijri day in the next month.")) : month.state === "day29_qualifies" && authority ? (ur?"سائنسی نتائج کے مطابق کل آغازِ ماہ ہو سکتا ہے؛ حتمی فیصلہ سرکاری ہوگا۔":"Scientific visibility may support next-day month start; an official decision remains required.") : (ur?"کوئی سرکاری آغازِ ماہ کا نتیجہ اخذ نہیں کیا گیا۔":"No official month-start conclusion is inferred.")}</p></section>
    {PAKISTAN_VISIBILITY_MAP_ENABLED ? <PakistanVisibilityMap date={date} selectedObserver={observer} decision={decision} lang={lang} /> : <><p className={`mt-4 rounded-xl border p-4 text-sm text-muted-foreground ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان بھر کا رؤیتِ ہلال نقشہ جغرافیائی نقشے کی نظرِ ثانی کے باعث عارضی طور پر دستیاب نہیں۔" : "The Pakistan-wide crescent visibility map is temporarily unavailable while its geographic base map is being reviewed."}</p><NationalEvidencePanel decision={decision} lang={lang} /></>}
    <details className="mt-4"><summary className="font-bold">{ur?"مزید سائنسی تفصیلات":"Scientific details"}</summary><p className="mt-2">{ur?"سائنسی پیش گوئیاں سرکاری رویتِ ہلال کا اعلان نہیں ہیں۔":"Scientific predictions are not official moon-sighting declarations."}</p></details>
  </main>;
}
function Card({title,children}:{title:string;children:ReactNode}) { return <section className="rounded-2xl border p-5"><h2 className="font-bold">{title}</h2>{children}</section>; }

function OtherCitiesDropdown({ observerId, setObserverId, ur }: { observerId: string; setObserverId: (id: string) => void; ur: boolean }) {
  const cities = PAKISTAN_YALLOP_OBSERVERS.filter(city => city.id !== "karachi" && city.id !== "islamabad");
  const label = ur ? "دیگر شہر" : "Other cities";
  const [open, setOpen] = useState(false), [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null), triggerRef = useRef<HTMLButtonElement>(null), optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", closeOutside); return () => document.removeEventListener("mousedown", closeOutside);
  }, []);
  useEffect(() => { if (open) optionRefs.current[activeIndex]?.focus(); }, [open, activeIndex]);
  const select = (id: string) => { setObserverId(id); setOpen(false); triggerRef.current?.focus(); };
  const move = (next: number) => setActiveIndex((next + cities.length) % cities.length);
  return <div ref={rootRef} className="relative"><button ref={triggerRef} type="button" aria-expanded={open} aria-haspopup="listbox" aria-controls="other-cities-listbox" onClick={() => setOpen(value => !value)} onKeyDown={event => { if (["Enter", " ", "ArrowDown"].includes(event.key)) { event.preventDefault(); setOpen(true); } if (event.key === "Escape") setOpen(false); }} className="rounded-lg border border-[#1A3A2A] bg-white px-3 py-2 text-[#173b26] shadow-sm hover:bg-[#edf4ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A] dark:border-[#b7d8bd] dark:bg-[#1A3A2A] dark:text-white dark:hover:bg-[#274d36]">{label} <span aria-hidden="true">▼</span></button>{open && <div id="other-cities-listbox" role="listbox" aria-label={label} className="absolute z-20 mt-1 max-h-64 min-w-48 overflow-y-auto rounded-lg border border-[#1A3A2A] bg-[#f8fbf8] p-1 shadow-lg dark:border-[#b7d8bd] dark:bg-[#12321f]">{cities.map((city, index) => <button key={city.id} ref={element => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={observerId === city.id} tabIndex={index === activeIndex ? 0 : -1} onClick={() => select(city.id)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); move(index + 1); } if (event.key === "ArrowUp") { event.preventDefault(); move(index - 1); } if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(city.id); } if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } }} className={`block w-full rounded-md px-3 py-2 text-start text-sm font-medium text-[#173b26] hover:bg-[#dcebdd] focus-visible:bg-[#c6dfc9] focus-visible:outline-none dark:text-white dark:hover:bg-[#2b5a3b] dark:focus-visible:bg-[#356c48] ${observerId === city.id ? "bg-[#cfe5d2] dark:bg-[#28563a]" : ""}`}>{ur ? (urduNames[city.id] ?? city.name) : city.name}</button>)}</div>}</div>;
}
