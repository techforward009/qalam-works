import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
export function DateFactsCard({profile}:{profile:DateProfile}) {
 return <section className="rounded-xl border p-5">
 <h2 className="font-semibold">Facts</h2>
 <p>Weekday: {profile.weekday.en} / {profile.weekday.ur}</p>
 <p>Leap year: {String(profile.leapYear)}</p>
 <p>Day of year: {profile.dayOfYear}</p>
 <p>ISO week: {profile.isoWeek}</p>
 <p>JDN: {profile.julianDayNumber}</p>
 </section>
}
