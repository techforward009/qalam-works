import { Suspense } from "react";
import { DateProfileClient } from "@/app/components/date-studio/DateProfileClient";
import { notFound } from "next/navigation";
import { DateStudioNav } from "@/app/components/date-studio/DateStudioNav";
import { DateProfileCard } from "@/app/components/date-studio/DateProfileCard";
import { getDateEvents } from "@/app/tools/date-converter/utils/dateEvents";
import { buildDateProfile, formatGregorianDate, formatHijriDate } from "@/app/tools/date-converter/utils/dateProfile";
import { gregorianMonthLength } from "@/app/tools/date-converter/utils/dateEngine";

export const revalidate = 86400;
export async function generateStaticParams() { return []; }

function parseValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const p = value.split("-").map(Number);
  if (p.length !== 3 || p.some(Number.isNaN)) return null;
  const [year, month, day] = p;
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > gregorianMonthLength(month, year)) return null;
  return { year, month, day };
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const parsed = parseValidDate((await params).date);
  if (!parsed) return { title: "Date Studio | Qalam Works" };
  const profile = buildDateProfile(parsed);
  const officialDate = profile.pakistanOfficialHijri?.hijri;
  const shownDate = officialDate ?? profile.hijri;
  return {
    robots: { index: true, follow: false },
    title: `${formatGregorianDate(parsed)} | ${formatHijriDate(shownDate)} | Qalam Works Date Studio`,
    description: officialDate
      ? `${formatGregorianDate(parsed)} corresponds to ${formatHijriDate(officialDate)} in the Pakistan Hijri calendar.`
      : `${formatGregorianDate(parsed)} corresponds to ${formatHijriDate(profile.hijri)} in Qalam's calculated tabular calendar.`,
  };
}

export default async function DateProfilePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const parsed = parseValidDate(date);
  if (!parsed) notFound();

  const profile = buildDateProfile(parsed);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <DateStudioNav />
      <Suspense fallback={<DateProfileCard profile={profile} events={getDateEvents(parsed)} />}>
        <DateProfileClient profile={profile} events={getDateEvents(parsed)} />
      </Suspense>
    </main>
  );
}
