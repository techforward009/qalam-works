import type { Metadata } from "next";
import DocumentStudioEditor from "./components/DocumentStudioEditor";

export const metadata: Metadata = {
  title: "Document Studio (Beta) | Qalam Works",
  description:
    "A multilingual rich text editor for Urdu, Arabic, Persian, and mixed RTL/LTR writing — early preview.",
  alternates: {
    canonical: "/tools/document-studio",
  },
};

export default function DocumentStudioPage() {
  return (
    <main className="py-10 md:py-14">
      <section className="max-w-3xl mx-auto px-4 text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-900 font-nastaliq mb-2">
          ڈاکومنٹ اسٹوڈیو
        </h1>
        <p className="text-lg md:text-xl font-semibold text-gray-800 mb-3">
          Document Studio
          <span className="ml-2 text-xs align-middle bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            Beta
          </span>
        </p>
        <p className="text-sm md:text-base text-gray-600" dir="ltr">
          A multilingual rich text editor for Urdu, Arabic, Persian, and mixed RTL/LTR
          writing. This is an early foundation — publishing checks and export are coming soon.
        </p>
      </section>

      <div className="mb-14">
        <DocumentStudioEditor />
      </div>
    </main>
  );
}
