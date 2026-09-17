import type { Metadata } from "next";
import UrduTextToPdfContent from "./UrduTextToPdfContent";

export const metadata: Metadata = {
  title: "Urdu Text to PDF Converter Online | Qalam Works",
  description:
    "Write or paste Urdu text, format it with RTL and Nastaliq support, and download a clean PDF. اردو متن سے خوب صورت PDF بنائیں۔",
  alternates: { canonical: "/tools/urdu-text-to-pdf" },
};

export default function UrduTextToPdfPage() {
  return <UrduTextToPdfContent />;
}
