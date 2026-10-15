import { describe, expect, it } from "vitest";
import { COUNTRY_CALENDARS, COUNTRY_MAP, methodLabel } from "../app/tools/date-converter/utils/countryCalendars";
import { resolvePakistanOfficialHijriDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";

describe("country-specific lunar method integrity", () => {
  it("lists all requested countries with method evidence, not a fake universal lunar conversion", () => {
    expect(COUNTRY_CALENDARS.map(c => c.id)).toContain("iq");
    for (const id of ["pk", "in", "af", "ir", "iq"]) {
      const item = COUNTRY_MAP.get(id);
      expect(item).toBeDefined();
      expect(item?.methodSource?.url).toMatch(/^https:\/\//);
      expect(item?.hijriNote.ur.length).toBeGreaterThan(35);
    }
  });
  it("does not mistake Afghan government lunar declarations for a Solar-Hijri-only civil rule", () => {
    expect(COUNTRY_MAP.get("af")?.hijriMethod).toBe("observational");
    expect(COUNTRY_MAP.get("af")?.officialNote?.en).toContain("official correspondence");
  });
  it("treats Indian regions and Iraqi marja decisions as non-universal country dates", () => {
    expect(COUNTRY_MAP.get("in")?.hijriMethod).toBe("observational-varying");
    expect(COUNTRY_MAP.get("iq")?.hijriMethod).toBe("observational-varying");
    expect(COUNTRY_MAP.get("iq")?.hijriNote.ur).toContain("سیستانی");
    expect(methodLabel("observational-varying", "ur")).toContain("متغیر");
  });
  it("preserves distinct Iranian Solar-Hijri civil and Pakistani lunar observation methods", () => {
    expect(COUNTRY_MAP.get("ir")?.hijriMethod).toBe("solar-hijri-civil");
    expect(COUNTRY_MAP.get("pk")?.hijriMethod).toBe("observational");
    expect(resolvePakistanOfficialHijriDate({year:2026,month:2,day:28})?.hijri)
      .toEqual({year:1447,month:9,day:10});
  });
});
