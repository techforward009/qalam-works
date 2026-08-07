# Qalam Works — AI Collaboration Rules

This file is the operational policy for how AI collaborators work on this
codebase day to day. It is separate from `DECISIONS.md`: that file is a
historical log of one-time decisions; this file is the standing process
every AI follows on every task, and gets referenced/updated as the
workflow itself evolves.

---

## Roles

- **ChatGPT** — Product architecture, roadmap, scope control, merge
  review.
- **Claude** — Complex technical architecture, TipTap/ProseMirror, state
  management, risky refactors, senior code review.
- **Gemini** — UI implementation, Tailwind, utilities, tests,
  repetitive/low-risk coding.
- **Sajjad** — Product owner, live testing, final approval.

Role assignment is risk-based, not model-based: it reflects which parts
of the codebase are expensive to get wrong, not a claim that one model is
categorically better than another. See `DECISIONS.md` → "AI Collaboration
Policy — Risk-Based Role Division" for the reasoning behind this.

---

## Mandatory Pre-Coding Rule

Before modifying code, the AI must:

1. Open and inspect the exact current file(s).
2. Verify the current branch/commit when repository state matters.
3. Quote or summarize only what is actually present.
4. Identify exact files to change.
5. Prefer the smallest safe diff.
6. Reuse existing utilities and types.
7. Do not invent state, functions, paths, interfaces, or architecture.
8. Do not replace existing architecture unless explicitly approved.

This rule applies to any AI used on this project, present or future —
it is not specific to Claude or Gemini.

---

## Risk Rule

High-risk work must go through Claude or ChatGPT review before merge:

- TipTap / ProseMirror
- editor state/history/undo
- persistence/autosave
- file conversion/export
- authentication/payments
- shared architecture/refactors

Lower-risk work may be implemented by Gemini:

- presentational UI
- Tailwind styling
- isolated utilities
- tests
- copy/labels
- straightforward components

---

## Verification Rule

No task is complete until applicable checks pass:

- `npm test`
- `npx tsc --noEmit`
- production build
- live browser verification for UI/editor behavior

The AI must clearly distinguish, in its own report of the work:

- verified output (actually run and observed)
- inferred/expected behavior (reasoned about but not run)
- manual verification still required (needs Sajjad to check live)
