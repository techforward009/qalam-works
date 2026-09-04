
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
import { formatGregorianDate, formatHijriDate, formatSolarDate } from "@/app/tools/date-converter/utils/dateProfile";
import { DateFactsCard } from "./DateFactsCard";
import { CalendarLinksCard } from "./CalendarLinksCard";
import { RegionalContextCard } from "./RegionalContextCard";

export function DateProfileCard({profile}:{profile:DateProfile}) {
 const age = profile.age
  ? `${profile.age.years} years, ${profile.age.months} months, ${profile.age.days} days`
  : null;

 return <div className="space-y-5">
  <header className="rounded-xl border p-5">
   <h1 className="text-3xl font-bold">{formatGregorianDate(profile.gregorian)}</h1>
   <p>{profile.weekday.en}</p>
   <p dir="rtl">{profile.weekday.ur}</p>
  </header>
  <section className="rounded-xl border p-5">
   <h2 className="font-semibold">Calendar Conversions</h2>
   <p>Gregorian: {formatGregorianDate(profile.gregorian)}</p>
   <p>Hijri: {formatHijriDate(profile.hijri)}</p>
   <p>Solar Hijri: {formatSolarDate(profile.solar)}</p>
  </section>
  <DateFactsCard profile={profile}/>
  <section className="rounded-xl border p-5">
   <h2 className="font-semibold">Age</h2>
   {age ? <p>{age}</p> : <><p>Future date</p><p>{profile.elapsedDays} days remaining</p></>}
  </section>
  <RegionalContextCard profile={profile}/>
  <CalendarLinksCard profile={profile}/>
 </div>
}
