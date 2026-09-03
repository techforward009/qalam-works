import type { Metadata } from "next";
import CalendarMakerContent from "./CalendarMakerContent";

export const metadata: Metadata = {
  title: "Calendar Maker — Annual Gregorian & Hijri Calendar | Qalam Works",
  description:
    "Create and download a clean annual Gregorian calendar with an optional calculated Hijri date overlay, English or Urdu labels, Sunday or Monday week start, and A4 PDF export.",
  alternates: { canonical: "/tools/calendar-maker" },
};

export default function CalendarMakerPage() {
  return <CalendarMakerContent />;
}
