import {
  createReviewState,
  acceptSuggestion,
  ignoreSuggestion,
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
