# Speaking-guide continuity and source-inclusive copying

The global language provider now starts with the same English state during server rendering and browser hydration, then restores the saved browser language after mounting. This fixes the Urdu preference hydration mismatch identified during the death-topic pilot. HTML language and direction still follow the selected language. The existing preference key is preserved.

The Khateeb speaking guide remembers brief/detailed selection under a versioned browser-storage key. Restoration never writes a default over the saved choice. Invalid values fall back to detailed; blocked browser storage leaves the guide fully usable for the current visit.

Death-topic copying now includes the related ready study records, scholarly attribution, book/page references, source URLs, and an explicit editorial-summary label. Detailed copies include the existing paraphrased material; brief copies include summaries and references. Unrelated or non-ready records are excluded. The main speaking guide remains distinct from the scholarly study appendix.

Validation: the full repository suite passed 3,708 tests with zero failures and ten skips after the language/preference change. The final focused Khateeb/language suite passed 338 tests with zero failures, including the source-inclusive export changes. Hydration tests cover saved Urdu/English, server text, recovery errors, document direction, switching, invalid preferences, and unavailable storage. Preference tests cover restoration, remount, and unavailable storage. Export tests cover both languages, references, detail selection, and exclusion of unrelated material. The production webpack build passed. Local Chromium verified saved Urdu, saved guide mode, reopening the page, source-inclusive clipboard text, mobile width, print visibility, and zero hydration/page errors.

This review commit does not move any hosted branch or create a Vercel deployment.
