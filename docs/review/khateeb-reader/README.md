# PR #109 — Khateeb reader visual review

Application head reviewed: `282b7624f6cbee0c4dd73b79991015eb0a41497e`. Captured locally on 2026-10-22 from the existing production build. No reader features, production source text, fonts or workflows were changed.

The book-reader API is mocked because previews cannot reach R2. These images demonstrate the real reader UI and its browser-measured pagination, **not live R2 availability or printed-book pagination**.

Desktop viewport: **1280 × 1000**. Mobile viewport: **390 × 844**. PNGs are exactly 1280px or 390px wide. Reading/search images include the entire main reader area, captured without resizing the live viewport; list and contents images show the viewport. The existing native book selector is the library's book list, not a replacement shelf UI.

## Review fixture

[`khateebReaderVisual.ts`](../../../tests/e2e/fixtures/khateebReaderVisual.ts) contains continuous excerpts from Nahj al-Balagha sermon 1, a passage from letter 31, and saying 81, in Arabic plus original Urdu review translations. The Urdu is clearly marked as review material, not attributed to a published translator. The fixture exposes Arabic and Urdu editions through mocked catalog, contents, read and find responses. It is not imported by production code. Source references are included in the fixture.

The longer opening sermon produces real visual pages in both viewports. The capture checks click Next and assert that the counter changes from 1 to 2 and the Arabic content changes. No text is repeated merely to pad the fixture.

## Findings

- **Mobile English More menu clips at the left edge:** its 240px panel starts at **x = −25.84px**. Labels and links lose their first characters. See image 11 and the corresponding `metrics.json`.
- **Floating theme button overlaps reading text on mobile:** visible near the lower-right lines in Arabic page 2 and Urdu page 1 (images 04 and 07).
- **Stale font label:** More → Arabic font comparison says “Digital Khatt (current)” although the rendered Arabic is Noorehuda. Noorehuda and Nafees Nastaleeq both report `loaded` in the recorded font metrics.
- **Dark selector contrast:** the book selector and its caption look dim against the dark background. The main Arabic and Urdu reading text remains legible.
- The header fits at both widths without logo/language-switch overlap. Book headers fit; English metadata wraps onto two lines on mobile. English UI labels read left-to-right while the book text remains right-to-left.
- Page numbers advance to 2. In Urdu UI, Next is the left arrow and Previous is the right arrow; English UI uses the opposite direction. Page counters represent visual excerpt pages, not source print-page numbers.
- No page-level horizontal scrolling was measured (`scrollWidth === innerWidth` in all captures). This does not hide the negative-left More-menu clipping noted above.

These are review findings only; none were fixed in this screenshot task.

## Screenshots

Click an image for full resolution.

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
| More menu — existing label/clipping issues | [![Desktop: More menu — existing label/clipping issues](desktop-1280/11-more-menu-font-label.png)](desktop-1280/11-more-menu-font-label.png) | [![Mobile: More menu — existing label/clipping issues](mobile-390/11-more-menu-font-label.png)](mobile-390/11-more-menu-font-label.png) |

## Validation and reproduction

- Screenshot capture: **2 passed** (desktop and mobile), including loaded-font, pagination, search-result and direction checks.
- TypeScript (`npx tsc --noEmit`): passed.
- Per-view measurements: [desktop metrics](desktop-1280/metrics.json), [mobile metrics](mobile-390/metrics.json).

From the repository root, with dependencies and a Playwright Chromium browser installed:

```sh
npm run build
npx playwright test --config=tests/e2e/review/playwright.config.ts
```

The review config starts the local production server on port 3004. `PLAYWRIGHT_CHROMIUM_PATH` can select an existing Chromium binary. The capture script and fixture live under `tests/` only; the special capture filename is outside the normal Playwright spec glob.
