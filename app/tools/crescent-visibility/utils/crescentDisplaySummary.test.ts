import { describe, expect, it } from "vitest";
import {
  formatReferenceSiteCount,
  getReferenceSiteConditionWording,
  getFollowingCardEvening,
} from "./crescentDisplaySummary";

describe("crescent reference-site wording", () => {
  it.each([
    [8, "تمام مقامات پر حالات موافق ہیں", "Conditions are favorable at all sites"],
    [4, "بعض مقامات پر حالات موافق ہیں", "Conditions are favorable at some sites"],
    [2, "بعض مقامات پر حالات موافق ہیں", "Conditions are favorable at some sites"],
    [0, "کسی مقام پر حالات موافق نہیں", "Conditions are unfavorable at all sites"],
  ])("uses the actual count %i/8 in both model summaries", (count, urdu, english) => {
    expect(getReferenceSiteConditionWording(count, 8, "ur")).toBe(urdu);
    expect(getReferenceSiteConditionWording(count, 8, "en")).toBe(english);
  });

  it("uses Western digits in Urdu for every nonzero count and spells out zero", () => {
    expect(formatReferenceSiteCount(8, 8, "ur")).toBe("8 از 8 مقامات");
    expect(formatReferenceSiteCount(4, 8, "ur")).toBe("4 از 8 مقامات");
    expect(formatReferenceSiteCount(2, 8, "ur")).toBe("2 از 8 مقامات");
    expect(formatReferenceSiteCount(0, 8, "ur")).toBe("صفر مقامات");
    expect(formatReferenceSiteCount(8, 8, "en")).toBe("8/8 locations");
  });

  it("only identifies the following evening when a displayed month-card date is one day earlier", () => {
    expect(getFollowingCardEvening("2026-11-11", ["2026-11-10", "2026-12-10"])).toBe("2026-11-10");
    expect(getFollowingCardEvening("2026-11-10", ["2026-11-10"])).toBeNull();
    expect(getFollowingCardEvening("2026-11-12", ["2026-11-10"])).toBeNull();
    expect(getFollowingCardEvening("2027-01-01", ["2026-12-31"])).toBe("2026-12-31");
    expect(getFollowingCardEvening("2026-11-11", [])).toBeNull();
  });
});
