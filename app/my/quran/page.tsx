import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasOwnerSession } from "../../lib/ownerQuranAuth";
import { ahmedgrafQuranReference } from "../../tools/arabic-diacritics/quran/ahmedgrafProvider";
import { SURAH_NAMES } from "../../quran/reader/metadata";
import PrivateQuranReader from "./PrivateQuranReader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ذاتی قرآن — قلم ورکس",
  robots: {index:false,follow:false,nocache:true},
};
export default async function PrivateQuranPage({
  searchParams,
}: {searchParams: Promise<{surah?: string}>}) {
  if (!await hasOwnerSession()) notFound();
  const input = (await searchParams).surah ?? "1";
  if (!/^\d{1,3}$/.test(input)) notFound();
  const surah = Number(input);
  if (surah < 1 || surah > 114) notFound();
  const verses = ahmedgrafQuranReference.listAyahs()
    .filter(row => row.surah === surah)
    .map(row => ({ayah:row.ayah, text:row.text}));
  if (verses.length === 0) notFound();
  return <PrivateQuranReader surah={surah} surahNames={[...SURAH_NAMES]} verses={verses}/>;
}
