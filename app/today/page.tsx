import { redirect } from "next/navigation";
import { pakistanDate } from "../lib/pakistanDate";

// Resolve on every request so a cached build never redirects to yesterday.
export const dynamic = "force-dynamic";

export default function TodayPage() {
  redirect(`/date/${pakistanDate().iso}`);
}
