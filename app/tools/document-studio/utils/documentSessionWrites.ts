/** Serialize editor-owned writes through the existing library API. A rejected
 * operation remains visible to its caller without poisoning subsequent retries. */
export function createDocumentSessionWrites() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    write<T>(operation: () => Promise<T>): Promise<T> {
      const result = tail.then(operation);
      tail = result.catch(() => undefined);
      return result;
    },
    async drain(): Promise<void> { await tail; },
  };
}
