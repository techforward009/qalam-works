import type { Metadata } from "next";
import ServicesContent from "./ServicesContent";

export const metadata: Metadata = {
  title: "Services — Qalam Works",
  description: "Professional Urdu translation, proofreading, editing, and document formatting services.",
  alternates: { canonical: "https://qalamworks.com/services" },
};

export default function ServicesPage() {
  return <ServicesContent />;
}
