import { describe, expect, it } from "vitest";
import { RABI_AL_THANI_1448_EVENTS } from "../shiaCalendar";

function visibleForRegion(region: "all" | "pk" | "in" | "ir") {
  if (region === "all") return [...RABI_AL_THANI_1448_EVENTS];
  return RABI_AL_THANI_1448_EVENTS.filter((event) => {
    if (!event.regions?.length) return true;
    return event.regions.includes("all") || event.regions.includes(region);
  });
}

describe("Khateeb Studio regional calendar filter", () => {
  it("keeps regionless occasions visible in every region", () => {
    const general = RABI_AL_THANI_1448_EVENTS.filter((event) => !event.regions?.length);
    expect(visibleForRegion("pk").length).toBeGreaterThanOrEqual(general.length);
    expect(visibleForRegion("in").length).toBe(general.length);
    expect(visibleForRegion("ir").length).toBe(general.length);
  });

  it("shows Pakistan-specific records in the Pakistan view", () => {
    const pkSpecific = RABI_AL_THANI_1448_EVENTS.filter((event) => event.regions?.includes("pk"));
    expect(pkSpecific.length).toBeGreaterThan(0);
    expect(visibleForRegion("pk")).toEqual(
      expect.arrayContaining(pkSpecific),
    );
  });

  it("does not leak Pakistan-only records into India or Iran", () => {
    const pkOnlyIds = RABI_AL_THANI_1448_EVENTS
      .filter((event) => event.regions?.includes("pk"))
      .map((event) => event.id);

    expect(visibleForRegion("in").some((event) => pkOnlyIds.includes(event.id))).toBe(false);
    expect(visibleForRegion("ir").some((event) => pkOnlyIds.includes(event.id))).toBe(false);
  });
});
