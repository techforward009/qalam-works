import type { OfficialHijriMonthAnchor } from "../../date-converter/utils/hijri-authority/types";

export function NationalEvidencePanel({ decision, lang }: { decision: OfficialHijriMonthAnchor | null; lang: "en" | "ur" }) {
  const ur = lang === "ur";
  return <section className="mt-4 rounded-xl border p-4" aria-label={ur ? "سرکاری تاریخی فیصلہ" : "Official historical decision"}>
    <h3 className="font-bold">{ur ? "سرکاری تاریخی فیصلہ" : "Official historical decision"}</h3>
    {decision ? <><p>{decision.sightingDecision === "sighted" ? (ur ? "سرکاری فیصلہ: ہلال نظر آگیا" : "Official decision: crescent sighted") : (ur ? "سرکاری فیصلہ: ہلال نظر نہیں آیا" : "Official decision: crescent not sighted")}</p><p className="text-sm">{decision.providerLabel[lang]} · {decision.sourceReference}</p></> : <p>{ur ? "اس شام کے لیے کوئی جائزہ شدہ سرکاری رویتِ ہلال فیصلہ دستیاب نہیں۔" : "No reviewed official moon-sighting decision is available for this evening."}</p>}
    <p className="mt-2 text-xs text-muted-foreground">{ur ? "یہ قومی ثبوت نقشے کے سائنسی نتائج یا مقامات کو تبدیل نہیں کرتا۔" : "This national evidence does not alter scientific map results or infer a sighting location."}</p>
  </section>;
}
