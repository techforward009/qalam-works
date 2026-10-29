"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Moon, Share2 } from "lucide-react";
import { formatDate, monthName, type DateParts } from "../../date-converter/utils/dateEngine";
import { dateDigits } from "../../date-converter/utils/pakistanDateShare";
import { evaluatePakistanNationalCrescentPrediction, type PakistanNationalPrediction } from "../../date-converter/utils/pakistan-crescent/nationalPrediction";
import type { YallopNationalReferencePrediction } from "../../date-converter/utils/yallop/nationalReferencePrediction";
import type { OfficialHijriMonthAnchor } from "../../date-converter/utils/hijri-authority/types";
import { getPakistanThirtyDayMonthOutlook } from "../utils/pakistanThirtyDayMonthOutlook";

const URDU_NAMES: Record<string, string> = {
  gilgit: "گلگت", peshawar: "پشاور", islamabad: "اسلام آباد", lahore: "لاہور",
  muzaffarabad: "مظفرآباد", quetta: "کوئٹہ", karachi: "کراچی", jiwani: "جیوانی",
};
const number = (value: number, lang: "ur" | "en") => dateDigits(value.toFixed(1), lang);
const dateLabel = (d: DateParts, lang: "ur" | "en") => dateDigits(formatDate(d, "gregorian", lang), lang);

export function PakistanCrescentQuickResult({
  date, lang, pakistan, yallop, decision, outsideNewCrescentWindow,
}: {
  date: DateParts;
  lang: "ur" | "en";
  pakistan: PakistanNationalPrediction;
  yallop: YallopNationalReferencePrediction;
  decision: OfficialHijriMonthAnchor | null;
  outsideNewCrescentWindow: boolean;
}) {
  const ur = lang === "ur";
  const [locationId, setLocationId] = useState("karachi");
  const [shareStatus, setShareStatus] = useState<"copied" | "failed" | null>(null);
  const selected = pakistan.locations.find(({ observer }) => observer.id === locationId) ?? pakistan.locations[0];
  const localName = selected ? ur ? URDU_NAMES[selected.observer.id] ?? selected.observer.name : selected.observer.name : "—";
  const local = selected?.prediction;
  const ref = yallop.locations.find(({ observer }) => observer.id === selected?.observer.id)?.prediction;
  const measured = local?.status === "evaluated" ? local.criterion : null;
  const sunset = local?.status === "evaluated" ? local.snapshot?.sunsetUtc : null;
  const age = ref?.status === "evaluated" && sunset && ref.snapshot?.conjunctionUtc
    ? (Date.parse(sunset) - Date.parse(ref.snapshot.conjunctionUtc)) / 3_600_000 : null;
  const qualified = pakistan.locations.filter(({ prediction }) =>
    prediction.status === "evaluated" && prediction.criterion.qualifies).length;
  const incomplete = pakistan.locations.some(({ prediction }) =>
    prediction.status !== "evaluated" && prediction.status !== "moonset-before-or-at-sunset");
  const yallopAccepted = yallop.locations.filter(({ prediction }) =>
    prediction.status === "evaluated" && prediction.acceptedByPolicy).length;
  const state = outsideNewCrescentWindow ? "not-new" :
    qualified > 0 ? "favorable" : incomplete ? "incomplete" : "unfavorable";
  const outlook = state === "unfavorable"
    ? getPakistanThirtyDayMonthOutlook(date, pakistan, decision) : null;
  // Day thirty is a separate evening. Never infer its astronomy from day twenty-nine.
  const nextEveningScience = useMemo(
    () => outlook ? evaluatePakistanNationalCrescentPrediction(outlook.dayThirty) : null,
    [outlook?.dayThirty.year, outlook?.dayThirty.month, outlook?.dayThirty.day],
  );
  const nextLocation = nextEveningScience?.locations.find(({ observer }) => observer.id === locationId);
  const nextMeasured = nextLocation?.prediction.status === "evaluated" ? nextLocation.prediction.criterion : null;
  const nextPasses = nextEveningScience?.locations.filter(({ prediction }) =>
    prediction.status === "evaluated" && prediction.criterion.qualifies).length ?? 0;
  const nextIncomplete = nextEveningScience?.locations.some(({ prediction }) =>
    prediction.status !== "evaluated" && prediction.status !== "moonset-before-or-at-sunset") ?? true;
  const publicCount = (n: number) => ur && n === 0 ? "صفر" : dateDigits(String(n), lang);
  const nextEveningStatus = nextIncomplete
    ? (ur ? "بعض مقامات کا حساب دستیاب نہیں" : "Some locations have incomplete calculations")
    : nextPasses > 0 ? (ur ? "رؤیت کے سائنسی حالات موافق ہیں" : "Scientific visibility conditions are favorable")
      : (ur ? "رؤیت کے سائنسی حالات موافق نہیں" : "Scientific visibility conditions are unfavorable");
  const officialSighting = decision?.sightingDecision === "sighted";
  const officialNotSighting = decision?.sightingDecision === "not-sighted";
  const targetName = outlook ? monthName("hijri", outlook.nextHijriMonth, lang) : "";
  const targetYear = outlook ? dateDigits(String(outlook.nextHijriYear), lang) : "";
  const weekdayNamesUr = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];
  const firstDayLabel = outlook
    ? `${targetName} ${targetYear} کی پہلی تاریخ ${dateLabel(outlook.dayOne, lang)}${ur ? "ء بروز " + weekdayNamesUr[new Date(Date.UTC(outlook.dayOne.year, outlook.dayOne.month - 1, outlook.dayOne.day)).getUTCDay()] + " ہوگی۔" : "."}`
    : "";
  const firstDayText = outlook
    ? ur ? `ہمارے سائنسی حساب سے ${firstDayLabel}`
      : `Our scientific calculation forecasts the first of ${targetName} ${targetYear} on ${dateLabel(outlook.dayOne, lang)}.`
    : "";
  const headline = officialSighting ? (ur ? "سرکاری اعلان: چاند نظر آگیا" : "Official announcement: Crescent sighted")
    : officialNotSighting ? (ur ? "سرکاری اعلان: چاند نظر نہیں آیا" : "Official announcement: Crescent not sighted")
    : state === "not-new" ? (ur ? "یہ نئے چاند کی شام نہیں ہے" : "Not a new crescent evening")
    : state === "favorable" ? (ur ? "چاند نظر آنے کے امکانات ہیں" : "The crescent may be visible")
    : state === "incomplete" ? (ur ? "ابھی واضح اندازہ نہیں لگایا جا سکتا" : "No clear prediction is available")
    : (ur ? "اس شام چاند نظر آنے کی توقع نہیں" : "The crescent is not expected to be visible");
  const explanation = officialSighting ? (ur ? "مرکزی رؤیتِ ہلال کمیٹی کے دستیاب اور جائزہ شدہ اعلان کے مطابق۔" : "According to the reviewed official sighting announcement.")
    : officialNotSighting ? (ur ? "مرکزی رؤیتِ ہلال کمیٹی کے دستیاب اور جائزہ شدہ اعلان کے مطابق۔" : "According to the reviewed official non-sighting announcement.")
    : state === "not-new" ? (ur ? "اوپر کسی نئے قمری مہینے کو منتخب کریں۔" : "Choose an upcoming lunar month above.")
    : state === "favorable" ? (ur ? "ہمارے پاکستانی سائنسی حساب کے مطابق حالات موافق ہیں۔" : "Pakistan scientific conditions are favorable.")
    : state === "incomplete" ? (ur ? "بعض مقامات کی معلومات مکمل نہیں۔ اس لیے ہم حتمی اندازہ نہیں دے رہے۔" : "Some local calculations are incomplete, so we cannot give a definite outlook.")
    : (ur ? "ہمارے پاکستانی سائنسی معیار کے مطابق اس شام ہلال کی رؤیت ممکن نہیں۔" : "Under our Pakistan scientific criterion, the crescent cannot be seen that evening.");
  const resultText = [
    ur ? "قلم ورکس — پاکستان میں رؤیتِ ہلال" : "Qalam Works — Crescent visibility in Pakistan",
    dateLabel(date, lang), headline, explanation, firstDayText,
    !decision ? (ur ? "یہ سائنسی پیش گوئی ہے، سرکاری اعلان نہیں۔" : "Scientific forecast, not an official announcement.") : "",
    `https://www.qalamworks.com/tools/crescent-visibility?date=${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
  ].filter(Boolean).join("\n");

  async function share() {
    setShareStatus(null);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: ur ? "رؤیتِ ہلال" : "Moon sighting", text: resultText });
        return;
      }
      await navigator.clipboard.writeText(resultText);
      setShareStatus("copied");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareStatus("failed");
    }
  }

  const measures = [
    { label: ur ? "چاند کی عمر" : "Moon age", value: age !== null && Number.isFinite(age) && age >= 0 ? `${number(age, lang)} ${ur ? "گھنٹے" : "h"}` : "—" },
    { label: ur ? "زاویائی فاصلہ" : "Elongation", value: measured ? `${number(measured.elongationDeg, lang)}°` : "—" },
    { label: ur ? "غروب کا وقفہ" : "Moon lag", value: measured ? `${number(measured.lagMinutes, lang)} ${ur ? "منٹ" : "min"}` : "—" },
    { label: ur ? "افق سے بلندی" : "Altitude", value: measured ? `${number(measured.altitudeDeg, lang)}°` : "—" },
  ];
  return (
    <section data-testid="crescent-simple-result" aria-label={ur ? "رؤیتِ ہلال کا آسان نتیجہ" : "Crescent visibility quick result"}
      className="overflow-hidden rounded-3xl border border-[#1A3A2A]/15 bg-white shadow-sm dark:border-[#35513d] dark:bg-[#162a1e]">
      <div className="bg-[#F7F5EF] px-5 py-7 text-center dark:bg-[#1b2c20] sm:px-8">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#315c40] dark:text-[#c3e0c5]">
          <Moon className="h-5 w-5" aria-hidden="true" />{ur ? "پاکستان میں چاند کی رؤیت" : "Crescent visibility in Pakistan"}
        </p>
        <p className="mt-2 text-sm text-[#587060] dark:text-[#b6cbb9]">{dateLabel(date, lang)}</p>
        <h2 data-testid="crescent-simple-headline" className={`mt-3 text-2xl font-bold leading-relaxed sm:text-3xl ${state === "favorable" ? "text-emerald-800 dark:text-emerald-300" : state === "unfavorable" ? "text-rose-800 dark:text-rose-300" : "text-[#153b29] dark:text-[#f0f7f0]"} ${ur ? "font-naskh" : ""}`}>{headline}</h2>
        <p className={`mx-auto mt-2 max-w-xl text-base leading-8 text-[#486155] dark:text-[#cfddd1] ${ur ? "font-naskh" : ""}`}>{explanation}</p>
        {outlook && nextEveningScience && <section data-testid="crescent-next-evening" className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[#1A3A2A]/20 bg-white px-4 py-5 text-[#153b29] dark:border-[#35513d] dark:bg-[#203326] dark:text-white">
          <h3 className="text-center">{ur ? `${dateLabel(outlook.dayThirty, lang)} کی شام کا سائنسی جائزہ` : `Scientific outlook for the evening of ${dateLabel(outlook.dayThirty, lang)}`}</h3>
          <p className="mt-2 text-center" data-testid="crescent-next-evening-status">{nextEveningStatus}</p>
          <p className="mt-1 text-center" data-testid="crescent-next-evening-count">
            {ur ? `پاکستان کے آٹھ مقامات میں سے ${publicCount(nextPasses)} مقامات پر سائنسی معیار پورا ہوتا ہے۔` : `Criterion met at ${nextPasses} of 8 Pakistan locations.`}
          </p>
          <p className="mt-2 text-center">{ur ? `${localName} میں اسی شام کے حقیقی حسابی اعداد:` : `Actual astronomical calculations for ${localName} that evening:`}</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-center sm:grid-cols-2" data-testid="crescent-next-evening-metrics">
            {[
              { label: ur ? "افق سے بلندی" : "Altitude", value: nextMeasured ? `${number(nextMeasured.altitudeDeg, lang)}°` : "—" },
              { label: ur ? "غروب کا وقفہ" : "Moonset lag", value: nextMeasured ? `${number(nextMeasured.lagMinutes, lang)} ${ur ? "منٹ" : "min"}` : "—" },
              { label: ur ? "زاویائی فاصلہ" : "Elongation", value: nextMeasured ? `${number(nextMeasured.elongationDeg, lang)}°` : "—" },
              { label: ur ? "ہلال کی چوڑائی" : "Crescent width", value: nextMeasured ? `${number(nextMeasured.widthArcMin, lang)}′` : "—" },
            ].map(item => <div key={item.label} className="rounded-xl border border-[#1A3A2A]/10 p-3 dark:border-[#52715a]"><dt>{item.label}</dt><dd className="mt-1 font-bold" dir="auto">{item.value}</dd></div>)}
          </dl>
          <a className="mt-4 block text-center underline underline-offset-4" data-testid="crescent-next-evening-link"
            href={`/tools/crescent-visibility?date=${outlook.dayThirty.year}-${String(outlook.dayThirty.month).padStart(2, "0")}-${String(outlook.dayThirty.day).padStart(2, "0")}`}>
            {ur ? "۱۱ نومبر کے تمام مقامات کا حساب دیکھیں" : "View all locations for the next evening"}
          </a>
        </section>}
        {outlook && !officialSighting && <div data-testid="crescent-predicted-first-day" className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#1A3A2A]/15 bg-white px-4 py-4 text-[#153b29] dark:border-[#35513d] dark:bg-[#203326] dark:text-white">
          <p className="text-lg leading-9">{ur ? <>ہمارے سائنسی حساب سے <strong>{firstDayLabel}</strong></> : firstDayText}</p>
        </div>}
        {!decision && <p className="mt-4 text-xs leading-6 text-[#6b786d] dark:text-[#c1cec2]">{ur ? "حتمی اعلان مرکزی رؤیتِ ہلال کمیٹی پاکستان کرے گی۔" : "Pakistan's Central Ruet-e-Hilal Committee makes the official decision."}</p>}
        {decision && <p data-testid="crescent-simple-official" className="mt-4 text-sm font-semibold text-[#775724] dark:text-[#efdfa9]">{ur ? "سرکاری اعلان دستیاب ہے" : "Reviewed official declaration available"}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#1A3A2A]/10 px-5 py-5 dark:border-[#35513d] sm:px-8">
        <button type="button" data-testid="crescent-share-result" onClick={() => void share()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1A3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2e6546] dark:bg-[#2e6546]">
          {shareStatus === "copied" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {shareStatus === "copied" ? (ur ? "نتیجہ کاپی ہوگیا" : "Result copied") : (ur ? "نتیجہ شیئر کریں" : "Share result")}
        </button>
        <a href="#crescent-simple-details" onClick={() => {
          const details = document.getElementById("crescent-simple-details") as HTMLDetailsElement | null;
          if (details) details.open = true;
        }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#1A3A2A]/20 px-4 py-2.5 text-sm font-semibold text-[#1A3A2A] dark:border-[#35513d] dark:text-[#e9f2e9]">
          <Clipboard className="h-4 w-4" />{ur ? "مزید تفصیل" : "More details"}
        </a>
        {shareStatus === "failed" && <p role="alert" className="w-full text-center text-sm text-rose-700 dark:text-rose-300">{ur ? "شیئر نہیں ہو سکا، دوبارہ کوشش کریں۔" : "Could not share. Please try again."}</p>}
      </div>

      <details id="crescent-simple-details" data-testid="crescent-simple-details" className="border-t border-[#1A3A2A]/10 px-5 pb-5 dark:border-[#35513d] sm:px-8">
        <summary className="cursor-pointer py-4 text-base font-bold text-[#315c40] dark:text-[#c3e0c5]">{ur ? "آسان الفاظ میں مکمل بات" : "Explanation in simple terms"}</summary>
        <div className="space-y-3 text-sm leading-8 text-[#153b29] dark:text-[#e6f0e6]" data-testid="crescent-three-outcomes">
          <p data-testid="crescent-simple-national-count"><strong>{ur ? "پاکستان میں:" : "Pakistan:"}</strong> {ur ? `آٹھ مقامات میں سے ${publicCount(qualified)} مقامات پر معیار پورا ہوا۔` : `The visibility test was met at ${qualified} of 8 reference locations.`}</p>
          <p><strong>{ur ? "سرکاری فیصلہ:" : "Official decision:"}</strong> {decision ? (officialSighting ? (ur ? "چاند نظر آنے کا اعلان ہوا۔" : "A sighting was declared.") : (ur ? "چاند نظر نہ آنے کا اعلان ہوا۔" : "No sighting was declared.")) : (ur ? "ابھی مصدقہ اعلان دستیاب نہیں۔" : "No reviewed announcement is available yet.")}</p>
          <p><strong>{ur ? "دوسرے سائنسی حساب سے:" : "Second scientific check:"}</strong> {ur ? `آٹھ میں سے ${publicCount(yallopAccepted)} مقامات پر حالات موافق ہیں۔` : `Conditions are favorable at ${yallopAccepted} of 8 locations.`}</p>
        </div>
        <div className="mt-5 rounded-xl border border-[#1A3A2A]/10 p-4 dark:border-[#35513d]">
          <label className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[#315c40] dark:text-[#cfddd1]">
            <span>{ur ? "کس شہر کے اعداد دیکھنا چاہیں گے؟" : "Which city's measurements?"}</span>
            <select data-testid="crescent-quick-location" aria-label={ur ? "فلکیاتی اعداد کے لیے مقام منتخب کریں" : "Choose location for astronomical values"}
              value={selected?.observer.id ?? ""} onChange={event => setLocationId(event.target.value)}
              className="rounded-lg border border-[#1A3A2A]/20 bg-white px-3 py-2 text-[#153b29] dark:border-[#35513d] dark:bg-[#203326] dark:text-white">
              {pakistan.locations.map(({ observer }) => <option key={observer.id} value={observer.id}>{ur ? URDU_NAMES[observer.id] ?? observer.name : observer.name}</option>)}
            </select>
          </label>
          <p className="mt-2 text-xs text-[#587060] dark:text-[#b6cbb9]">{ur ? `${localName} کے اصل فلکیاتی اعداد؛ قومی نتیجہ نہیں بدلتا۔` : `Real measurements for ${localName}; the national conclusion does not change.`}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4" data-testid="crescent-simple-metrics">
            {measures.map(item => <div key={item.label} className="rounded-lg bg-[#F7F5EF] p-3 dark:bg-[#203326]"><dt className="text-xs text-[#587060] dark:text-[#b6cbb9]">{item.label}</dt><dd className="mt-1 font-bold text-[#153b29] dark:text-white" dir="auto">{item.value}</dd></div>)}
          </dl>
          <p className="mt-2 text-xs text-[#587060] dark:text-[#b6cbb9]">{ur ? "— کا مطلب ہے کہ متعلقہ عدد دستیاب نہیں۔" : "— means the number is unavailable."}</p>
        </div>
        <a href="#crescent-technical-report" onClick={() => {
          const detail = document.getElementById("crescent-technical-report") as HTMLDetailsElement | null;
          if (detail) detail.open = true;
        }} className="mt-4 inline-flex rounded-xl border border-[#1A3A2A]/20 px-4 py-3 text-sm font-bold text-[#1A3A2A] dark:text-white">
          {ur ? "اصل تحقیق اور حوالہ جات" : "Original research and sources"}
        </a>
      </details>
    </section>
  );
}
