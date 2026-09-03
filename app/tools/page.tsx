import type { Metadata } from "next";
import AllToolsContent from "./AllToolsContent";

export const metadata: Metadata = {
  title: "All Tools — Qalam Works | تمام ٹولز",
  description:
    "Every Qalam Works tool in one place: Document Studio, Translation Studio, Urdu Text Cleaner, Roman Urdu converter, Unicode Fixer, Quality Check, WhatsApp Formatter, Invoice Generator, Date Converter, and Calendar Maker.",
  alternates: { canonical: "/tools" },
};

export default function AllToolsPage() {
  return <AllToolsContent />;
}
