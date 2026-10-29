import { convert, type DateParts } from "../dateEngine";
import { resolvePakistanOfficialHijriDate } from "./resolveOfficialHijriDate";
import { predictPakistanHijriDate } from "./pakistanScientificHijriDate";

/** Calendar UI policy, not a change to the deterministic conversion engine. */
export type DisplayHijriPolicy = "pakistan" | "tabular";
export type DisplayHijriResult = {
  hijri: DateParts;
  source: "official" | "reported-official" | "scientific" | "tabular";
  sourceUrl?: string;
};

/** One date presentation policy shared by day, month and year views. */
export function resolveDisplayHijriDate(
  gregorian: DateParts,
  policy: DisplayHijriPolicy = "pakistan",
): DisplayHijriResult {
  if (policy === "pakistan") {
    const official = resolvePakistanOfficialHijriDate(gregorian);
    if (official) return {
      hijri: official.hijri,
      source: official.authority,
      sourceUrl: official.sourceUrl,
    };
    const scientific = predictPakistanHijriDate(gregorian);
    if (scientific) return { hijri: scientific, source: "scientific" };
  }
  return { hijri: convert("gregorian", gregorian).hijri, source: "tabular" };
}
