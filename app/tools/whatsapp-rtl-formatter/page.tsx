import type { Metadata } from "next";
import WhatsAppRtlFormatterContent from "./WhatsAppRtlFormatterContent";

export const metadata: Metadata = {
  title: "WhatsApp RTL Formatter | Qalam Works",
  description:
    "Prepare mixed Urdu and English text so it stays visually stable when pasted into WhatsApp. Isolates LTR fragments (PDF, numbers, URLs, emails) inside RTL paragraphs.",
  alternates: {
    canonical: "/tools/whatsapp-rtl-formatter",
  },
};

export default function WhatsAppRtlFormatterPage() {
  return <WhatsAppRtlFormatterContent />;
}
