import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
export function CalendarLinksCard({profile}:{profile:DateProfile}) {
 return <section className="rounded-xl border p-5">
  <h2 className="font-semibold">Related Calendars</h2>
  {profile.relatedCalendarLinks.map(x=><a className="block underline" key={x.href} href={x.href}>{x.label}</a>)}
 </section>;
}
