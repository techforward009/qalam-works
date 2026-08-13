import type { Metadata } from "next";
import DocumentStudioContent from "./DocumentStudioContent";

export const metadata: Metadata = {
  title: "Document Studio — Multilingual Text Editing | Qalam Works",
  description:
    "Professional text editing and cleanup for Urdu, English, and Arabic, with safe Auto mode for uncertain RTL script, quality checks, and DOCX/PDF export. Rules-based — not a translation or AI tool.",
  alternates: {
    canonical: "/tools/document-studio",
  },
};

export default function DocumentStudioPage() {
  return <DocumentStudioContent />;
}
