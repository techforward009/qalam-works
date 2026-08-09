// Document Intelligence — Suggestion Review Workflow (2026-08-09). Pure
// state-management and text-application logic, deliberately separated
// from any editor/DOM concern so it's fully testable on its own (per
// the explicit priority on pure utility tests). The actual editor
// integration (finding a suggestion's real position in the live
// ProseMirror document and applying it there) lives in
// DocumentStudioEditor.tsx, which calls these pure functions plus a thin
// editor-specific position-finder — see that file's own comments.

import type { DocumentSuggestion } from "./generateDocumentSuggestions";

export interface SuggestionReviewState {
  pending: DocumentSuggestion[];
  accepted: DocumentSuggestion[];
  ignored: DocumentSuggestion[];
}

// Suggestions are regenerated fresh (new array, new object identities) on
// every edit, since generateDocumentSuggestions() re-scans the live text —
// so review decisions can't be tracked by array index or object reference
// across renders. This content-based key (type + the exact original text
// snippet) is stable enough in practice: two genuinely different issues
// of the same type essentially never share an identical text snippet.
export function suggestionKey(suggestion: DocumentSuggestion): string {
  return `${suggestion.type}::${suggestion.originalText}`;
}

export function createReviewState(suggestions: DocumentSuggestion[]): SuggestionReviewState {
  return { pending: suggestions, accepted: [], ignored: [] };
}

/**
 * Called whenever the document's text changes and suggestions are
 * re-generated from scratch (fresh object identities every time). This
 * keeps prior Accept/Ignore decisions intact for issues that are still
 * present, rather than having every edit anywhere in the document wipe
 * out the user's review progress on unrelated issues — while still
 * reflecting the CURRENT text (a freshly-fixed issue simply won't be in
 * `freshSuggestions` anymore and will correctly disappear).
 */
export function refreshPendingSuggestions(
  state: SuggestionReviewState,
  freshSuggestions: DocumentSuggestion[]
): SuggestionReviewState {
  const decidedKeys = new Set([...state.accepted, ...state.ignored].map(suggestionKey));
  const pending = freshSuggestions.filter((s) => !decidedKeys.has(suggestionKey(s)));
  return { pending, accepted: state.accepted, ignored: state.ignored };
}

/** Removes all currently-accepted suggestions from state (e.g. after applying them). */
export function clearAccepted(state: SuggestionReviewState): SuggestionReviewState {
  return { pending: state.pending, accepted: [], ignored: state.ignored };
}

function removeByKey(list: DocumentSuggestion[], key: string): { removed: DocumentSuggestion | undefined; rest: DocumentSuggestion[] } {
  const index = list.findIndex((s) => suggestionKey(s) === key);
  if (index === -1) return { removed: undefined, rest: list };
  return { removed: list[index], rest: [...list.slice(0, index), ...list.slice(index + 1)] };
}

/** Moves one suggestion from pending → accepted. No-op if the key isn't found in pending. */
export function acceptSuggestion(state: SuggestionReviewState, key: string): SuggestionReviewState {
  const { removed, rest } = removeByKey(state.pending, key);
  if (!removed) return state;
  return { pending: rest, accepted: [...state.accepted, removed], ignored: state.ignored };
}

/** Moves one suggestion from pending → ignored. No-op if the key isn't found in pending. */
export function ignoreSuggestion(state: SuggestionReviewState, key: string): SuggestionReviewState {
  const { removed, rest } = removeByKey(state.pending, key);
  if (!removed) return state;
  return { pending: rest, accepted: state.accepted, ignored: [...state.ignored, removed] };
}

// Batch Actions (2026-08-09) — safe by design: only ever moves items that
// are currently PENDING in the given category. Never touches items
// already accepted or ignored, and never affects any other category.
// Deliberately no "accept/ignore ALL categories" or "Fix All" action —
// each batch action is scoped to one category at a time, matching the
// explicit requirement not to add a global bulk action.
export function acceptCategory(state: SuggestionReviewState, category: DocumentSuggestion["category"]): SuggestionReviewState {
  const toAccept = state.pending.filter((s) => s.category === category);
  const stillPending = state.pending.filter((s) => s.category !== category);
  return { pending: stillPending, accepted: [...state.accepted, ...toAccept], ignored: state.ignored };
}

export function ignoreCategory(state: SuggestionReviewState, category: DocumentSuggestion["category"]): SuggestionReviewState {
  const toIgnore = state.pending.filter((s) => s.category === category);
  const stillPending = state.pending.filter((s) => s.category !== category);
  return { pending: stillPending, accepted: state.accepted, ignored: [...state.ignored, ...toIgnore] };
}

/**
 * Applies ONE suggestion to a plain-text string: replaces the FIRST
 * verbatim occurrence of `originalText` with `suggestedText`. Stale-safe
 * by design — if `originalText` no longer appears (the document changed
 * since the suggestion was generated, or the suggestion is a document-
 * level advisory like numeral/punctuation consistency that was never a
 * literal substring to begin with), the text is returned UNCHANGED
 * rather than guessing or applying a wrong edit. This is also why this
 * function never does a global/bulk replace — only ever the first match,
 * matching "no destructive bulk replacement."
 */
export function applySuggestionToText(text: string, suggestion: DocumentSuggestion): string {
  const index = text.indexOf(suggestion.originalText);
  if (index === -1) return text;
  return text.slice(0, index) + suggestion.suggestedText + text.slice(index + suggestion.originalText.length);
}

/**
 * Applies a list of accepted suggestions to a plain-text string, one at a
 * time, each against the result of the previous application — so later
 * suggestions still find their target text even if an earlier
 * replacement shifted character positions. Suggestions whose original
 * text can no longer be found (already applied, or no longer present)
 * are silently skipped rather than erroring.
 */
export function applyAcceptedSuggestions(text: string, accepted: DocumentSuggestion[]): string {
  return accepted.reduce((currentText, suggestion) => applySuggestionToText(currentText, suggestion), text);
}
