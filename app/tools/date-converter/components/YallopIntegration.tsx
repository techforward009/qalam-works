"use client";

import { useMemo } from "react";
import { PAKISTAN_YALLOP_OBSERVERS, yallopObserver } from "../utils/yallop/observerLocations";
import { evaluateDateStudioYallopPrediction, type DateStudioYallopPrediction } from "../utils/yallop/dateStudioPrediction";
import { evaluateDateStudioPakistanCrescentPrediction } from "../utils/pakistan-crescent/dateStudioPrediction";
import type { PakistanCrescentPrediction } from "../utils/pakistan-crescent/types";
import { formatDate, type DateParts } from "../utils/dateEngine";
import type { YallopObserver } from "../utils/yallop/types";
import { interpretDateStudioMonthStart, type HijriDayAuthority } from "../utils/yallop/dateStudioMonthStart";
import type { ResolvedHijriDate } from "../utils/hijri-authority/types";
import { resolvePakistanOfficialSightingDecisionForEvening } from "../utils/hijri-authority/resolveOfficialSightingDecision";

type Language = "en" | "ur";
export type DateStudioMethod = "qalam" | "yallop" | "pakistan-5year" | "crescent-compare";

const COPY = {
  en: {
    method: "Calculation method", qalam: "Current Qalam Method", yallop: "Yallop Crescent Visibility", pakistan: "Pakistan 5-Year Calendar Criterion",
    observer: "Observer location", evening: "Evaluation evening", visibility: "Visibility class",
    q: "q value", currentSituation: "Current lunar situation", astronomicalVisibility: "Astronomical visibility", monthStartOutlook: "Month-start outlook", scientificDetails: "Scientific details",
    officialDate: "Pakistan official Hijri date", reportedOfficialDate: "Reported official Pakistan Hijri date",
    day29Favorable: (observer: string) => `Crescent visibility conditions are favorable this evening in ${observer}.`,
    day29Outlook: "According to the current Qalam Yallop policy, tomorrow may begin the new Hijri month, subject to the official moon-sighting decision.",
    doesNotQualify: "Crescent visibility conditions do not qualify for next-day month start under the current Qalam Yallop policy.",
    day30Consequence: "Today is the 30th day of the current Hijri month. Therefore, tomorrow is necessarily the first day of the next Hijri month.",
    favorable: "Crescent visibility conditions are favorable this evening.",
    prediction: "Astronomical crescent-visibility prediction", provenance: "Method", provenanceValue: "Yallop Crescent Visibility — NAO Technical Note 69",
    disclaimer: "Astronomical crescent-visibility prediction; not an official moon-sighting declaration.",
    unavailable: "A Yallop prediction is unavailable for this evaluation evening.",
    pakistanPass: "Crescent conditions meet the published Pakistan 5-Year Calendar criterion at sunset.", pakistanFail: "Crescent conditions do not meet the published Pakistan 5-Year Calendar criterion at sunset.", pakistanDisclaimer: "Scientific crescent-visibility calculation; not an official moon-sighting declaration.", sunset: "Local sunset", moonset: "Moonset", altitude: "Moon altitude", width: "Crescent width", illumination: "Illumination", elongation: "Elongation", lag: "Lag", threshold: "required", illuminationOrElongation: "Illumination OR elongation",
    compare: "Compare crescent methods", comparison: "Crescent visibility comparison", yallopSection: "Yallop Crescent Visibility", pakistanSection: "Pakistan 5-Year Calendar Criterion", officialDecision: "Official historical decision", noDecision: "No reviewed official moon-sighting decision is available for this evening.", sighted: "Official decision: crescent sighted", notSighted: "Official decision: crescent not sighted", separate: "Scientific predictions and official decisions are shown separately for comparison.", bestTime: "Yallop best-time evaluation",
  },
  ur: {
    method: "حساب کا طریقہ", qalam: "موجودہ قلم طریقہ", yallop: "یالوپ رؤیتِ ہلال", pakistan: "پاکستان پانچ سالہ قمری تقویم معیار",
    observer: "مقامِ مشاہدہ", evening: "جانچ کی شام", visibility: "رؤیت کی درجہ بندی",
    q: "q قدر", currentSituation: "آج کی قمری صورتِ حال", astronomicalVisibility: "فلکیاتی رؤیت", monthStartOutlook: "آغازِ ماہ کا امکان", scientificDetails: "سائنسی تفصیلات",
    officialDate: "پاکستان کی سرکاری ہجری تاریخ", reportedOfficialDate: "رپورٹ شدہ سرکاری پاکستانی ہجری تاریخ",
    day29Favorable: (observer: string) => `${observer} میں آج شام ہلال کی رؤیت کے حالات موافق ہیں۔`,
    day29Outlook: "موجودہ قلم یالوپ پالیسی کے مطابق کل نئے قمری مہینے کا آغاز ہو سکتا ہے، تاہم سرکاری آغاز مرکزی رویتِ ہلال کمیٹی کے فیصلے پر منحصر ہوگا۔",
    doesNotQualify: "موجودہ قلم یالوپ پالیسی کے مطابق آج شام کے حالات اگلے دن نئے قمری مہینے کے آغاز کے لیے موزوں نہیں ہیں۔",
    day30Consequence: "آج موجودہ ہجری مہینے کی تیس تاریخ ہے۔ اس لیے کل لازماً اگلے ہجری مہینے کی پہلی تاریخ ہوگی۔",
    favorable: "آج شام ہلال کی رؤیت کے حالات موافق ہیں۔",
    prediction: "فلکیاتی رؤیتِ ہلال کی پیش گوئی", provenance: "طریقہ", provenanceValue: "یالوپ رؤیتِ ہلال — این اے او ٹیکنیکل نوٹ 69",
    disclaimer: "یہ رؤیتِ ہلال کی فلکیاتی پیش گوئی ہے، سرکاری رویتِ ہلال کا اعلان نہیں۔",
    unavailable: "اس جانچ کی شام کے لیے یالوپ پیش گوئی دستیاب نہیں۔",
    pakistanPass: "غروبِ آفتاب کے وقت ہلال کے حالات پاکستان کے شائع شدہ پانچ سالہ قمری تقویم معیار پر پورا اترتے ہیں۔", pakistanFail: "غروبِ آفتاب کے وقت ہلال کے حالات پاکستان کے شائع شدہ پانچ سالہ قمری تقویم معیار پر پورا نہیں اترتے۔", pakistanDisclaimer: "یہ رؤیتِ ہلال کا سائنسی حساب ہے، سرکاری رویتِ ہلال کا اعلان نہیں۔", sunset: "مقامی غروبِ آفتاب", moonset: "غروبِ قمر", altitude: "ہلال کی بلندی", width: "ہلال کی چوڑائی", illumination: "روشن حصہ", elongation: "استطالہ", lag: "وقفۂ غروب", threshold: "درکار", illuminationOrElongation: "روشن حصہ یا استطالہ",
    compare: "رؤیتِ ہلال طریقوں کا تقابل", comparison: "رؤیتِ ہلال کا تقابلی جائزہ", yallopSection: "یالوپ رؤیتِ ہلال", pakistanSection: "پاکستان پانچ سالہ قمری تقویم معیار", officialDecision: "سرکاری تاریخی فیصلہ", noDecision: "اس شام کے لیے کوئی جائزہ شدہ سرکاری رویتِ ہلال فیصلہ دستیاب نہیں۔", sighted: "سرکاری فیصلہ: ہلال نظر آگیا", notSighted: "سرکاری فیصلہ: ہلال نظر نہیں آیا", separate: "سائنسی پیش گوئیاں اور سرکاری فیصلے تقابل کے لیے الگ الگ دکھائے گئے ہیں۔", bestTime: "یالوپ بہترین وقت کی جانچ",
  },
} as const;

const URDU_OBSERVER_NAMES: Record<string, string> = {
  karachi: "کراچی", hyderabad: "حیدرآباد", lahore: "لاہور", rawalpindi: "راولپنڈی",
  multan: "ملتان", islamabad: "اسلام آباد", peshawar: "پشاور", quetta: "کوئٹہ",
  muzaffarabad: "مظفرآباد", gilgit: "گلگت", skardu: "سکردو", jiwani: "جیوانی",
};

function observerDisplayName(observer: YallopObserver, lang: Language): string {
  return lang === "ur" ? URDU_OBSERVER_NAMES[observer.id] ?? observer.name : observer.name;
}

export function YallopIntegration({
  lang, method, onMethodChange, observerId, onObserverChange, gregorian, hijriDay, hijriDayAuthority, authorityContext, embedded = false, predict, pakistanPredict,
}: {
  lang: Language;
  method: DateStudioMethod;
  onMethodChange: (method: DateStudioMethod) => void;
  observerId: string;
  onObserverChange: (observerId: string) => void;
  gregorian: DateParts | null;
  hijriDay: number | null;
  hijriDayAuthority: HijriDayAuthority;
  authorityContext?: ResolvedHijriDate | null;
  embedded?: boolean;
  predict?: (gregorian: DateParts, observer: YallopObserver) => DateStudioYallopPrediction;
  pakistanPredict?: (gregorian: DateParts, observer: YallopObserver) => PakistanCrescentPrediction;
}) {
  const t = COPY[lang];
  const isUr = lang === "ur";
  const observer = yallopObserver(observerId) ?? yallopObserver("karachi")!;
  const prediction = useMemo(
    () => (method === "yallop" || method === "crescent-compare") && gregorian ? (predict ?? evaluateDateStudioYallopPrediction)(gregorian, observer) : null,
    [method, gregorian?.year, gregorian?.month, gregorian?.day, observer, predict],
  );
  const pakistanPrediction = useMemo(
    () => (method === "pakistan-5year" || method === "crescent-compare") && gregorian ? (pakistanPredict ?? evaluateDateStudioPakistanCrescentPrediction)(gregorian, observer) : null,
    [method, gregorian?.year, gregorian?.month, gregorian?.day, observer, pakistanPredict],
  );
  const monthStart = prediction?.status === "evaluated" && authorityContext
    ? interpretDateStudioMonthStart(hijriDay, prediction.acceptedByPolicy, hijriDayAuthority)
    : null;
  const officialDateLabel = authorityContext?.authority === "reported-official" ? t.reportedOfficialDate : t.officialDate;
  const historicalDecision = useMemo(() => gregorian ? resolvePakistanOfficialSightingDecisionForEvening(gregorian) : null, [gregorian?.year, gregorian?.month, gregorian?.day]);

  return (
    <section className={embedded ? "" : "mb-5 rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-[#F7F5EF] dark:bg-[#162a1e] p-5 sm:p-6"} dir={isUr ? "rtl" : "ltr"}>
      <label className={`block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] uppercase tracking-wide mb-2 ${isUr ? "font-naskh" : ""}`}>
        {t.method}
      </label>
      <select aria-label={t.method} value={method} onChange={(event) => onMethodChange(event.target.value as DateStudioMethod)} className={`w-full rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>
        <option value="qalam">{t.qalam}</option>
        <option value="yallop">{t.yallop}</option>
        <option value="pakistan-5year">{t.pakistan}</option>
        <option value="crescent-compare">{t.compare}</option>
      </select>

      {(method === "yallop" || method === "pakistan-5year" || method === "crescent-compare") && <>
        <label className={`mt-4 block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] mb-2 ${isUr ? "font-naskh" : ""}`}>
          {t.observer}
        </label>
        <select aria-label={t.observer} value={observer.id} onChange={(event) => onObserverChange(event.target.value)} className={`w-full rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>
          {PAKISTAN_YALLOP_OBSERVERS.map((place) => <option key={place.id} value={place.id}>{observerDisplayName(place, lang)}</option>)}
        </select>

        {method === "crescent-compare" && prediction && pakistanPrediction && <div className="mt-4 rounded-xl border border-[#B8935A]/40 bg-white/70 p-4 dark:bg-[#0e1c15]/60">
          <h2 className={`text-base font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.comparison}</h2>
          <p className={`mt-2 text-sm text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.evening}: <span dir="ltr">{gregorian && `${gregorian.year}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`}</span> · {t.observer}: {observerDisplayName(observer, lang)}</p>
          <p className={`mt-2 text-xs text-[#4a6a4a] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.separate}</p>
          <h3 className={`mt-4 text-sm font-bold ${isUr ? "font-naskh" : ""}`}>{t.yallopSection}</h3>
          {prediction.status === "evaluated" ? <><p className={`mt-1 text-sm ${isUr ? "font-naskh" : ""}`}>{prediction.acceptedByPolicy ? t.favorable : t.doesNotQualify}</p><p className="text-xs" dir="ltr">Class {prediction.criterion.visibilityClass} · q {prediction.criterion.q.toFixed(3)} · {t.bestTime}: {prediction.snapshot.bestTimeUtc}</p><p className={`text-xs ${isUr ? "font-naskh" : ""}`}>{t.provenance}: {t.provenanceValue}</p></> : <p className={`text-sm ${isUr ? "font-naskh" : ""}`}>{t.unavailable}</p>}
          <h3 className={`mt-4 text-sm font-bold ${isUr ? "font-naskh" : ""}`}>{t.pakistanSection}</h3>
          {pakistanPrediction.status === "evaluated" ? <><p className={`mt-1 text-sm ${isUr ? "font-naskh" : ""}`}>{pakistanPrediction.criterion.qualifies ? t.pakistanPass : t.pakistanFail}</p><p className="text-xs" dir="ltr">Altitude {pakistanPrediction.snapshot.altitudeDeg.toFixed(2)}° · Width {pakistanPrediction.snapshot.widthArcMin.toFixed(3)} arcmin · Illumination {pakistanPrediction.snapshot.illuminationPercent.toFixed(2)}% · Elongation {pakistanPrediction.snapshot.elongationDeg.toFixed(2)}° · Lag {pakistanPrediction.snapshot.lagMinutes.toFixed(1)} min</p><p className="text-xs" dir="ltr">Illumination OR elongation: {pakistanPrediction.criterion.illuminationOrElongationPasses ? "Pass" : "Fail"} · {t.sunset}: {pakistanPrediction.snapshot.sunsetUtc}</p><p className={`text-xs ${isUr ? "font-naskh" : ""}`}>{t.provenance}: {t.pakistan}</p></> : <p className={`text-sm ${isUr ? "font-naskh" : ""}`}>{t.pakistanDisclaimer}</p>}
          <h3 className={`mt-4 text-sm font-bold ${isUr ? "font-naskh" : ""}`}>{t.officialDecision}</h3>
          {historicalDecision ? <><p className={`mt-1 text-sm font-semibold ${isUr ? "font-naskh" : ""}`}>{historicalDecision.sightingDecision === "sighted" ? t.sighted : t.notSighted}</p><p className={`text-xs ${isUr ? "font-naskh" : ""}`}>{historicalDecision.authority === "reported-official" ? t.reportedOfficialDate : t.officialDate} · {historicalDecision.providerLabel[lang]} · <span dir="ltr">{historicalDecision.announcementGregorianDate && `${historicalDecision.announcementGregorianDate.year}-${String(historicalDecision.announcementGregorianDate.month).padStart(2, "0")}-${String(historicalDecision.announcementGregorianDate.day).padStart(2, "0")}`}</span></p><p className="text-xs">{historicalDecision.sourceReference}</p></> : <p className={`mt-1 text-sm ${isUr ? "font-naskh" : ""}`}>{t.noDecision}</p>}
        </div>}

        {method !== "crescent-compare" && prediction && (prediction.status === "evaluated" ? <div className="mt-4 rounded-xl border border-[#B8935A]/40 bg-white/70 p-4 dark:bg-[#0e1c15]/60">
          {authorityContext && <>
            <h2 className={`text-base font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.currentSituation}</h2>
            <p className={`mt-3 text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${isUr ? "font-naskh" : ""}`}>{officialDateLabel}</p>
            <p className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{formatDate(authorityContext.hijri, "hijri", lang)}</p>
          </>}
          {monthStart?.state === "day30_forced_next_month" ? <>
            <h3 className={`mt-3 text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.astronomicalVisibility}</h3>
            <p className={`mt-1 text-sm text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{prediction.acceptedByPolicy ? t.favorable : t.doesNotQualify}</p>
            <p className={`mt-4 text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.day30Consequence}</p>
          </> : <>
            {!authorityContext && <h2 className={`text-base font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.astronomicalVisibility}</h2>}
            <p className={`mt-3 text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>
              {monthStart?.state === "day29_qualifies" ? t.day29Favorable(observerDisplayName(prediction.snapshot.observer, lang))
                : prediction.acceptedByPolicy ? t.favorable : t.doesNotQualify}
            </p>
            {monthStart?.state === "day29_qualifies" && <><h3 className={`mt-4 text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.monthStartOutlook}</h3><p className={`mt-1 text-sm text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.day29Outlook}</p></>}
          </>}
          <p className={`mt-4 rounded-lg bg-[#1A3A2A]/5 px-3 py-2 text-[12px] leading-relaxed text-[#3a6a4a] dark:bg-white/[0.05] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.disclaimer}</p>
          <h3 className={`mt-5 text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.scientificDetails}</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label={t.observer} value={observerDisplayName(prediction.snapshot.observer, lang)} urdu={isUr} />
            <Detail label={t.evening} value={prediction.observerLocalDate} numeric />
            <Detail label={t.visibility} value={prediction.criterion.visibilityClass} numeric />
            <Detail label={t.q} value={prediction.criterion.q.toFixed(3)} numeric />
            <Detail label={t.provenance} value={t.provenanceValue} urdu={isUr} />
          </div>
        </div> : <p className={`mt-4 text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.unavailable}</p>)}
        {prediction && prediction.status !== "evaluated" && <p className={`mt-4 rounded-lg bg-[#1A3A2A]/5 px-3 py-2 text-[12px] leading-relaxed text-[#3a6a4a] dark:bg-white/[0.05] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.disclaimer}</p>}
        {method !== "crescent-compare" && pakistanPrediction && (pakistanPrediction.status === "evaluated" ? <div className="mt-4 rounded-xl border border-[#B8935A]/40 bg-white/70 p-4 dark:bg-[#0e1c15]/60">
          {authorityContext && <><p className={`text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${isUr ? "font-naskh" : ""}`}>{officialDateLabel}</p><p className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{formatDate(authorityContext.hijri, "hijri", lang)}</p></>}
          <p className={`mt-3 text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{pakistanPrediction.criterion.qualifies ? t.pakistanPass : t.pakistanFail}</p>
          {authorityContext?.hijri.day === 29 && pakistanPrediction.criterion.qualifies && <p className={`mt-3 text-sm text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{isUr ? "اس سائنسی معیار کے مطابق اگلا دن آغازِ ماہ کے لیے موزوں ہے؛ حتمی سرکاری فیصلہ مرکزی رویتِ ہلال کمیٹی کا ہوگا۔" : "Under this scientific criterion, the next day qualifies for month start; the official decision remains with the Central Ruet-e-Hilal Committee."}</p>}
          <p className={`mt-4 rounded-lg bg-[#1A3A2A]/5 px-3 py-2 text-[12px] leading-relaxed text-[#3a6a4a] dark:bg-white/[0.05] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.pakistanDisclaimer}</p>
          <h3 className={`mt-5 text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.scientificDetails}</h3>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label={t.observer} value={observerDisplayName(pakistanPrediction.snapshot.observer, lang)} urdu={isUr} /><Detail label={t.evening} value={pakistanPrediction.observerLocalDate} numeric />
            <PakistanDetail label={t.altitude} value={`${pakistanPrediction.snapshot.altitudeDeg.toFixed(2)}°`} required="≥ 6.5°" pass={pakistanPrediction.criterion.altitudePasses} urdu={isUr} /><PakistanDetail label={t.width} value={`${pakistanPrediction.snapshot.widthArcMin.toFixed(3)} arcmin`} required="≥ 0.17 arcmin" pass={pakistanPrediction.criterion.widthPasses} urdu={isUr} />
            <PakistanDetail label={t.illumination} value={`${pakistanPrediction.snapshot.illuminationPercent.toFixed(2)}%`} required="≥ 0.8%" pass={pakistanPrediction.snapshot.illuminationPercent >= 0.8} urdu={isUr} /><PakistanDetail label={t.elongation} value={`${pakistanPrediction.snapshot.elongationDeg.toFixed(2)}°`} required="≥ 9°" pass={pakistanPrediction.snapshot.elongationDeg >= 9} urdu={isUr} />
            <PakistanDetail label={t.illuminationOrElongation} value={pakistanPrediction.criterion.illuminationOrElongationPasses ? (isUr ? "پورا اترتا ہے" : "Pass") : (isUr ? "پورا نہیں اترتا" : "Fail")} required="illumination ≥ 0.8% OR elongation ≥ 9°" pass={pakistanPrediction.criterion.illuminationOrElongationPasses} urdu={isUr} />
            <PakistanDetail label={t.lag} value={`${pakistanPrediction.snapshot.lagMinutes.toFixed(1)} min`} required="≥ 38 min" pass={pakistanPrediction.criterion.lagPasses} urdu={isUr} /><Detail label={t.provenance} value={t.pakistan} urdu={isUr} />
          </div>
        </div> : <><p className={`mt-4 text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.pakistanDisclaimer}</p></>)}
      </>}
    </section>
  );
}

function PakistanDetail({ label, value, required, pass, urdu }: { label: string; value: string; required: string; pass: boolean; urdu: boolean }) {
  const state = urdu ? (pass ? "پورا اترتا ہے" : "پورا نہیں اترتا") : (pass ? "Pass" : "Fail");
  return <div><p className={`text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${urdu ? "font-naskh" : ""}`}>{label}</p><p className="mt-0.5 font-bold text-[#1A3A2A] dark:text-[#e8ede9]" dir="ltr">{value}</p><p className={`text-[11px] ${pass ? "text-[#3a6a4a]" : "text-[#9a4b35]"}`} dir={urdu ? undefined : "ltr"}>{`${required} · ${state}`}</p></div>;
}

function Detail({ label, value, numeric, urdu }: { label: string; value: string; numeric?: boolean; urdu?: boolean }) {
  return <div className={numeric ? "" : "col-span-2"}><p className={`text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${urdu ? "font-naskh" : ""}`}>{label}</p><p className={`mt-0.5 font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${urdu ? "font-naskh" : ""}`} dir={numeric ? "ltr" : undefined}>{value}</p></div>;
}
