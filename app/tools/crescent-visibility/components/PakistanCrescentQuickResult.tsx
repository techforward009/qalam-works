"use client";

import { useState } from "react";
import { Check, Clipboard, Moon, Share2 } from "lucide-react";
import { formatDate, type DateParts } from "../../date-converter/utils/dateEngine";
import { dateDigits } from "../../date-converter/utils/pakistanDateShare";
import type { PakistanNationalPrediction } from "../../date-converter/utils/pakistan-crescent/nationalPrediction";
import type { YallopNationalReferencePrediction } from "../../date-converter/utils/yallop/nationalReferencePrediction";
import type { OfficialHijriMonthAnchor, ResolvedHijriDate } from "../../date-converter/utils/hijri-authority/types";

const URDU_NAMES: Record<string, string> = {
  gilgit: "گلگت", peshawar: "پشاور", islamabad: "اسلام آباد", lahore: "لاہور",
  muzaffarabad: "مظفرآباد", quetta: "کوئٹہ", karachi: "کراچی", jiwani: "جیوانی",
};
const n = (value: number, lang: "ur" | "en", digits = 1) =>
  dateDigits(value.toFixed(digits), lang);

export function PakistanCrescentQuickResult({
  date, lang, pakistan, yallop, authority, decision, outsideNewCrescentWindow,
}: {
  date: DateParts;
  lang: "ur" | "en";
  pakistan: PakistanNationalPrediction;
  yallop: YallopNationalReferencePrediction;
  authority: ResolvedHijriDate | null;
  decision: OfficialHijriMonthAnchor | null;
  outsideNewCrescentWindow: boolean;
}) {
  const ur = lang === "ur";
  const [locationId, setLocationId] = useState("karachi");
  const [shareStatus, setShareStatus] = useState<"copied" | "failed" | null>(null);
  const selected = pakistan.locations.find(({ observer }) => observer.id === locationId) ?? pakistan.locations[0];
  const localName = selected ? (ur ? URDU_NAMES[selected.observer.id] ?? selected.observer.name : selected.observer.name) : "—";
  const local = selected?.prediction;
  const reference = yallop.locations.find(({ observer }) => observer.id === selected?.observer.id)?.prediction;
  const measured = local?.status === "evaluated" ? local.criterion : null;
  const sunset = local?.status === "evaluated" && local.snapshot?.sunsetUtc ? local.snapshot.sunsetUtc : null;
  const age = reference?.status === "evaluated" && sunset && reference.snapshot?.conjunctionUtc
    ? (Date.parse(sunset) - Date.parse(reference.snapshot.conjunctionUtc)) / 3600000 : null;
  const qualified = pakistan.locations.filter(({ prediction }) =>
    prediction.status === "evaluated" && prediction.criterion.qualifies).length;
  const yallopAccepted = yallop.locations.filter(({ prediction }) => prediction.status === "evaluated" && prediction.acceptedByPolicy).length;
  const yallopIncomplete = yallop.locations.some(({ prediction }) => prediction.status === "no-sunset" || prediction.status === "no-moonset");
  const incomplete = pakistan.locations.some(({ prediction }) =>
    prediction.status === "no-sunset" || prediction.status === "no-moonset");
  const state = outsideNewCrescentWindow ? "not-new" :
    qualified > 0 ? "favorable" : incomplete ? "incomplete" : "unfavorable";
  const friendlyHeadline = state === "not-new"
    ? (ur ? "یہ چاند دیکھنے کی صحیح شام نہیں" : "This is not the new-moon evening")
    : state === "favorable" ? (ur ? "چاند نظر آنے کے حالات موافق ہیں" : "Conditions favor crescent visibility")
    : state === "incomplete" ? (ur ? "ابھی واضح اندازہ دستیاب نہیں" : "No clear prediction is available yet")
    : (ur ? "چاند نظر آنے کے حالات موافق نہیں" : "Conditions do not favor crescent visibility");
  const status = state === "not-new" ? (ur ? "یہ نئے ہلال کی شام نہیں ہے" : "Not a new-crescent evening")
    : state === "favorable" ? (ur ? "سائنسی معیار پورا ہوتا ہے" : "Scientific criterion is met")
    : state === "incomplete" ? (ur ? "سائنسی جانچ نامکمل ہے" : "Scientific evaluation is incomplete")
    : (ur ? "سائنسی معیار پورا نہیں ہوتا" : "Scientific criterion is not met");
  const explanation = state === "not-new"
    ? (ur ? "اگلے چاند کا مہینہ منتخب کریں، یا اوپر تاریخ بدلیں۔" : "Choose an upcoming month above or change the date.")
    : state === "favorable"
      ? (ur ? "پاکستان کے کم از کم ایک مقررہ مقام پر رؤیت کا سائنسی معیار پورا ہو رہا ہے۔ یہ چاند نظر آنے کی ضمانت نہیں۔"
        : "At least one Pakistan reference location meets the visibility criterion. This is not a guarantee of sighting.")
      : state === "incomplete"
        ? (ur ? "بعض مقامات کے فلکیاتی اعداد مکمل نہیں؛ قطعی منفی نتیجہ نہیں دیا جا سکتا۔"
          : "Some locations lack full astronomical data, so a definitive negative prediction is not possible.")
        : (ur ? "پاکستان کے آٹھ حوالہ جاتی مقامات پر رؤیت کا مقررہ سائنسی معیار پورا نہیں ہوا۔"
          : "None of Pakistan's eight reference locations meets the specified scientific criterion.");
  const resultText = [
    ur ? "قلم ورکس — پاکستان میں رؤیتِ ہلال" : "Qalam Works — Pakistan Crescent Visibility",
    dateDigits(formatDate(date, "gregorian", lang), lang),
    status,
    outsideNewCrescentWindow ? "" : (ur ? `پاکستانی قومی معیار: ${qualified}/8 مقامات` : `Pakistan national criterion: ${qualified}/8 locations`),
    decision?.sightingDecision === "sighted" ? (ur ? "سرکاری اعلان: چاند نظر آگیا" : "Official announcement: Crescent sighted")
      : decision?.sightingDecision === "not-sighted" ? (ur ? "سرکاری اعلان: چاند نظر نہیں آیا" : "Official announcement: Crescent not sighted")
      : (ur ? "سائنسی جائزہ، سرکاری اعلان نہیں" : "Scientific outlook, not an official announcement"),
    `https://www.qalamworks.com/tools/crescent-visibility?date=${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
  ].filter(Boolean).join("\n");

  async function share() {
    setShareStatus(null);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: ur ? "رؤیتِ ہلال" : "Crescent visibility", text: resultText });
        return;
      }
      await navigator.clipboard.writeText(resultText);
      setShareStatus("copied");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareStatus("failed");
    }
  }

  const metric = (label: string, value: string, unit: string) =>
    <div className="rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] px-4 py-3 text-center dark:border-[#35513d] dark:bg-[#203326]">
      <dt className="text-xs font-semibold text-[#587060] dark:text-[#b6cbb9]">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-[#153b29] dark:text-[#f0f7f0]" dir="ltr">{value}<span className="ms-1 text-xs font-medium">{unit}</span></dd>
    </div>;

  return (
    <section data-testid="crescent-simple-result" aria-label={ur ? "رؤیتِ ہلال کا آسان نتیجہ" : "Crescent visibility quick result"}
      className="overflow-hidden rounded-3xl border border-[#1A3A2A]/15 bg-white shadow-sm dark:border-[#35513d] dark:bg-[#162a1e]">
      <div className="border-b border-[#1A3A2A]/10 bg-[#F7F5EF] px-5 py-7 text-center dark:border-[#35513d] dark:bg-[#1b2c20] sm:px-8">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#315c40] dark:text-[#c3e0c5]">
          <Moon className="h-5 w-5" aria-hidden="true" />{ur ? "پاکستانی قومی سائنسی نتیجہ" : "Pakistan national scientific result"}
        </span>
        <p className="mt-2 text-sm text-[#587060] dark:text-[#b6cbb9]">{dateDigits(formatDate(date, "gregorian", lang), lang)}</p>
        <h2 data-testid="crescent-simple-headline" className={`mt-3 text-2xl font-bold leading-relaxed sm:text-3xl ${state === "favorable" ? "text-emerald-800 dark:text-emerald-300" : state === "unfavorable" ? "text-rose-800 dark:text-rose-300" : "text-[#153b29] dark:text-[#f0f7f0]"} ${ur ? "font-naskh" : ""}`}>
          {friendlyHeadline}
        </h2>
        <p className={`mx-auto mt-2 max-w-xl text-base leading-8 text-[#486155] dark:text-[#cfddd1] ${ur ? "font-naskh" : ""}`}>{explanation}</p>
        {!outsideNewCrescentWindow && <p data-testid="crescent-simple-national-count" className="mt-3 text-sm font-semibold text-[#234b34] dark:text-[#e0ecdf]" dir="auto">
          {ur ? "پاکستان کے منتخب ۸ مقامات میں سے: " : "Of 8 Pakistan reference sites: "}<span dir="ltr">{qualified}/8</span>
        </p>}
        {decision ? <p className="mx-auto mt-4 max-w-lg rounded-lg border border-[#B8935A]/45 px-3 py-2 text-sm font-semibold text-[#775724] dark:text-[#efdfa9]" data-testid="crescent-simple-official">
          {ur ? "سرکاری اعلان: " : "Official declaration: "}
          {decision.sightingDecision === "sighted" ? (ur ? "چاند نظر آگیا" : "Crescent sighted") : (ur ? "چاند نظر نہیں آیا" : "Crescent not sighted")}
        </p> : <p className="mt-3 text-xs text-[#6b786d] dark:text-[#c1cec2]">
          {ur ? "یہ پیش گوئی سرکاری رؤیتِ ہلال کا اعلان نہیں ہے۔" : "This prediction is not an official moon-sighting declaration."}
        </p>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 px-5 py-5 sm:px-8">
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
        {shareStatus === "failed" && <p role="alert" className="w-full text-center text-sm text-rose-700 dark:text-rose-300">{ur ? "شیئر نہیں ہو سکا۔ دوبارہ کوشش کریں۔" : "Could not share. Please try again."}</p>}
      </div>

      <details data-testid="crescent-simple-details" className="border-t border-[#1A3A2A]/10 px-5 pb-5 dark:border-[#35513d] sm:px-8">
        <summary className="cursor-pointer py-4 text-sm font-bold text-[#315c40] dark:text-[#c3e0c5]">{ur ? "یہ اندازہ کیسے لگایا گیا؟" : "How was this predicted?"}</summary>
      <div className="grid gap-3 pt-2 sm:grid-cols-3" data-testid="crescent-three-outcomes">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{ur ? "پاکستانی قومی معیار" : "Pakistan national criterion"}</h3>
          <p className="mt-2 text-lg font-bold text-emerald-950 dark:text-emerald-100">{outsideNewCrescentWindow ? (ur ? "نئے ہلال کی جانچ نہیں" : "Not a new-crescent test") : status}</p>
          <p className="mt-1 text-xs leading-6 text-emerald-900 dark:text-emerald-200">{outsideNewCrescentWindow ? (ur ? "یہ صرف فلکیاتی معلومات ہیں۔" : "Astronomical information only.") : `${dateDigits(String(qualified), lang)}/${dateDigits("8", lang)} ${ur ? "قومی مشاہداتی مقامات" : "national reference locations"}`}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">{ur ? "سرکاری رؤیتِ ہلال فیصلہ" : "Official sighting decision"}</h3>
          <p className="mt-2 text-lg font-bold text-amber-950 dark:text-amber-100">{decision?.sightingDecision === "sighted" ? (ur ? "چاند نظر آیا" : "Crescent sighted") : decision?.sightingDecision === "not-sighted" ? (ur ? "چاند نظر نہیں آیا" : "Crescent not sighted") : (ur ? "مصدقہ اعلان دستیاب نہیں" : "No reviewed announcement")}</p>
          <p className="mt-1 text-xs leading-6 text-amber-900 dark:text-amber-200">{decision ? (ur ? "مرکزی کمیٹی کے دستیاب اعلان کے مطابق" : "Based on the reviewed committee announcement") : (ur ? "سائنسی پیش گوئی سرکاری فیصلہ نہیں۔" : "The scientific forecast is not an official decision.")}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/70">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{ur ? "یالوپ کا تقابلی ماڈل" : "Yallop comparison"}</h3>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{outsideNewCrescentWindow ? (ur ? "نئے ہلال کی جانچ نہیں" : "Not a new-crescent test") : yallopAccepted > 0 ? (ur ? "کچھ مقامات موافق" : "Favorable at some sites") : yallopIncomplete ? (ur ? "اعداد نامکمل" : "Incomplete evaluation") : (ur ? "موافق نہیں" : "Not favorable")}</p>
          <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">{outsideNewCrescentWindow ? (ur ? "صرف حوالہ جاتی ماڈل" : "Reference model only") : `${dateDigits(String(yallopAccepted), lang)}/${dateDigits("8", lang)} ${ur ? "حوالہ جاتی مقامات" : "reference locations"}`}</p>
        </article>
      </div>

      <div className="px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={`text-base font-bold text-[#153b29] dark:text-[#e6f0e6] ${ur ? "font-naskh" : ""}`}>{ur ? "اصل فلکیاتی اعداد" : "Actual astronomical values"}</h3>
            <p className="text-xs text-[#587060] dark:text-[#b6cbb9]">{ur ? "مقام کی تفصیل؛ قومی نتیجہ تمام آٹھ مقامات سے ہے۔" : "Local detail; the national conclusion uses all eight locations."}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#315c40] dark:text-[#cfddd1]">
            <span>{ur ? "مقام" : "Location"}</span>
            <select data-testid="crescent-quick-location" aria-label={ur ? "فلکیاتی اعداد کے لیے مقام منتخب کریں" : "Choose location for astronomical values"}
              value={selected?.observer.id ?? ""}
              onChange={event => setLocationId(event.target.value)}
              className="max-w-[190px] rounded-lg border border-[#1A3A2A]/20 bg-white px-2 py-2 text-[#153b29] dark:border-[#35513d] dark:bg-[#203326] dark:text-white">
              {pakistan.locations.map(({ observer }) =>
                <option key={observer.id} value={observer.id}>{ur ? URDU_NAMES[observer.id] ?? observer.name : observer.name}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-[#587060] dark:text-[#b6cbb9]">
          {ur ? `${localName} کے اعداد، اسی شام کے غروب آفتاب کے حساب سے` : `${localName} values at sunset on the selected evening`}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="crescent-simple-metrics">
          {metric(ur ? "چاند کی عمر" : "Moon age", age !== null && Number.isFinite(age) && age >= 0 ? n(age, lang) : "—", ur ? "گھنٹے" : "h")}
          {metric(ur ? "زاویائی فاصلہ" : "Elongation", measured ? n(measured.elongationDeg, lang) : "—", "°")}
          {metric(ur ? "غروب کا وقفہ" : "Moon lag", measured ? n(measured.lagMinutes, lang) : "—", ur ? "منٹ" : "min")}
          {metric(ur ? "افق سے بلندی" : "Altitude", measured ? n(measured.altitudeDeg, lang) : "—", "°")}
        </dl>
        <p className="mt-3 text-xs leading-6 text-[#587060] dark:text-[#b6cbb9]">
          {ur ? "— کا مطلب ہے کہ اس مقام کے لیے متعلقہ سائنسی عدد دستیاب نہیں۔" : "— means the relevant scientific measurement is unavailable for this location."}
        </p>
        <details className="mt-4 rounded-xl border border-[#1A3A2A]/15 dark:border-[#35513d]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[#153b29] dark:text-[#e6f0e6]">{ur ? "فلکیاتی اعداد جدول میں دیکھیں" : "View astronomical measurements as a table"}</summary>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[320px] text-sm" data-testid="crescent-astronomy-table">
              <thead><tr className="border-b text-start text-[#486155] dark:text-[#cfddd1]"><th scope="col" className="py-2 text-start">{ur ? "فلکیاتی مقدار" : "Astronomical parameter"}</th><th scope="col" className="py-2 text-start">{ur ? "حقیقی حسابی قدر" : "Calculated value"}</th><th scope="col" className="py-2 text-start">{ur ? "حیثیت" : "Status"}</th></tr></thead>
              <tbody className="divide-y divide-[#1A3A2A]/10 dark:divide-[#35513d]">
                {[
                  { label: ur ? "چاند کی عمر" : "Moon age", value: age !== null && Number.isFinite(age) && age >= 0 ? `${n(age, lang)} ${ur ? "گھنٹے" : "h"}` : null },
                  { label: ur ? "زاویائی فاصلہ" : "Elongation", value: measured ? `${n(measured.elongationDeg, lang)}°` : null },
                  { label: ur ? "غروب کا وقفہ" : "Moon lag", value: measured ? `${n(measured.lagMinutes, lang)} ${ur ? "منٹ" : "min"}` : null },
                  { label: ur ? "افق سے بلندی" : "Altitude", value: measured ? `${n(measured.altitudeDeg, lang)}°` : null },
                ].map(row => <tr key={row.label} className="text-[#153b29] dark:text-[#e6f0e6]"><th scope="row" className="py-2 pe-3 text-start font-medium">{row.label}</th><td className="py-2 pe-3" dir="auto">{row.value ?? "—"}</td><td className="py-2 text-xs">{row.value ? (ur ? "محسوب" : "Calculated") : (ur ? "دستیاب نہیں" : "Unavailable")}</td></tr>)}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      </details>
    </section>
  );
}
