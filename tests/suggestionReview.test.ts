import {
  createReviewState,
  acceptSuggestion,
  ignoreSuggestion,
  acceptCategory,
  ignoreCategory,
  applySuggestionToText,
  applyAcceptedSuggestions,
  suggestionKey,
} from "../app/tools/document-studio/utils/suggestionReview";
import type { DocumentSuggestion } from "../app/tools/document-studio/utils/generateDocumentSuggestions";

function suggestion(overrides: Partial<DocumentSuggestion> = {}): DocumentSuggestion {
  return {
    type: "unicode-arabic-yeh",
    category: "unicode",
    severity: "medium",
    originalText: "علي",
    suggestedText: "علی",
    explanation: "test",
    contextBefore: "",
    contextAfter: "",
    ...overrides,
  };
}

describe("createReviewState", () => {
  test("puts all suggestions in pending, accepted/ignored start empty", () => {
    const s1 = suggestion();
    const s2 = suggestion({ originalText: "كتاب", suggestedText: "کتاب" });
    const state = createReviewState([s1, s2]);
    expect(state.pending).toEqual([s1, s2]);
    expect(state.accepted).toEqual([]);
    expect(state.ignored).toEqual([]);
  });

  test("an empty suggestion list produces an empty state", () => {
    const state = createReviewState([]);
    expect(state.pending).toEqual([]);
  });
});

describe("acceptSuggestion", () => {
  test("moves the matching suggestion from pending to accepted", () => {
    const s1 = suggestion();
    let state = createReviewState([s1]);
    state = acceptSuggestion(state, suggestionKey(s1));
    expect(state.pending).toHaveLength(0);
    expect(state.accepted).toEqual([s1]);
    expect(state.ignored).toHaveLength(0);
  });

  test("only moves the matching suggestion, leaves others pending", () => {
    const s1 = suggestion();
    const s2 = suggestion({ originalText: "كتاب", suggestedText: "کتاب" });
    let state = createReviewState([s1, s2]);
    state = acceptSuggestion(state, suggestionKey(s1));
    expect(state.pending).toEqual([s2]);
    expect(state.accepted).toEqual([s1]);
  });

  test("is a no-op if the key is not found in pending (e.g. already accepted)", () => {
    const s1 = suggestion();
    let state = createReviewState([s1]);
    state = acceptSuggestion(state, suggestionKey(s1));
    const stateAfterFirstAccept = state;
    state = acceptSuggestion(state, suggestionKey(s1)); // key no longer in pending
    expect(state).toEqual(stateAfterFirstAccept);
  });

  test("does not mutate the original state object", () => {
    const s1 = suggestion();
    const original = createReviewState([s1]);
    const originalPendingRef = original.pending;
    acceptSuggestion(original, suggestionKey(s1));
    expect(original.pending).toBe(originalPendingRef);
    expect(original.accepted).toHaveLength(0);
  });
});

describe("ignoreSuggestion", () => {
  test("moves the matching suggestion from pending to ignored", () => {
    const s1 = suggestion();
    let state = createReviewState([s1]);
    state = ignoreSuggestion(state, suggestionKey(s1));
    expect(state.pending).toHaveLength(0);
    expect(state.ignored).toEqual([s1]);
    expect(state.accepted).toHaveLength(0);
  });

  test("is a no-op if the key is not found in pending", () => {
    const s1 = suggestion();
    const state = createReviewState([s1]);
    const result = ignoreSuggestion(state, "nonexistent::key");
    expect(result).toEqual(state);
  });
});

describe("accept and ignore together", () => {
  test("suggestions can be independently accepted and ignored, pending shrinks accordingly", () => {
    const s1 = suggestion();
    const s2 = suggestion({ type: "unicode-arabic-kaf", originalText: "كتاب", suggestedText: "کتاب" });
    const s3 = suggestion({ type: "spacing-multiple-spaces", category: "spacing", originalText: "یہ  ہے", suggestedText: "یہ ہے" });
    let state = createReviewState([s1, s2, s3]);
    state = acceptSuggestion(state, suggestionKey(s1));
    state = ignoreSuggestion(state, suggestionKey(s2));
    expect(state.pending).toEqual([s3]);
    expect(state.accepted).toEqual([s1]);
    expect(state.ignored).toEqual([s2]);
  });
});

describe("applySuggestionToText", () => {
  test("replaces the first occurrence of originalText with suggestedText", () => {
    const result = applySuggestionToText("علي نے کہا", suggestion());
    expect(result).toBe("علی نے کہا");
  });

  test("leaves the text completely unchanged when originalText is not found (stale-safe)", () => {
    const text = "یہ ایک مختلف جملہ ہے";
    const result = applySuggestionToText(text, suggestion());
    expect(result).toBe(text);
  });

  test("only replaces the FIRST occurrence, not all of them (no bulk replacement)", () => {
    const result = applySuggestionToText("علي اور علي", suggestion());
    expect(result).toBe("علی اور علي");
  });

  test("preserves all surrounding text exactly", () => {
    const result = applySuggestionToText("ابتداء: علي، انتہا", suggestion());
    expect(result).toBe("ابتداء: علی، انتہا");
  });
});

describe("applyAcceptedSuggestions", () => {
  test("applies multiple accepted suggestions in sequence", () => {
    const s1 = suggestion();
    const s2 = suggestion({ type: "unicode-arabic-kaf", originalText: "كتاب", suggestedText: "کتاب" });
    const result = applyAcceptedSuggestions("علي نے كتاب پڑھی", [s1, s2]);
    expect(result).toBe("علی نے کتاب پڑھی");
  });

  test("an empty accepted list leaves the text completely unchanged", () => {
    const text = "یہ ایک جملہ ہے";
    expect(applyAcceptedSuggestions(text, [])).toBe(text);
  });

  test("skips a suggestion whose text can no longer be found, without erroring", () => {
    const s1 = suggestion({ originalText: "غیر موجود متن" });
    const text = "یہ ایک عام جملہ ہے";
    expect(applyAcceptedSuggestions(text, [s1])).toBe(text);
  });

  test("unrelated text outside any suggestion's scope is preserved exactly", () => {
    const s1 = suggestion();
    const text = "تعارف: علي یہاں ہے۔ باقی متن بالکل غیر متعلق اور طویل ہے۔";
    const result = applyAcceptedSuggestions(text, [s1]);
    expect(result).toContain("باقی متن بالکل غیر متعلق اور طویل ہے۔");
    expect(result).toContain("تعارف:");
  });
});

describe("suggestionKey", () => {
  test("produces the same key for two structurally identical suggestions (stability across regeneration)", () => {
    const a = suggestion();
    const b = suggestion();
    expect(suggestionKey(a)).toBe(suggestionKey(b));
  });

  test("produces different keys for different types even with the same text", () => {
    const a = suggestion({ type: "unicode-arabic-yeh" });
    const b = suggestion({ type: "unicode-arabic-kaf" });
    expect(suggestionKey(a)).not.toBe(suggestionKey(b));
  });
});

describe("acceptCategory (Batch Actions)", () => {
  test("accepts all pending suggestions in the given category, leaves others pending", () => {
    const s1 = suggestion({ category: "unicode" });
    const s2 = suggestion({ type: "unicode-arabic-kaf", category: "unicode", originalText: "ك", suggestedText: "ک" });
    const s3 = suggestion({ type: "spacing-multiple-spaces", category: "spacing", originalText: "  ", suggestedText: " " });
    let state = createReviewState([s1, s2, s3]);
    state = acceptCategory(state, "unicode");
    expect(state.pending).toEqual([s3]);
    expect(state.accepted).toEqual([s1, s2]);
  });

  test("does not affect already-accepted or already-ignored items", () => {
    const s1 = suggestion({ category: "unicode" });
    const s2 = suggestion({ type: "unicode-arabic-kaf", category: "unicode", originalText: "ك", suggestedText: "ک" });
    let state = createReviewState([s1, s2]);
    state = acceptSuggestion(state, suggestionKey(s1));
    const acceptedBefore = state.accepted;
    state = acceptCategory(state, "unicode");
    expect(state.accepted).toEqual([...acceptedBefore, s2]);
    expect(state.accepted).toHaveLength(2);
  });

  test("a category with no pending items is a no-op", () => {
    const s1 = suggestion({ category: "spacing" });
    const state = createReviewState([s1]);
    const result = acceptCategory(state, "unicode");
    expect(result).toEqual(state);
  });
});

describe("ignoreCategory (Batch Actions)", () => {
  test("ignores all pending suggestions in the given category, leaves others pending", () => {
    const s1 = suggestion({ category: "unicode" });
    const s2 = suggestion({ type: "spacing-multiple-spaces", category: "spacing", originalText: "  ", suggestedText: " " });
    let state = createReviewState([s1, s2]);
    state = ignoreCategory(state, "unicode");
    expect(state.pending).toEqual([s2]);
    expect(state.ignored).toEqual([s1]);
  });

  test("does not affect a different category's pending items", () => {
    const s1 = suggestion({ category: "unicode" });
    const s2 = suggestion({ type: "structure-empty-paragraphs", category: "structure", originalText: "x", suggestedText: "y" });
    let state = createReviewState([s1, s2]);
    state = ignoreCategory(state, "structure");
    expect(state.pending).toEqual([s1]);
    expect(state.ignored).toEqual([s2]);
  });
});

describe("suggestionKey — duplicate-instance fix (Maintenance Batch, 2026-08-09)", () => {
  test("two identical issue types with different surrounding context produce DISTINCT keys", () => {
    const s1 = suggestion({ type: "typography-repeated-word", contextBefore: "پہلا پیراگراف: ", originalText: "یہ یہ", contextAfter: " ہے" });
    const s2 = suggestion({ type: "typography-repeated-word", contextBefore: "دوسری جگہ، ", originalText: "یہ یہ", contextAfter: " دوبارہ" });
    expect(suggestionKey(s1)).not.toBe(suggestionKey(s2));
  });

  test("two suggestions with genuinely identical context still produce the same key (expected, rare edge case)", () => {
    const s1 = suggestion({ contextBefore: "same", originalText: "same", contextAfter: "same" });
    const s2 = suggestion({ contextBefore: "same", originalText: "same", contextAfter: "same" });
    expect(suggestionKey(s1)).toBe(suggestionKey(s2));
  });

  test("accepting one of two distinctly-keyed instances leaves the other pending", () => {
    const s1 = suggestion({ originalText: "یہ یہ", contextBefore: "پہلا: ", contextAfter: "" });
    const s2 = suggestion({ originalText: "یہ یہ", contextBefore: "دوسرا: ", contextAfter: "" });
    let state = createReviewState([s1, s2]);
    state = acceptSuggestion(state, suggestionKey(s1));
    expect(state.pending).toEqual([s2]);
    expect(state.accepted).toEqual([s1]);
  });

  test("document-level advisories (empty context) are unaffected by this change", () => {
    const s1 = suggestion({ type: "numeral-mixed", category: "numeral", contextBefore: "", originalText: "2024 / ۱۲۳", contextAfter: "" });
    expect(suggestionKey(s1)).toBe("numeral-mixed::::2024 / ۱۲۳::");
  });
});
