/**
 * Per-SpeechRecognition-instance result-index reconciliation.
 *
 * Indexes reset to 0 on every new browser recognition instance, so callers
 * must create a fresh state for each instance.
 *
 * Interim hypotheses replace the previous value at the same index.
 * Final results are committed exactly once. Orphan interims (never finalized
 * before the instance ended) can be harvested once.
 */

export interface InstanceRecognitionState {
  pending: Map<number, string>;
  committedIndexes: Set<number>;
}

export function createInstanceRecognitionState(): InstanceRecognitionState {
  return {
    pending: new Map(),
    committedIndexes: new Set(),
  };
}

function normalizeChunk(text: string | undefined | null): string {
  return (text ?? "").trim();
}

/**
 * Apply one onresult batch. Returns newly committed FINAL chunks in index order.
 * Interim values replace the pending hypothesis for that index and are not returned.
 */
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

/**
 * Take pending interims that never became final, in index order, once.
 * Clears pending tracking. Already-committed indexes are skipped.
 */
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

export function appendTranscriptChunks(existing: string, chunks: string[]): string {
  let out = existing;
  for (const chunk of chunks) {
    const text = normalizeChunk(chunk);
    if (!text) continue;
    out += (out ? " " : "") + text;
  }
  return out;
}
