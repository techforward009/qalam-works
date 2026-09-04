import type { DateProfile } from "@/app/tools/date-converter/utils/dateProfile";
import { gregorianToJDN } from "@/app/tools/date-converter/utils/dateEngine";

const HIJRI_MONTHS = [
  "", "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah",
];

function formatHijri(profile: DateProfile) {
  return `${profile.hijri.day} ${HIJRI_MONTHS[profile.hijri.month]} ${profile.hijri.year} AH`;
}

function formatGregorian(date: { year: number; month: number; day: number }) {
  return `${date.day}-${date.month}-${date.year}`;
}

function formatDifference(profile: DateProfile) {
  const reference = profile.regionalReference?.gregorianDate;
  if (!reference) return "No verified difference available";

  const difference =
    gregorianToJDN(reference.year, reference.month, reference.day) -
    gregorianToJDN(profile.gregorian.year, profile.gregorian.month, profile.gregorian.day);

  return `${Math.abs(difference)} day${Math.abs(difference) === 1 ? "" : "s"}`;
}

export function RegionalContextCard({ profile }: { profile: DateProfile }) {
  const r = profile.regionalReference;

  return (
    <section className="rounded-xl border p-5 space-y-2">
      <h2 className="font-semibold">Regional Context</h2>

      <p>Calculated result: {formatHijri(profile)}</p>

      <p>
        Regional reference:{" "}
        {r
          ? `${formatGregorian(r.gregorianDate)} (${r.sourceLabel.en})`
          : "No verified regional reference"}
      </p>

      <p>Difference: {r ? formatDifference(profile) : "No verified difference available"}</p>

      <p>Confidence: {r?.confidence ?? "None"}</p>
    </section>
  );
}
