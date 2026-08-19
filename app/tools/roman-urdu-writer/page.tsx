import type { Metadata } from "next";
import RomanUrduWriterClient from "./RomanUrduWriterClient";

export const metadata: Metadata = {
  title: "Qalam Urdu Writer — Write Urdu from Roman | Qalam Works",
  description:
    "Write Urdu easily from Roman Urdu, with control over uncertain words. Review suggestions, copy, export TXT, WhatsApp-ready text, or continue in Document Studio.",
  alternates: { canonical: "/tools/roman-urdu-writer" },
};

export default function RomanUrduWriterPage() {
  return <RomanUrduWriterClient />;
}
