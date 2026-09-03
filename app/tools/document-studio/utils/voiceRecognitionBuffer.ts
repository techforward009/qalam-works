/**
 * Per-SpeechRecognition-instance result-index reconciliation
 * plus session-level final vs provisional-tail tracking.
 *
 * Browser result indexes reset to 0 on every new recognition instance.
 * Growing interim hypotheses across auto-end/restart must NOT be appended
 * as separate permanent phrases.
 *
 * Tail lifecycle:
 * - replace: a newer unfinalized interim overwrites provisionalTail
 * - discard: any real final means speech has moved on; drop the tail
 * - promote: only on logical session end, and only if still unresolved
 */

export interface InstanceRecognitionState {
  pending: Map<number, string>;
  committedIndexes: Set<number>;
}

export interface SessionTranscriptState {
  committed: string;
  lastCommitted: string;
  provisionalTail: string;
}

export function createInstanceRecognitionState(): InstanceRecognitionState {
  return {
    pending: new Map(),
    committedIndexes: new Set(),
  };
}

export function createSessionTranscriptState(): SessionTranscriptState {
  return {
    committed: "",
    lastCommitted: "",
    provisionalTail: "",
  };
}

function normalizeChunk(text: string | undefined | null): string {
  return (text ?? "").trim();
}

export function applyRecognitionResults(
  state: InstanceRecognitionState,
  results: Array<{ index: number; isFinal: boolean; transcript: string }>,
): string[] {
  const newlyCommitted: string[] = [];

  for (const result of results) {
    const text = normalizeChunk(result.transcript);
    const idx = result.index;

    if (result.isFinal) {
      state.pending.delete(idx);
      if (state.committedIndexes.has(idx)) continue;
      state.committedIndexes.add(idx);
      if (text) newlyCommitted.push(text);
      continue;
    }

    if (state.committedIndexes.has(idx)) continue;
    if (text) state.pending.set(idx, text);
    else state.pending.delete(idx);
  }

  return newlyCommitted;
}

export function takeOrphanInterims(state: InstanceRecognitionState): string[] {
  const indexes = [...state.pending.keys()].sort((a, b) => a - b);
  const orphans: string[] = [];
  for (const idx of indexes) {
    if (state.committedIndexes.has(idx)) continue;
    const text = normalizeChunk(state.pending.get(idx));
    if (text) orphans.push(text);
  }
  state.pending.clear();
  return orphans;
}

/** Latest unfinalized interim only — auto-end carryover, not a list of prefixes. */
export function captureLatestProvisional(state: InstanceRecognitionState): string {
  const orphans = takeOrphanInterims(state);
  if (orphans.length === 0) return "";
  return orphans[orphans.length - 1];
}

export function appendTranscriptChunks(existing: string, chunks: string[]): string {
  let out = existing;
  for (const chunk of chunks) {
    const text = normalizeChunk(chunk);
    if (!text) continue;
    out += (out ? " " : "") + text;
  }
  return out;
}

function isGrowingHypothesis(previous: string, next: string): boolean {
  const a = normalizeChunk(previous);
  const b = normalizeChunk(next);
  if (!a || !b) return false;
  if (b === a) return true;
  if (b.startsWith(a + " ") || b.startsWith(a)) return true;
  if (a.startsWith(b + " ") || a.startsWith(b)) return true;
  return false;
}

export function replaceProvisionalTail(
  session: SessionTranscriptState,
  tail: string,
): void {
  const text = normalizeChunk(tail);
  if (!text) return;
  session.provisionalTail = text;
}

export function applyFinalChunks(
  session: SessionTranscriptState,
  chunks: string[],
): void {
  for (const chunk of chunks) {
    const text = normalizeChunk(chunk);
    if (!text) continue;

    // Any final discards the unfinished tail (same utterance or a new one).
    session.provisionalTail = "";

    if (session.lastCommitted && isGrowingHypothesis(session.lastCommitted, text)) {
      if (text === session.lastCommitted) continue;
      if (session.committed === session.lastCommitted) {
        session.committed = text;
      } else if (session.committed.endsWith(session.lastCommitted)) {
        session.committed =
          session.committed.slice(0, session.committed.length - session.lastCommitted.length).trimEnd();
        session.committed = appendTranscriptChunks(session.committed, [text]);
      } else {
        session.committed = appendTranscriptChunks(session.committed, [text]);
      }
      session.lastCommitted = text;
      continue;
    }

    session.committed = appendTranscriptChunks(session.committed, [text]);
    session.lastCommitted = text;
  }
}

export function finalizeSessionTranscript(session: SessionTranscriptState): string {
  const tail = normalizeChunk(session.provisionalTail);
  session.provisionalTail = "";
  if (!tail) return session.committed;

  if (session.lastCommitted && isGrowingHypothesis(session.lastCommitted, tail)) {
    if (tail === session.lastCommitted) return session.committed;
    if (session.committed === session.lastCommitted) {
      session.committed = tail;
    } else if (session.committed.endsWith(session.lastCommitted)) {
      session.committed =
        session.committed.slice(0, session.committed.length - session.lastCommitted.length).trimEnd();
      session.committed = appendTranscriptChunks(session.committed, [tail]);
    }
    session.lastCommitted = tail;
    return session.committed;
  }

  session.committed = appendTranscriptChunks(session.committed, [tail]);
  session.lastCommitted = tail;
  return session.committed;
}
