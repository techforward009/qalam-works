import type { Metadata } from "next";
import DocumentCleanerContent from "./DocumentCleanerContent";

export const metadata: Metadata = {
  title: "Document Cleaner — Urdu, English & Arabic Text Cleanup | Qalam Works",
  description:
    "Paste text or upload .txt/.docx for language-aware cleanup: Urdu normalization, English-safe spacing, Arabic orthography preservation, and safe Auto mode. Runs in your browser.",
  alternates: { canonical: "/tools/document-cleaner" },
};

export default function DocumentCleanerPage() {
  return <DocumentCleanerContent />;
}
