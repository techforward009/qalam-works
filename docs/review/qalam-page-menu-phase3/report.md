# Phase 3 — Window menu and safe document switching

PR #144, branch `feat/qalam-page-inpage-menus`, based on
`602a74c7194179a91d25ffcd5f36224b85003937`. Phase 3 only.

## Architecture and decisions

- Inspected `DocumentStudioEditor`, `DocumentLibraryDialog`, `documentLibrary`,
  the IndexedDB backend, `DocumentMenuBar`, `documentMenus`, and page navigation.
- Library rows are saved documents, not open windows. The editor now keeps a
  separate, ordered, ID-deduplicated in-memory list populated only when an
  existing record is applied. Initial open, New, library Open and InPage Import
  use that same path. Rename updates actual titles. No fabricated names or
  library-wide enumeration are used to populate Window.
- The open list belongs to this mounted editor session. Reload opens the saved
  active record as a new session; it does not reopen every library record.
  Resetting this list never deletes stored records. Explicit library Delete
  retains its existing confirmation and removes that record's session entry.
- InPage's Ribbon / Page / View entries are workspace activation commands.
  Qalam has one Page editing workspace, not separate MDI page windows.
  Window → Page / Alt+F12 activates that workspace, retaining the selection,
  document and current Single/Facing/Pageless mode. With Arrow selected it
  focuses the scroller rather than enabling typing. The existing Single Page
  action remains accessible in View's Qalam-only section.
- Cascade, Tile, Close All, Ribbon and View remain Coming soon. This phase does
  not invent window-management features or implement reference dialogs.

## Data protection

- A synchronous transition guard rejects overlapping New/Open/Import requests.
  Editing is briefly disabled and the editor root is inert while the guarded
  transition runs; it is restored even after an error.
- Cancel the debounce timer, drain the editor-owned write queue, and save a
  current full content/title/settings snapshot through the existing library
  API before creating or loading another document. IndexedDB resolves writes
  only after transaction completion. Autosave, settings and rename now share
  the queue, preventing read/modify/write metadata races.
- Object frames and minimum-page counts retain their existing separate storage.
  Validate that the shared maps can be read, then flush and read back both before
  switching, since the existing helpers swallow storage exceptions. A mismatch blocks switching. Column count/gutter are
  retained per open document in memory (their existing model is session-only).
- Failed saves or failed destination reads leave the current editor intact and
  show an actionable alert; manual retry is supported. A rejected queue entry
  does not poison subsequent retries. New Document no longer changes the old
  document's page floor/layout before its save succeeds.
- Reuse `applyRecordToEditor`, `persistActiveNow`, the existing document library
  and InPage importer. No parser, storage schema, font, PDF or deployment changes.
  Existing memory-only storage still has its existing temporary-storage warning;
  this work cannot make unavailable browser persistence durable.

## Tests-first and bounded corrections

The new real browser test was run against unchanged Phase 2 source and failed
because numbered Window document entries did not exist. Queue tests also failed
before the queue helper existed. Initial local attempts using 127.0.0.1 could not
initialize the editor; the temporary test configuration uses localhost instead.
No repository configuration was changed for this.

Two targeted correction rounds addressed keyboard entry into an already-open
menu and preserved the existing Single Page action. The final browser test enters
Window via ArrowDown, then End and Enter, and verifies actual document switching.
No further phases were started.

## Final verification

- `npx tsc --noEmit`: PASS.
- `npx vitest run tests/documentSessionWrites.test.ts tests/documentMenuPhase1.test.ts tests/documentMenuBar.test.tsx tests/inpageParser.test.ts tests/inpageSetup.test.ts tests/plainTextToDocNode.test.ts`: 46 passed, 0 failed.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase3-playwright.config.ts tests/e2e/documentStudioWindowPhase3.spec.ts tests/e2e/documentStudioImportPhase2.spec.ts tests/e2e/documentStudioMenuPhase1.spec.ts tests/e2e/documentStudioInpageMenus.spec.ts --project=desktop-chrome --project=mobile-android --workers=1`: 53 passed, 1 failed in the combined final run (see the intermittent assertion below).
- All 12 Phase 3 Window cases passed (6 cases on each project).
- The existing desktop TXT case at `documentStudioImportPhase2.spec.ts:55`
  uses an immediate `allTextContents()` equality assertion. In the final run it
  observed only the first paragraph. The assertion does not wait for rendering.
  It had passed in earlier combined runs (including a 52/52 run before the final
  strict storage-read guard) and passed again without any code/assertion change:
  `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase3-playwright.config.ts tests/e2e/documentStudioImportPhase2.spec.ts --project=desktop-chrome --project=mobile-android --workers=1 --grep 'TXT import preserves' --output=/tmp/qalam-phase3-txt-recheck`: 2 passed, 0 failed.
  This intermittent existing assertion is reported, not silently fixed or
  counted as a clean combined run. No baseline-on-main claim is made.
- Temporary Playwright config imports the repository config, uses the local dev
  server at `http://localhost:3242`, writes artifacts under `/tmp`, and sets
  `webServer: undefined`; no build or production-site testing occurs.
- Coverage: saved-but-unopened record excluded; numbered actual titles; active
  checkmark; rename; repeated switches; immediate Urdu edits before switching;
  save failure and recovery; imported real InPage fixture/settings round trip;
  object/page-floor isolation; denied object-storage reads; competing library open requests; keyboard menu
  access; Alt+F12 scope; frozen Phase 1 top bar; Phase 2 INP/TXT/DOCX and corrupt
  inputs; Ctrl+Y Redo. No full suites run.

Unrelated GitHub font CI failures, including the previously reported Jameel
availability failure, were not investigated or changed in this phase.

Keep PR #144 draft. No merge or production deployment. Stop after Phase 3.
