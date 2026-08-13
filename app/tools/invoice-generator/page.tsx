import type { Metadata } from "next";
import InvoiceGeneratorContent from "./InvoiceGeneratorContent";

export const metadata: Metadata = {
  title: "Invoice Generator | Qalam Works",
  description:
    "Create a clean, professional invoice in your browser and save it as a PDF — free, no sign-up required.",
  alternates: {
    canonical: "/tools/invoice-generator",
  },
};

export default function InvoiceGeneratorPage() {
  return <InvoiceGeneratorContent />;
}
