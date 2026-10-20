import type { Metadata } from "next";
import QualityCheckerContent from "./QualityCheckerContent";

export const metadata: Metadata = {
  title: "Find Mistakes in Urdu Text | اردو متن میں غلطیاں دیکھیں | Qalam Works",
  description: "Find Mistakes in Urdu Text: inspect spacing, punctuation and script issues without changing your text. اردو متن میں غلطیاں دیکھیں: متن بدلے بغیر فاصلے، رموزِ اوقاف اور رسم الخط کے مسائل معلوم کریں۔",
  alternates: { canonical: "/tools/quality-checker" },
};

export default function QualityCheckerPage() {
  return <QualityCheckerContent />;
}
