import { describe, expect, it } from "vitest";
import { getDateEvents } from "../app/tools/date-converter/utils/dateEvents";

describe("Date Event Model", () => {
  it("matches exact month and day", () => {
    const events = getDateEvents({ year: 2025, month: 1, day: 1 });
    expect(events.length).toBeGreaterThan(0);
  });

  it("matches year-specific events only for matching year", () => {
    expect(getDateEvents({ year: 2026, month: 5, day: 5 }).length).toBe(1);
    expect(getDateEvents({ year: 2025, month: 5, day: 5 })).toEqual([]);
  });

  it("supports year-independent events", () => {
    expect(getDateEvents({ year: 2030, month: 1, day: 1 }).length).toBeGreaterThan(0);
  });

  it("returns empty state when no events exist", () => {
    expect(getDateEvents({ year: 2030, month: 8, day: 20 })).toEqual([]);
  });

  it("keeps multilingual fields", () => {
    const event = getDateEvents({ year: 2030, month: 1, day: 1 })[0];
    expect(event.title.en).toBeTruthy();
    expect(event.title.ur).toBeTruthy();
  });
});
