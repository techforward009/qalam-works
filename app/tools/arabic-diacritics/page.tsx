import type { Metadata } from "next";
import ArabicDiacriticsContent from "./ArabicDiacriticsContent";

export const metadata: Metadata = {
  title: "Arabic Diacritics — Indo-Pakistani Tashkeel | Qalam Works",
  description:
    "Add Indo-Pakistani publishing diacritics to plain Arabic. Unknown words stay unchanged. Not Urdu diacritization and not newspaper tashkeel.",
  alternates: { canonical: "/tools/arabic-diacritics" },
};

export default function ArabicDiacriticsPage() {
  return <ArabicDiacriticsContent />;
}
