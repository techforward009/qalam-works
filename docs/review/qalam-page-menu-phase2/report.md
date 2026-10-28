# PR #144 — Phase 2: repair File → Import

Starting head: `d1c5d700da66ad7257b14bf74c485101003dd48f`.

## Change

File → Import still dispatches the existing `file.upload` action to the same picker. Its accept list now includes `.inp,.txt,.docx`. A case-insensitive `.inp` filename goes to the existing `handleInPageFile`; TXT/DOCX continue through the existing `handleUploadFile` and shared validation/extraction path.

No new parser, storage behavior, page-setup mapping, font or PDF logic was introduced. Existing InPage 32MB protection and TXT/DOCX 5MB validation remain unchanged. Unsupported-file feedback now correctly names all three supported extensions. Switching import formats clears stale error notices; import failures have explicit accessible alert identification, separate from Next.js's route announcer.

The existing InPage handler still creates a new document, imports its longest story and offers the other stories for copying. The original library-based InPage picker remains intact. TXT/DOCX still replace the active document's text and keep the existing DOCX plain-text confirmation/notice behavior.

## Tests first and correction budget

The first Playwright test chose the actual repository fixture `tests/fixtures/inpage/hadiyat.inp` through **File → Import** before implementation. It failed, and the browser error snapshot showed `Only .txt and .docx files are supported.`

Two targeted check/correction cycles were used. The first confirmed all valid formats; invalid-case tests exposed missing alert semantics for TXT/DOCX and an ambiguous selector matching Next's empty route announcer. The final cycle checks the actual application import notice and verifies unchanged document data plus successful recovery after each rejected file.

## Final local results

- `npx tsc --noEmit`: **passed**.
- `npx vitest run tests/inpageParser.test.ts tests/inpageSetup.test.ts tests/plainTextToDocNode.test.ts tests/documentMenuPhase1.test.ts tests/documentMenuBar.test.tsx`: **42 passed, 0 failed**.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase2-playwright.config.ts tests/e2e/documentStudioImportPhase2.spec.ts tests/e2e/documentStudioInpageMenus.spec.ts tests/e2e/documentStudioMenuPhase1.spec.ts --project=desktop-chrome --project=mobile-android --workers=1`: **42 passed, 0 failed** (16 import cases plus 26 Phase 1/menu/shortcut checks).
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase2-playwright.config.ts tests/e2e/documentStudio.spec.ts --project=desktop-chrome --project=mobile-android --workers=1 --grep 'imports InPage fixture page setup|opens generated InPage text' --output=/tmp/qalam-phase2-legacy-results`: **4 passed, 0 failed**, preserving the original library import route.
- `git diff --check`: **passed**.

The temporary Playwright config used the local dev server on port 3242 with `webServer: undefined`. No production build or live-production tests were run. Phase 1's always-on frozen bar geometry fixture, menus, popup bounds and keyboard checks passed; a second main-server pixel comparison was not needed or repeated in this phase.

The real fixture checks Urdu passages, alternate-story access, A5 aspect ratio, dimensions **419.527 × 595.275pt**, left/right margins **57.6pt**, top **50.976pt**, bottom **32.976pt**, starting page **77**, and content/settings after reload. TXT preserves blank lines; generated DOCX preserves Urdu paragraphs and the original plain-text warning. Unsupported BIN, corrupt/empty INP and corrupt DOCX are rejected without changing document JSON, active ID or page width, and a subsequent valid import clears the error. Ctrl+Y is explicitly verified as Redo, with no file chooser.

## Separate, unrelated font CI status

The owner-reported GitHub font failures, including **Jameel font availability**, are outside Phase 2 and were not fixed. `gh pr checks 144` could not retrieve authoritative job results: the workspace's GitHub API request returned `Forbidden`. Exact current GitHub failure counts/logs therefore cannot be independently reported from this environment.

For separation of concerns, only two offline metadata assertions were sampled using `npx vitest run tests/fontRegistry.test.ts -t 'Jameel uses the public Blob|all Blob families are available'`. Both passed on this branch and unchanged main `fc951100` (**2 passed, 16 filtered/skipped on each**). These metadata checks do **not** verify live Cloudflare/Jameel delivery or supersede the reported GitHub availability failure. No live font delivery scripts, font changes, workflow changes or infrastructure fixes were attempted.

## Stop point

Only Phase 2 is implemented. Phase 1 menu code and the Ctrl+Y binding are unchanged. No font files, parser, PDF code, document storage, packages, lockfile or workflows changed. Keep PR #144 draft and wait for owner approval before Phase 3. No merge or production deployment.
