import type { Metadata } from "next";
import PrivacyContent from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy — Qalam Works",
  description: "Privacy policy for Qalam Works tools and services.",
  alternates: { canonical: "https://www.qalamworks.com/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
