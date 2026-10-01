import type { Metadata } from "next";
import MadinahReader from "../../MadinahReader";

export async function generateMetadata({ params }: { params: Promise<{ surah: string; ayah: string }> }): Promise<Metadata> {
  const { surah, ayah } = await params;
  return { title: `Madinah Mushaf ${surah}:${ayah} — Qalam Works` };
}

export default async function MadinahAyahPage({ params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const { surah, ayah } = await params;
  return <MadinahReader surah={Number(surah)} ayah={Number(ayah)} />;
}
