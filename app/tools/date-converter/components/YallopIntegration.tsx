"use client";

import { useMemo } from "react";
import { PAKISTAN_YALLOP_OBSERVERS, yallopObserver } from "../utils/yallop/observerLocations";
import { evaluateDateStudioYallopPrediction, type DateStudioYallopPrediction } from "../utils/yallop/dateStudioPrediction";
import { formatDate, type DateParts } from "../utils/dateEngine";
import type { YallopObserver } from "../utils/yallop/types";
import { interpretDateStudioMonthStart, type HijriDayAuthority } from "../utils/yallop/dateStudioMonthStart";
import type { ResolvedHijriDate } from "../utils/hijri-authority/types";

type Language = "en" | "ur";
export type DateStudioMethod = "qalam" | "yallop";

const COPY = {
  en: {
    method: "Calculation method", qalam: "Current Qalam Method", yallop: "Yallop Crescent Visibility",
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
  },
  ur: {
    method: "حساب کا طریقہ", qalam: "موجودہ قلم طریقہ", yallop: "یالوپ رؤیتِ ہلال",
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
  },
} as const;

const URDU_OBSERVER_NAMES: Record<string, string> = {
  karachi: "کراچی", hyderabad: "حیدرآباد", lahore: "لاہور", rawalpindi: "راولپنڈی",
  multan: "ملتان", islamabad: "اسلام آباد", peshawar: "پشاور", quetta: "کوئٹہ",
  muzaffarabad: "مظفرآباد", gilgit: "گلگت", skardu: "سکردو",
};

function observerDisplayName(observer: YallopObserver, lang: Language): string {
  return lang === "ur" ? URDU_OBSERVER_NAMES[observer.id] ?? observer.name : observer.name;
}

export function YallopIntegration({
  lang, method, onMethodChange, observerId, onObserverChange, gregorian, hijriDay, hijriDayAuthority, authorityContext, predict,
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
  predict?: (gregorian: DateParts, observer: YallopObserver) => DateStudioYallopPrediction;
}) {
  const t = COPY[lang];
  const isUr = lang === "ur";
  const observer = yallopObserver(observerId) ?? yallopObserver("karachi")!;
  const prediction = useMemo(
    () => method === "yallop" && gregorian ? (predict ?? evaluateDateStudioYallopPrediction)(gregorian, observer) : null,
    [method, gregorian?.year, gregorian?.month, gregorian?.day, observer, predict],
  );
  const monthStart = prediction?.status === "evaluated" && authorityContext
    ? interpretDateStudioMonthStart(hijriDay, prediction.acceptedByPolicy, hijriDayAuthority)
    : null;
  const officialDateLabel = authorityContext?.authority === "reported-official" ? t.reportedOfficialDate : t.officialDate;

  return (
    <section className="mb-5 rounded-2xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-[#F7F5EF] dark:bg-[#162a1e] p-5 sm:p-6" dir={isUr ? "rtl" : "ltr"}>
      <label className={`block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] uppercase tracking-wide mb-2 ${isUr ? "font-naskh" : ""}`}>
        {t.method}
      </label>
      <select aria-label={t.method} value={method} onChange={(event) => onMethodChange(event.target.value as DateStudioMethod)} className={`w-full rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>
        <option value="qalam">{t.qalam}</option>
        <option value="yallop">{t.yallop}</option>
      </select>

      {method === "yallop" && <>
        <label className={`mt-4 block text-[12px] font-bold text-[#3a6a4a] dark:text-[#b8d4bc] mb-2 ${isUr ? "font-naskh" : ""}`}>
          {t.observer}
        </label>
        <select aria-label={t.observer} value={observer.id} onChange={(event) => onObserverChange(event.target.value)} className={`w-full rounded-lg border border-[#1A3A2A]/15 bg-white px-3 py-2.5 text-sm dark:border-[#2a3d30] dark:bg-[#0e1c15] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>
          {PAKISTAN_YALLOP_OBSERVERS.map((place) => <option key={place.id} value={place.id}>{observerDisplayName(place, lang)}</option>)}
        </select>

        {prediction && (prediction.status === "evaluated" ? <div className="mt-4 rounded-xl border border-[#B8935A]/40 bg-white/70 p-4 dark:bg-[#0e1c15]/60">
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
      </>}
    </section>
  );
}

function Detail({ label, value, numeric, urdu }: { label: string; value: string; numeric?: boolean; urdu?: boolean }) {
  return <div className={numeric ? "" : "col-span-2"}><p className={`text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${urdu ? "font-naskh" : ""}`}>{label}</p><p className={`mt-0.5 font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${urdu ? "font-naskh" : ""}`} dir={numeric ? "ltr" : undefined}>{value}</p></div>;
}
