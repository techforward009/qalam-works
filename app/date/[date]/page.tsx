import { notFound } from "next/navigation";
import Link from "next/link";
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
  const officialDate = profile.pakistanOfficialHijri?.hijri;
  const shownDate = officialDate ?? profile.hijri;
  return {
    title: `${formatGregorianDate(parsed)} | ${formatHijriDate(shownDate)} | Qalam Works Date Studio`,
    description: officialDate
      ? `${formatGregorianDate(parsed)} corresponds to ${formatHijriDate(officialDate)} in the Pakistan Hijri calendar.`
      : `${formatGregorianDate(parsed)} corresponds to ${formatHijriDate(profile.hijri)} in Qalam's calculated tabular calendar.`,
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
      <section className="mb-5 rounded-2xl border border-[#1A3A2A]/10 bg-[#F7F5EF] p-5 text-right dark:border-[#35513d] dark:bg-[#1b2c20]" dir="rtl">
        <p className="text-sm font-semibold text-[#7A5528] dark:text-[#D3B274]">قلم ورکس — ڈیٹ اسٹوڈیو</p>
        <h1 className="mt-2 text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9]">پاکستانی ہجری تاریخ اور مکمل تفصیلات</h1>
        <p className="mt-2 text-sm leading-8 text-[#38543f] dark:text-[#c8e1cf]">
          یہاں آپ منتخب تاریخ کی پاکستانی ہجری تاریخ، اصل ماخذ اور متعلقہ معلومات دیکھ سکتے ہیں۔
          ڈیٹ اسٹوڈیو میں دوسری تاریخ تلاش کریں، عیسوی اور ہجری تاریخیں تبدیل کریں اور نتائج کاپی یا شیئر کریں۔
        </p>
        <Link href="/tools/date-converter"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#1A3A2A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#28513a] dark:bg-[#326044]">
          ڈیٹ اسٹوڈیو کھولیں ←
        </Link>
      </section>
      <DateProfileCard profile={profile} events={getDateEvents(parsed)} />
    </main>
  );
}
