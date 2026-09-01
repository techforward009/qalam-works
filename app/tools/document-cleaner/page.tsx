import type { Metadata } from "next";
import DocumentCleanerContent from "./DocumentCleanerContent";

export const metadata: Metadata = {
  title: "Urdu Text Cleaner — Document Cleaner | Qalam Works",
  description:
    "An Urdu text cleaner for safe cleanup, normalization, and formatting. Language-aware spacing and punctuation, English-safe cleanup, Arabic preservation, and conservative Auto mode. Paste text or upload .txt/.docx in your browser.",
  alternates: { canonical: "/tools/document-cleaner" },
};

export default function DocumentCleanerPage() {
  return <DocumentCleanerContent />;
}
