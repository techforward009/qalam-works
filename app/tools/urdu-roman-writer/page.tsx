import type { Metadata } from "next";
import UrduRomanWriterClient from "./UrduRomanWriterClient";

export const metadata: Metadata = {
  title: "Urdu to Roman Converter | Qalam Works",
  description: "Convert Urdu script to Roman Urdu — deterministic transliteration, not translation.",
};

export default function UrduRomanWriterPage() {
  return <UrduRomanWriterClient />;
}
