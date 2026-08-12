import type { Metadata } from "next";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "About — Qalam Works",
  description: "Qalam Works is a professional digital workspace for Urdu writing, editing, and publication preparation.",
  alternates: { canonical: "https://qalamworks.com/about" },
};

export default function AboutPage() {
  return <AboutContent />;
}
