import type { Metadata } from "next";
import HijriToGregorianContent from "./HijriToGregorianContent";

export const metadata: Metadata = {
  title: "Hijri to Gregorian Date Converter | Qalam Works",
  description:
    "Convert a Hijri date to its Gregorian equivalent with weekday and date details. ہجری تاریخ کو عیسوی تاریخ میں تبدیل کریں۔",
  alternates: { canonical: "/tools/hijri-to-gregorian" },
};

export default function HijriToGregorianPage() {
  return <HijriToGregorianContent />;
}
