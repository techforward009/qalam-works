import { notFound } from "next/navigation";
import { DateStudioRouteNav } from "@/app/components/date-studio/DateStudioRouteNav";
import { HijriYearDashboard, type HijriYearMonthSummary } from "@/app/components/date-studio/HijriYearDashboard";
import { convert } from "@/app/tools/date-converter/utils/dateEngine";

function isSupportedHijriYear(year: number) {
  if (!Number.isInteger(year) || year <= 0) return false;
  try {
    return Boolean(convert("hijri", { year, month: 1, day: 1 }).gregorian);
  } catch {
    return false;
  }
}

function hijriMonthDays(year: number, month: number) {
  const candidate = convert("hijri", { year, month, day: 30 });
  return candidate.hijri.year === year && candidate.hijri.month === month && candidate.hijri.day === 30 ? 30 : 29;
}

export default async function HijriYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const y = Number(year);
  if (!isSupportedHijriYear(y)) notFound();

  const months: HijriYearMonthSummary[] = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const days = hijriMonthDays(y, month);
    return {
      month,
      days,
      start: convert("hijri", { year: y, month, day: 1 }).gregorian,
      end: convert("hijri", { year: y, month, day: days }).gregorian,
    };
  });

  const gregorianStart = months[0].start;

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <DateStudioRouteNav
        previousHref={`/hijri/${y - 1}`}
        nextHref={`/hijri/${y + 1}`}
        periodLabel={{ en: `${y} AH`, ur: `${y} ھ` }}
        counterpartHref={`/calendar/${gregorianStart.year}`}
        counterpartLabel={{ en: "Explore Gregorian year", ur: "عیسوی سال دیکھیں" }}
      />
      <HijriYearDashboard year={y} months={months} />
    </main>
  );
}
