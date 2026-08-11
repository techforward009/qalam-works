import type { Metadata } from "next";
import UnicodeStandardizerContent from "./UnicodeStandardizerContent";

export const metadata: Metadata = {
  title: "Urdu Unicode Standardizer | Qalam Works",
  description:
    "Free tool to normalize Urdu text: fix mixed character variants (ي/ی, ك/ک), clean up spacing, and correct punctuation for publication-ready Unicode text.",
  alternates: {
    canonical: "/tools/unicode-standardizer",
  },
};

export default function UnicodeStandardizerPage() {
  return <UnicodeStandardizerContent />;
}
