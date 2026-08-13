import type { Metadata } from "next";
import QualityCheckerContent from "./QualityCheckerContent";

export const metadata: Metadata = {
  title: "Quality Audit — Text Quality Checker | Qalam Works",
  description:
    "Inspect text for spacing, punctuation, and script issues without changing it. Supports Urdu, English, Arabic, and safe Auto audit modes.",
  alternates: { canonical: "/tools/quality-checker" },
};

export default function QualityCheckerPage() {
  return <QualityCheckerContent />;
}
