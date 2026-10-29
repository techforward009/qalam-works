"use client";

import { useLanguage } from "@/app/lib/language-context";
import type { DateEvent } from "@/app/tools/date-converter/utils/dateEvents";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
import { SOLAR_MONTHS_EN, SOLAR_MONTHS_UR } from "@/app/tools/date-converter/utils/dateEngine";
import { PakistanDateResult } from "@/app/tools/date-converter/components/PakistanDateResult";
import { resolveDisplayHijriDate } from "@/app/tools/date-converter/utils/hijri-authority/displayHijriDate";
import { CalendarLinksCard } from "./CalendarLinksCard";
import { DateFactsCard } from "./DateFactsCard";
import { HistoricalContext } from "./HistoricalContext";
import { RegionalContextCard } from "./RegionalContextCard";

const COPY = {
  en: {
    status: "Date status", today: "Today",
    future: (days: number) => `In ${days} days`,
    ago: "ago", years: "years", months: "months", days: "days",
    secondary: "Other calendar details and date context",
    solar: "Solar Hijri (calculated)",
  },
  ur: {
    status: "تاریخ کی کیفیت", today: "آج",
    future: (days: number) => `${days} دن بعد`,
    ago: "پہلے", years: "سال", months: "ماہ", days: "دن",
    secondary: "دیگر تقاویم اور تاریخ کی تفصیلات",
    solar: "ہجری شمسی (حسابی)",
  },
};

export function DateProfileCard({ profile, events = [] }: {
  profile: DateProfile;
  events?: DateEvent[];
}) {
  const { language, dir } = useLanguage();
  const lang = language as "en" | "ur";
  const t = COPY[lang];
  const isUr = lang === "ur";
  const naskh = isUr ? "font-naskh" : "";
  const official = profile.pakistanOfficialHijri;
  const display = resolveDisplayHijriDate(profile.gregorian);
  const primaryHijri = display.hijri;

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

  const solar = profile.solar
    ? `${profile.solar.day} ${(isUr ? SOLAR_MONTHS_UR : SOLAR_MONTHS_EN)[profile.solar.month-1]} ${profile.solar.year}`
    : "—";

  return (
    <div className="space-y-5" dir={dir}>
      <PakistanDateResult
        gregorian={profile.gregorian}
        hijri={primaryHijri}
        reviewed={official ?? null}
        source={display.source === "scientific" ? "scientific" : "tabular"}
        weekday={profile.weekday[lang]}
        lang={lang}
      />

      <details className="rounded-2xl border border-[#1A3A2A]/10 bg-white p-5 dark:border-[#2a3d30] dark:bg-[#162a1e]">
        <summary className={`cursor-pointer text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>
          {t.secondary}
        </summary>
        <div className="mt-4 space-y-4">
          <section className="rounded-xl bg-[#F7F5EF] p-4 dark:bg-[#1b2c20]">
            <p className={`text-xs font-semibold text-[#7A5528] dark:text-[#D3B274] ${naskh}`}>{t.status}</p>
            <p className={`mt-1 text-lg font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${naskh}`}>{status}</p>
          </section>
          <p className={`text-sm text-[#4a6a4a] dark:text-[#b8d4bc] ${naskh}`}>{t.solar}: {solar}</p>
          <DateFactsCard profile={profile} />
          <RegionalContextCard profile={profile} />
        </div>
      </details>

      <HistoricalContext events={events} />
      <CalendarLinksCard profile={profile} />
    </div>
  );
}
