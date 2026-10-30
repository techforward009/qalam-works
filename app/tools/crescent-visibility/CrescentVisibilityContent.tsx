"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../lib/language-context";
import { formatDate, validateDate, type DateParts } from "../date-converter/utils/dateEngine";
import { resolvePakistanOfficialHijriDate } from "../date-converter/utils/hijri-authority/resolveOfficialHijriDate";
import { resolvePakistanOfficialSightingDecisionForEvening } from "../date-converter/utils/hijri-authority/resolveOfficialSightingDecision";
import { evaluatePakistanNationalCrescentPrediction } from "../date-converter/utils/pakistan-crescent/nationalPrediction";
import { evaluateYallopNationalReferencePrediction } from "../date-converter/utils/yallop/nationalReferencePrediction";
import { UpcomingCrescentShortcuts } from "./components/UpcomingCrescentShortcuts";
import { PakistanCrescentQuickResult } from "./components/PakistanCrescentQuickResult";
import { getUpcomingPakistanCrescentEvenings } from "./utils/upcomingCrescentEvenings";
import { formatReferenceSiteCount, getFollowingCardEvening, getReferenceSiteConditionWording } from "./utils/crescentDisplaySummary";

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
  const [today] = useState(pakistanToday);
  const [dateInput, setDateInput] = useState(() => getUpcomingPakistanCrescentEvenings(today, 1)[0]?.dateIso ?? iso(today));
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const syncFromAddress = () => {
      const requested = new URLSearchParams(window.location.search).get("date");
      if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && validateDate("gregorian", parse(requested)) === null) {
        setDateInput(requested);
      } else {
        setDateInput(getUpcomingPakistanCrescentEvenings(today, 1)[0]?.dateIso ?? iso(today));
      }
    };
    syncFromAddress();
    window.addEventListener("popstate", syncFromAddress);
    return () => window.removeEventListener("popstate", syncFromAddress);
  }, []);
  const selectDate = (value: string, jumpToResults = false) => {
    setDateInput(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value && validateDate("gregorian", parse(value)) === null) url.searchParams.set("date", value);
    else url.searchParams.delete("date");
    const nextUrl = url.pathname + url.search + url.hash;
    if (jumpToResults) window.history.pushState(null, "", nextUrl);
    else window.history.replaceState(null, "", nextUrl);
    if (jumpToResults) window.requestAnimationFrame(() => resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  };
  const [isYallopHelpOpen, setYallopHelpOpen] = useState(false);
  const date = parse(dateInput);
  const isValidDate = validateDate("gregorian", date) === null;
  const followingMonthCardDate = useMemo(() => getFollowingCardEvening(
    dateInput, getUpcomingPakistanCrescentEvenings(today, 6).map(entry => entry.dateIso),
  ), [dateInput, today.year, today.month, today.day]);
  const pakistan = useMemo(() => isValidDate ? evaluatePakistanNationalCrescentPrediction(date) : null, [isValidDate, date.year, date.month, date.day]);
  const yallop = useMemo(() => isValidDate ? evaluateYallopNationalReferencePrediction(date) : null, [isValidDate, date.year, date.month, date.day]);
  const authority = useMemo(() => isValidDate ? resolvePakistanOfficialHijriDate(date) : null, [isValidDate, date.year, date.month, date.day]);
  const decision = useMemo(() => isValidDate ? resolvePakistanOfficialSightingDecisionForEvening(date) : null, [isValidDate, date.year, date.month, date.day]);
  const dateControl = <section data-testid="crescent-date-control" className="mt-5 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-[#B8935A] bg-gradient-to-l from-[#153f30] to-[#255d46] px-5 py-6 text-center shadow-lg sm:flex-row sm:gap-8 dark:from-[#173d2e] dark:to-[#255d46]">
    <label className={`text-center text-white ${ur ? "font-naskh" : ""}`} htmlFor="dashboard-date">{ur ? "کس شام کا چاند دیکھنا ہے؟" : "Which evening would you like to check?"}</label>
    <input id="dashboard-date" aria-label={ur ? "تاریخ تبدیل کریں" : "Change date"} type="date" min="1900-01-01" max="2100-12-31" value={dateInput} onChange={e => selectDate(e.target.value)}
      className="min-h-12 w-full max-w-[245px] rounded-xl border-2 border-[#e6c875] bg-white px-4 py-2 text-center text-[#153b29] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-[#f7f5ef] dark:text-[#153b29]" dir="ltr" />
  </section>;
  const backToStudio = (
    <div className="mb-6">
      <Link
        href="/tools/date-converter#date-studio"
        className={`inline-flex items-center gap-2 rounded-lg border border-[#1A3A2A]/15 bg-white/80 px-3 py-2 text-sm font-semibold text-[#1A3A2A] shadow-sm transition-colors hover:border-[#B8935A]/60 dark:border-[#35513d] dark:bg-[#162a1e] dark:text-[#e8ede9] ${ur ? "font-naskh" : ""}`}
      >
        <span aria-hidden="true">{ur ? "→" : "←"}</span>
        <span>{ur ? "تاریخ کنورٹر پر واپس" : "Back to Date Converter"}</span>
      </Link>
    </div>
  );

  if (!isValidDate || !pakistan || !yallop) return <main className="mx-auto max-w-5xl px-4 py-8" dir={ur ? "rtl" : "ltr"}>{backToStudio}<h1 className={`text-3xl font-bold text-[#1A3A2A] dark:text-white ${ur ? "font-naskh" : ""}`}>{ur ? "رؤیتِ ہلال" : "Moon Sighting"}</h1>{dateControl}<p role="alert" className={`mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 ${ur ? "font-naskh" : ""}`}>{ur ? "براہِ کرم 1900 سے 2100 کے درمیان عیسوی تاریخ منتخب کریں۔" : "Please select a Gregorian date between 1900 and 2100."}</p></main>;

  // Favor reviewed civil-month context. Never present waxing/gibbous lunar visibility as a new-crescent forecast.
  const officialNonBoundaryDay = !!authority && authority.hijri.day >= 3 && authority.hijri.day <= 28;
  const evaluatedYallop = yallop.locations.find(({ prediction }) => prediction.status === "evaluated")?.prediction;
  const conjunctionAgeHours = evaluatedYallop?.status === "evaluated" && evaluatedYallop.snapshot?.conjunctionUtc && evaluatedYallop.snapshot?.sunsetUtc
    ? (Date.parse(evaluatedYallop.snapshot.sunsetUtc) - Date.parse(evaluatedYallop.snapshot.conjunctionUtc)) / 3_600_000
    : null;
  const outsideNewCrescentWindow = officialNonBoundaryDay || (conjunctionAgeHours !== null && Number.isFinite(conjunctionAgeHours) && conjunctionAgeHours > 72);
  const nonCrescentSummary = ur
    ? "یہ نئے ہلال کی تلاش کی شام نہیں ہے۔ فلکیاتی اعداد چاند کی عمومی رؤیت سے متعلق ہیں، نئے قمری مہینے کے اعلان سے نہیں۔"
    : "This is not a new-crescent observation evening. The raw astronomical values describe the Moon's visibility, not the start of a lunar month.";
  const classSummary = (["A", "B", "C", "D", "E", "F"] as const).filter(key => yallop.classCounts[key] > 0).map(key => `${key}: ${yallop.classCounts[key]}`).join(" · ");
  const pakistanPassCount = pakistan.locations.filter(({ prediction }) => prediction.status === "evaluated" && prediction.criterion.qualifies).length;
  const yallopAcceptedCount = yallop.locations.filter(({ prediction }) => prediction.status === "evaluated" && prediction.acceptedByPolicy).length;
  const pakCountDisplay = formatReferenceSiteCount(pakistanPassCount, pakistan.locations.length, ur ? "ur" : "en");
  const yallopCountDisplay = formatReferenceSiteCount(yallopAcceptedCount, yallop.locations.length, ur ? "ur" : "en");
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
  const yallopPublicSummary = yallop.classCounts.A === 8
    ? (ur ? "تمام 8 حوالہ جاتی مقامات پر رؤیت کے حالات بہت موافق ہیں۔" : "Visibility conditions are very favorable across all 8 reference locations.")
    : yallopAcceptedCount === 8
      ? (ur ? "تمام 8 حوالہ جاتی مقامات پر رؤیت کے حالات موافق ہیں۔" : "Visibility conditions are favorable across all 8 reference locations.")
      : yallopAcceptedCount > 0
        ? (ur ? `8 میں سے ${yallopAcceptedCount} حوالہ جاتی مقامات پر رؤیت کے حالات موافق ہیں۔` : `${yallopAcceptedCount} of 8 reference locations have favorable visibility conditions.`)
        : (ur ? "اس ماڈل کے مطابق 8 میں سے کسی حوالہ جاتی مقام پر رؤیت کے حالات موافق نہیں ہیں۔" : "None of the 8 reference locations currently have favorable visibility conditions under this model.");

  return <main className="mx-auto max-w-[1080px] px-4 py-12" dir={ur ? "rtl" : "ltr"} data-crescent-ui={ur ? "ur" : "en"}>
    {backToStudio}
    <header className="relative max-w-none overflow-hidden rounded-3xl bg-gradient-to-l from-[#123326] via-[#174f3a] to-[#122c37] px-6 py-9 text-white shadow-lg sm:px-9 sm:py-11"><div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-14 h-56 w-56 rounded-full bg-[#B8935A]/15 blur-3xl" /><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f1d99e]">Qalam Works</p><h1 className={`mt-3 text-3xl font-bold leading-relaxed tracking-tight sm:text-4xl ${ur ? "font-naskh" : ""}`}>{ur ? "رؤیتِ ہلال — پاکستان" : "Moon Sighting — Pakistan"}</h1><p className={`mt-3 text-base text-[#e3eee4] ${ur ? "font-naskh" : ""}`}>{ur ? "سائنسی اور فلکیاتی جائزہ" : "Scientific and astronomical outlook"}</p></div></header>
    <section data-crescent-intro className={`mx-auto mt-5 max-w-3xl text-center text-muted-foreground ${ur ? "font-urdu" : ""}`}>{ur ? "مہینہ چنیں اور دیکھیں کہ پاکستان میں چاند نظر آنے کے کیا امکانات ہیں۔" : "Choose a lunar month to see whether the crescent may be visible in Pakistan."}</section>
    <UpcomingCrescentShortcuts lang={ur ? "ur" : "en"} today={today} selectedDate={dateInput} onSelect={value => selectDate(value, true)} />
    {dateControl}
    <div ref={resultRef} tabIndex={-1} className="mt-7 scroll-mt-24">
      {followingMonthCardDate && <p data-testid="crescent-following-evening-note" className="mb-4 rounded-xl border border-[#B8935A]/50 bg-[#F7F5EF] px-4 py-3 text-center text-[#153b29] dark:border-[#B8935A]/40 dark:bg-[#203326] dark:text-[#e6f1e7]">
        {ur ? `یہ ${formatDate(parse(followingMonthCardDate), "gregorian", lang)} کے بعد والی شام، ${formatDate(date, "gregorian", lang)} کا الگ فلکیاتی حساب ہے۔` : `This is the separate calculation for ${formatDate(date, "gregorian", lang)}, the evening after the ${formatDate(parse(followingMonthCardDate), "gregorian", lang)} month card.`}
      </p>}
      <PakistanCrescentQuickResult date={date} lang={ur ? "ur" : "en"} pakistan={pakistan} yallop={yallop} decision={decision} outsideNewCrescentWindow={outsideNewCrescentWindow} />
    </div>
    <details id="crescent-technical-report" data-testid="crescent-deep-details" className="mt-6 scroll-mt-24 rounded-2xl border border-[#1A3A2A]/15 bg-white p-4 dark:border-[#35513d] dark:bg-[#162a1e] sm:p-6">
      <summary className={`cursor-pointer text-base font-bold text-[#153b29] dark:text-[#e6f0e6] ${ur ? "font-naskh" : ""}`}>{ur ? "مکمل سائنسی تحقیق دیکھیں" : "View the complete scientific research"}</summary>
      <div className="mt-5">
      <h2 className={`text-xl font-bold text-[#123326] dark:text-[#f7faf7] ${ur ? "font-naskh" : ""}`}>{ur ? "تفصیلی سائنسی تحقیق" : "Detailed scientific research"}</h2>
      <p className={`mt-1 text-sm text-[#486155] dark:text-[#c8d5cc] ${ur ? "font-naskh" : ""}`}>{ur ? "پاکستان کے آٹھ مقامات کا فلکیاتی حساب اور یالوپ ماڈل" : "Astronomical calculations for eight Pakistan locations and the Yallop model"}</p>
    </div>
    <section className="mt-4 overflow-hidden rounded-[22px] bg-[#123326] p-6 text-center text-white shadow-xl shadow-[#123326]/15 md:p-8" data-testid="crescent-science-summary">
      <p className="text-[#f1d99e]">{ur ? "پاکستان میں رؤیتِ ہلال کا سائنسی جائزہ" : "Scientific crescent-visibility outlook for Pakistan"}</p>
      <p className="mt-2 text-[#dce8de]">{formatDate(date, "gregorian", lang)}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className={`rounded-2xl p-5 ring-1 ${outsideNewCrescentWindow ? "bg-white/10 ring-white/20" : pakistanPassCount > 0 ? "bg-emerald-800/30 ring-emerald-500/40" : "bg-rose-900/30 ring-rose-500/30"}`}>
          <h3>{ur ? "پاکستانی سائنسی معیار" : "Pakistan scientific criterion"}</h3>
          <p className="mt-2">{outsideNewCrescentWindow ? (ur ? "یہ نئے ہلال کی جانچ نہیں" : "Not a new-crescent test") : getReferenceSiteConditionWording(pakistanPassCount, pakistan.locations.length, ur ? "ur" : "en")}</p>
          <p className="mt-2 text-[#dce8de]">{outsideNewCrescentWindow ? (ur ? "صرف فلکیاتی اعداد" : "Astronomical measurements only") : pakCountDisplay}</p>
        </article>
        <article className={`rounded-2xl p-5 ring-1 ${outsideNewCrescentWindow ? "bg-white/10 ring-white/20" : yallopAcceptedCount > 0 ? "bg-emerald-800/30 ring-emerald-500/40" : "bg-rose-900/30 ring-rose-500/30"}`}>
          <h3>{ur ? "یالوپ کا تقابلی حساب" : "Yallop comparison"}</h3>
          <p className="mt-2">{outsideNewCrescentWindow ? (ur ? "یہ نئے ہلال کی جانچ نہیں" : "Not a new-crescent test") : getReferenceSiteConditionWording(yallopAcceptedCount, yallop.locations.length, ur ? "ur" : "en")}</p>
          <p className="mt-2 text-[#dce8de]">{outsideNewCrescentWindow ? (ur ? "صرف حوالہ جاتی اعداد" : "Reference figures only") : yallopCountDisplay}</p>
        </article>
      </div>
    </section>
    <section data-testid="crescent-three-reference-cards" className="mt-6 grid gap-4 text-center md:grid-cols-2">
      <article className="rounded-[20px] bg-[#eef6ef] p-6 shadow-sm dark:bg-[#193120]">
        <p className="text-[#3e7350]">{ur ? "سائنسی پیش گوئی" : "Scientific prediction"}</p>
        <h2 className="mt-2 text-[#183c2b] dark:text-[#dce8de]">{ur ? "پاکستانی سائنسی معیار" : "Pakistan scientific criterion"}</h2>
        <p className="mt-3">{outsideNewCrescentWindow ? nonCrescentSummary : pakistanSummary}</p>
      </article>
      <article className="rounded-[20px] bg-[#f9f6ef] p-6 shadow-sm dark:bg-[#202d25]">
        <p className="text-[#8a6830]">{ur ? "فلکیاتی ماڈل" : "Astronomical model"}</p>
        <h2 className="mt-2 text-[#183c2b] dark:text-[#dce8de]">{ur ? "بین الاقوامی سائنسی ماڈل" : "International astronomical model"}</h2>
        <p className="mt-3">{outsideNewCrescentWindow ? nonCrescentSummary : yallopPublicSummary}</p>
        <p className="mt-3">{ur ? "یالوپ (Yallop)" : "Yallop"}</p>
      </article>
    </section>
    <section className="mt-4"><button type="button" aria-expanded={isYallopHelpOpen} aria-controls="yallop-class-help" onClick={() => setYallopHelpOpen(open => !open)} className={`text-sm font-semibold underline focus-visible:outline focus-visible:outline-2 ${ur ? "font-naskh" : ""}`}>{ur ? "یالوپ ماڈل کی وضاحت" : "About the Yallop model"}</button>{isYallopHelpOpen && <div id="yallop-class-help" className={`mt-2 rounded-xl bg-muted p-4 text-sm ${ur ? "font-naskh" : ""}`}><p>{ur ? "یہ ایک بین الاقوامی فلکیاتی ماڈل ہے جو ہلال کی رؤیت کے امکانات کو مختلف درجوں میں تقسیم کرتا ہے۔" : "This is an international astronomical model that classifies crescent-visibility conditions."}</p><p className="mt-2 text-xs">{ur ? "A — بہت موافق حالات؛ B — موافق حالات؛ C — ابتدا میں بصری آلے کی ضرورت پڑ سکتی ہے؛ D — عموماً بصری آلہ درکار ہوتا ہے؛ E/F — رؤیت متوقع نہیں" : "A: easily visible; B: visible under favorable conditions; C: may require optical aid; D: optical aid generally required; E/F: not expected to be visible."}</p></div>}</section>
    <details className="mt-6">
      <summary className={`font-bold ${ur ? "font-naskh" : ""}`}>{ur ? "مزید سائنسی تفصیلات" : "Scientific details"}</summary>
      <p className="mt-3 text-center">{ur ? "تمام مقامات کے اعداد ان کے مقامی غروبِ آفتاب کے حساب سے ہیں۔" : "Figures use the local sunset at each location."}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2" data-testid="scientific-location-grid">
        {pakistan.locations.map(({ observer, prediction }, index) => {
          const comparison = yallop.locations[index]?.prediction;
          const evaluated = prediction.status === "evaluated";
          const pass = evaluated && prediction.criterion.qualifies;
          const values = evaluated ? [
            { label: ur ? "افق سے بلندی (ڈگری)" : "Altitude (degrees)", value: `${prediction.criterion.altitudeDeg.toFixed(2)}°` },
            { label: ur ? "ہلال کی چوڑائی (قوسی منٹ)" : "Crescent width (arcminutes)", value: `${prediction.criterion.widthArcMin.toFixed(3)}′` },
            { label: ur ? "روشن حصہ" : "Illuminated fraction", value: `${prediction.criterion.illuminationPercent.toFixed(2)}%` },
            { label: ur ? "زاویائی فاصلہ (ڈگری)" : "Elongation (degrees)", value: `${prediction.criterion.elongationDeg.toFixed(2)}°` },
            { label: ur ? "غروب کا وقفہ" : "Moonset lag", value: `${prediction.criterion.lagMinutes.toFixed(1)}`, unit: ur ? "منٹ" : "min" },
          ] : [];
          return <article key={observer.id} className="rounded-2xl border border-[#1A3A2A]/15 p-5 text-center dark:border-[#35513d]" data-crescent-location-card>
            <h3>{ur ? URDU_LOCATION_NAMES[observer.id] ?? observer.name : observer.name}</h3>
            <p className="mt-2">{pass ? (ur ? "رؤیت کے حالات موافق" : "Favorable conditions") : (ur ? "رؤیت کے حالات ناموافق" : "Unfavorable conditions")}</p>
            {evaluated ? <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {values.map(v => <div key={v.label} className="rounded-xl bg-[#F7F5EF] p-3 text-center dark:bg-[#203326]">
                <dt className="text-center">{v.label.endsWith(" (قوسی منٹ)") ? <>{v.label.replace(" (قوسی منٹ)", "")}{" "}<span className="block">(قوسی منٹ)</span></> : v.label}</dt>
                <dd className="mt-2 flex flex-wrap items-baseline justify-center gap-2 text-center font-normal">
                  <span data-crescent-latin-number dir="ltr">{v.value}</span>
                  {v.unit && <span>{v.unit}</span>}
                </dd>
              </div>)}
            </dl> : <p className="mt-3">{ur ? "فلکیاتی اعداد دستیاب نہیں" : "Astronomical measurements unavailable"}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
              <span>{ur ? "یالوپ:" : "Yallop:"}</span>
              {comparison?.status === "evaluated" ? <>
                <span>{ur ? "درجہ" : "Class"} <bdi dir="ltr">{comparison.criterion.visibilityClass}</bdi></span>
                <span dir="ltr" data-crescent-latin-number>(q = {comparison.criterion.q.toFixed(3)})</span>
              </> : <span>{ur ? "دستیاب نہیں" : "Unavailable"}</span>}
            </div>
          </article>;
        })}
      </div>
    </details>
    </details>
  </main>;
}
