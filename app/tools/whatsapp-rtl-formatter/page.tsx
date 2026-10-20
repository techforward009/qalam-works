import type { Metadata } from "next";
import WhatsAppRtlFormatterContent from "./WhatsAppRtlFormatterContent";

export const metadata: Metadata = {
  title: "Urdu for WhatsApp | واٹس ایپ کے لیے اردو | Qalam Works",
  description: "Urdu for WhatsApp: format Urdu and mixed text, numbered lists, links and English words for cleaner copy-paste. واٹس ایپ کے لیے اردو: اردو اور مخلوط متن، فہرستوں اور روابط کی ترتیب بہتر بنائیں اور نقل کریں۔",
  alternates: {
    canonical: "/tools/whatsapp-rtl-formatter",
  },
  openGraph: {
    title: "Urdu for WhatsApp | واٹس ایپ کے لیے اردو | Qalam Works",
    description: "Urdu for WhatsApp: format Urdu and mixed text, numbered lists, links and English words for cleaner copy-paste. واٹس ایپ کے لیے اردو: اردو اور مخلوط متن، فہرستوں اور روابط کی ترتیب بہتر بنائیں اور نقل کریں۔",
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
