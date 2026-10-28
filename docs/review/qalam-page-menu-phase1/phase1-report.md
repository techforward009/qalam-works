# PR #144 — Phase 1: dropdown structure and appearance only

Baseline: live main `fc9511001ebfebbad07206528bb57ec90ad42433`; starting PR head `e92664d66e6b022b1f920236ae4e42a3a141f285`.

## Scope and invariants

- Restored main's **Format** and **Insert** labels. Top-level order, original coordinates, dimensions, fonts, gradient, title bar and closed/open/hover styling are unchanged.
- Reconstructed only dropdown interiors. Reference commands retain their order and separators. Real Qalam-specific commands appear after a separate **Qalam Page** section caption, which is not focusable or executable.
- **Place** is genuinely disabled (`disabled`, `aria-disabled=true`, Coming soon tooltip), with no image-import action.
- **Link** and **Load Example** are absent from Insert. To preserve working commands, Link remains available in Format's Qalam section and Load Example in Utilities' Qalam section.
- Full reference Text Wrap and Table Format dialogs remain disabled; existing Image Commands and Table Commands remain accessible separately. Existing image wrapping/table operations were not disabled or relabeled as complete reference dialogs.
- All starting command IDs remain accessible. Clipboard/history/image/table commands retain their existing context-dependent enabled states. No dispatcher, editor, import, storage, PDF or dialog implementation changed in this phase.
- The 18 dialog references are documented individually in [the separate future workstream](dialog-reference-workstream.md), including exact canvas sizes, approximate frame bounds, controls, functionality and approval gates. No reference dialog was implemented.

## Popup geometry

| Popup | Width (CSS px) |
|---|---:|
| File | 250 |
| Edit | 244 |
| View | 202 |
| Format | 263 |
| Insert | 225 |
| Utilities | 243 |
| Window | 197 |
| Help | 168 |
| Preferences flyout, desktop | 265 |
| Other flyouts, desktop | 220 |

File's reference screenshot is about 850px wide because of genuine long recent-file paths. Phase 1 does not fabricate those paths or expand an empty MRU placeholder to that width.

- Rows remain 22px; command inset 32px, shortcut inset 20px, with a separate shortcut column/gap.
- Etched separators have 3px horizontal inset. Popup frames use crisp white/gray borders and a 2px classic shadow; pale blue outlined hover; original CSS arrows and a small original SVG check in a 16px gutter.
- Desktop popup starts at the bar's bottom, 7px left of its label anchor, constrained to the viewport. Preferences intentionally overlaps the parent border by 6px, following the reference; command text does not overlap.
- On narrow screens popups start below the **entire wrapped main bar**, preserving main's bar geometry and keeping the second row accessible. Submenus use tap accordions, scroll their expanded contents into the menu viewport, and do not open/close from synthetic mouse hover.
- Long content scrolls inside its popup. No off-screen popup or overlapping shortcut/label columns were found in the final tests.

## Verification

Tests were written first. Main-label and disabled-Place regressions failed before implementation. Two targeted implementation/check cycles were used; no full suite or production build was run.

Final results:

- `npx tsc --noEmit`: passed.
- `npx vitest run tests/documentMenuPhase1.test.ts tests/documentMenuBar.test.tsx tests/documentStudioShell.test.ts tests/documentPhase3a.test.tsx tests/documentView.test.ts`: **51 passed, 0 failed**.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium MENU_BASELINE_URL=http://127.0.0.1:3240 npx playwright test --config=/tmp/qalam-phase1-playwright.config.ts tests/e2e/documentStudioMenuPhase1.spec.ts tests/e2e/documentStudioInpageMenus.spec.ts --project=desktop-chrome --project=mobile-android --workers=1`: **26 passed, 0 failed**.
- `git diff --check`: passed.

The temporary Playwright configuration uses the local PR dev server on port 3241 and `webServer: undefined`; unchanged main is served separately on port 3240. Neither invokes a build. No live-production tests or deployment were performed.

The top-level bar matches unchanged main's decoded screenshot pixels in **closed, open File and hover/switched Edit states** at desktop/mobile widths. Popup interiors are hidden only while capturing the bar comparison: main's old popup overlaps its wrapped second bar row, and popup content/geometry is deliberately changing in this phase. The always-on frozen main geometry fixture independently checks every root label, coordinate, dimension, font, padding, background and bottom border. Local verification additionally supplies `MENU_BASELINE_URL` for actual pixel comparisons.

Popup tests check every top-level menu and submenu at 1280px/375px, including bounds, label/shortcut collisions, disabled Place, Insert removals, separate Qalam sections, tap expansion, Escape/outside dismissal, enabled-only keyboard navigation, submenu focus return, current actions, clipboard, undo/redo and existing zoom shortcuts.

## Visual review artifacts (local, not committed)

| Viewport | Before e92664d6 | After Phase 1 |
|---|---|---|
| 1280 × 800 | `/tmp/qalam-phase1-review/before-1280.png` | `/tmp/qalam-phase1-review/after-1280.png` |
| 375 × 800 | `/tmp/qalam-phase1-review/before-375.png` | `/tmp/qalam-phase1-review/after-375.png` |

Additional desktop/mobile-device Preferences screenshots and per-menu crops are under `/tmp/qalam-phase1-results/`. Main/Phase-1 bar comparison images are saved by the same tests.

## Explicitly deferred

- Phase 2: Import's `.inp` picker/routing repair.
- Phase 3: Window → Page/Alt+F12 semantics and genuine open-document session entries.
- Phase 4: server-PDF recovery via the existing browser print workflow.
- Phase 5: final integrated regression, production build and preview review.

Existing shortcut conflicts are not rebound for screenshot imitation: Ctrl+Y still belongs to redo, F1 still opens existing help, and unimplemented reference commands remain disabled. No font, workflow, package or lockfile changes. Keep PR #144 draft; stop for owner approval before Phase 2.
