import { notFound } from "next/navigation";
import { DateProfileCard } from "@/app/components/date-studio/DateProfileCard";
import { getDateEvents } from "@/app/tools/date-converter/utils/dateEvents";
import { buildDateProfile, formatGregorianDate, formatHijriDate } from "@/app/tools/date-converter/utils/dateProfile";
import { gregorianMonthLength } from "@/app/tools/date-converter/utils/dateEngine";

function parseValidDate(value: string) {
  const p = value.split("-").map(Number);
  if (p.length !== 3 || p.some(Number.isNaN)) return null;
  const [year, month, day] = p;
  if (month < 1 || month > 12 || day < 1 || day > gregorianMonthLength(month, year)) return null;
  return { year, month, day };
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const parsed = parseValidDate((await params).date);
  if (!parsed) return { title: "Date Studio | Qalam Works" };
  const profile = buildDateProfile(parsed);
  return {
    title: `${formatGregorianDate(parsed)} | ${formatHijriDate(profile.hijri)} | Qalam Works Date Studio`,
    description: `${formatGregorianDate(parsed)} corresponds to ${formatHijriDate(profile.hijri)} in Qalam Works Date Studio.`,
  };
}

export default async function DateProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams?: Promise<{ countryId?: string }>;
}) {
  const { date } = await params;
  const parsed = parseValidDate(date);
  if (!parsed) notFound();

  const countryId = searchParams ? (await searchParams)?.countryId : undefined;
  const profile = buildDateProfile(parsed, countryId);

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <DateProfileCard profile={profile} events={getDateEvents(parsed)} />
    </main>
  );
}
