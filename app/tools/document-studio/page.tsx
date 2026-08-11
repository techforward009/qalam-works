import type { Metadata } from "next";
import DocumentStudioContent from "./DocumentStudioContent";

export const metadata: Metadata = {
  title: "Document Studio | Qalam Works",
  description:
    "A professional writing and editing workspace built for Urdu — with live quality feedback, Unicode standardization, and DOCX/PDF export.",
  alternates: {
    canonical: "/tools/document-studio",
  },
};

export default function DocumentStudioPage() {
  return <DocumentStudioContent />;
}
