"use client";

import { useSearchParams } from "next/navigation";
import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
import type { DateEvent } from "@/app/tools/date-converter/utils/dateEvents";
import { resolveRegionalHijriReference } from "@/app/tools/date-converter/utils/regionalDateEvidence";
import { DateProfileCard } from "./DateProfileCard";

/** Country context belongs to the visitor, never to the shared ISR response. */
export function DateProfileClient({ profile, events }: { profile: DateProfile; events: DateEvent[] }) {
  const countryId = useSearchParams().get("countryId");
  const regionalReference = countryId ? resolveRegionalHijriReference(countryId, profile.hijri) : null;
  return <DateProfileCard profile={{ ...profile, regionalReference }} events={events} />;
}
