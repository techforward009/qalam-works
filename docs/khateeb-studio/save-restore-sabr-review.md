# My Sermon persistence and three-session patience pilot — 2026-10-06

## Result

My Sermon writes changes immediately, reopens the last active draft, and retains personal section notes when research, source selections, format, or duration change. Removed source sections retain their notes for later reselection. Storage failures keep the in-memory text available for export and never announce a successful save. Nested project validation rejects damaged records without deleting their bytes.

Backup restoration validates every record before mutation. Existing drafts are preserved; a different version of the same draft becomes a separate record. Repeated restoration of an already-present version is idempotent. A quota failure rolls back newly imported records. Opening a restored draft is immediate. Existing version-1 backups remain supported; the optional section-note cache preserves temporarily inactive sections.

The new patience pilot has three distinct sessions: responsible action, speech/decisions under distress, and mutual support. Every session has five timed blocks, full source verses and named translations, original editorial delivery paragraphs, explanation, a clearly hypothetical example, audience question, action, and connected opening/close. The second session uses the existing verified Mishkat 1625 Arabic record and its separately labelled editorial translations; the source record is unchanged. Five additional verse translations were extracted unchanged from the complete reader corpus, with exact corpus comparison tests.

Whole-series copying includes all three complete preparations for the selected duration. Individual preparation copying uses the same workbench text. Custom draft copying has success feedback and a full selected-text fallback. Custom printing isolates the active draft from the topic preparation; source Arabic remains separately styled. No preview deployment is needed for these checks.

## Validation

- Production webpack build including TypeScript passed.
- Full suite: 3,842 passed, zero failures, 10 intentionally skipped.
- Focused unit/UI checks passed, including immediate unmount/remount, damaged records, malformed backup rejection, quota rollback, older-version preservation, exact source strings/translations, timing totals for 20/30/45 minutes, note preservation across source changes, manual copy and custom print targeting.
- Eight production-build browser flows passed: Urdu and English on desktop and mobile, immediate reload, exact backup download/import, conflicting and repeated import, whole/individual copying, denied-clipboard selection and Escape, isolated custom printing, and complete series printing. Zero application page errors and no horizontal overflow.
- PDF extraction confirmed all three session titles, 2:156, 103:3, and the 1625 reference in English. Urdu and English PDFs contain text on every page; Urdu printed pages were visually inspected for readable joining, wrapping, and continuous pagination.
