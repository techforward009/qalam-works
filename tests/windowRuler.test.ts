import { describe, expect, it } from "vitest";
import { calculateWindowRulerTicks, PASTEBOARD_GUIDE_PX, PASTEBOARD_TOP_PX } from "../app/tools/document-studio/utils/windowRuler";

describe("InPage window ruler", () => {
  it("puts 0 on the right and continues into negative millimetres", () => {
    const ticks = calculateWindowRulerTicks({
      lengthPx: 1000,
      originPx: 700,
      pxPerMm: 4,
      positiveDirection: -1,
    });
    const at = (label: string) => ticks.find((tick) => tick.label === label);
    expect(at("0")?.offsetPx).toBe(700);
    expect(at("20")?.offsetPx).toBe(620);
    expect(at("-20")?.offsetPx).toBe(780);
    expect(PASTEBOARD_TOP_PX).toBe(4);
    expect(PASTEBOARD_GUIDE_PX).toBe(119);
  });
});
