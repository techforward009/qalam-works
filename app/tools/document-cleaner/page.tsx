import type { Metadata } from "next";
import DocumentCleanerContent from "./DocumentCleanerContent";

export const metadata: Metadata = {
  title: "Document Cleaner for Urdu Files | Qalam Works",
  description:
    "Upload .txt or .docx files for automated Unicode normalization and publication quality audit — free document cleaning for Urdu text.",
  alternates: {
    canonical: "/tools/document-cleaner",
  },
};

export default function DocumentCleanerPage() {
  return <DocumentCleanerContent />;
}
