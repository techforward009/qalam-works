import { describe, test, expect } from "vitest";
import {
  applyRecognitionResults,
  appendTranscriptChunks,
  createInstanceRecognitionState,
  takeOrphanInterims,
} from "../app/tools/document-studio/utils/voiceRecognitionBuffer";

describe("voice recognition result-index reconciliation", () => {
  test("interim replacement at the same index does not accumulate", () => {
    const state = createInstanceRecognitionState();
    applyRecognitionResults(state, [
      { index: 0, isFinal: false, transcript: "یہ ایک" },
    ]);
    applyRecognitionResults(state, [
      { index: 0, isFinal: false, transcript: "یہ ایک تجربہ" },
    ]);
    applyRecognitionResults(state, [
      { index: 0, isFinal: false, transcript: "یہ ایک تجربہ ہے" },
    ]);
    expect([...state.pending.values()]).toEqual(["یہ ایک تجربہ ہے"]);
    expect(state.committedIndexes.size).toBe(0);
  });

  test("interim then final at the same index commits once", () => {
    const state = createInstanceRecognitionState();
    applyRecognitionResults(state, [
      { index: 0, isFinal: false, transcript: "یہ ایک" },
    ]);
    applyRecognitionResults(state, [
      { index: 0, isFinal: false, transcript: "یہ ایک تجربہ ہے" },
    ]);
    const committed = applyRecognitionResults(state, [
      { index: 0, isFinal: true, transcript: "یہ ایک تجربہ ہے" },
    ]);
    expect(committed).toEqual(["یہ ایک تجربہ ہے"]);
    expect(takeOrphanInterims(state)).toEqual([]);
    const again = applyRecognitionResults(state, [
      { index: 0, isFinal: true, transcript: "یہ ایک تجربہ ہے" },
    ]);
    expect(again).toEqual([]);
  });

  test("orphan interim is preserved once when the instance ends", () => {
    const state = createInstanceRecognitionState();
    applyRecognitionResults(state, [
      { index: 0, isFinal: false, transcript: "میں آج لاہور" },
    ]);
    expect(takeOrphanInterims(state)).toEqual(["میں آج لاہور"]);
    expect(takeOrphanInterims(state)).toEqual([]);
  });

  test("final result is not re-appended from onend harvest", () => {
    const state = createInstanceRecognitionState();
    const committed = applyRecognitionResults(state, [
      { index: 0, isFinal: true, transcript: "آج موسم اچھا ہے" },
    ]);
    expect(committed).toEqual(["آج موسم اچھا ہے"]);
    expect(takeOrphanInterims(state)).toEqual([]);
  });

  test("instance #2 index 0 is independent of instance #1", () => {
    const first = createInstanceRecognitionState();
    applyRecognitionResults(first, [
      { index: 0, isFinal: true, transcript: "جملہ ایک" },
    ]);
    const second = createInstanceRecognitionState();
    const committed = applyRecognitionResults(second, [
      { index: 0, isFinal: true, transcript: "جملہ دو" },
    ]);
    expect(committed).toEqual(["جملہ دو"]);
    expect(first.committedIndexes.has(0)).toBe(true);
    expect(second.committedIndexes.has(0)).toBe(true);
  });

  test("appendTranscriptChunks joins without duplicating empty pieces", () => {
    expect(appendTranscriptChunks("", ["آج موسم اچھا ہے"])).toBe("آج موسم اچھا ہے");
    expect(appendTranscriptChunks("آج موسم اچھا ہے", ["  ", "شام کو بارش"])).toBe(
      "آج موسم اچھا ہے شام کو بارش",
    );
  });
});
