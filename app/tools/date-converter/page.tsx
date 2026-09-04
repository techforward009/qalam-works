import type { Metadata } from "next";
import DateConverterContent from "./DateConverterContent";

export const metadata: Metadata = {
  title: "Date Converter | Qalam Works",
  description:
    "Convert dates between Gregorian, Hijri, and Solar Hijri calendars. عیسوی، ہجری قمری اور ہجری شمسی تاریخوں کو باہم تبدیل کریں۔",
  alternates: { canonical: "/tools/date-converter" },
};

export default async function DateConverterPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const requestedMode = searchParams ? (await searchParams)?.mode : undefined;
  const initialMode = requestedMode === "find" ? "find" : "convert";
  return <DateConverterContent initialMode={initialMode} />;
}
