import type { Metadata } from "next";
import MadinahReader from "../../MadinahReader";
import {surahTitle} from "../../../reader/metadata";

export async function generateMetadata({ params }: { params: Promise<{ surah: string; ayah: string }> }): Promise<Metadata> {
  const { surah, ayah } = await params;
  return { title: `${surahTitle(Number(surah))} ${ayah} — Madinah Mushaf Quran | Qalam Works` };
}

export default async function MadinahAyahPage({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const { surah, ayah } = await params;
  return <MadinahReader surah={Number(surah)} ayah={Number(ayah)} />;
}

export async function generateStaticParams() { return []; }
export const revalidate = 86400;
