import { notFound } from "next/navigation";
import { CalendarExplorer } from "@/app/components/date-studio/CalendarExplorer";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";
import { buildCalendarYearModel, parseCalendarYearInput } from "@/app/tools/calendar-maker/utils/calendarModel";
import { convert, isGregorianLeap } from "@/app/tools/date-converter/utils/dateEngine";

export default async function CalendarYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const parsed = parseCalendarYearInput(year);
  if (!parsed) notFound();

  const model = buildCalendarYearModel({
    year: parsed,
    content: "gregorian",
    language: "en",
    weekStart: "sunday",
    page: "a4-portrait",
  });
  const hijriStart = convert("gregorian", { year: parsed, month: 1, day: 1 }).hijri;

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <DateStudioRouteNav
        previousHref={`/calendar/${parsed - 1}`}
        nextHref={`/calendar/${parsed + 1}`}
        periodLabel={String(parsed)}
        counterpartHref={`/hijri/${hijriStart.year}`}
        counterpartLabel={{ en: "Explore Hijri year", ur: "ہجری سال دیکھیں" }}
      />
      <p className="mb-4 text-sm text-[#4a6a4a] dark:text-[#a8c8b0]">{isGregorianLeap(parsed) ? "Leap year" : "Common year"}</p>
      <CalendarExplorer model={model} />
    </main>
  );
}
