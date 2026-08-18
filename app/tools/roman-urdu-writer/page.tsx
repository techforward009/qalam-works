import type { Metadata } from "next";
import RomanUrduWriterClient from "./RomanUrduWriterClient";

export const metadata: Metadata = {
  title: "Urdu Writer — Roman to Urdu Script | Qalam Works",
  description:
    "Type naturally in Roman Urdu and see the Urdu script instantly. Preserves URLs, numbers, English words, and names. Copy the result in one click.",
  alternates: { canonical: "/tools/roman-urdu-writer" },
};

export default function RomanUrduWriterPage() {
  return <RomanUrduWriterClient />;
}
