# Production readiness review — 2026-10-05

## Completed additions

All 61 angles across 13 topics now include separate Urdu and English ready-to-deliver paragraphs. These are newly composed Qalam Works editorial prose, not quotations from a scholar. Detailed mode displays and copies them; brief mode keeps concise points, questions, actions, source verses, translations, and scholarly references.

Topic-guide, research-dossier, and occasion-preparation copying now announce success through an accessible status region. Denied or missing clipboard access opens a native modal containing the exact complete text, selected for manual copying. Dismissal/Escape restore ordinary interaction. Out-of-order copy results cannot replace a newer successful request.

## Scholarly and editorial review

The new explanatory and delivery layers were read against the topic verses and the available source-backed dossier/evidence text. Original Qur'anic and hadith strings remain unchanged. No new attributed hadith or historical incident is introduced. Specific jurisprudential cases are not turned into generalized rulings.

- Parents: reviewed Qur'an 17:23–24, 31:14, 46:15, the supplied Rights Treatise material, and Reyshahri's bilingual parent-duty chapter, especially sections 2.1 and 2.2. Care includes respectful speech and attention, not money alone. Remembrance practices are not described as mandatory rituals or assigned invented rewards.
- Infallibility: reviewed the supplied Naqvi source-backed records for majalis 1, 3–7 and the existing dossier. The distinction between observation and theological certainty is retained; incapacity, compulsion, and moral perfection are not conflated. The scholar's argument is explicitly attributed. Everyday self-mastery is not equated with the theological office of infallibility.
- Imamate: checked Tabataba'i's published Imamah chapter against the dossier and the new paragraph. The claim concerns guardianship of religious/social affairs, religious knowledge, and guidance. Verse text, Imami interpretation, and editorial application remain distinct. No new polemical accusation is introduced.
- Dua: checked al-Mizan's discussion of 2:186, especially the distinction between verbal requests and real need, and between using means and relying on them as independent powers. The material promises no particular worldly outcome and does not infer an individual's lack of faith from delay.
- Ethics/family/provision: reviewed all remaining delivery paragraphs for their topic fit and distinction between hypothetical example, Qur'anic principle, editorial application, and a case requiring qualified guidance. Justice is not reduced to identical allocation; discretion does not block necessary help; prayer and trust do not replace effort.

Published sources consulted:

- https://al-islam.org/children-quran-and-sunnah-muhammadi-reyshahri/chapter-2-childrens-duties-towards-their-parents
- https://al-islam.org/islamic-teachings-brief-sayyid-muhammad-husayn-tabatabai/imamah
- https://al-islam.org/al-mizan-exegesis-quran-volume-3-sayyid-muhammad-husayn-tabatabai/suratul-baqarah-verse-186

This is an editorial meaning/attribution review against the identified material, not a claim that every referenced book has received a new full-text or isnad audit.

## Release scope

The final release includes every accumulated review commit descending from production main 73bbf3b8b0eaee08f5e33ae77467d4962c428dc2: bilingual editorial hadith translations and Arabic preservation, PDF production build/source-matching repairs, Qur'an translation typography, language hydration and guide preferences, source-inclusive guides for all topics, and these final delivery/copy additions. Publish once through the production Git branch after checks pass, avoiding additional preview deployments.

## Release validation

- TypeScript check and production webpack build passed.
- Full test suite: 3,822 passed, zero failed, 10 intentionally skipped. The local Chromium executable was restored from the installed package before the successful full run.
- Production-build browser verification: 26 topic/language flows covering all 13 topics and 61 angles, brief/detailed output, durations, copied content, success feedback, denied-clipboard manual selection, Escape, research dossier, mobile overflow, and print controls; zero page errors.
