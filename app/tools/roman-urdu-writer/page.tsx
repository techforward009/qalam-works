import type { Metadata } from "next";
import RomanUrduWriterClient from "./RomanUrduWriterClient";

export const metadata: Metadata = {
  title: "Roman Urdu Writer | رومن اردو رائٹر | Qalam Works",
  description:
    "Roman Urdu Writer: type in Roman Urdu, review suggestions, and copy or export your Urdu text. Not a translator. رومن اردو رائٹر: رومن میں لکھیں، تجاویز دیکھیں اور اردو متن نقل یا محفوظ کریں۔ ترجمہ نہیں۔",
  alternates: { canonical: "/tools/roman-urdu-writer" },
};

export default function RomanUrduWriterPage() {
  return <RomanUrduWriterClient />;
}
