import type { Metadata } from "next";
import RomanUrduWriterClient from "./RomanUrduWriterClient";

export const metadata: Metadata = {
  title: "Roman Urdu to Urdu | رومن اردو سے اردو | Qalam Works",
  description: "Roman Urdu to Urdu: type in Roman Urdu, review suggestions, and copy or export your Urdu text. رومن اردو سے اردو: رومن میں لکھیں، تجاویز دیکھیں اور اردو متن نقل یا محفوظ کریں۔",
  alternates: { canonical: "/tools/roman-urdu-writer" },
};

export default function RomanUrduWriterPage() {
  return <RomanUrduWriterClient />;
}
