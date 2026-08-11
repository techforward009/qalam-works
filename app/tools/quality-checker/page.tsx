import type { Metadata } from "next";
import QualityCheckerContent from "./QualityCheckerContent";

export const metadata: Metadata = {
  title: "Publication Quality Checker for Urdu | Qalam Works",
  description:
    "Free tool to audit Urdu text before publication: detect extra spacing, mixed punctuation, repeated words, and mixed scripts.",
  alternates: {
    canonical: "/tools/quality-checker",
  },
};

export default function QualityCheckerPage() {
  return <QualityCheckerContent />;
}
