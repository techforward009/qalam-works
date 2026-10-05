import { describe, expect, test } from "vitest";
import { PUBLIC_KHATEEB_CORPUS } from "../app/tools/khateeb-studio/engine/khateebCorpus";
import { SHIA_CALENDAR_1448_EVENTS } from "../app/tools/khateeb-studio/engine/shiaCalendar";
import {
  eventDayLabel,
  eventNote,
  eventTitle,
  sourceLabel,
  speakerFocus,
  speakerName,
  speakerSearchText,
} from "../app/tools/khateeb-studio/engine/khateebLocale";

const ARABIC_SCRIPT = /[\u0600-\u06FF]/u;

describe("Khateeb Studio English locale", () => {
  test("every speaker has an English-only visible name and focus", () => {
    for (const speaker of PUBLIC_KHATEEB_CORPUS) {
      expect(speakerName(speaker, true)).not.toMatch(ARABIC_SCRIPT);
      expect(speakerFocus(speaker, true).length).toBeGreaterThan(0);
      expect(speakerFocus(speaker, true).join(" ")).not.toMatch(ARABIC_SCRIPT);
      expect(speakerSearchText(speaker)).toContain(speakerName(speaker, true).toLowerCase());
    }
  });

  test("every 1448 occasion has an English-only title and source label", () => {
    for (const event of SHIA_CALENDAR_1448_EVENTS) {
      expect(eventTitle(event, true)).not.toBe("Calendar occasion");
      expect(eventTitle(event, true)).not.toMatch(ARABIC_SCRIPT);
      expect(String(eventDayLabel(event, true))).not.toMatch(ARABIC_SCRIPT);
      expect(sourceLabel(event, true)).not.toMatch(ARABIC_SCRIPT);
      const note = eventNote(event, true);
      if (note) expect(note).not.toMatch(ARABIC_SCRIPT);
    }
  });
});
