import type { Metadata } from "next";
import ArabicDiacriticsContent from "./ArabicDiacriticsContent";

export const metadata: Metadata = {
  title: "Arabic Diacritics — Indo-Pakistani Tashkeel | Qalam Works",
  description:
    "Fully vocalize plain Arabic in an Indo-Pakistani publishing style, including harakat, shadda, sukun, tanwin, and contextual final case endings.",
  alternates: { canonical: "/tools/arabic-diacritics" },
};


export default function ArabicDiacriticsPage() {
  return <ArabicDiacriticsContent />;
}
