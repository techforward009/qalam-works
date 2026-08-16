// Batch 17C.1 — Review state transition tests

import {
  isEffectivelyApproved,
  getReviewDisplayState,
  approveSegment,
  requestChanges,
  applyTargetEditReviewTransition,
  applyMarkFinalReviewTransition,
  summarizeReviewState,
  REVIEW_NOTE_MAX,
} from "../app/tools/translation-studio/utils/reviewState";
import { parseProject, defaultBrief, type TranslationSegment } from "../app/tools/translation-studio/utils/translationTypes";
import { segmentFingerprint, makeSegmentId } from "../app/tools/translation-studio/utils/segmentation";
import { generateProjectId } from "../app/tools/translation-studio/utils/projectId";

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

// ── isEffectivelyApproved ──────────────────────────────────────────────────────

describe("isEffectivelyApproved", () => {
  test("Final + approved + matching fingerprint → true", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: "Test.", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) });
    expect(isEffectivelyApproved(s)).toBe(true);
  });
  test("K: approved but fingerprint mismatches target → false", () => {
    const s = seg({ source: "Test.", target: "changed", status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint("original") });
    expect(isEffectivelyApproved(s)).toBe(false);
  });
  test("L: approved but empty target → false", () => {
    const s = seg({ source: "Test.", target: "", status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint("") });
    expect(isEffectivelyApproved(s)).toBe(false);
  });
  test("Draft + approved → false (not final)", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: "Test.", target: tgt, status: "draft", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) });
    expect(isEffectivelyApproved(s)).toBe(false);
  });
});

// ── getReviewDisplayState ──────────────────────────────────────────────────────

describe("getReviewDisplayState", () => {
  test("Draft + unreviewed → not-ready", () => {
    expect(getReviewDisplayState(seg({ source: ".", target: "x", status: "draft" }))).toBe("not-ready");
  });
  test("Final + non-empty + unreviewed → ready", () => {
    expect(getReviewDisplayState(seg({ source: ".", target: "x", status: "final" }))).toBe("ready");
  });
  test("Final + approved + matching fingerprint → approved", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: ".", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) });
    expect(getReviewDisplayState(s)).toBe("approved");
  });
  test("changes-requested → changes-requested regardless of status", () => {
    expect(getReviewDisplayState(seg({ source: ".", target: "x", status: "draft", reviewStatus: "changes-requested" }))).toBe("changes-requested");
  });
  test("Untranslated → not-ready", () => {
    expect(getReviewDisplayState(seg({ source: ".", target: "", status: "untranslated" }))).toBe("not-ready");
  });
});

// ── Matrix A – Mark Final ──────────────────────────────────────────────────────

describe("A: Mark Final transition", () => {
  test("Draft + unreviewed → Final + unreviewed (ready)", () => {
    const s = seg({ source: "Test.", target: "ترجمہ", status: "draft" });
    const patch = applyMarkFinalReviewTransition(s);
    const updated = { ...s, status: "final" as const, ...patch };
    expect(updated.status).toBe("final");
    expect(updated.reviewStatus).toBe("unreviewed");
    expect(getReviewDisplayState(updated)).toBe("ready");
  });
});

// ── Matrix B – Approve ────────────────────────────────────────────────────────

describe("B: Approve transition", () => {
  test("Final + unreviewed + target → Approved with fingerprint", () => {
    const tgt = "ترجمہ اصل";
    const s = seg({ source: "Test.", target: tgt, status: "final" });
    const updated = approveSegment(s);
    expect(updated).not.toBeNull();
    expect(updated!.reviewStatus).toBe("approved");
    expect(updated!.reviewedTargetFingerprint).toBe(segmentFingerprint(tgt));
    expect(isEffectivelyApproved(updated!)).toBe(true);
  });
});

// ── Matrix C – Edit approved ──────────────────────────────────────────────────

describe("C: Editing an approved segment", () => {
  test("edit one character → Draft + unreviewed + fingerprint cleared + note cleared", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: "Test.", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt), reviewNote: "old note" });
    const patch = applyTargetEditReviewTransition(s, tgt + "x");
    const updated = { ...s, target: tgt + "x", ...patch };
    expect(updated.reviewStatus).toBe("unreviewed");
    expect(updated.reviewedTargetFingerprint).toBe("");
    expect(updated.reviewNote).toBe("");
  });
});

// ── Matrix D – Clear approved ─────────────────────────────────────────────────

describe("D: Clearing an approved segment target", () => {
  test("clear target → unreviewed + fingerprint cleared", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: "Test.", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) });
    const patch = applyTargetEditReviewTransition(s, "");
    const updated = { ...s, target: "", ...patch };
    expect(updated.reviewStatus).toBe("unreviewed");
    expect(updated.reviewedTargetFingerprint).toBe("");
    expect(isEffectivelyApproved(updated)).toBe(false);
  });
});

// ── Matrix E – Request changes ────────────────────────────────────────────────

describe("E: Request changes with valid note", () => {
  test("Final + unreviewed → Draft + changes-requested + note preserved", () => {
    const s = seg({ source: "Test.", target: "ترجمہ", status: "final" });
    const updated = requestChanges(s, "Please revise this wording.");
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("draft");
    expect(updated!.reviewStatus).toBe("changes-requested");
    expect(updated!.reviewNote).toBe("Please revise this wording.");
    expect(updated!.reviewedTargetFingerprint).toBe("");
  });
});

// ── Matrix F – Blank note rejected ───────────────────────────────────────────

describe("F: Request changes with blank note", () => {
  test("empty/whitespace note → null (rejected)", () => {
    const s = seg({ source: "Test.", target: "ترجمہ", status: "final" });
    expect(requestChanges(s, "")).toBeNull();
    expect(requestChanges(s, "   ")).toBeNull();
  });
});

// ── Matrix G – Edit while changes-requested ──────────────────────────────────

describe("G: Edit target while changes-requested", () => {
  test("editing → note remains, fingerprint cleared", () => {
    const s = seg({ source: "Test.", target: "v1", status: "draft", reviewStatus: "changes-requested", reviewNote: "Fix it" });
    const patch = applyTargetEditReviewTransition(s, "v2");
    const updated = { ...s, target: "v2", ...patch };
    expect(updated.reviewStatus).toBe("changes-requested");
    expect(updated.reviewNote).toBe("Fix it");
    expect(updated.reviewedTargetFingerprint).toBe("");
  });
});

// ── Matrix H – Clear while changes-requested ─────────────────────────────────

describe("H: Clear target while changes-requested", () => {
  test("clear → note remains", () => {
    const s = seg({ source: "Test.", target: "v1", status: "draft", reviewStatus: "changes-requested", reviewNote: "Fix it" });
    const patch = applyTargetEditReviewTransition(s, "");
    const updated = { ...s, target: "", ...patch };
    expect(updated.reviewNote).toBe("Fix it");
  });
});

// ── Matrix I – Mark Final after changes-requested ────────────────────────────

describe("I: Mark Final after changes-requested (resubmission)", () => {
  test("→ Final + unreviewed + note retained = ready for review", () => {
    const s = seg({ source: "Test.", target: "revised", status: "draft", reviewStatus: "changes-requested", reviewNote: "Fix it" });
    const patch = applyMarkFinalReviewTransition(s);
    const updated = { ...s, status: "final" as const, ...patch };
    expect(updated.reviewStatus).toBe("unreviewed");
    expect(updated.reviewNote).toBe("Fix it");
    expect(getReviewDisplayState(updated)).toBe("ready");
  });
});

// ── Matrix J – Approve resubmission with previous note ───────────────────────

describe("J: Approve resubmitted segment (previous note retained)", () => {
  test("approving a Ready segment with prior note keeps the note", () => {
    const tgt = "revised ترجمہ";
    const s = seg({ source: "Test.", target: tgt, status: "final", reviewStatus: "unreviewed", reviewNote: "Old note from previous cycle" });
    const updated = approveSegment(s);
    expect(updated).not.toBeNull();
    expect(updated!.reviewStatus).toBe("approved");
    expect(updated!.reviewNote).toBe("Old note from previous cycle");
  });
});

// ── QA does not block approval ────────────────────────────────────────────────

describe("QA does not block approval", () => {
  test("segment with number mismatch can still be approved by reviewer", () => {
    const tgt = "19 اضلاع"; // wrong number (source has 18)
    const s = seg({ source: "18 districts", target: tgt, status: "final" });
    // approveSegment has no awareness of QA — reviewer is in control
    const updated = approveSegment(s);
    expect(updated).not.toBeNull();
    expect(updated!.reviewStatus).toBe("approved");
    expect(isEffectivelyApproved(updated!)).toBe(true);
  });
});

// ── Project review summary ────────────────────────────────────────────────────

describe("summarizeReviewState", () => {
  test("matrix §21: ready=1, approved=1, changesRequested=1, notReady=1", () => {
    const tgt = "ترجمہ";
    const segs: TranslationSegment[] = [
      seg({ id: makeSegmentId(1), order: 1, source: "A.", target: tgt, status: "final", reviewStatus: "unreviewed" }),
      seg({ id: makeSegmentId(2), order: 2, source: "B.", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) }),
      seg({ id: makeSegmentId(3), order: 3, source: "C.", target: tgt, status: "draft", reviewStatus: "changes-requested", reviewNote: "note" }),
      seg({ id: makeSegmentId(4), order: 4, source: "D.", target: tgt, status: "draft", reviewStatus: "unreviewed" }),
    ];
    const summary = summarizeReviewState(segs);
    expect(summary.ready).toBe(1);
    expect(summary.approved).toBe(1);
    expect(summary.changesRequested).toBe(1);
    expect(summary.notReady).toBe(1);
    expect(summary.ready + summary.approved + summary.changesRequested + summary.notReady).toBe(4);
  });
});

// ── Old project backward compatibility ───────────────────────────────────────

describe("backward compatibility: old v1 project without review fields", () => {
  test("parseProject assigns review defaults to all segments", () => {
    const raw = {
      schemaVersion: 1,
      id: generateProjectId(),
      name: "Legacy",
      sourceLanguage: "en", targetLanguage: "ur",
      brief: defaultBrief(),
      segments: [
        { id: "SEG-0001", order: 1, source: "Hello.", target: "سلام", sourceDir: "ltr", targetDir: "rtl", status: "final", sourceFingerprint: "abc" },
        { id: "SEG-0002", order: 2, source: "World.", target: "", sourceDir: "ltr", targetDir: "rtl", status: "untranslated", sourceFingerprint: "def" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const p = parseProject(raw);
    expect(p).not.toBeNull();
    for (const s of p!.segments) {
      expect(s.reviewStatus).toBe("unreviewed");
      expect(s.reviewNote).toBe("");
      expect(s.reviewedTargetFingerprint).toBe("");
    }
    // Final segment → ready, NOT auto-approved
    expect(isEffectivelyApproved(p!.segments[0])).toBe(false);
    expect(getReviewDisplayState(p!.segments[0])).toBe("ready");
  });
});

// ── Immutability ──────────────────────────────────────────────────────────────

describe("immutability of review helpers", () => {
  test("helpers return new objects, original unchanged", () => {
    const original = seg({ source: "Test.", target: "ترجمہ", status: "final" });
    const origCopy = { ...original };
    approveSegment(original);
    requestChanges(original, "note");
    applyTargetEditReviewTransition(original, "new");
    applyMarkFinalReviewTransition(original);
    expect(original.reviewStatus).toBe(origCopy.reviewStatus);
    expect(original.reviewNote).toBe(origCopy.reviewNote);
    expect(original.reviewedTargetFingerprint).toBe(origCopy.reviewedTargetFingerprint);
  });
});

// ── 17C.1.1 required new tests ────────────────────────────────────────────────

describe("17C.1.1 — Fix 1: changes-requested clear keeps reviewStatus", () => {
  test("clear target while changes-requested → reviewStatus stays changes-requested, note retained, fingerprint cleared", () => {
    const s = seg({ source: "Test.", target: "existing", status: "draft", reviewStatus: "changes-requested", reviewNote: "Please revise this wording." });
    const patch = applyTargetEditReviewTransition(s, "");
    const updated = { ...s, target: "", ...patch };
    expect(updated.reviewStatus).toBe("changes-requested");
    expect(updated.reviewNote).toBe("Please revise this wording.");
    expect(updated.reviewedTargetFingerprint).toBe("");
  });
});

describe("17C.1.1 — Fix 2: stale approval display recovery", () => {
  test("A: Final + approved + stale fingerprint → ready", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint("something else") });
    expect(getReviewDisplayState(s)).toBe("ready");
  });
  test("B: Final + approved + empty fingerprint → ready", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "final", reviewStatus: "approved", reviewedTargetFingerprint: "" });
    expect(getReviewDisplayState(s)).toBe("ready");
  });
  test("C: Draft + approved + stale fingerprint → not-ready", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "draft", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint("other") });
    expect(getReviewDisplayState(s)).toBe("not-ready");
  });
  test("D: Final + approved + valid fingerprint → approved", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: ".", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) });
    expect(getReviewDisplayState(s)).toBe("approved");
  });
  test("Summary: stale-approved Final counts as ready, not approved or notReady", () => {
    const tgt = "ترجمہ";
    const staleApproved = seg({ id: makeSegmentId(1), order: 1, source: ".", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint("different") });
    const summary = summarizeReviewState([staleApproved]);
    expect(summary.ready).toBe(1);
    expect(summary.approved).toBe(0);
    expect(summary.notReady).toBe(0);
  });
});

describe("17C.1.1 — Fix 3: hardened approveSegment", () => {
  test("5: approveSegment(Draft) → null", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "draft" });
    expect(approveSegment(s)).toBeNull();
  });
  test("6: approveSegment(Final empty) → null", () => {
    const s = seg({ source: ".", target: "", status: "final" });
    expect(approveSegment(s)).toBeNull();
  });
  test("7: approveSegment(valid Ready) → Approved", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: ".", target: tgt, status: "final" });
    const updated = approveSegment(s);
    expect(updated).not.toBeNull();
    expect(updated!.reviewStatus).toBe("approved");
    expect(isEffectivelyApproved(updated!)).toBe(true);
  });
  test("already approved → null (cannot double-approve)", () => {
    const tgt = "ترجمہ";
    const s = seg({ source: ".", target: tgt, status: "final", reviewStatus: "approved", reviewedTargetFingerprint: segmentFingerprint(tgt) });
    expect(approveSegment(s)).toBeNull();
  });
  test("changes-requested (not resubmitted) → null", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "draft", reviewStatus: "changes-requested", reviewNote: "note" });
    expect(approveSegment(s)).toBeNull();
  });
});

describe("17C.1.1 — Fix 4: hardened requestChanges", () => {
  test("8: requestChanges(Draft) → null", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "draft" });
    expect(requestChanges(s, "note")).toBeNull();
  });
  test("9: requestChanges(Final empty) → null", () => {
    const s = seg({ source: ".", target: "", status: "final" });
    expect(requestChanges(s, "note")).toBeNull();
  });
  test("10: requestChanges(Final + blank note) → null", () => {
    const s = seg({ source: ".", target: "ترجمہ", status: "final" });
    expect(requestChanges(s, "   ")).toBeNull();
  });
});

describe("17C.1.1 — Fix 5: reviewNote capped at parse time", () => {
  test("11: 700-char stored reviewNote parsed to 500", () => {
    const longNote = "x".repeat(700);
    const raw = {
      schemaVersion: 1,
      id: "test-id",
      name: "Test",
      sourceLanguage: "en", targetLanguage: "ur",
      brief: defaultBrief(),
      segments: [{
        id: "SEG-0001", order: 1, source: "Test.", target: "ترجمہ",
        sourceDir: "ltr", targetDir: "rtl", status: "final",
        sourceFingerprint: "abc",
        reviewStatus: "changes-requested",
        reviewNote: longNote,
        reviewedTargetFingerprint: "",
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const p = parseProject(raw);
    expect(p).not.toBeNull();
    expect(p!.segments[0].reviewNote.length).toBe(REVIEW_NOTE_MAX);
  });
  test("valid note ≤500 chars unchanged", () => {
    const note = "x".repeat(300);
    const raw = {
      schemaVersion: 1, id: "test-id", name: "Test",
      sourceLanguage: "en", targetLanguage: "ur",
      brief: defaultBrief(),
      segments: [{ id: "SEG-0001", order: 1, source: "Test.", target: "ترجمہ", sourceDir: "ltr", targetDir: "rtl", status: "draft", sourceFingerprint: "abc", reviewNote: note, reviewStatus: "changes-requested", reviewedTargetFingerprint: "" }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const p = parseProject(raw);
    expect(p!.segments[0].reviewNote.length).toBe(300);
  });
});
