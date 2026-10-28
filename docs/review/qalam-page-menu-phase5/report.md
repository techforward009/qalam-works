# Phase 5 — Drawing objects in both PDF paths

PR #144, `feat/qalam-page-inpage-menus`, based on `34b2e47c387ac42b0bb2546da4aa88a79b01af8b`.

## Changes

- New shared `printableFrames` adapter validates and renders the existing five
  StudioFrame kinds: rect, ellipse, round-rect, line and text. SVG geometry uses
  physical millimetres, 1 CSS-pixel black outlines, transparent fill, the existing
  6.35mm rounded radius and both line diagonals. Array order is retained.
- Optional request `frames` carries current React frame state independently of
  TipTap JSON. File Print and Phase 4 recovery also receive current frames
  explicitly; no export reads localStorage. Existing requests with no frames
  retain their original path and were tested with real server PDFs.
- Limits: 200 frames, page numbers 1–100, finite geometry bounded to ±2000mm
  (positive dimensions), 10,000 UTF-16 units per text frame, 50,000 combined text
  units and a 256KiB complete frame payload. Combined story/frame font-discovery
  content also passes existing source complexity limits. Invalid payloads return
  JSON HTTP 400 before browser rendering. Text/IDs are escaped; shapes contain
  only generated SVG. No user SVG, HTML, URLs or CSS are accepted.
- Frame text participates in existing font loading and unchanged Unicode/font
  guards before its guarded markup is detached. Only story text enters existing
  ink measurement/pagination. Afterwards physical-page wrappers place the
  unchanged measured story at its original margins and add the guarded frames.
  Native print margins are zero only for this frames path, allowing objects in
  page-margin areas without clipping. Existing header/footer templates remain.
  Assigned object pages can legitimately extend the story's page count.
- Browser print retains its existing clone/font-readiness/print portal. With
  frames, zero native margins plus cloned page padding preserve story margins on
  each fragment; clipped physical-page object layers provide correct placement.
  No-frame print CSS remains unchanged. No second print engine was introduced.
- Shared print fonts use the registry's physical stack, not unresolved Next font
  variables. Local important priority isolates frame fonts from broad editor CSS;
  mobile text autosizing is disabled for fixed physical text geometry.
- No changes to stored data/schema/autosave, canvas appearance/drawing handlers,
  menus, Window Page/Alt+F12, status/page controls, font files/settings, Digital
  Khatt handling, pdfInkPagination, existing font guards, limiter or infrastructure.

## Tests and evidence

Tests were written first. The real baseline export had **zero rectangle pixels**
at its expected position while the saved rectangle was visible in the editor.

- `npx tsc --noEmit`: passed.
- `npx vitest run tests/documentPrintableFrames.test.ts tests/documentPrintFrames.test.ts tests/pdfFrameAdmission.test.ts tests/documentPdfRecovery.test.tsx tests/documentPdfExportError.test.ts tests/documentView.test.ts tests/documentPageSections.test.ts tests/documentSessionWrites.test.ts tests/documentMenuPhase1.test.ts tests/documentMenuBar.test.tsx tests/inpageParser.test.ts tests/inpageSetup.test.ts tests/plainTextToDocNode.test.ts tests/pdfSourcePreflight.test.ts tests/pdfNormalizeExport.test.ts`: **138 passed, 2 existing opt-in tests skipped, 0 failed** (14 files passed, 1 skipped).
- Phase 1–4 desktop/mobile targeted Playwright run: **76 passed, 0 failed**.
- Updated Phase 4 real browser/server comparison: **1 passed, 0 failed**.
- Final Phase 5 real-PDF test, desktop/mobile: **2 passed, 0 failed**. Combined
  final Playwright results: **79 passed, 0 failed** across these targeted runs.
- Browser commands use `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase5-playwright.config.ts`, `--workers=1`, and projects `desktop-chrome`/`mobile-android`. Config uses localhost:3242 with `webServer: undefined`; no build or full suites run.
- PDF test file: `tests/e2e/documentStudioFrameExport.spec.ts`. Regressions:
  `documentStudioPdfRecovery`, `documentStudioInpageMenus`, `documentStudioMenuPhase1`,
  `documentStudioImportPhase2`, `documentStudioWindowPhase3`. The older real
  comparison is `documentStudioPdfRecoveryCompare.spec.ts` (desktop).
- Two-page A5 fixture: all five kinds, nine frames, Urdu/Arabic/English text,
  opposite diagonals, an edge rectangle, story text, image, table and manual break.
  Actual PDF pages are rasterized only for verification, not export. Checks cover
  visible ink, page assignment, no duplication on wrong pages, origins within
  3 CSS px and dimensions within 4 CSS px at 96dpi, line direction and ink inside
  text-frame borders. Both files have exactly two pages. Existing story JSON is
  unchanged; controls/handles are absent; normal download and recovery are used.
- Real UI moves/text edits are made while frame storage writes are suppressed in
  the test, proving that both paths use current unsaved state. Canonical Single
  editor geometry is compared with payload millimetres; export then runs after
  changing to Facing/200%, and browser recovery at 50%. Legacy requests without
  frames still produce the expected two-page document.
- All three frame scripts have matching text size, line spacing and wrapped
  glyph bounds between server and browser. Actual PDFs embed CID TrueType Mehr,
  Digital Khatt and Inter faces with Unicode maps; frame text remains selectable.

## Visual review and limitations

- Artifacts: `/tmp/qalam-phase5-review/` contains server/browser page 1 and page 2
  PNGs, their PDFs, comparison image, text-style metrics, editor geometry and
  object pixel measurements. Binary artifacts are not committed.
- Existing story differences remain: server header/footer/page numbers, table
  grid/image styling, and Chromium's sub-point paper-height rounding differ from
  browser output. This phase does not claim complete renderer equivalence.
- The text-frame model is plain text with optional document typography, not rich
  character formatting or a saved alignment/scroll-position model. Exports keep
  its RTL/plaintext bidi behavior (English resolves LTR), start alignment and
  wrapping; overflow clips to the frame like an unscrolled textarea. Text beyond
  that viewport remains stored, not flowed to a new frame/page. No formatting or
  scroll state was invented.
- **Separate canvas issue observed:** in Facing/200%, the existing object layer
  can be horizontally offset from paper by the spread's extra width. Its
  absolute `inset:0` plus spread width in an RTL containing block is unchanged
  in StudioObjectLayer. This was not repaired because the task forbids canvas
  appearance/interaction changes. Export uses canonical stored page/mm values,
  matching Single editor geometry, independently of that visual canvas offset.
- Jameel availability/fallback warnings remain unrelated and untouched. New
  frame-font waits record unavailable faces and retain declared fallbacks rather
  than abort printing; no fonts were installed/modified or CI warnings fixed.
- The previously documented intermittent TXT assertion remains unchanged; it
  passed in the final 76-case regression run. Fixture setup was moved before
  bootstrap to avoid racing test-injected frames with pending saves.

Keep PR #144 draft. No merge or production deployment. Stop for owner review.
