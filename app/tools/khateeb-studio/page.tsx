import type { Metadata } from "next";
import KhateebStudioContent from "./KhateebStudioContent";

export const metadata: Metadata = {
  title: "Khateeb Studio | Qalam Works",
  description: "Explore Shi'a calendar occasions and a curated khateeb source index for sermon research.",
  alternates: { canonical: "/tools/khateeb-studio" },
};

export default function KhateebStudioPage() {
  return <KhateebStudioContent />;
}
