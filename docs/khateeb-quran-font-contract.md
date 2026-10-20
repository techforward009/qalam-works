# Khateeb Studio — Qur'an source and font rule (owner-locked)

- Qur'anic Arabic is sourced exclusively from the **Ahmedgraf Indo-Pak edition** (no normalization or editorial rewriting).
- Qur'anic Arabic **must use Muhammadi Quranic** in Khateeb Studio, including prepared majalis, grouped verses, quotations, book passage readers, and print views. This includes al-A'raf **7:179** (the Ghaflah majlis sample).
- **Digital Khatt IndoPak Book** is reserved for **non-Qur'anic Arabic**: hadith, historical quotations, and book passages.
- Never let `.qalam-book-arabic` override `.khateeb-muhammadi-quranic` in a nested element; the classes represent different source identities.
- Displayed Quran source and font are independent: a correct Ahmedgraf ayah with the wrong font is a release regression.
- Regression tests live in `app/tools/khateeb-studio/engine/__tests__/ghaflahFreshMajalis.test.ts` and `tests/bookPassageFont.test.tsx`.
- **Owner instruction on October 17, 2026: save this change for a future release. Do not merge/deploy to production without subsequent explicit approval.**
