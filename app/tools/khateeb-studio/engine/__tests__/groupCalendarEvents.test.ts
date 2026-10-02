import { describe, expect, it } from "vitest";
import {
  groupCalendarEvents,
  type CalendarEventGroup,
} from "../groupCalendarEvents";
import { SHIA_CALENDAR_1448_EVENTS } from "../shiaCalendar";

describe("groupCalendarEvents", () => {
  it("groups duplicate source records into one visible occasion", () => {
    const rabiAlThaniAskari = SHIA_CALENDAR_1448_EVENTS.filter(
      (event) =>
        event.month === "rabi-al-thani" &&
        event.day === 10 &&
        event.title.includes("امام حسن عسکری"),
    );

    const groups = groupCalendarEvents(rabiAlThaniAskari);
    const target = groups.find(
      (group) => group.representative.day === 10,
    );

    expect(target).toBeDefined();
    expect(target?.items.length).toBeGreaterThan(1);
    expect(groups).toHaveLength(1);
  });

  it("keeps distinct occasions on the same date separate", () => {
    const events = SHIA_CALENDAR_1448_EVENTS.filter(
      (event) =>
        event.month === "rabi-al-thani" &&
        event.day === 10,
    );

    const groups = groupCalendarEvents(events);
    const titles = new Set(
      groups.map((group: CalendarEventGroup) => group.representative.title),
    );

    expect(titles.size).toBeGreaterThan(1);
  });

  it("applies the same grouping model across the full 1448 calendar", () => {
    const groups = groupCalendarEvents(SHIA_CALENDAR_1448_EVENTS);

    expect(groups.length).toBeLessThan(
      SHIA_CALENDAR_1448_EVENTS.length,
    );
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
  });
});
