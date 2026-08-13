import type { Metadata } from "next";
import DocumentCleanerContent from "./DocumentCleanerContent";

export const metadata: Metadata = {
  title: "Document Cleaner | Qalam Works",
  description:
    "Clean Urdu, English, or Arabic text from a file or by pasting. Language-aware spacing and Unicode cleanup runs in your browser.",
  alternates: {
    canonical: "/tools/document-cleaner",
  },
};

export default function DocumentCleanerPage() {
  return <DocumentCleanerContent />;
}
