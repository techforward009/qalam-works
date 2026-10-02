import type { Metadata } from "next";
import KhateebStudioContent from "./KhateebStudioContent";
import { parseKhateebStudioView } from "./engine/studioView";

export const metadata: Metadata = {
  title: "Khateeb Studio | Qalam Works",
  description: "Explore Shi'a calendar occasions and a curated khateeb source index for sermon research.",
  alternates: { canonical: "/tools/khateeb-studio" },
};

export default async function KhateebStudioPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = searchParams ? await searchParams : {};
  return <KhateebStudioContent initialView={parseKhateebStudioView(raw)} />;
}
