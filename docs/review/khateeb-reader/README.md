# PR #109 — Khateeb reader visual review

Before-fix head: `883e4832ee3c89ce21486b6ac6c098ce37d34eac`. These are regenerated **after** captures from the local production build on 2026-10-22, following the requested typography, pagination and mobile header changes. Production source text, font files and workflows remain unchanged.

The book-reader API is mocked because previews cannot reach R2. These images demonstrate the real reader UI and its browser-measured pagination, **not live R2 availability or printed-book pagination**.

Desktop viewport: **1280 × 1000**. Mobile viewport: **390 × 844**. PNGs are exactly 1280px or 390px wide. Reading/search images include the entire main reader area, captured without resizing the live viewport; list and contents images show the viewport. The existing native book selector is the library's book list, not a replacement shelf UI.

## Review fixture

[`khateebReaderVisual.ts`](../../../tests/e2e/fixtures/khateebReaderVisual.ts) contains continuous excerpts from Nahj al-Balagha sermon 1, a passage from letter 31, and saying 81, in Arabic plus original Urdu review translations. The Urdu is clearly marked as review material, not attributed to a published translator. The fixture exposes Arabic and Urdu editions through mocked catalog, contents, read and find responses. It is not imported by production code. Source references are included in the fixture.

The longer opening sermon produces real visual pages in both viewports. The capture checks click Next and assert that the counter changes from 1 to 2 and the Arabic content changes. No text is repeated merely to pad the fixture.

## Typography and mobile header update

- Arabic uses **1.85** leading inside the reader (23px type / 42.55px lines). Font files, family, scale and source text are unchanged. Actual neighboring-line ink bounds are checked for overlap and clipping.
- The paginator fills remaining page space with a grapheme-safe part of the next paragraph instead of moving that entire paragraph to a fresh page. The probe has the real sheet's width and height, matches its Arabic markup, and explicitly loads the text fonts before measuring. This avoids using stale fallback-font measurements.
- Mobile Urdu is **18% smaller**: 18.04px versus 22px on desktop. Mobile Nastaliq uses 45.1px lines to retain ink clearance. Desktop Urdu sizing and leading remain 22px / 51.7px. The mobile sheet has a 40rem minimum height, providing room for at least ten readable lines after header/padding.
- English headers use a concise section label (for example “Sermon No. 1”). Mobile sides stay on one line, with ellipsis if necessary and complete text in title attributes. English book labels use LTR direction.
- Arrow buttons are **8px** from the page-number box on both sides; the navigation group is exactly centered. Existing previous/next directions are retained.

The previous More-menu, inline-theme-control, Noorehuda label and dark-contrast fixes remain in place and their capture checks still pass.

## Lines per page

These are DOM-measured visual line counts for every page of the **unchanged mocked Nahj sermon 1 review section at default settings**, not a claim about unavailable live R2 books or printed pagination. The last entry in each row is the final page of that section and is exempt from the minimum.

| Viewport | Arabic pages | Urdu pages |
|---|---|---|
| 390px mobile | **11, 11**, 8 (last) | **11, 11, 11, 11**, 1 (last) |
| 1280px desktop | **16**, 3 (last) | **14, 14**, 2 (last) |

Every non-final page has at least ten lines and less than one line plus the next paragraph gap of unused space. Captures also check continuous, complete source offsets; no source characters are dropped or duplicated. Minimum measured adjacent-ink clearance was 7.55px Arabic / 1.11px Urdu on mobile and 5.55px Arabic / 0.69px Urdu on desktop. The text remains within the reader area.

## Before / after

Before images are pinned to `883e4832`; after images are regenerated below.

| View | Before | After |
|---|---|---|
| Mobile Arabic — leading and page fill | [![Before: Mobile Arabic — leading and page fill](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/mobile-390/03-arabic-page-1.png?raw=true)](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/mobile-390/03-arabic-page-1.png) | [![After: Mobile Arabic — leading and page fill](mobile-390/03-arabic-page-1.png)](mobile-390/03-arabic-page-1.png) |
| Mobile Urdu — size and page fill | [![Before: Mobile Urdu — size and page fill](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/mobile-390/07-urdu-page-1.png?raw=true)](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/mobile-390/07-urdu-page-1.png) | [![After: Mobile Urdu — size and page fill](mobile-390/07-urdu-page-1.png)](mobile-390/07-urdu-page-1.png) |
| Mobile English header and arrows | [![Before: Mobile English header and arrows](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/mobile-390/10-english-ui-arabic.png?raw=true)](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/mobile-390/10-english-ui-arabic.png) | [![After: Mobile English header and arrows](mobile-390/10-english-ui-arabic.png)](mobile-390/10-english-ui-arabic.png) |
| Desktop Arabic pagination | [![Before: Desktop Arabic pagination](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/desktop-1280/03-arabic-page-1.png?raw=true)](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/desktop-1280/03-arabic-page-1.png) | [![After: Desktop Arabic pagination](desktop-1280/03-arabic-page-1.png)](desktop-1280/03-arabic-page-1.png) |
| Desktop Urdu pagination | [![Before: Desktop Urdu pagination](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/desktop-1280/07-urdu-page-1.png?raw=true)](https://github.com/techforward009/qalam-works/blob/883e4832ee3c89ce21486b6ac6c098ce37d34eac/docs/review/khateeb-reader/desktop-1280/07-urdu-page-1.png) | [![After: Desktop Urdu pagination](desktop-1280/07-urdu-page-1.png)](desktop-1280/07-urdu-page-1.png) |

## Screenshots

26 after screenshots (13 per width). Click an image for full resolution.

| View | Desktop — 1280px | Mobile — 390px |
|---|---|---|
| Library book list (native selector) | [![Desktop: Library book list (native selector)](desktop-1280/01-library-book-list.png)](desktop-1280/01-library-book-list.png) | [![Mobile: Library book list (native selector)](mobile-390/01-library-book-list.png)](mobile-390/01-library-book-list.png) |
| Nahj al-Balagha contents | [![Desktop: Nahj al-Balagha contents](desktop-1280/02-nahj-contents.png)](desktop-1280/02-nahj-contents.png) | [![Mobile: Nahj al-Balagha contents](mobile-390/02-nahj-contents.png)](mobile-390/02-nahj-contents.png) |
| Arabic / Noorehuda — page 1 | [![Desktop: Arabic / Noorehuda — page 1](desktop-1280/03-arabic-page-1.png)](desktop-1280/03-arabic-page-1.png) | [![Mobile: Arabic / Noorehuda — page 1](mobile-390/03-arabic-page-1.png)](mobile-390/03-arabic-page-1.png) |
| Arabic / Noorehuda — page 2 after Next | [![Desktop: Arabic / Noorehuda — page 2 after Next](desktop-1280/04-arabic-page-2.png)](desktop-1280/04-arabic-page-2.png) | [![Mobile: Arabic / Noorehuda — page 2 after Next](mobile-390/04-arabic-page-2.png)](mobile-390/04-arabic-page-2.png) |
| In-book search results | [![Desktop: In-book search results](desktop-1280/05-in-book-search.png)](desktop-1280/05-in-book-search.png) | [![Mobile: In-book search results](mobile-390/05-in-book-search.png)](mobile-390/05-in-book-search.png) |
| Arabic reader — dark mode | [![Desktop: Arabic reader — dark mode](desktop-1280/06-arabic-dark.png)](desktop-1280/06-arabic-dark.png) | [![Mobile: Arabic reader — dark mode](mobile-390/06-arabic-dark.png)](mobile-390/06-arabic-dark.png) |
| Urdu / Nastaliq — page 1 | [![Desktop: Urdu / Nastaliq — page 1](desktop-1280/07-urdu-page-1.png)](desktop-1280/07-urdu-page-1.png) | [![Mobile: Urdu / Nastaliq — page 1](mobile-390/07-urdu-page-1.png)](mobile-390/07-urdu-page-1.png) |
| Urdu / Nastaliq — page 2 after Next | [![Desktop: Urdu / Nastaliq — page 2 after Next](desktop-1280/08-urdu-page-2.png)](desktop-1280/08-urdu-page-2.png) | [![Mobile: Urdu / Nastaliq — page 2 after Next](mobile-390/08-urdu-page-2.png)](mobile-390/08-urdu-page-2.png) |
| Urdu reader — dark mode | [![Desktop: Urdu reader — dark mode](desktop-1280/09-urdu-dark.png)](desktop-1280/09-urdu-dark.png) | [![Mobile: Urdu reader — dark mode](mobile-390/09-urdu-dark.png)](mobile-390/09-urdu-dark.png) |
| English UI with RTL Arabic text | [![Desktop: English UI with RTL Arabic text](desktop-1280/10-english-ui-arabic.png)](desktop-1280/10-english-ui-arabic.png) | [![Mobile: English UI with RTL Arabic text](mobile-390/10-english-ui-arabic.png)](mobile-390/10-english-ui-arabic.png) |
| English More menu — corrected label and placement | [![Desktop: English More menu — corrected label and placement](desktop-1280/11-more-menu-font-label.png)](desktop-1280/11-more-menu-font-label.png) | [![Mobile: English More menu — corrected label and placement](mobile-390/11-more-menu-font-label.png)](mobile-390/11-more-menu-font-label.png) |
| Urdu More menu — viewport bounds | [![Desktop Urdu More menu](desktop-1280/12-urdu-more-menu.png)](desktop-1280/12-urdu-more-menu.png) | [![Mobile Urdu More menu](mobile-390/12-urdu-more-menu.png)](mobile-390/12-urdu-more-menu.png) |
| English dark-mode selector | [![Desktop English dark selector](desktop-1280/13-english-dark-selector.png)](desktop-1280/13-english-dark-selector.png) | [![Mobile English dark selector](mobile-390/13-english-dark-selector.png)](mobile-390/13-english-dark-selector.png) |

## Validation and reproduction

- Screenshot capture: **2 passed** (desktop and mobile), including every-page line counts, adjacent-ink clearance, no clipping, source-offset coverage, single-line headers, 8px arrow gaps, centering, and the earlier menu/theme/contrast regressions.
- Reader Vitest checks: **31 passed** across eight files.
- TypeScript (`npx tsc --noEmit`): passed.
- Production build: passed.
- Existing Noorehuda/Quran Playwright regression: **2 passed**, confirming book Arabic and Quran retain their respective fonts.
- Per-view measurements: [desktop metrics](desktop-1280/metrics.json), [mobile metrics](mobile-390/metrics.json).

From the repository root, with dependencies and a Playwright Chromium browser installed:

```sh
npm run build
npx playwright test --config=tests/e2e/review/playwright.config.ts
```

The review config starts the local production server on port 3004. `PLAYWRIGHT_CHROMIUM_PATH` can select an existing Chromium binary. The capture script and fixture live under `tests/` only; the special capture filename is outside the normal Playwright spec glob.
