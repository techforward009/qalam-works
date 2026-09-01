import type { Metadata } from "next";
import QualityCheckerContent from "./QualityCheckerContent";

export const metadata: Metadata = {
  title: "Urdu Proofreading — Quality Audit | Qalam Works",
  description:
    "Urdu proofreading support that checks punctuation and text quality without changing your document. Inspect spacing, punctuation, and script issues in Urdu, English, or Arabic, including safe Auto mode.",
  alternates: { canonical: "/tools/quality-checker" },
};

export default function QualityCheckerPage() {
  return <QualityCheckerContent />;
}
