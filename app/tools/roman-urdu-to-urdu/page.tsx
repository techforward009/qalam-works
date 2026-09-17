import type { Metadata } from "next";
import RomanUrduToUrduContent from "./RomanUrduToUrduContent";

export const metadata: Metadata = {
  title: "Roman Urdu to Urdu Converter Online | Qalam Works",
  description:
    "Convert Roman Urdu into Urdu script, review uncertain words, and copy or continue editing the result. رومن اردو کو اردو رسم الخط میں تبدیل کریں۔",
  alternates: { canonical: "/tools/roman-urdu-to-urdu" },
};

export default function RomanUrduToUrduPage() {
  return <RomanUrduToUrduContent />;
}
