import { adaptProcessText } from "../../app/tools/research-studio/engine";
import { processText } from "../../app/utils/processing/processText";

describe("processText adapter boundary", () => {
  test("normalizedText is processText output; rawText is not overwritten", () => {
    const raw = "یہ    متن ہے۔";
    const adapted = adaptProcessText(raw, "auto");
    expect(adapted.rawText).toBe(raw);
    expect(adapted.normalizedText).toBe(processText(raw, "auto").output);
    expect(adapted.normalizedText).not.toBe(raw);
  });

  test("empty input stays empty and does not throw", () => {
    const adapted = adaptProcessText("");
    expect(adapted.rawText).toBe("");
    expect(adapted.normalizedText).toBe("");
  });

  test("explicit ur mode still leaves the original string intact", () => {
    const raw = "كراچى";
    const adapted = adaptProcessText(raw, "ur");
    expect(adapted.rawText).toBe(raw);
    expect(adapted.normalizedText).toBe(processText(raw, "ur").output);
  });
});
