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
const number = (value: number) => value.toFixed(1);
const dateLabel = (d: DateParts, lang: "ur" | "en") => formatDate(d, "gregorian", lang);

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
  const qualified = pakistan.locations.filter(({ prediction }) =>
    prediction.status === "evaluated" && prediction.criterion.qualifies).length;
  const incomplete = pakistan.locations.some(({ prediction }) =>
    prediction.status !== "evaluated" && prediction.status !== "moonset-before-or-at-sunset");
  const yallopAccepted = yallop.locations.filter(({ prediction }) =>
    prediction.status === "evaluated" && prediction.acceptedByPolicy).length;
  const yallopIncomplete = yallop.locations.some(({ prediction }) =>
    prediction.status !== "evaluated" && prediction.status !== "moonset-before-or-at-sunset");
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
  const nextEveningStatus = nextLocation?.prediction.status === "evaluated"
    ? nextLocation.prediction.criterion.qualifies
      ? (ur ? "رؤیت کے سائنسی حالات موافق ہیں" : "Scientific visibility conditions are favorable")
      : (ur ? "رؤیت کے سائنسی حالات موافق نہیں" : "Scientific visibility conditions are unfavorable")
    : nextLocation?.prediction.status === "moonset-before-or-at-sunset"
      ? (ur ? "رؤیت کے سائنسی حالات موافق نہیں" : "Scientific visibility conditions are unfavorable")
      : (ur ? "اس شہر کا حساب دستیاب نہیں" : "Calculations unavailable for this city");
  // These percentages describe the share of eight sites meeting each model's
  // threshold; they are not statistical probabilities of an actual sighting.
  const modelShare = (count: number, missing: boolean) => {
    if (outsideNewCrescentWindow) return ur ? "نئے ہلال کا جائزہ نہیں" : "Not a new-crescent evening";
    if (missing) return ur ? "مکمل حساب دستیاب نہیں" : "Incomplete measurements";
    if (count === 0) return ur ? "کوئی امکان نہیں" : "No favorable sites";
    const percent = count / 8 * 100;
    return ur
      ? `${percent}% مقامات پر رؤیت کے حالات موافق ہیں`
      : `Favorable at ${percent}% of the eight sites`;
  };
  const pakistanLine = modelShare(qualified, incomplete);
  const yallopLine = modelShare(yallopAccepted, yallopIncomplete);
  const officialSighting = decision?.sightingDecision === "sighted";
  const targetName = outlook ? monthName("hijri", outlook.nextHijriMonth, lang) : "";
  const targetYear = outlook ? String(outlook.nextHijriYear) : "";
  const weekdayNamesUr = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];
  const firstDayLabel = outlook
    ? `${targetName} ${targetYear} کی پہلی تاریخ ${formatDate(outlook.dayOne, "gregorian", lang)}${ur ? "ء بروز " + weekdayNamesUr[new Date(Date.UTC(outlook.dayOne.year, outlook.dayOne.month - 1, outlook.dayOne.day)).getUTCDay()] + " ہوگی۔" : "."}`
    : "";
  const firstDayText = outlook
    ? ur ? `ہمارے سائنسی حساب سے ${firstDayLabel}`
      : `Our scientific calculation forecasts the first of ${targetName} ${targetYear} on ${dateLabel(outlook.dayOne, lang)}.`
    : "";
  const headline = ur ? "اس شام چاند نظر آنے کے امکانات:" : "Crescent-visibility conditions this evening:";
  const resultText = [
    ur ? "قلم ورکس — پاکستان میں رؤیتِ ہلال" : "Qalam Works — Crescent visibility in Pakistan",
    dateLabel(date, lang), headline,
    `${ur ? "پاکستانی سائنسی ماڈل" : "Pakistan scientific model"}: ${pakistanLine}`,
    `${ur ? "بین الاقوامی سائنسی ماڈل" : "International scientific model"}: ${yallopLine}`,
    firstDayText,
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

  return (
    <section data-testid="crescent-simple-result" aria-label={ur ? "رؤیتِ ہلال کا آسان نتیجہ" : "Crescent visibility quick result"}
      className="overflow-hidden rounded-3xl border border-[#1A3A2A]/15 bg-white shadow-sm dark:border-[#35513d] dark:bg-[#162a1e]">
      <div className="bg-[#F7F5EF] px-5 py-7 text-center dark:bg-[#1b2c20] sm:px-8">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#315c40] dark:text-[#c3e0c5]">
          <Moon className="h-5 w-5" aria-hidden="true" />{ur ? "پاکستان میں چاند کی رؤیت" : "Crescent visibility in Pakistan"}
        </p>
        <p className="mt-2 text-sm text-[#587060] dark:text-[#b6cbb9]">{dateLabel(date, lang)}</p>
        <h2 data-testid="crescent-simple-headline" className="mt-4 text-[#153b29] dark:text-[#f0f7f0]">{headline}</h2>
        <div data-testid="crescent-model-results" className="mx-auto mt-5 grid max-w-3xl gap-3 text-center">
          <p data-testid="crescent-pakistan-model" className="rounded-xl border border-[#b7ceb9] bg-white p-3 text-[#173d2a] dark:border-[#476c51] dark:bg-[#203326] dark:text-[#e6f1e7]">
            <span>{ur ? "پاکستانی سائنسی ماڈل:" : "Pakistan scientific model:"}</span>{" "}
            <span>{pakistanLine}</span>
          </p>
          <p data-testid="crescent-yallop-model" className="rounded-xl border border-[#b7ceb9] bg-white p-3 text-[#173d2a] dark:border-[#476c51] dark:bg-[#203326] dark:text-[#e6f1e7]">
            <span>{ur ? "بین الاقوامی سائنسی ماڈل:" : "International scientific model:"}</span>{" "}
            <span>{yallopLine}</span>
          </p>
          {(qualified > 0 || yallopAccepted > 0) && !outsideNewCrescentWindow && <p className="text-[#486155] dark:text-[#cfddd1]">
            {ur ? "فیصد سے مراد آٹھ مقامات میں موافق حالات کا تناسب ہے۔" : "Percentages are shares of eight favorable sites, not probabilities of sighting."}
          </p>}
        </div>
        <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-xl border border-[#1A3A2A]/15 bg-white px-4 py-3 text-[#153b29] dark:border-[#35513d] dark:bg-[#203326] dark:text-white" data-testid="crescent-visible-city-selector">
          <label htmlFor="crescent-observer-city">{ur ? "اپنا شہر منتخب کریں:" : "Choose your city:"}</label>
          <select id="crescent-observer-city" data-testid="crescent-quick-location"
            value={selected?.observer.id ?? ""}
            onChange={event => setLocationId(event.target.value)}
            className="min-h-11 max-w-full rounded-lg border border-[#1A3A2A]/20 bg-[#F7F5EF] px-3 py-2 text-[#153b29] dark:border-[#35513d] dark:bg-[#162a1e] dark:text-white">
            {pakistan.locations.map(({ observer }) => <option key={observer.id} value={observer.id}>
              {ur ? URDU_NAMES[observer.id] ?? observer.name : observer.name}
            </option>)}
          </select>
        </div>
        {outlook && nextEveningScience && <section data-testid="crescent-next-evening" className="mx-auto mt-5 max-w-2xl rounded-2xl border border-[#1A3A2A]/20 bg-white px-4 py-5 text-[#153b29] dark:border-[#35513d] dark:bg-[#203326] dark:text-white">
          <h3 className="text-center">{ur ? `${formatDate(outlook.dayThirty, "gregorian", lang)} کی شام کا سائنسی جائزہ` : `Scientific outlook for the evening of ${dateLabel(outlook.dayThirty, lang)}`}</h3>
          <p className="mt-2 text-center">{ur ? `${localName} میں 11ویں شام:` : `For ${localName} on this evening:`}</p>
          <p className="mt-2 text-center" data-testid="crescent-next-evening-status">{nextEveningStatus}</p>
          <p className="mt-3 text-center">{ur ? `${localName} کے فلکیاتی اعداد:` : `Astronomical figures for ${localName}:`}</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-center sm:grid-cols-2" data-testid="crescent-next-evening-metrics">
            {[
              { label: ur ? "افق سے بلندی (ڈگری)" : "Altitude (degrees)", value: nextMeasured?.altitudeDeg ?? null, symbol: "°", unit: "" },
              { label: ur ? "غروب کا وقفہ" : "Moonset lag", value: nextMeasured?.lagMinutes ?? null, symbol: "", unit: ur ? "منٹ" : "min" },
              { label: ur ? "زاویائی فاصلہ" : "Elongation", value: nextMeasured?.elongationDeg ?? null, symbol: "°", unit: "" },
              { label: ur ? "ہلال کی چوڑائی (قوسی منٹ)" : "Crescent width (arcminutes)", value: nextMeasured?.widthArcMin ?? null, symbol: "′", unit: "" },
            ].map(item => <div key={item.label} data-crescent-measure className="rounded-xl border border-[#1A3A2A]/10 p-3 dark:border-[#52715a]">
              <dt className="text-[#587060] dark:text-[#c8d5cc]">{item.label}</dt>
              <dd className="mt-1 flex items-baseline justify-center gap-2 font-normal text-[#153b29] dark:text-white">
                {item.value === null || !Number.isFinite(item.value) ? "—" : <>
                  <span data-crescent-latin-number dir="ltr">{number(item.value)}{item.symbol}</span>
                  {item.unit && <span>{item.unit}</span>}
                </>}
              </dd>
            </div>)}
          </dl>
          <a className="mt-4 block text-center underline underline-offset-4" data-testid="crescent-next-evening-link"
            href={`/tools/crescent-visibility?date=${outlook.dayThirty.year}-${String(outlook.dayThirty.month).padStart(2, "0")}-${String(outlook.dayThirty.day).padStart(2, "0")}`}>
            {ur ? "11 نومبر کے تمام مقامات کا حساب دیکھیں" : "View all locations for the next evening"}
          </a>
        </section>}
        {outlook && !officialSighting && <div data-testid="crescent-predicted-first-day" className="mx-auto mt-6 w-full rounded-2xl border-2 border-[#ad7b18] bg-[#f3cf68] px-5 py-5 text-[#173325] shadow-[0_8px_30px_rgba(172,120,20,0.25)] dark:border-[#dbb64b] dark:bg-[#f3cf68] dark:text-[#173325] sm:px-6">
          <p data-crescent-forecast className="text-lg font-normal leading-9">{ur && outlook
            ? <>ہمارے سائنسی حساب سے {targetName} <bdi dir="ltr">{outlook.nextHijriYear}</bdi> کی پہلی تاریخ <bdi dir="ltr">{outlook.dayOne.day}</bdi> {monthName("gregorian", outlook.dayOne.month, "ur")} <bdi dir="ltr">{outlook.dayOne.year}</bdi>ء بروز {weekdayNamesUr[new Date(Date.UTC(outlook.dayOne.year, outlook.dayOne.month - 1, outlook.dayOne.day)).getUTCDay()]} ہوگی۔</>
            : firstDayText}</p>
        </div>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#1A3A2A]/10 px-5 py-5 dark:border-[#35513d] sm:px-8">
        <button type="button" data-testid="crescent-share-result" onClick={() => void share()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1A3A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2e6546] dark:bg-[#2e6546]">
          {shareStatus === "copied" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {shareStatus === "copied" ? (ur ? "نتیجہ کاپی ہوگیا" : "Result copied") : (ur ? "نتیجہ شیئر کریں" : "Share result")}
        </button>
        <a href="#crescent-technical-report" onClick={() => {
          const details = document.getElementById("crescent-technical-report") as HTMLDetailsElement | null;
          if (details) details.open = true;
        }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#1A3A2A]/20 px-4 py-2.5 text-sm font-semibold text-[#1A3A2A] dark:border-[#35513d] dark:text-[#e9f2e9]">
          <Clipboard className="h-4 w-4" />{ur ? "مزید تفصیل" : "More details"}
        </a>
        {shareStatus === "failed" && <p role="alert" className="w-full text-center text-sm text-rose-700 dark:text-rose-300">{ur ? "شیئر نہیں ہو سکا، دوبارہ کوشش کریں۔" : "Could not share. Please try again."}</p>}
      </div>

    </section>
  );
}
