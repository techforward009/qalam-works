# Context-sensitive object toolbar — review evidence

## Baseline and scope

Repository: techforward009/qalam-works. Separate branch: `feat/qalam-context-object-toolbar`, stacked on draft PR #154 at `9a522d09a735191ac35c703c8b8b4521da52fbe2`. PR #154 itself is unchanged. No production deployment or merge is authorized.

## Implemented

- One authoritative selected-ID array in DocumentStudioEditor, passed through DocumentCanvas into StudioObjectLayer. The layer no longer keeps a contradictory private selection.
- Arrow selection of any of the five supported frame kinds activates a compact two-row toolbar. Empty-area clicks, Escape, deletion, Text-tool activation, document changes and view changes invalidate object mode. Toolbar focus retains selection; Escape in a field cancels its draft instead of clearing the object.
- Actual page-local X/Y/width/height in millimetres, Enter/blur commit and Escape cancel, strict numeric/unit and page-bound checks, unrounded stored precision, live drag/resize synchronization. Multi-selection displays Mixed and applies the explicitly chosen absolute value to all selected objects, atomically rejecting invalid batches.
- Optional `StudioFrame.appearance`: border presence, thickness in points (0.1–12), solid/dashed/dotted, hex colour and fill or null/no-fill. Legacy frames default to their original black 0.75pt border and transparent fill. Per-object appearance fields are merged independently during batch edits.
- Shared print validation/markup preserves appearance for server PDF and browser print. Fonts, authored Unicode and story JSON are not changed by object operations.
- Geometry commits check active document identity, current IDs and transition state. Failed storage writes report failure and do not change the visible frame. Toolbar commits also verify read-back. Existing drag/text-frame writes now surface storage exceptions instead of silently accepting them.
- The projected Facing object layer explicitly anchors to the physical left. Previously its wider absolute box plus RTL/right anchoring displaced objects off-screen. Canonical frame coordinates and pagination are untouched.
- Synthetic InPage two-box fixtures preserve texts, metadata and swapped placements. Zero-filled pre-table padding was accidentally interpreted as extra empty stories; nonzero filler makes the intended table unambiguous. Tests explicitly expand the existing collapsed experimental preview.

## Deliberately unfinished

Rotation and text-box columns/gutter are disabled. Run Around is **source metadata only, not paragraph reflow**. Source ON/OFF/omitted/unknown survives geometry edits but is never advertised as working wrap.

Text boxes remain the existing plain-text textarea representation, with the existing safety rejection for unsupported selected-range formatting. No rich-box redesign or new combined undo history is included. Story undo/redo remains its existing ProseMirror history; object properties do not gain a new undo stack.

Story/settings and frames remain separate existing stores, not a new atomic cross-store or cross-tab transaction. Tests cover normal reload/document switching and rejected writes, not a new recovery/migration architecture.

The owner's private `Two_Boxes_A.inp`/`Two_Boxes_B.inp` files were not present in the supplied attachments. Synthetic public fixtures verify their described two-box arrangement; this is not certification against the private originals.

## Checks and artifacts

No build or production tests. Playwright uses `/tmp/qalam-phase6a-verification.config.ts`, whose webServer is explicitly disabled, against a local development server on port 3242. Artifacts are outside git in `/tmp/qalam-object-review/` and the Playwright output directories.

Commands:

```sh
npx tsc --noEmit
npx vitest run tests/documentObjectToolbar.test.ts tests/documentObjectToolbarControls.test.tsx tests/documentPrintableFrames.test.ts tests/documentPrintFrames.test.ts tests/documentFormattingSafety.test.ts tests/documentStudioInpageToolbar.test.tsx tests/activeToolbarFormatting.test.ts
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase6a-verification.config.ts tests/e2e/documentStudioObjectToolbar.spec.ts tests/e2e/documentStudioTwoInPageBoxes.spec.ts tests/e2e/documentStudioObjectAppearanceExport.spec.ts tests/e2e/documentStudioFormattingSafety.spec.ts tests/e2e/documentStudioInpageToolbar.spec.ts --project=desktop-chrome --project=mobile-android --workers=1 --output=/tmp/qalam-object-verified
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase6a-verification.config.ts tests/e2e/documentStudioTwoInPageBoxes.spec.ts tests/e2e/documentStudioFacing.spec.ts --grep 'native two-box|swapping native|unknown two-box|context toolbar follows|facing zoom shortcuts' --project=desktop-chrome --project=mobile-android --workers=1 --output=/tmp/qalam-object-inpage-caret-verified
```

TypeScript passed. Vitest: 79 passed, 1 failed, 0 skipped (80 tests, 7 files). The failure is the existing `documentStudioInpageToolbar.test.tsx` assertion expecting `repeating-linear-gradient` for Pattern. The unchanged parent PR #154 reproduces exactly that failure (21 passed, 1 failed in that file). The initial new export-appearance test failed before serializer support, then passed after the fix.

ESLint is not configured as an executable dependency here; the existing `next lint` script fails with “Invalid project directory … /lint” on Next 16. No packages or lint configuration were changed.

Real-PDF coverage: the new browser test applies geometry/red border/yellow fill through the toolbar, calls the actual export route with its resulting frame payload, also prints through the existing browser-print UI, rasterizes both PDFs, and checks the frame border/fill pixels. This proves these object properties on both paths; it does not newly certify every historical text-font/pagination combination.

Final focused browser results (desktop and mobile; targeted reruns included):

| Group | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Object toolbar, including keyboard zoom and physical-page bounds | 14 | 0 | 0 |
| Existing formatting-safety regressions | 14 | 0 | 0 |
| Synthetic two-box InPage integration | 8 | 0 | 0 |
| Actual server/browser PDF object appearance | 2 | 0 | 0 |
| Existing Facing zoom/caret geometry | 2 | 0 | 0 |
| Existing text-toolbar regression suite | 6 | 4 | 0 |

The four old text-toolbar failures are two cases on both projects: fullscreen size-list cannot open after selection ownership is invalidated; the everyday test uses obsolete menu/colour selectors. Both fail at the same assertions on the unchanged PR #154 baseline. No attempt was made to weaken the formatting guard or change unrelated controls.

One intermediate 34-case run had 33 passes and one mobile import-readiness failure. The test opened Import before initial document-library loading settled. Its helper now waits for an active saved document; all eight import tests subsequently passed. Earlier fixture/setup and PDF-raster sample failures were corrected and are not counted as baseline failures.

Final narrow commands supplementing the broader command above:

```sh
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase6a-verification.config.ts tests/e2e/documentStudioObjectToolbar.spec.ts --project=desktop-chrome --project=mobile-android --workers=1 --output=/tmp/qalam-object-toolbar-final
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase6a-verification.config.ts tests/e2e/documentStudioTwoInPageBoxes.spec.ts --project=desktop-chrome --project=mobile-android --workers=1 --output=/tmp/qalam-object-inpage-final
```

Direct drawing/moving/resizing also rejects geometry outside its physical page. Fill is disabled for line objects and mixed selections containing a line, rather than accepting an edit that cannot paint anything.

Screenshots: `/tmp/qalam-object-review/desktop-chrome-object-toolbar.png`, `/tmp/qalam-object-review/desktop-chrome-text-toolbar.png` and the corresponding `mobile-android-*` images. PDFs and raster checks live under `/tmp/qalam-object-release-verified/` and `/tmp/qalam-object-verified/`.
