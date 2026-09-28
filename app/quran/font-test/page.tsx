import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FontComparison from "./FontComparison";

export const metadata: Metadata = {
  title: "Quran font comparison",
  robots: { index: false, follow: false },
};

export default function QuranFontTestPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FontComparison />;
}
