# Build and research repair — 2026-10-05

Continues the unpublished translation batch b9954ba36af8f7e70031d1c23f4bb9d2281df941. No hosted branch reference is moved, and no deployment is requested.

## Behavior changes

- PDF route exports now contain only supported Next.js route handlers and configuration. Header/footer builders and document font loading are separate utility modules; the PDF rendering logic and request-scoped Jameel handling are retained.
- Local thematic matching uses complete words and requires reasonable query coverage, preventing unrelated queries from finding accidental substrings such as the Urdu word for a test matching the topic of trials.
- eShia excerpt search correctly recognizes Unicode letters and whitespace while returning unchanged source text with original positions and diacritics.
- Anger queries recognize the Urdu inflection غصے. Candidate detection recognizes Abu/Abi forms and diacritized Arabic, retaining the exact source excerpt. Weak chain introductions remain candidates needing context, never verified quotations.
- Live external source pages retain a bounded share of the evidence list when local results fill the requested limit. The candidate queue is derived from the evidence actually returned.
- Quran Urdu translation now actually applies the defined public Jameel font, with a 20px base size and 2.3 line height. English keeps its own typography and direction. A rendered component test checks both languages.

## Test maintenance

Old expectations were reconciled with existing source-reviewed corpus expansion: Sabr records are selected by topic instead of assuming the entire corpus contains only five records; independently checked cross-reference witnesses retain their own wording; four Dua narrations are verified while Tanbih remains pending; the Rizq corpus contains eight Quran mappings plus five verified narrations; indexed book excerpts remain partially indexed books; public speaker checks exclude deliberately hidden registry entries. Pending narration suppression and exact witness fidelity remain tested.

## Validation

- Full suite with four workers and the bundled Chromium executable: 3,689 passed, zero failed, ten skipped.
- All Khateeb tests passed, including the 22 previously failing checks.
- Real PDF route tests exercised the rendering pipeline and multi-page output using bundled Chromium. The browser binary was extracted to temporary scratch space without changing application dependencies.
- Next.js webpack production build passed: compilation, generated route types, and generation of 45 pages.
- git diff --check passed.

Skipped tests retain their existing opt-in conditions. This batch is ready for a later combined publication; the hosted site is not changed.
