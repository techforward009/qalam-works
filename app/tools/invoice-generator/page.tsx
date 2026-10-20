import type { Metadata } from "next";
import InvoiceGeneratorContent from "./InvoiceGeneratorContent";

export const metadata: Metadata = {
  title: "Invoice Maker | انوائس بنائیں | Qalam Works",
  description: "Invoice Maker: create free invoices for Pakistan in Urdu or English, in PKR or other currencies, and download a PDF. No sign-up required. انوائس بنائیں: اردو یا انگریزی میں پاکستانی روپے یا دوسری کرنسی کی انوائس تیار کریں اور پی ڈی ایف حاصل کریں۔",
  alternates: {
    canonical: "/tools/invoice-generator",
  },
};

export default function InvoiceGeneratorPage() {
  const application = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Qalam Works Invoice Maker",
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
