import type { Metadata } from "next";
import DateConverterContent from "./DateConverterContent";

export const metadata: Metadata = {
  title: "Date Converter: Gregorian, Hijri & Solar Hijri | Qalam Works",
  description:
    "Convert Gregorian, Hijri, and Solar Hijri dates online. Find a Gregorian date from a Hijri day and month, and check Pakistan's reviewed Hijri date when available.",
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
