import type { Metadata } from "next";
import RomanUrduWriterClient from "./RomanUrduWriterClient";

export const metadata: Metadata = {
  title: "Roman Urdu Writer | رومن اردو رائٹر | Qalam Works",
  description:
    "Roman Urdu Writer: Type in Roman Urdu, review suggestions, and copy or export Urdu text. This tool converts Roman Urdu typing into Urdu script; it does not translate English text. رومن اردو لکھیں، تجاویز دیکھیں اور اردو متن نقل یا محفوظ کریں۔",
  alternates: { canonical: "/tools/roman-urdu-writer" },
};

export default function RomanUrduWriterPage() {
  return <RomanUrduWriterClient />;
}
