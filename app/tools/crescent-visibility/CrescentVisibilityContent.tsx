"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "../../lib/language-context";
import { formatDate, validateDate, type DateParts } from "../date-converter/utils/dateEngine";
import { resolvePakistanOfficialHijriDate } from "../date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { resolvePakistanOfficialSightingDecisionForEvening } from "../date-converter/utils/hijri-authority/resolveOfficialSightingDecision";
import { evaluatePakistanNationalCrescentPrediction } from "../date-converter/utils/pakistan-crescent/nationalPrediction";
import { evaluateYallopNationalReferencePrediction } from "../date-converter/utils/yallop/nationalReferencePrediction";
import { interpretDateStudioMonthStart } from "../date-converter/utils/yallop/dateStudioMonthStart";
import { NationalEvidencePanel } from "./components/NationalEvidencePanel";

// Presentation safeguard: re-enable only after an approved Pakistan boundary/mask is available.
const PAKISTAN_VISIBILITY_MAP_ENABLED = false;

const pakistanToday = (): DateParts => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts().filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
  return { year: values.year, month: values.month, day: values.day } as DateParts;
};
const iso = (d: DateParts) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
const parse = (s: string): DateParts => { const [year, month, day] = s.split("-").map(Number); return { year, month, day }; };
const URDU_LOCATION_NAMES: Record<string, string> = { gilgit: "گلگت", peshawar: "پشاور", islamabad: "اسلام آباد", lahore: "لاہور", muzaffarabad: "مظفرآباد", quetta: "کوئٹہ", karachi: "کراچی", jiwani: "جیوانی" };

export default function CrescentVisibilityContent() {
  const { language: lang } = useLanguage();
  const ur = lang === "ur";
  const [dateInput, setDateInput] = useState(() => iso(pakistanToday()));
  const [isYallopHelpOpen, setYallopHelpOpen] = useState(false);
  const date = parse(dateInput);
  const isValidDate = validateDate("gregorian", date) === null;
  const pakistan = useMemo(() => isValidDate ? evaluatePakistanNationalCrescentPrediction(date) : null, [isValidDate, date.year, date.month, date.day]);
  const yallop = useMemo(() => isValidDate ? evaluateYallopNationalReferencePrediction(date) : null, [isValidDate, date.year, date.month, date.day]);
  const authority = useMemo(() => isValidDate ? resolvePakistanOfficialHijriDate(date) : null, [isValidDate, date.year, date.month, date.day]);
  const decision = useMemo(() => isValidDate ? resolvePakistanOfficialSightingDecisionForEvening(date) : null, [isValidDate, date.year, date.month, date.day]);
  const dateControl = <div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-sm font-semibold" htmlFor="dashboard-date">{ur ? "تاریخ" : "Date"}</label><input id="dashboard-date" aria-label={ur ? "تاریخ تبدیل کریں" : "Change date"} type="date" min="1900-01-01" max="2100-12-31" value={dateInput} onChange={e => setDateInput(e.target.value)} className="rounded-lg border px-3 py-2" /></div>;

  if (!isValidDate || !pakistan || !yallop) return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}><h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان میں رؤیتِ ہلال کا قومی جائزہ" : "Pakistan national crescent visibility outlook"}</h1>{dateControl}<p role="alert" className={`mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 ${ur ? "font-naskh" : ""}`}>{ur ? "براہِ کرم 1900 سے 2100 کے درمیان عیسوی تاریخ منتخب کریں۔" : "Please select a Gregorian date between 1900 and 2100."}</p></main>;

  const month = authority ? interpretDateStudioMonthStart(authority.hijri.day, yallop.anyAcceptedByPolicy, authority.authority) : null;
  const classSummary = (["A", "B", "C", "D", "E", "F"] as const).filter(key => yallop.classCounts[key] > 0).map(key => `${key}: ${yallop.classCounts[key]}`).join(" · ");
  const pakistanPassCount = pakistan.locations.filter(({ prediction }) => prediction.status === "evaluated" && prediction.criterion.qualifies).length;
  const yallopAcceptedCount = yallop.locations.filter(({ prediction }) => prediction.status === "evaluated" && prediction.acceptedByPolicy).length;
  const pakistanSummary = pakistanPassCount === 8
    ? (ur ? "تمام 8 مقررہ قومی مشاہداتی مقامات رؤیتِ ہلال کے سائنسی معیار پر پورا اترتے ہیں۔" : "All 8 prescribed national observation locations meet the scientific crescent-visibility criterion.")
    : pakistanPassCount > 0
      ? (ur ? `8 میں سے ${pakistanPassCount} مقررہ قومی مشاہداتی مقامات رؤیتِ ہلال کے سائنسی معیار پر پورا اترتے ہیں۔` : `${pakistanPassCount} of 8 prescribed national observation locations meet the scientific crescent-visibility criterion.`)
      : (ur ? "پاکستان کے مقررہ قومی مشاہداتی مقامات میں فی الحال کوئی مقام رؤیتِ ہلال کے سائنسی معیار پر پورا نہیں اترتا۔" : "None of Pakistan's prescribed national observation locations currently meets the scientific crescent-visibility criterion.");
  const yallopSummary = yallop.classCounts.A === 8
    ? (ur ? "تمام 8 قومی حوالہ جاتی مقامات یالوپ درجہ A میں ہیں۔" : "All 8 national reference locations are Yallop class A.")
    : yallopAcceptedCount === 8
      ? (ur ? "تمام 8 قومی حوالہ جاتی مقامات موجودہ قلم یالوپ A/B پالیسی پر پورا اترتے ہیں۔" : "All 8 national reference locations meet the current Qalam Yallop A/B policy.")
      : yallopAcceptedCount > 0
        ? (ur ? `8 میں سے ${yallopAcceptedCount} قومی حوالہ جاتی مقامات موجودہ قلم یالوپ A/B پالیسی پر پورا اترتے ہیں۔` : `${yallopAcceptedCount} of 8 national reference locations meet the current Qalam Yallop A/B policy.`)
        : (ur ? "کوئی قومی حوالہ جاتی مقام موجودہ قلم یالوپ A/B پالیسی تک نہیں پہنچتا۔" : "No national reference location reaches the current Qalam Yallop A/B policy.");
  const qText = (q: number) => `${q >= 0 ? "+" : ""}${q.toFixed(3)}`;
  const classTone = (visibilityClass: string) => visibilityClass === "A" || visibilityClass === "B"
    ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
    : visibilityClass === "C" || visibilityClass === "D"
      ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      : "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100";

  return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}>
    <h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان میں رؤیتِ ہلال کا قومی جائزہ" : "Pakistan national crescent visibility outlook"}</h1>
    <section className="mt-3"><h2 className={`text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان بھر کا تناظر" : "Pakistan-wide context"}</h2><p className={`mt-1 text-sm ${ur ? "font-naskh" : ""}`}>{ur ? "قومی سرکاری فیصلہ پورے پاکستان سے موصول ہونے والی معتبر شہادت کو دیکھتا ہے؛ سائنسی قومی جائزہ مقررہ حوالہ جاتی مقامات کے حالات دکھاتا ہے۔" : "The national official decision considers credible accepted testimony from across Pakistan; the scientific national outlook describes the prescribed reference locations."}</p></section>
    {dateControl}
    <section className="mt-4 rounded-2xl bg-[#F7F5EF] p-5 dark:bg-[#162a1e]">
      {authority ? <><p className="text-sm font-semibold">{authority.authority === "official" ? (ur ? "پاکستان کی سرکاری ہجری تاریخ" : "Pakistan official Hijri date") : (ur ? "رپورٹ شدہ سرکاری پاکستانی ہجری تاریخ" : "Reported official Pakistan Hijri date")}</p><p className={`text-2xl font-bold ${ur ? "font-naskh" : ""}`}>{formatDate(authority.hijri, "hijri", lang)}</p></> : <><p className={`text-sm font-semibold ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان کی سرکاری ہجری تاریخ دستیاب نہیں" : "Pakistan official Hijri date unavailable"}</p><p className={`mt-1 text-sm ${ur ? "font-naskh" : ""}`}>{ur ? "اس تاریخ کے لیے کوئی جائزہ شدہ سرکاری پاکستانی ہجری تاریخ دستیاب نہیں۔" : "No reviewed official Pakistan Hijri date is available for this date."}</p></>}
      <p className={`mt-3 text-sm text-[#335a3d] dark:text-[#d7eadb] ${ur ? "font-naskh" : ""}`}>{ur ? "حتمی سرکاری اعلان پاکستان کے کسی بھی مقام سے موصول ہونے والی معتبر شہادت کی بنیاد پر ہوسکتا ہے۔" : "The final official declaration may be based on credible accepted sighting testimony from any location in Pakistan."}</p>
    </section>
    {decision && <section className="mt-4 rounded-2xl border border-[#5b7d54] bg-[#edf4e8] p-5 dark:border-[#78946c] dark:bg-[#213921]" aria-label={ur ? "پاکستان کا سرکاری رویتِ ہلال فیصلہ" : "Official Pakistan moon-sighting decision"}><h2 className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان کا سرکاری رویتِ ہلال فیصلہ" : "Official Pakistan moon-sighting decision"}</h2><p className={`mt-1 text-lg font-semibold ${ur ? "font-naskh" : ""}`}>{decision.sightingDecision === "sighted" ? (ur ? "چاند نظر آگیا۔" : "Crescent sighted.") : (ur ? "چاند نظر نہیں آیا۔" : "Crescent not sighted.")}</p><p className={`mt-2 text-sm text-[#335a3d] dark:text-[#d7eadb] ${ur ? "font-naskh" : ""}`}>{decision.providerLabel[lang]} · {decision.sourceReference}</p></section>}
    <section className="mt-4 rounded-2xl border p-5"><h2 className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان پانچ سالہ تقویمی معیار" : "Pakistan 5-Year Calendar Criterion"}</h2><p className={`mt-2 text-lg font-semibold ${ur ? "font-naskh" : ""}`}>{pakistanSummary}</p></section>
    <section className="mt-4 rounded-2xl border p-5"><div className="flex flex-wrap items-center gap-2"><h2 className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "قومی حوالہ جاتی مقامات پر یالوپ تقابل" : "Yallop comparison across national reference locations"}</h2><button type="button" aria-expanded={isYallopHelpOpen} aria-controls="yallop-class-help" onClick={() => setYallopHelpOpen(open => !open)} className="rounded-full border px-2 py-0.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={ur ? "یالوپ درجات کی وضاحت" : "About Yallop classes"}>i</button></div>{isYallopHelpOpen && <div id="yallop-class-help" className={`mt-2 rounded-lg bg-muted p-3 text-sm ${ur ? "font-naskh" : ""}`}><p>{ur ? "A: موافق حالات میں آسانی سے نظر آنے کا امکان؛ B: موافق حالات میں نظر آنے کا امکان؛ C: ابتدا میں بصری آلے کی ضرورت پڑ سکتی ہے؛ D: عموماً بصری آلہ درکار ہوتا ہے؛ E/F: اس معیار کے تحت نظر آنے کی توقع نہیں۔ یہ فلکیاتی درجہ بندیاں ہیں، سرکاری اعلان نہیں۔" : "A: easily visible under favorable conditions; B: visible under favorable conditions; C: may require optical aid initially; D: optical aid generally required; E/F: not expected to be visible under the criterion. These are astronomical classes, not an official declaration."}</p></div>}<p className={`mt-2 ${ur ? "font-naskh" : ""}`}>{yallopSummary}</p><p className="mt-2 text-sm text-muted-foreground" dir="ltr">{classSummary}</p></section>
    {month && <section className="mt-4 rounded-xl border p-4"><h2 className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "آغازِ ماہ کا امکان" : "Month-start implication"}</h2><p className={ur ? "font-naskh" : ""}>{month.state === "day30_forced_next_month" ? (ur ? "سرکاری قمری سیاق کے مطابق کل نئے مہینے کی پہلی تاریخ ہے۔" : "Authoritative calendar context makes tomorrow the first day of the next month.") : month.state === "day29_qualifies" ? (ur ? "سائنسی نتائج کے مطابق کل آغازِ ماہ ہو سکتا ہے؛ حتمی فیصلہ سرکاری ہوگا۔" : "Scientific visibility may support next-day month start; an official decision remains required.") : (ur ? "کوئی سرکاری آغازِ ماہ کا نتیجہ اخذ نہیں کیا گیا۔" : "No official month-start conclusion is inferred.")}</p></section>}
    {!PAKISTAN_VISIBILITY_MAP_ENABLED && <p className={`mt-4 rounded-xl border p-4 text-sm text-muted-foreground ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان بھر کا رؤیتِ ہلال نقشہ جغرافیائی نقشے کی نظرِ ثانی کے باعث عارضی طور پر دستیاب نہیں۔" : "The Pakistan-wide crescent visibility map is temporarily unavailable while its geographic base map is being reviewed."}</p>}
    {!decision && <NationalEvidencePanel decision={decision} lang={lang} />}
    <details className="mt-4"><summary className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "مزید سائنسی تفصیلات" : "Scientific details"}</summary><p className={`mt-2 ${ur ? "font-naskh" : ""}`}>{ur ? "سائنسی پیش گوئیاں سرکاری رویتِ ہلال کا اعلان نہیں ہیں۔" : "Scientific predictions are not official moon-sighting declarations."}</p><div className="mt-3 grid gap-2 md:grid-cols-2" data-testid="scientific-location-grid">{pakistan.locations.map(({ observer, prediction }, index) => { const yallopPrediction = yallop.locations[index].prediction; const evaluatedPakistan = prediction.status === "evaluated"; const evaluatedYallop = yallopPrediction.status === "evaluated"; const passes = evaluatedPakistan && prediction.criterion.qualifies; return <div key={observer.id} className="rounded-lg border p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{ur ? (URDU_LOCATION_NAMES[observer.id] ?? observer.name) : observer.name}</strong><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${passes ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100" : "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100"}`}>{passes ? (ur ? "پورا" : "Pass") : (ur ? "پورا نہیں" : "Fail")}</span></div>{evaluatedPakistan && <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" dir="ltr"><dt>{ur ? "ارتفاع" : "Altitude"}</dt><dd>{prediction.criterion.altitudeDeg.toFixed(2)}°</dd><dt>{ur ? "ہلال کی چوڑائی" : "Crescent width"}</dt><dd>{prediction.criterion.widthArcMin.toFixed(3)}′</dd><dt>{ur ? "روشن حصہ" : "Illumination"}</dt><dd>{prediction.criterion.illuminationPercent.toFixed(2)}%</dd><dt>{ur ? "فاصلۂ استطالت" : "Elongation"}</dt><dd>{prediction.criterion.elongationDeg.toFixed(2)}°</dd><dt>{ur ? "وقفہ" : "Lag"}</dt><dd>{prediction.criterion.lagMinutes.toFixed(1)} min</dd></dl>}<div className="mt-2 flex items-center gap-2" dir="ltr"><span>Yallop:</span>{evaluatedYallop ? <><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${classTone(yallopPrediction.criterion.visibilityClass)}`}>Class {yallopPrediction.criterion.visibilityClass}</span><span>(q = {qText(yallopPrediction.criterion.q)})</span></> : <span>unavailable</span>}</div></div>; })}</div></details>
  </main>;
}
