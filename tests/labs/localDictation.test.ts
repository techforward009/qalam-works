import { describe, expect, test } from "vitest";
import {
  choosePreferredDtype,
  clampRecordingMs,
  detectWebGpuAvailable,
  DEFAULT_WHISPER_MODEL_KEY,
  MAX_RECORDING_MS,
  MODEL_SWITCH_MESSAGE,
  REQUESTED_DTYPE,
  resolveWhisperModel,
  shouldAcceptTranscriptionResult,
  TRANSCRIBE_WATCHDOG_MS,
  URDU_TRANSCRIBE_OPTIONS,
  WHISPER_MODELS,
  WHISPER_MODEL_ID,
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

  test("Tiny resolves to the correct model ID", () => {
    expect(resolveWhisperModel("tiny").id).toBe("onnx-community/whisper-tiny");
    expect(WHISPER_MODELS.tiny.id).toBe("onnx-community/whisper-tiny");
    expect(WHISPER_MODEL_ID).toBe("onnx-community/whisper-tiny");
  });

  test("Base resolves to the correct model ID", () => {
    expect(resolveWhisperModel("base").id).toBe("onnx-community/whisper-base");
  });

  test("default model remains Tiny", () => {
    expect(DEFAULT_WHISPER_MODEL_KEY).toBe("tiny");
    expect(resolveWhisperModel().id).toBe("onnx-community/whisper-tiny");
  });

  test("loaded model info fields distinguish requested vs actual dtype", () => {
    expect(REQUESTED_DTYPE).toBe("q8");
  });

  test("requesting another model after load is an explicit error message", () => {
    expect(MODEL_SWITCH_MESSAGE).toContain("Reload the page");
  });

  test("Urdu transcription options stay raw transcribe", () => {
    expect(URDU_TRANSCRIBE_OPTIONS).toEqual({ language: "urdu", task: "transcribe" });
  });

  test("watchdog threshold stays 120 seconds", () => {
    expect(TRANSCRIBE_WATCHDOG_MS).toBe(120_000);
  });

  test("stale or timed-out transcription results are ignored", () => {
    expect(shouldAcceptTranscriptionResult(1, 1, false)).toBe(true);
    expect(shouldAcceptTranscriptionResult(1, 2, false)).toBe(false);
    expect(shouldAcceptTranscriptionResult(3, 3, true)).toBe(false);
  });
});
