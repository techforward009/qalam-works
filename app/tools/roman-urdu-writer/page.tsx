import type { Metadata } from "next";
import RomanUrduWriterClient from "./RomanUrduWriterClient";

export const metadata: Metadata = {
  title: "Roman Urdu Typing | Qalam Works",
  description:
    "A Roman Urdu converter and writing assistant. Type in Roman Urdu, review uncertain words, then copy, export TXT, format for WhatsApp, or continue in Qalam Page: Urdu Editor.",
  alternates: { canonical: "/tools/roman-urdu-writer" },
};

export default function RomanUrduWriterPage() {
  return <RomanUrduWriterClient />;
}
