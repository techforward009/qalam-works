import { describe, expect, test } from "vitest";
import {
  choosePreferredDtype,
  clampRecordingMs,
  detectWebGpuAvailable,
  MAX_RECORDING_MS,
} from "../../app/labs/local-dictation/whisperLocal";

describe("local dictation labs helpers", () => {
  test("prefers quantized dtypes when present", () => {
    expect(choosePreferredDtype(["fp32", "q8", "fp16"])).toBe("q8");
    expect(choosePreferredDtype(["fp32"])).toBe("fp32");
    expect(choosePreferredDtype([])).toBe("q8");
  });

  test("clamps recording duration to 30 seconds", () => {
    expect(clampRecordingMs(12_000)).toBe(12_000);
    expect(clampRecordingMs(90_000)).toBe(MAX_RECORDING_MS);
    expect(clampRecordingMs(-5)).toBe(0);
  });

  test("WebGPU detection is false in Node test env", () => {
    expect(detectWebGpuAvailable()).toBe(false);
  });
});
