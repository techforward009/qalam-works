import type { Metadata } from "next";
import InvoiceGeneratorContent from "./InvoiceGeneratorContent";

export const metadata: Metadata = {
  title: "Free Invoice Generator Pakistan | انوائس جنریٹر | Qalam Works",
  description:
    "Create invoices for Pakistan in PKR or other currencies, in Urdu or English. Download a clean PDF with this free invoice generator. No sign-up required.",
  alternates: {
    canonical: "/tools/invoice-generator",
  },
};

export default function InvoiceGeneratorPage() {
  const application = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Qalam Works Invoice Generator",
    url: "https://www.qalamworks.com/tools/invoice-generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    inLanguage: ["en", "ur"],
    description: "Create Urdu or English invoices in PKR or other currencies with business and client details, line items, tax, discounts, logos and signatures. Preview and download as PDF.",
  };
  return (
    <>
      <script
        id="invoice-generator-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(application).replace(/</g, "\\u003c") }}
      />
      <InvoiceGeneratorContent />
    </>
  );
}
