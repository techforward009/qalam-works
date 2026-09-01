import type { Metadata } from "next";
import UrduRomanWriterClient from "./UrduRomanWriterClient";

export const metadata: Metadata = {
  title: "Urdu to Roman Urdu Converter | Qalam Works",
  description:
    "Convert Urdu script to Roman Urdu with deterministic transliteration — not translation. Choose a Roman style and copy the result.",
};

export default function UrduRomanWriterPage() {
  return <UrduRomanWriterClient />;
}
