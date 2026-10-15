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
      <section
        dir="rtl"
        aria-labelledby="date-studio-intro-title"
        className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-[#cbb78f]/50 bg-gradient-to-bl from-[#fbf8ed] via-[#fffdf8] to-[#f4eee0] px-5 py-7 shadow-[0_8px_30px_rgba(43,58,36,0.07)] sm:px-10 sm:py-9 dark:border-[#536446]/50 dark:from-[#203929] dark:via-[#192e22] dark:to-[#15271d]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full border border-[#c9ad74]/20 sm:h-64 sm:w-64" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full border border-[#c9ad74]/20" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-3 flex items-center justify-center gap-3 text-[#8a6a33] dark:text-[#d8bd83]">
            <span aria-hidden="true" className="h-px w-9 bg-current opacity-50" />
            <span className="font-naskh text-sm font-semibold tracking-normal">قلم ورکس  ·  ڈیٹ اسٹوڈیو</span>
            <span aria-hidden="true" className="h-px w-9 bg-current opacity-50" />
          </div>
          <h1 id="date-studio-intro-title" className="font-nastaliq mx-auto max-w-2xl text-[clamp(1.4rem,3.5vw,2.1rem)] font-bold leading-[2.3] text-[#183d2b] dark:text-[#f4f1e8]">
            پاکستانی ہجری تاریخ اور مکمل تفصیلات
          </h1>
          <div aria-hidden="true" className="mx-auto mt-1 h-0.5 w-16 rounded-full bg-[#b58e4d]/70" />
          <p className="font-nastaliq mx-auto mt-4 max-w-2xl text-[clamp(0.95rem,2vw,1.12rem)] leading-[2.7] text-[#465f4c] dark:text-[#d0dfd1]">
            منتخب تاریخ کی پاکستانی ہجری تاریخ، مستند حوالہ اور متعلقہ معلومات یہاں دیکھیے۔
            مزید تاریخیں تلاش کرنے، عیسوی و ہجری تاریخیں تبدیل کرنے اور نتائج دوسروں تک پہنچانے کے لیے ڈیٹ اسٹوڈیو استعمال کیجیے۔
          </p>
          <Link
            href="/tools/date-converter"
            className="font-naskh mt-5 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#1c4933] px-7 py-2.5 text-base font-semibold text-white shadow-[0_4px_14px_rgba(28,73,51,0.18)] transition-colors hover:bg-[#276144] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b58e4d] dark:bg-[#cfb47a] dark:text-[#1b3022] dark:hover:bg-[#dfc793]"
          >
            <span>ڈیٹ اسٹوڈیو کھولیں</span>
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </section>
      <DateProfileCard profile={profile} events={getDateEvents(parsed)} />
    </main>
  );
}
