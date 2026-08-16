// Pure review filter and navigation helpers.
// No React, no side effects, no mutation.
// Business-logic systems (QA, TM, conflict, summary) must always use the
// full project.segments array — NEVER visibleSegments.

import type { TranslationSegment } from "./translationTypes";
import { getReviewDisplayState } from "./reviewState";

export type ReviewFilter =
  | "all"
  | "ready"
  | "changes-requested"
  | "approved"
  | "not-ready";

/**
 * Returns true if the segment should appear under the given filter.
 * Delegates entirely to getReviewDisplayState — no duplicate logic.
 */
export function matchesReviewFilter(
  segment: TranslationSegment,
  filter: ReviewFilter
): boolean {
  if (filter === "all") return true;
  return getReviewDisplayState(segment) === filter;
}

/**
 * Returns the subset of segments matching the filter, in original project order.
 * The input array is never mutated.
 */
export function filterSegmentsByReviewState(
  segments: TranslationSegment[],
  filter: ReviewFilter
): TranslationSegment[] {
  if (filter === "all") return segments.slice(); // preserve order, fresh array
  return segments.filter(s => matchesReviewFilter(s, filter));
}

/**
 * Returns the next segment to navigate to.
 *
 * Chooses the first visible segment with order > afterOrder.
 * If none, wraps to the first visible segment.
 * Returns null when visibleSegments is empty.
 *
 * afterOrder = 0 selects the first segment unconditionally.
 */
export function findNextVisibleSegment(
  visibleSegments: TranslationSegment[],
  afterOrder: number
): TranslationSegment | null {
  if (visibleSegments.length === 0) return null;
  // First with order > afterOrder
  const next = visibleSegments.find(s => s.order > afterOrder);
  if (next) return next;
  // Wrap to first
  return visibleSegments[0];
}
