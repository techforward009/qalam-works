import { describe, expect, it } from "vitest";
import { getDateEvents } from "../app/tools/date-converter/utils/dateEvents";

describe("Historical Intelligence expansion", () => {
  it("supports category fields", () => {
    expect(getDateEvents({year:2030, month:1, day:1})[0].category).toBeDefined();
  });

  it("supports tags", () => {
    expect(getDateEvents({year:2030, month:1, day:1})[0].tags).toContain("sample");
  });

  it("supports importance", () => {
    expect(getDateEvents({year:2030, month:1, day:1})[0].importance).toBe("medium");
  });

  it("keeps multilingual fields", () => {
    const event = getDateEvents({year:2030, month:1, day:1})[0];
    expect(event.title.ur).toBeTruthy();
  });

  it("supports source display data", () => {
    expect(getDateEvents({year:2030, month:1, day:1})[0].source?.label).toBeTruthy();
  });
});
