import type { Metadata } from "next";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact — Qalam Works",
  description: "Contact Qalam Works for translation, editing, proofreading, or publishing services.",
  alternates: { canonical: "https://qalamworks.com/contact" },
};

export default function ContactPage() {
  return <ContactContent />;
}
