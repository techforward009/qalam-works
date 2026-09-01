import type { Metadata } from "next";
import UnicodeStandardizerContent from "./UnicodeStandardizerContent";

export const metadata: Metadata = {
  title: "Urdu Unicode Fixer — Standardizer | Qalam Works",
  description:
    "An Urdu Unicode fixer for letter-form correction, spacing, and punctuation. Normalize Arabic yeh and kaf toward standard Urdu characters. For Arabic or English cleanup, use Document Cleaner.",
  alternates: { canonical: "/tools/unicode-standardizer" },
};

export default function UnicodeStandardizerPage() {
  return <UnicodeStandardizerContent />;
}
