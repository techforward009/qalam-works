import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuranReader from "../../QuranReader";
import { surahTitle } from "../../reader/metadata";
import { getReaderAyah } from "../../reader/model";

export async function generateMetadata({ params }: { params: Promise<{ surah: string; ayah: string }> }): Promise<Metadata> {
  const { surah, ayah } = await params;
  const found = getReaderAyah(Number(surah), Number(ayah));
  if (!found) return { title: "Quran" };
  return { title: `${surahTitle(found.surah)} ${found.ayah} — Qalam Works` };
}

export default async function QuranAyahPage({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const { surah, ayah } = await params;
  const surahNumber = Number(surah);
  const ayahNumber = Number(ayah);
  if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber) || !getReaderAyah(surahNumber, ayahNumber)) notFound();
  return <QuranReader surah={surahNumber} ayah={ayahNumber} />;
}
