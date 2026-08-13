import type { Metadata } from "next";
import UnicodeStandardizerContent from "./UnicodeStandardizerContent";

export const metadata: Metadata = {
  title: "Urdu Unicode Standardizer | Qalam Works",
  description:
    "Normalize Urdu letter forms (Arabic yeh→Urdu yeh, Arabic kaf→Urdu kaf), spacing, and punctuation. Urdu-specific — for Arabic or English cleanup use Document Cleaner.",
  alternates: { canonical: "/tools/unicode-standardizer" },
};

export default function UnicodeStandardizerPage() {
  return <UnicodeStandardizerContent />;
}
