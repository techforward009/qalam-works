import type { Metadata } from "next";
import DigitalKhattReader from "../../DigitalKhattReader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surah: string; ayah: string }>;
}): Promise<Metadata> {
  const { surah, ayah } = await params;
  return { title: "IndoPak Digital Khatt " + surah + ":" + ayah + " — Qalam Works" };
}

export default async function DigitalKhattAyahPage({
  params,
}: {
  params: Promise<{ surah: string; ayah: string }>;
}) {
  const { surah, ayah } = await params;
  return <DigitalKhattReader surah={Number(surah)} ayah={Number(ayah)} />;
}
