import { notFound, redirect } from "next/navigation";
import { getReaderAyah } from "../reader/model";

export default async function QuranSurahPage({
  params,
}: {
  params: Promise<{ surah: string }>;
}) {
  const { surah } = await params;
  const number = Number(surah);
  if (!/^(?:[1-9]|[1-9][0-9]|1[01][0-9]|11[0-4])$/.test(surah) || !Number.isInteger(number) || !getReaderAyah(number, 1)) {
    notFound();
  }
  redirect(`/quran/${number}/1`);
}
