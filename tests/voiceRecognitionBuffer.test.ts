import { describe, test, expect } from "vitest";
import {
  applyFinalChunks,
  applyRecognitionResults,
  appendTranscriptChunks,
  captureLatestProvisional,
  createInstanceRecognitionState,
  createSessionTranscriptState,
  finalizeSessionTranscript,
  replaceProvisionalTail,
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

describe("cross-instance provisional tail", () => {
  test("growing auto-end interims do not accumulate; later final wins", () => {
    const session = createSessionTranscriptState();

    const first = createInstanceRecognitionState();
    applyRecognitionResults(first, [
      { index: 0, isFinal: false, transcript: "Aaj" },
    ]);
    replaceProvisionalTail(session, captureLatestProvisional(first));

    const second = createInstanceRecognitionState();
    applyRecognitionResults(second, [
      { index: 0, isFinal: false, transcript: "Aaj Mausam" },
    ]);
    replaceProvisionalTail(session, captureLatestProvisional(second));

    const third = createInstanceRecognitionState();
    const finals = applyRecognitionResults(third, [
      { index: 0, isFinal: true, transcript: "Aaj Mausam bahut Achcha hai" },
    ]);
    applyFinalChunks(session, finals);

    expect(finalizeSessionTranscript(session)).toBe("Aaj Mausam bahut Achcha hai");
    expect(session.committed).not.toContain("Aaj Aaj Mausam");
  });

  test("distinct later final discards the stale provisional tail", () => {
    const session = createSessionTranscriptState();
    const first = createInstanceRecognitionState();
    applyRecognitionResults(first, [
      { index: 0, isFinal: false, transcript: "میں آج لاہور" },
    ]);
    replaceProvisionalTail(session, captureLatestProvisional(first));

    const second = createInstanceRecognitionState();
    const finals = applyRecognitionResults(second, [
      { index: 0, isFinal: true, transcript: "کل واپس آؤں گا" },
    ]);
    applyFinalChunks(session, finals);

    expect(session.provisionalTail).toBe("");
    expect(finalizeSessionTranscript(session)).toBe("کل واپس آؤں گا");
  });

  test("shorter later final does not append the longer provisional", () => {
    const session = createSessionTranscriptState();
    replaceProvisionalTail(session, "Aaj Mausam bahut Achcha");
    applyFinalChunks(session, ["Aaj Mausam"]);
    expect(finalizeSessionTranscript(session)).toBe("Aaj Mausam");
    expect(session.committed).not.toContain("Aaj Mausam Aaj Mausam bahut Achcha");
  });

  test("Stop before a final keeps the latest provisional once", () => {
    const session = createSessionTranscriptState();
    const inst = createInstanceRecognitionState();
    applyRecognitionResults(inst, [
      { index: 0, isFinal: false, transcript: "میں آج لاہور" },
    ]);
    replaceProvisionalTail(session, captureLatestProvisional(inst));
    expect(finalizeSessionTranscript(session)).toBe("میں آج لاہور");
  });

  test("genuine spoken repetition in a final is preserved", () => {
    const session = createSessionTranscriptState();
    applyFinalChunks(session, ["بہت بہت شکریہ"]);
    expect(finalizeSessionTranscript(session)).toBe("بہت بہت شکریہ");
  });

  test("restarts with no new final do not append cumulative prefixes", () => {
    const session = createSessionTranscriptState();
    for (const text of ["Aaj", "Aaj Mausam", "Aaj Mausam bahut"]) {
      const inst = createInstanceRecognitionState();
      applyRecognitionResults(inst, [
        { index: 0, isFinal: false, transcript: text },
      ]);
      replaceProvisionalTail(session, captureLatestProvisional(inst));
    }
    expect(session.committed).toBe("");
    expect(session.provisionalTail).toBe("Aaj Mausam bahut");
    expect(finalizeSessionTranscript(session)).toBe("Aaj Mausam bahut");
  });
});
