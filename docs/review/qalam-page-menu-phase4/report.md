# Phase 4 — Classic PDF recovery dialog

PR #144, branch `feat/qalam-page-inpage-menus`, based on
`5ac262afb453ca3a5a231f7823b2fd08ed15d2c2`. Phase 4 only.

## Behavior and scope

- Successful server PDF export retains its existing normalized request,
  response handling, summary, filename and download. A real local POST through
  the unchanged export handler produced a PDF and completed the UI download.
- HTTP 408/429/502/503/504 and fetch/body connection failures offer recovery.
  HTTP 400/413/422 and renderer HTTP 500 retain their original explanations.
  A 500 may be an unsupported-content or validation failure, so it is not
  automatically described as overload. The server is never automatically retried.
- Failure UI is a small, centered, square-cornered gray classic dialog, with
  Qalam Page title bar, drawn warning icon, beveled frame and compact rectangular
  buttons. It remains inside a 375px viewport with the document visible behind.
  Nonrecoverable explanations use the same classic shell without a busy claim
  or inappropriate recovery offer.
- Choose the existing `printDocumentStudioAsync` workflow on an explicit button
  click. We do not auto-print following an asynchronous request: transient user
  activation and native print support cannot be assumed reliably across browsers.
  No second PDF engine, retry loop or forced Save as PDF destination was added.
- The existing helper still mounts its document-only portal, strips view-only
  pagination, waits for fonts and invokes native print. A print return is never
  labeled a successful save. One request per dialog and an editor-local guard
  across dialog reopen prevent duplicate invocations while printing is pending.
  `afterprint` releases the pending guard, not a success notification.
- Initial focus, Tab/Shift+Tab trapping, native Enter activation, Escape/Close
  and focus restoration are covered. Modal keystrokes cannot leak into editor
  formatting/zoom handlers. Print CSS always hides the dialog.
- Dialog copy supports both English and the supplied Urdu text (tested as a
  real React component). The editor remains English-only, including on the Urdu
  site; its existing language policy was not changed.
- No changes to server generation, PDF layout/normalization/fonts, limiter,
  browser print infrastructure, document sessions/storage, menus, Window Page /
  Alt+F12, status bar, page controls, packages, lockfile, workflows or settings.

## Tests-first and final checks

Before implementation, the new unit suite failed because the recovery component
was absent. The actual browser HTTP 429 test failed because the existing banner
provided no dialog or browser-print action. Failures were mocked, never induced
by overloading a real server. Two bounded correction rounds corrected an
ambiguous nested-span comparison selector, characterized physical page rounding,
strengthened duplicate-print guards and isolated modal keystrokes.

- `npx tsc --noEmit`: PASS.
- `npx vitest run tests/documentPdfRecovery.test.tsx tests/documentPdfExportError.test.ts tests/documentView.test.ts tests/documentPageSections.test.ts tests/documentSessionWrites.test.ts tests/documentMenuPhase1.test.ts tests/documentMenuBar.test.tsx tests/inpageParser.test.ts tests/inpageSetup.test.ts tests/plainTextToDocNode.test.ts`: **95 passed, 0 failed**, 10 files.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase4-playwright.config.ts tests/e2e/documentStudioPdfRecovery.spec.ts tests/e2e/documentStudioInpageMenus.spec.ts tests/e2e/documentStudioMenuPhase1.spec.ts tests/e2e/documentStudioImportPhase2.spec.ts tests/e2e/documentStudioWindowPhase3.spec.ts --project=desktop-chrome --project=mobile-android --workers=1`: **76 passed, 0 failed**.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase4-playwright.config.ts tests/e2e/documentStudioPdfRecoveryCompare.spec.ts --project=desktop-chrome --workers=1 --output=/tmp/qalam-phase4-comparison`: **1 passed, 0 failed** (real existing server handler plus real headless browser PDF output).
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config=/tmp/qalam-phase4-playwright.config.ts tests/e2e/documentStudioPdfRecovery.spec.ts --project=desktop-chrome --project=mobile-android --workers=1 --grep 'keyboard Close' --output=/tmp/qalam-phase4-keyboard`: **2 passed, 0 failed**, focused recheck after modal shortcut isolation.
- `git diff --check`: PASS. No build or full suites run. The temporary config
  reuses the repository's browser projects, points at localhost:3242, stores
  artifacts under /tmp and sets `webServer: undefined` (no implicit build).
- Coverage includes 200 download, 429/502/503/504, network failure, validation /
  blocked renderer explanations, primary-button Enter, single print request even
  after dialog reopen, Close/Escape/focus/Tab, print exclusion, localized copy,
  desktop/mobile geometry and unchanged Phase 1–3 menus/import/session behavior.

## Actual browser/server output comparison — not identical

The representative document contains Mehr Urdu, Digital Khatt Arabic, red Latin
text, a blue inline image, a 2x2 table, an authored page break and a separate saved
rectangle. Existing New Document A5 setup and 12.7mm margins were used.

- Both PDFs contain **2 pages** and retain story text, direction, color, image,
  table content and manual break, with no trailing blank page or editor/dialog
  controls. The live document JSON remains unchanged. The print portal contains
  the expected RTL elements, 4 table cells and image; font readiness was awaited.
- Server MediaBoxes: 420 x 595.91998 pt. Browser: 420 x 594.95996 pt. Both are
  within 1pt of nominal 148 x 210mm; their heights differ by 0.96002pt (~0.34mm).
  This is existing Chromium physical-page rounding, not a changed layout rule.
- The server includes its configured Qalam Works header and page numbers;
  browser printing omits those. Browser output has visible table borders and
  rounded/centered image styling; server output has different image alignment,
  square image corners, table spacing and no visible table grid. Text vertical
  placement also differs. Neither renderer was modified to hide these differences.
- **Existing limitation:** separate drawing-layer objects, including the saved
  rectangle, are not included in the browser story clone or the server request.
  The fallback therefore does not add export support for that object layer.
  This was characterized explicitly, not presented as full export equivalence.
- The real test changes only the server browser executable/launch sandbox in
  its harness; it invokes the existing handler, font loader and rendering code.
  Native OS print UI and the user's Save/Cancel choice cannot be verified in
  headless Chromium. The user-click invokes window.print; actual document-only
  PDF bytes were separately produced and inspected via page.pdf/pdftotext.

## Review artifacts (local, not committed)

- Desktop 1280px: `/tmp/qalam-phase4-review/fallback-desktop.png`
- Mobile 375px: `/tmp/qalam-phase4-review/fallback-mobile.png`
- Side-by-side real output: `/tmp/qalam-phase4-review/server-browser-comparison.png`
- `/tmp/qalam-phase4-review/server.pdf`, `browser.pdf`, `comparison.json`

## Unrelated existing issues

- The prior Phase 3 intermittent immediate TXT assertion remains documented in
  `../qalam-page-menu-phase3/report.md`. It was not changed; both projects pass
  in the Phase 4 final run. No claim of fixing that intermittent test is made.
- Font CI issues were not investigated or fixed. The real local exporter logged
  `requested=yes load=unavailable used=no fallback=yes` for Jameel and completed
  successfully through its existing fallback. This availability warning is
  separate from Phase 4; no font source, binaries or mirror settings changed.

Keep PR #144 draft. No merge or production deployment. Stop after Phase 4.
