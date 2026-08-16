// Batch 17C.2 — Review filter and navigation tests

import {
  matchesReviewFilter,
  filterSegmentsByReviewState,
  findNextVisibleSegment,
  type ReviewFilter,
} from "../app/tools/translation-studio/utils/reviewNavigation";
import {
  getReviewDisplayState,
  summarizeReviewState,
  approveSegment,
} from "../app/tools/translation-studio/utils/reviewState";
import type { TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { segmentFingerprint, makeSegmentId } from "../app/tools/translation-studio/utils/segmentation";

function seg(overrides: Partial<TranslationSegment> & { source: string; target: string }): TranslationSegment {
  const { source, target, ...rest } = overrides;
  return {
    id: makeSegmentId(1), order: 1, source, target,
    sourceDir: "ltr", targetDir: "ltr", status: "draft",
    sourceFingerprint: segmentFingerprint(source),
    reviewStatus: "unreviewed", reviewNote: "", reviewedTargetFingerprint: "",
    ...rest,
  };
}

// Build the four canonical test segments for the spec matrix
function makeFourSegs() {
  const tgtApproved = "Approved translation";
  const A = seg({ id: makeSegmentId(1), order: 1, source: "Ready seg.", target: "ترجمہ", status: "final" });
  const B = seg({ id: makeSegmentId(2), order: 2, source: "Approved seg.", target: tgtApproved, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgtApproved) });
  const C = seg({ id: makeSegmentId(3), order: 3, source: "Changes seg.", target: "draft", status: "draft", reviewStatus: "changes-requested", reviewNote: "Needs work" });
  const D = seg({ id: makeSegmentId(4), order: 4, source: "Not ready.", target: "draft", status: "draft" });
  return { A, B, C, D };
}

// ── Filter matrix ─────────────────────────────────────────────────────────────

describe("matchesReviewFilter", () => {
  test.each([
    ["all", "ready" as ReviewFilter],
    ["all", "approved" as ReviewFilter],
    ["all", "changes-requested" as ReviewFilter],
    ["all", "not-ready" as ReviewFilter],
  ])("'all' filter includes every segment (display=%s, filter=%s)", (_display, filter) => {
    const s = seg({ source: ".", target: "x", status: "draft" });
    expect(matchesReviewFilter(s, "all")).toBe(true);
  });
});

describe("filterSegmentsByReviewState — spec matrix", () => {
  const { A, B, C, D } = makeFourSegs();
  const all = [A, B, C, D];

  test("filter=all → all 4 segments", () => {
    expect(filterSegmentsByReviewState(all, "all")).toHaveLength(4);
  });
  test("filter=ready → only A", () => {
    const result = filterSegmentsByReviewState(all, "ready");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(A.id);
  });
  test("filter=approved → only B", () => {
    const result = filterSegmentsByReviewState(all, "approved");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(B.id);
  });
  test("filter=changes-requested → only C", () => {
    const result = filterSegmentsByReviewState(all, "changes-requested");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(C.id);
  });
  test("filter=not-ready → only D", () => {
    const result = filterSegmentsByReviewState(all, "not-ready");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(D.id);
  });
  test("preserves segment order", () => {
    const result = filterSegmentsByReviewState(all, "all");
    expect(result.map(s => s.order)).toEqual([1, 2, 3, 4]);
  });
  test("does not mutate input array", () => {
    const copy = [...all];
    filterSegmentsByReviewState(all, "ready");
    expect(all).toEqual(copy);
  });
  test("empty input → empty output", () => {
    expect(filterSegmentsByReviewState([], "ready")).toHaveLength(0);
  });
});

// ── Stale-approval regression ─────────────────────────────────────────────────

describe("stale approval: ready filter includes it, approved filter excludes it", () => {
  test("Final + approved + stale fingerprint → appears in ready, not approved", () => {
    const staleApproved = seg({ id: makeSegmentId(1), order: 1, source: ".", target: "ترجمہ", status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint("different text") });
    const all = [staleApproved];
    expect(filterSegmentsByReviewState(all, "ready")).toHaveLength(1);
    expect(filterSegmentsByReviewState(all, "approved")).toHaveLength(0);
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe("findNextVisibleSegment", () => {
  const segs = [
    seg({ id: makeSegmentId(1), order: 2, source: ".", target: "." }),
    seg({ id: makeSegmentId(2), order: 5, source: ".", target: "." }),
    seg({ id: makeSegmentId(3), order: 8, source: ".", target: "." }),
  ];

  test("afterOrder=0 → first (order 2)", () => {
    expect(findNextVisibleSegment(segs, 0)?.order).toBe(2);
  });
  test("afterOrder=2 → next (order 5)", () => {
    expect(findNextVisibleSegment(segs, 2)?.order).toBe(5);
  });
  test("afterOrder=5 → next (order 8)", () => {
    expect(findNextVisibleSegment(segs, 5)?.order).toBe(8);
  });
  test("afterOrder=8 → wraps to first (order 2)", () => {
    expect(findNextVisibleSegment(segs, 8)?.order).toBe(2);
  });
  test("afterOrder=4 → next after 4 (order 5)", () => {
    expect(findNextVisibleSegment(segs, 4)?.order).toBe(5);
  });
  test("empty list → null", () => {
    expect(findNextVisibleSegment([], 0)).toBeNull();
  });
  test("zero visible → Next disabled (null)", () => {
    expect(findNextVisibleSegment([], 5)).toBeNull();
  });
});

// ── Showing count uses project total ─────────────────────────────────────────

describe("Showing count logic", () => {
  test("visibleCount and totalSegments are independent values", () => {
    const { A, B, C, D } = makeFourSegs();
    const all = [A, B, C, D];
    const visible = filterSegmentsByReviewState(all, "ready");
    // Y = project total (4), X = visible (1)
    expect(visible.length).toBe(1);    // X
    expect(all.length).toBe(4);        // Y — always project total
  });
});

// ── Project-wide summary isolation ───────────────────────────────────────────

describe("review summary always uses all segments", () => {
  test("summary counts unchanged when a filter reduces visible segments", () => {
    const { A, B, C, D } = makeFourSegs();
    const all = [A, B, C, D];
    const summaryFromAll = summarizeReviewState(all);
    // Simulate: only Ready filter is applied to rendering
    const visible = filterSegmentsByReviewState(all, "ready");
    // Summary computed from all (as required by spec)
    const summaryFromFiltered = summarizeReviewState(visible); // WRONG usage — just for contrast
    expect(summaryFromAll.ready).toBe(1);
    expect(summaryFromAll.approved).toBe(1);
    expect(summaryFromAll.changesRequested).toBe(1);
    expect(summaryFromAll.notReady).toBe(1);
    // Filtered summary would be different — confirming the isolation requirement
    expect(summaryFromFiltered.ready).toBe(1);
    expect(summaryFromFiltered.approved).toBe(0); // would miss B
  });

  test("source project array unchanged after filtering", () => {
    const { A, B, C, D } = makeFourSegs();
    const all = [A, B, C, D];
    const originalLength = all.length;
    filterSegmentsByReviewState(all, "approved");
    expect(all.length).toBe(originalLength);
  });
});

// ── Action cursor / filter change reset ──────────────────────────────────────

describe("navigation cursor behavior (pure)", () => {
  test("segment with order 5 approved → cursor moves to 5, next after 5 is 8", () => {
    const orders = [2, 5, 8];
    const cursor = 5; // set after approving order-5 segment
    const remaining = [
      seg({ id: makeSegmentId(1), order: 2, source: ".", target: "." }),
      // order 5 removed from Ready after approval
      seg({ id: makeSegmentId(3), order: 8, source: ".", target: "." }),
    ];
    const next = findNextVisibleSegment(remaining, cursor);
    expect(next?.order).toBe(8);
    // After 8, wrap to 2
    expect(findNextVisibleSegment(remaining, 8)?.order).toBe(2);
  });
});
