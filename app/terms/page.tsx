import type { Metadata } from "next";
import TermsContent from "./TermsContent";

export const metadata: Metadata = {
  title: "Terms of Use — Qalam Works",
  description: "Terms of use for Qalam Works tools and services.",
  alternates: { canonical: "https://qalamworks.com/terms" },
};

export default function TermsPage() {
  return <TermsContent />;
}
