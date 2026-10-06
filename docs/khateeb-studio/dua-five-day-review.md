# Complete prayer series and continuous al-Asr reading

## Scope

- `dua` with a five-session fresh composition now opens five fully prepared sessions, rather than the generic outline.
- The sequence develops relationship, attentive etiquette, hope during delayed outcomes, effort and rights, and moral formation through Sahifa al-Sajjadiyya.
- Each session includes five timed blocks, original Urdu and English delivery paragraphs, explanatory notes, a hypothetical example, an audience question, a practical action, and a boundary against repeating another session.
- Adjacent sessions share a specific bridge. The final session offers a seven-day private practice.
- Twenty, thirty and forty-five minutes are suggested allocations for delivery, explanation, source reading and audience reflection; this is preparation material rather than a verbatim recording or a timed speech transcript.
- Other series lengths continue to use their existing plans. The saved custom-sermon workspace is unchanged.

## Sources and editorial boundaries

Qur’anic Arabic comes unchanged from the existing Ahmedgraf provider. Every selected Urdu/English translation is compared against the complete reader corpus. Existing attribution to Shaykh Mohsin Ali Najafi and Ali Quli Qara’i remains intact. Six previously uncovered verses were added to the lightweight series supplement: 7:56, 2:216, 21:83–84, 4:58, 2:201. Coverage is now 71 verses.

The first session reuses the already text-verified `dua-weapon-believer` narration from Al-Kafi, vol. 2, p. 468, hadith 1. The third reuses `dua-station-through-asking`, Al-Kafi, vol. 2, pp. 466–467, hadith 3. Their Arabic, translations, references and witnesses are unchanged. Text/source verification is not represented as an independent chain-authenticity judgement.

The fifth session contains selected classical Arabic passages from Sahifa al-Sajjadiyya, supplication 20, paragraphs 1, 2 and 3. Arabic was checked against the published original at:

https://al-islam.org/sahifa-al-kamilah-al-sajjadiyya-imam-ali-zayn-al-abidin/20-his-supplication-noble-moral-traits-and

Urdu and English translations of these excerpts were composed editorially from Arabic. The hosted English translation was not reproduced. Each excerpt identifies its attribution, paragraph, selected nature, editorial translation, and source URL. The selected passages are not represented as the complete supplication.

Practical explanations, examples and closing prayers are labelled editorial. Examples are expressly hypothetical. The 2:216 discussion identifies its original context. The Ayyub account stays within 21:83–84 without speculative duration or medical details. No particular worldly outcome or hidden cause of a listener’s difficulty is promised.

## Continuous source passages

The patience pilot’s third session now presents all three verses of al-Asr as one continuous Arabic passage, followed by their combined attributed translation. Its short foundation reference also identifies the complete surah. The prepared series keeps full foundation references at every duration.

The shared preparation engine supports grouped Qur’anic passages, used additionally for 7:55–56 and 21:83–84. Every grouped verse remains traceable to its original surah/ayah and appears once in source output. Grouped Arabic and selected supplication Arabic explicitly use the Arabic font and direction. Arabic passages avoid internal page breaks in print.

## Verification

- Focused tests cover five distinct sessions, both languages, all three duration totals, complete copy output, unchanged Arabic, exact reader translations, continuous source groups, original excerpt references and Arabic rendering.
- The patience tests check that all three al-Asr verses form one Arabic passage in both the visible preparation and copied text.
- Browser scenarios cover Urdu/English on desktop/mobile: five visible sessions, complete source material, all duration controls, individual and whole-series copying, clipboard-denied fallback with full selection, print-only preparation, actual A4 PDF output, reload, changing series length, horizontal overflow and page errors.
- Existing save/restore and patience browser scenarios are rerun alongside the new prayer-series scenarios.
- Final production build and full unit suite are required before the single main-branch push.

Final results (2026-10-06): 3,853 unit tests passed, zero failed, ten intentionally skipped; twelve desktop/mobile browser scenarios passed. The production build passed. Urdu A4 PDFs contain thirty pages and English twenty-seven, with no empty pages; every English session title survives extraction after standard Unicode ligature normalization. Urdu print samples were visually reviewed for joining, line spacing, wrapping, and pagination.
