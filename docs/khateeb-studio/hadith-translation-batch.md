# Hadith translation batch — 2026-10-05

Base: 73bbf3b8b0eaee08f5e33ae77467d4962c428dc2.

Adds Urdu and English editorial translations for 35 source-verified dossier narrations and five source-verified live Rizq narrations. These translations are Qalam Works editorial translations of the recorded Arabic witness, not transcriptions of a published translation. Source verification describes the text and reference, not grading of a narration's chain.

Translations retain the exact Arabic snapshot they were prepared against. Pending, rejected, stale and incomplete translation records cannot expose translation fields through the presentation provider. Arabic, translation attribution and commentary remain separate in the research view, full sermon view, copied dossier, copied full sermon and copied live blueprint.

Retrieval now returns the whole matched topic group for both Urdu and English aliases. Fixes two missing regex escapes in live Rizq query normalization that removed Urdu letters and prevented the five verified narrations from being found. Research dossier evidence also carries its Quran location so the existing Quran translation component can resolve it.

Validation:

- Seven new behavior tests passed: bilingual coverage, presentation gating, research propagation, and both languages of copied dossier, live blueprint and full sermon.
- Khateeb suite before: 278 passed, 32 failed. After: 295 passed, 22 failed. Ten existing failures fixed; no new failures.
- Standalone TypeScript check passed before Next generated route checks.
- Webpack production compilation passed. The build's generated route type check failed on the existing exported `buildPdfHeaderTemplate` helper in app/api/export-pdf/route.ts. That route was unchanged by this batch.
- git diff --check passed.

No branch reference is moved by this batch. No Vercel deployment is requested. Existing test failures and the PDF route build blocker still need separate repair before publication.
