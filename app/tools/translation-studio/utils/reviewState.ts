// Translation Studio Review State — pure helpers per spec §4.
// No React, no side effects. All transitions return new segment copies.

import type { TranslationSegment, TranslationReviewStatus } from "./translationTypes";
import { segmentFingerprint } from "./segmentation";

export const REVIEW_NOTE_MAX = 500;

// ── Effective approval ────────────────────────────────────────────────────────

/**
 * Approval is effective only when ALL five conditions hold.
 * Stored "approved" with a stale fingerprint is treated as Unreviewed.
 */
export function isEffectivelyApproved(segment: TranslationSegment): boolean {
  return (
    segment.status === "final" &&
    segment.target.trim().length > 0 &&
    segment.reviewStatus === "approved" &&
    segment.reviewedTargetFingerprint.length > 0 &&
    segment.reviewedTargetFingerprint === segmentFingerprint(segment.target)
  );
}

/** The display review state after applying fingerprint safety. */
export type ReviewDisplayState =
  | "not-ready"        // Draft or Untranslated, not changes-requested
  | "changes-requested"
  | "ready"            // Final + non-empty + effectively unreviewed
  | "approved";        // Effectively approved

export function getReviewDisplayState(segment: TranslationSegment): ReviewDisplayState {
  if (segment.reviewStatus === "changes-requested") return "changes-requested";
  if (isEffectivelyApproved(segment)) return "approved";
  if (
    segment.status === "final" &&
    segment.target.trim().length > 0 &&
    segment.reviewStatus === "unreviewed"
  ) return "ready";
  return "not-ready";
}

// ── Transitions ───────────────────────────────────────────────────────────────

/** Mark segment as Approved. Only valid when segment is Final + non-empty + not already effectively approved. */
export function approveSegment(segment: TranslationSegment): TranslationSegment {
  return {
    ...segment,
    reviewStatus: "approved",
    reviewedTargetFingerprint: segmentFingerprint(segment.target),
    // retain existing reviewNote (context from prior correction cycle)
  };
}

/** Request changes. Requires a non-empty note. Returns null if note invalid. */
export function requestChanges(segment: TranslationSegment, note: string): TranslationSegment | null {
  if (!note.trim()) return null;
  return {
    ...segment,
    status: "draft",
    reviewStatus: "changes-requested",
    reviewNote: note.slice(0, REVIEW_NOTE_MAX),
    reviewedTargetFingerprint: "",
  };
}

/** Called when target text is changed (after status has already been updated by nextStatus). */
export function applyTargetEditReviewTransition(
  segment: TranslationSegment,
  newTarget: string
): Partial<TranslationSegment> {
  if (newTarget.trim() === "") {
    // Cleared — reset to unreviewed (except keep note if changes-requested)
    return {
      reviewStatus: "unreviewed",
      reviewedTargetFingerprint: "",
      reviewNote: segment.reviewStatus === "changes-requested" ? segment.reviewNote : "",
    };
  }
  if (segment.reviewStatus === "approved" || isEffectivelyApproved(segment)) {
    // Editing an approved segment: full reset
    return { reviewStatus: "unreviewed", reviewedTargetFingerprint: "", reviewNote: "" };
  }
  // Changes-requested: note and status stay, fingerprint cleared
  if (segment.reviewStatus === "changes-requested") {
    return { reviewedTargetFingerprint: "" };
  }
  // Unreviewed: nothing to change
  return {};
}

/** Called when Mark Final is clicked. */
export function applyMarkFinalReviewTransition(segment: TranslationSegment): Partial<TranslationSegment> {
  if (segment.reviewStatus === "changes-requested") {
    // Resubmission: becomes Ready (unreviewed), note retained
    return { reviewStatus: "unreviewed", reviewedTargetFingerprint: "" };
  }
  // Otherwise unchanged
  return {};
}

// ── Project summary ───────────────────────────────────────────────────────────

export interface ReviewSummary {
  ready: number;
  approved: number;
  changesRequested: number;
  notReady: number;
  total: number;
}

export function summarizeReviewState(segments: TranslationSegment[]): ReviewSummary {
  let ready = 0, approved = 0, changesRequested = 0, notReady = 0;
  for (const seg of segments) {
    switch (getReviewDisplayState(seg)) {
      case "ready": ready++; break;
      case "approved": approved++; break;
      case "changes-requested": changesRequested++; break;
      default: notReady++;
    }
  }
  return { ready, approved, changesRequested, notReady, total: segments.length };
}
