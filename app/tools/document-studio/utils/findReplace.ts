// Phase 1 Professional Usability (2026-08-09) — Find & Replace. Pure
// text-matching logic, deliberately separated from any editor/DOM
// concern so it's fully testable on its own. The actual editor
// integration (finding these matches' real positions in the live
// ProseMirror document and performing selection/replacement) lives in
// DocumentStudioEditor.tsx, which calls this pure function per text node
// while walking the document — the same separation-of-concerns pattern
// already established for suggestionReview.ts/generateDocumentSuggestions.ts.

export interface TextMatch {
  index: number;
  length: number;
}

/**
 * Pure — finds every occurrence of `searchText` within `text`, returning
 * each match's start index and length. Case-insensitive by default
 * (matches how most "Find" tools behave out of the box). Returns an
 * empty array for an empty search string rather than matching every
 * position (which `"".indexOf("")` would otherwise do endlessly).
 */
export function findAllTextMatches(text: string, searchText: string, caseSensitive = false): TextMatch[] {
  if (!searchText) return [];

  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? searchText : searchText.toLowerCase();

  const matches: TextMatch[] = [];
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    matches.push({ index, length: searchText.length });
    index = haystack.indexOf(needle, index + needle.length);
  }
  return matches;
}
