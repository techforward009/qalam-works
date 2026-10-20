import type { Metadata } from "next";
import AllToolsContent from "./AllToolsContent";

export const metadata: Metadata = {
  title: "All Tools — Qalam Works | تمام ٹولز",
  description:
    "Explore Qalam Page: Urdu Editor, Roman Urdu to Urdu, Fix Copied Urdu Text, Find Mistakes in Urdu Text, Urdu for WhatsApp, Invoice Maker, Date Converter, Moon Sighting and more. لکھنے، اردو متن درست کرنے، تاریخوں اور دیگر سہولتوں کے تمام اوزار ایک جگہ۔",
  alternates: { canonical: "/tools" },
};

export default function AllToolsPage() {
  return <AllToolsContent />;
}
