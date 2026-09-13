"use client";

import { useMemo } from "react";
import { PAKISTAN_YALLOP_OBSERVERS, yallopObserver } from "../utils/yallop/observerLocations";
import { evaluateDateStudioYallopPrediction, type DateStudioYallopPrediction } from "../utils/yallop/dateStudioPrediction";
import type { DateParts } from "../utils/dateEngine";
import type { YallopObserver } from "../utils/yallop/types";
import { interpretDateStudioMonthStart, type HijriDayAuthority } from "../utils/yallop/dateStudioMonthStart";
import type { ResolvedHijriDate } from "../utils/hijri-authority/types";

type Language = "en" | "ur";
export type DateStudioMethod = "qalam" | "yallop";

const COPY = {
  en: {
    method: "Calculation method", qalam: "Current Qalam Method", yallop: "Yallop Crescent Visibility",
    observer: "Observer location", evening: "Evaluation evening", visibility: "Visibility class",
    q: "q value", monthStart: "Next-day month-start policy",
    qualifies: "This evening qualifies for next-day month start under current Qalam v1 policy", doesNotQualify: "This evening does not qualify; the current Hijri month completes 30 days.", forcedNextMonth: "The current Hijri month has completed 30 days; the next day is necessarily the first day of the next Hijri month.", qalamQualifies: "According to the Qalam calculated Hijri date, this evening qualifies for next-day month start under current Qalam v1 policy.", qalamDoesNotQualify: "According to the Qalam calculated Hijri date, this evening does not qualify; the current calculated Hijri month completes 30 days.", qalamForcedNextMonth: "According to the Qalam calculated Hijri date, the current month is on day 30, so the next calculated Hijri day is the first of the next month.",
    prediction: "Astronomical crescent-visibility prediction", provenance: "Method", provenanceValue: "Yallop Crescent Visibility — NAO Technical Note 69",
    disclaimer: "Astronomical crescent-visibility prediction; not an official moon-sighting declaration.",
    unavailable: "A Yallop prediction is unavailable for this evaluation evening.",
    authority: "Pakistan Hijri date context", reportedAuthority: "Reported official Pakistan Hijri date",
  },
  ur: {
    method: "حساب کا طریقہ", qalam: "موجودہ قلم طریقہ", yallop: "یالوپ رؤیتِ ہلال",
    observer: "مقامِ مشاہدہ", evening: "جانچ کی شام", visibility: "رؤیت کی درجہ بندی",
    q: "q قدر", monthStart: "اگلے دن کے آغازِ ماہ کی پالیسی",
    qualifies: "یہ شام موجودہ قلم v1 پالیسی کے تحت اگلے دن کے آغازِ ماہ کے لیے موزوں ہے", doesNotQualify: "یہ شام موزوں نہیں؛ موجودہ ہجری مہینہ 30 دن مکمل کرے گا۔", forcedNextMonth: "موجودہ ہجری مہینہ 30 دن مکمل کر چکا ہے؛ اگلا دن لازماً اگلے ہجری مہینے کا پہلا دن ہے۔", qalamQualifies: "قلم کی حسابی قمری تاریخ کے مطابق یہ شام موجودہ قلم v1 پالیسی کے تحت اگلے دن کے آغازِ ماہ کے لیے موزوں ہے۔", qalamDoesNotQualify: "قلم کی حسابی قمری تاریخ کے مطابق یہ شام موزوں نہیں؛ موجودہ حسابی ہجری مہینہ 30 دن مکمل کرے گا۔", qalamForcedNextMonth: "قلم کی حسابی قمری تاریخ کے مطابق موجودہ مہینے کی آج 30 تاریخ ہے، اس لیے اگلی حسابی قمری تاریخ نئے مہینے کی پہلی ہوگی۔",
    prediction: "فلکیاتی رؤیتِ ہلال کی پیش گوئی", provenance: "طریقہ", provenanceValue: "یالوپ رؤیتِ ہلال — این اے او ٹیکنیکل نوٹ 69",
    disclaimer: "یہ رؤیتِ ہلال کی فلکیاتی پیش گوئی ہے، سرکاری رویتِ ہلال کا اعلان نہیں۔",
    unavailable: "اس جانچ کی شام کے لیے یالوپ پیش گوئی دستیاب نہیں۔",
    authority: "پاکستانی ہجری تاریخ کا حوالہ", reportedAuthority: "رپورٹ شدہ سرکاری پاکستانی ہجری تاریخ",
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
  const monthStart = prediction?.status === "evaluated"
    ? interpretDateStudioMonthStart(hijriDay, prediction.acceptedByPolicy, hijriDayAuthority)
    : null;
  const monthStartCopy = monthStart?.state === "day29_qualifies" ? (monthStart.authority === "qalam-tabular" ? t.qalamQualifies : t.qualifies)
    : monthStart?.state === "day29_does_not_qualify" ? (monthStart.authority === "qalam-tabular" ? t.qalamDoesNotQualify : t.doesNotQualify)
    : monthStart?.state === "day30_forced_next_month" ? (monthStart.authority === "qalam-tabular" ? t.qalamForcedNextMonth : t.forcedNextMonth) : null;

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
          <h2 className={`text-sm font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-naskh" : ""}`}>{t.prediction}</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label={t.observer} value={observerDisplayName(prediction.snapshot.observer, lang)} urdu={isUr} />
            <Detail label={t.evening} value={prediction.observerLocalDate} numeric />
            <Detail label={t.visibility} value={prediction.criterion.visibilityClass} numeric />
            <Detail label={t.q} value={prediction.criterion.q.toFixed(3)} numeric />
            {monthStartCopy && <Detail label={t.monthStart} value={monthStartCopy} urdu={isUr} />}
            {authorityContext && <Detail label={authorityContext.authority === "reported-official" ? t.reportedAuthority : t.authority} value={`${authorityContext.hijri.day}/${authorityContext.hijri.month}/${authorityContext.hijri.year} — ${authorityContext.providerLabel[lang]}`} urdu={isUr} />}
            <Detail label={t.provenance} value={t.provenanceValue} urdu={isUr} />
          </div>
        </div> : <p className={`mt-4 text-sm text-[#4a6a4a] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.unavailable}</p>)}
        {prediction && <p className={`mt-4 rounded-lg bg-[#1A3A2A]/5 px-3 py-2 text-[12px] leading-relaxed text-[#3a6a4a] dark:bg-white/[0.05] dark:text-[#a8c8b0] ${isUr ? "font-naskh" : ""}`}>{t.disclaimer}</p>}
      </>}
    </section>
  );
}

function Detail({ label, value, numeric, urdu }: { label: string; value: string; numeric?: boolean; urdu?: boolean }) {
  return <div className={numeric ? "" : "col-span-2"}><p className={`text-[11px] font-semibold text-[#4a7a5a] dark:text-[#8faa93] ${urdu ? "font-naskh" : ""}`}>{label}</p><p className={`mt-0.5 font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${urdu ? "font-naskh" : ""}`} dir={numeric ? "ltr" : undefined}>{value}</p></div>;
}
