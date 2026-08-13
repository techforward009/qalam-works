import type { Metadata } from "next";
import DocumentStudioContent from "./DocumentStudioContent";

export const metadata: Metadata = {
  title: "Document Studio — Multilingual Text Editing | Qalam Works",
  description:
    "Write, edit, clean, and review documents with Urdu, English, Arabic, or safe Auto processing. Quality checks and DOCX/PDF export. Rules-based editing workspace — not a translator.",
  alternates: { canonical: "/tools/document-studio" },
};

export default function DocumentStudioPage() {
  return <DocumentStudioContent />;
}
