import type { Metadata } from "next";
import DocumentStudioEditor from "./components/DocumentStudioEditor";

export const metadata: Metadata = {
  title: "Document Studio | Qalam Works",
  description:
    "A professional writing and editing workspace built for Urdu — with live quality feedback, Unicode standardization, and DOCX/PDF export.",
  alternates: {
    canonical: "/tools/document-studio",
  },
};

export default function DocumentStudioPage() {
  return (
    <main className="py-6 md:py-8">
      {/* Document Studio layout redesign (2026-08-10): the previous
          full hero-style intro (large heading + paragraph, ~10 units of
          vertical space) pushed the actual editor below the fold and
          made the tool feel secondary to its own description. This is
          now a single compact header line — the editor itself is the
          page's main content. */}
      <div className="max-w-[1200px] mx-auto px-4 mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-nastaliq text-xl text-amber-900">ڈاکومنٹ اسٹوڈیو</h1>
        <p className="text-xs text-gray-500" dir="ltr">
          A writing workspace built for Urdu — quality checks, Unicode standardization, DOCX/PDF export.
        </p>
      </div>

      <DocumentStudioEditor />
    </main>
  );
}
