import type { Metadata } from "next";
import WhatsAppRtlFormatterContent from "./WhatsAppRtlFormatterContent";

export const metadata: Metadata = {
  title: "WhatsApp RTL Formatter | Qalam Works",
  description:
    "Format Urdu and mixed RTL/LTR text for cleaner WhatsApp copy-paste, including numbered lists, bullets, English words, numbers and links.",
  alternates: {
    canonical: "/tools/whatsapp-rtl-formatter",
  },
  openGraph: {
    title: "WhatsApp RTL Formatter | Qalam Works",
    description:
      "Format Urdu and mixed RTL/LTR text for cleaner WhatsApp copy-paste, including numbered lists, bullets, English words, numbers and links.",
    url: "/tools/whatsapp-rtl-formatter",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function WhatsAppRtlFormatterPage() {
  return <WhatsAppRtlFormatterContent />;
}
