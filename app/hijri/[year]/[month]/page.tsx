import { notFound } from "next/navigation";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";
import { HijriMonthCalendar, type HijriMonthDay } from "@/app/components/date-studio/HijriMonthCalendar";
import { HIJRI_MONTHS_EN, HIJRI_MONTHS_UR, convert, isoDate } from "@/app/tools/date-converter/utils/dateEngine";

function getHijriMonthDays(year: number, month: number): HijriMonthDay[] {
  const days: HijriMonthDay[] = [];
  for (let day = 1; day <= 30; day++) {
    const result = convert("hijri", { year, month, day });
    if (result.hijri.year !== year || result.hijri.month !== month || result.hijri.day !== day) continue;
    days.push({ hijriDay: day, gregorian: result.gregorian, gregorianIso: isoDate(result.gregorian) });
  }
  return days;
}

export default async function HijriMonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params;
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y <= 0 || !Number.isInteger(m) || m < 1 || m > 12) notFound();

  const days = getHijriMonthDays(y, m);
  if (!days.length) notFound();

  const previousMonth = m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 };
  const nextMonth = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };
  const gregorianStart = days[0].gregorian;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <DateStudioRouteNav
        previousHref={`/hijri/${previousMonth.year}/${previousMonth.month}`}
        nextHref={`/hijri/${nextMonth.year}/${nextMonth.month}`}
        periodLabel={{ en: `${HIJRI_MONTHS_EN[m - 1]} ${y}`, ur: `${HIJRI_MONTHS_UR[m - 1]} ${y}` }}
        currentCalendar="hijri"
        counterpartHref={`/calendar/${gregorianStart.year}/${gregorianStart.month}`}
        counterpartLabel={{ en: "Explore Gregorian month", ur: "عیسوی مہینہ دیکھیں" }}
      />
      <HijriMonthCalendar year={y} month={m} days={days} />
    </main>
  );
}
