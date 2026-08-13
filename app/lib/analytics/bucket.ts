import type { CountBucket } from "./types";

/** Coarse size/count buckets — never exact content-derived strings. */
export function toCountBucket(n: number): CountBucket {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 100) return "1-100";
  if (n <= 500) return "101-500";
  if (n <= 2000) return "501-2000";
  if (n <= 10000) return "2001-10000";
  return "10000+";
}
