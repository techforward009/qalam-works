"use client";

import { useLanguage } from "@/app/lib/language-context";
import type { DateEvent } from "@/app/tools/date-converter/utils/dateEvents";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
import {
  GREGORIAN_MONTHS_EN,
  GREGORIAN_MONTHS_UR,
  HIJRI_MONTHS_EN,
  HIJRI_MONTHS_UR,
  SOLAR_MONTHS_EN,
  SOLAR_MONTHS_UR,
  type DateParts,
} from "@/app/tools/date-converter/utils/dateEngine";
import { CalendarLinksCard } from "./CalendarLinksCard";
import { DateFactsCard } from "./DateFactsCard";
import { HistoricalContext } from "./HistoricalContext";
import { RegionalContextCard } from "./RegionalContextCard";

const COPY = {
  en: {
    hijri: "Hijri",
    solar: "Solar Hijri",
    status: "Date status",
    today: "Today",
    future: (days: number) => `In ${days} days`,
    ago: "ago",
    years: "years",
    months: "months",
    days: "days",
  },
  ur: {
    hijri: "ہجری",
    solar: "ہجری شمسی",
    status: "تاریخ کی کیفیت",
    today: "آج",
    future: (days: number) => `${days} دن بعد`,
    ago: "پہلے",
    years: "سال",
    months: "ماہ",
    days: "دن",
  },
};

function formatGregorian(date: DateParts, lang: "en" | "ur") {
  const months = lang === "ur" ? GREGORIAN_MONTHS_UR : GREGORIAN_MONTHS_EN;
  return `${date.day} ${months[date.month - 1]} ${date.year}`;
}

function formatHijri(date: DateParts, lang: "en" | "ur") {
  const months = lang === "ur" ? HIJRI_MONTHS_UR : HIJRI_MONTHS_EN;
  return `${date.day} ${months[date.month - 1]} ${date.year}${lang === "ur" ? " ھ" : " AH"}`;
}

function formatSolar(date: DateParts | null, lang: "en" | "ur") {
  if (!date) return "—";
  const months = lang === "ur" ? SOLAR_MONTHS_UR : SOLAR_MONTHS_EN;
  return `${date.day} ${months[date.month - 1]} ${date.year}${lang === "ur" ? " ش" : " SH"}`;
}

export function DateProfileCard({
  profile,
  events = [],
}: {
  profile: DateProfile;
  events?: DateEvent[];
}) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const isUr = lang === "ur";
  const naskh = isUr ? "font-naskh" : "";

  let status: string;
  if (profile.futureState === "today") {
    status = t.today;
  } else if (profile.futureState === "future") {
    status = t.future(Math.abs(profile.elapsedDays));
  } else if (profile.age) {
    const parts = [
      profile.age.years ? `${profile.age.years} ${t.years}` : "",
      profile.age.months ? `${profile.age.months} ${t.months}` : "",
      profile.age.days ? `${profile.age.days} ${t.days}` : "",
    ].filter(Boolean);
    status = `${parts.join(", ")} ${t.ago}`;
  } else {
    status = `${Math.abs(profile.elapsedDays)} ${t.days} ${t.ago}`;
  }

  return (
    <div className="space-y-5" dir={dir}>
      <header className="overflow-hidden rounded-3xl border border-[#1A3A2A]/10 bg-[#1A3A2A] text-white shadow-md">
        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#B8935A]" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold leading-tight sm:text-4xl ${isUr ? "font-nastaliq font-normal" : ""}`}>
                {formatGregorian(profile.gregorian, lang)}
              </h1>
              <span className={`mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-[#F1DEC0] ${naskh}`}>
                {isUr ? profile.weekday.ur : profile.weekday.en}
              </span>
            </div>

            <div className="grid min-w-[240px] gap-2 sm:min-w-[310px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className={`text-xs font-bold text-[#D9BE8F] ${naskh}`}>{t.hijri}</p>
                <p className={`mt-1 text-lg font-bold ${naskh}`}>{formatHijri(profile.hijri, lang)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className={`text-xs font-bold text-[#D9BE8F] ${naskh}`}>{t.solar}</p>
                <p className={`mt-1 text-base font-semibold ${naskh}`}>{formatSolar(profile.solar, lang)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[#B8935A]/35 bg-[#F7F5EF] p-5 shadow-sm dark:bg-[#162a1e]">
        <p className={`text-xs font-bold uppercase tracking-wide text-[#7A5528] dark:text-[#D3B274] ${naskh}`}>{t.status}</p>
        <p className={`mt-1 text-2xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{status}</p>
      </section>

      <DateFactsCard profile={profile} />
      <RegionalContextCard profile={profile} />
      <HistoricalContext events={events} />
      <CalendarLinksCard profile={profile} />
    </div>
  );
}
