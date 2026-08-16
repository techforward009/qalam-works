// Translation Studio Review State — pure helpers per spec §4.
// No React, no side effects. All transitions return new segment copies.

import type { TranslationSegment, TranslationReviewStatus } from "./translationTypes";
import { REVIEW_NOTE_MAX } from "./translationTypes";
import { segmentFingerprint } from "./segmentation";

export { REVIEW_NOTE_MAX }; // re-export so consumers can import from one place

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
  // Final + non-empty → ready, regardless of whether stored reviewStatus is
  // "unreviewed" OR "approved" with a stale/empty fingerprint (isEffectivelyApproved
  // already returned false above, so stale approval falls through to here).
  if (segment.status === "final" && segment.target.trim().length > 0) return "ready";
  return "not-ready";
}

// ── Transitions ───────────────────────────────────────────────────────────────

/**
 * Approves a segment. Returns null if the segment is not eligible:
 * must be Final, non-empty target, and display state "ready" (unreviewed / stale approval).
 * QA findings do not affect eligibility — the human reviewer decides.
 */
export function approveSegment(segment: TranslationSegment): TranslationSegment | null {
  if (segment.status !== "final") return null;
  if (!segment.target.trim()) return null;
  const display = getReviewDisplayState(segment);
  if (display !== "ready") return null; // already approved, or changes-requested
  return {
    ...segment,
    reviewStatus: "approved",
    reviewedTargetFingerprint: segmentFingerprint(segment.target),
    // retain existing reviewNote for context from prior correction cycle
  };
}

/**
 * Requests changes on a segment. Returns null if the segment is not eligible
 * (must be Final + non-empty) or if the note is empty/whitespace.
 */
export function requestChanges(segment: TranslationSegment, note: string): TranslationSegment | null {
  if (segment.status !== "final") return null;
  if (!segment.target.trim()) return null;
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
    // Target cleared.
    // changes-requested: keep reviewStatus and reviewNote — the reviewer request
    // remains active even when the translator starts over from scratch.
    if (segment.reviewStatus === "changes-requested") {
      return { reviewedTargetFingerprint: "" };
    }
    // approved or unreviewed: reset fully.
    return { reviewStatus: "unreviewed", reviewedTargetFingerprint: "", reviewNote: "" };
  }
  if (segment.reviewStatus === "approved" || isEffectivelyApproved(segment)) {
    // Editing an approved segment: full reset of review cycle.
    return { reviewStatus: "unreviewed", reviewedTargetFingerprint: "", reviewNote: "" };
  }
  // changes-requested: note and reviewStatus stay, fingerprint cleared.
  if (segment.reviewStatus === "changes-requested") {
    return { reviewedTargetFingerprint: "" };
  }
  // Unreviewed: nothing to change.
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
