/** Deliberately narrow: a renderer's HTTP 500 may mean invalid/unsupported
 * content, so it must retain its original explanation rather than claim load. */
export function isRecoverablePdfStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}
