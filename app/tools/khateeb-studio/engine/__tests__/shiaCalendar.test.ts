import { describe, expect, it } from "vitest";
import {
  CALENDAR_MONTHS_1448,
  RABI_AL_THANI_1448_EVENTS,
  SHIA_CALENDAR_1448_EVENTS,
} from "../shiaCalendar";

describe("Khateeb Studio 1448 calendar", () => {
  it("contains all twelve Islamic months", () => {
    expect(CALENDAR_MONTHS_1448).toHaveLength(12);
    expect(new Set(SHIA_CALENDAR_1448_EVENTS.map((event) => event.month)).size).toBe(12);
  });

  it("preserves the 24 Rabi al-Thani source records", () => {
    expect(RABI_AL_THANI_1448_EVENTS).toHaveLength(24);
    expect(RABI_AL_THANI_1448_EVENTS.filter((event) => event.day === 10 && event.title.includes("امام حسن عسکری")).length).toBe(4);
  });

  it("keeps regionless records visible to every region", () => {
    const general = RABI_AL_THANI_1448_EVENTS.find((event) => event.id === "r2-01-tawwabin");
    const pk = RABI_AL_THANI_1448_EVENTS.find((event) => event.id === "r2-10-askari-pk");
    expect(general?.regions).toBeUndefined();
    expect(pk?.regions).toEqual(["pk"]);
  });

  it("records a local capture date for every event", () => {
    expect(SHIA_CALENDAR_1448_EVENTS.every((event) => event.sourceCapturedAt === "2026-10-02")).toBe(true);
  });
});
