# Supplied Kafi corpus audit — 7 October 2026

Audited all eight supplied DOCX files directly from `word/document.xml`. This is a structural intake audit, not verification against a printed edition and not a hadith authenticity assessment. No quotation was normalized, corrected or published.

| Volume | Paragraphs | Characters | Maximum paragraph | Book heading candidates | Chapter heading candidates | Numbered starts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1776 | 1269166 | 5542 | 5 | 187 | 1431 |
| 2 | 2689 | 1224392 | 5209 | 0 | 312 | 2308 |
| 3 | 2598 | 1095033 | 5389 | 0 | 314 | 2182 |
| 4 | 2563 | 1122024 | 5549 | 0 | 358 | 2154 |
| 5 | 2646 | 1166221 | 5017 | 0 | 381 | 2195 |
| 6 | 3977 | 1095208 | 3130 | 18 | 414 | 2644 |
| 7 | 2138 | 1015685 | 5312 | 0 | 287 | 1712 |
| 8 | 742 | 762285 | 9013 | 0 | 0 | 597 |

Numbered starts are detected paragraph markers, not certified counts of canonical hadiths. Continuations, duplicated headings and numbering resets need separate handling.

## Required before live ingestion

- Preserve volume, exact chapter label, printed local number, source hash and original paragraph locations. A repeated local number is not a unique identifier.
- Volumes 2–5 and 7 contain no standalone book heading matching the intake rule. Missing book titles must remain unknown until independently verified.
- Volume 8 has no standalone chapter heading matching the rule. Do not manufacture chapter labels or apply the earlier volumes’ chapter model.
- Volume 8 contains a 9,013-character paragraph, which the former 8,000-character retrieval cutoff would discard. The new retrieval limit preserves that paragraph intact once the collection is admitted.
- Retain Arabic-only material as Arabic sources; no Urdu translation was supplied with these eight files.
- The expanded import/search schema now accepts all eight Kafi sources alongside the original seven sources. The combined archive contains 4,978 records, including 2,302 Kafi heading groups. The package is prepared and tested; production import/activation is not claimed.

## Reproduce

```bash
python3 scripts/audit-kafi-docx.py /absolute/source-directory /absolute/audit-output.json
```

The output contains fingerprints, counts, paragraph locations and warnings, without copying source prose. The script requires all eight volumes and uses only the Python standard library.


## Prepared package and verification

`build-kafi-corpus.py` copies the existing seven compressed source members without modification and appends all eight Kafi volumes. Every original paragraph, including metadata/front matter, is preserved in order. Book/chapter/section groups have internal segment ordinals; those ordinals are not human hadith references. Consecutive source-paragraph positions and literal chapter/section labels are checked at import, as is the last actual book heading in source order. The package is approximately 5.8 MiB, within the new 8 MiB upload limit.

```bash
python3 scripts/build-kafi-corpus.py /absolute/original-corpus.zip /absolute/kafi-docx-directory /absolute/combined-corpus.zip --json-directory /absolute/test-fixtures
```

The eight Arabic volumes are source-only in Urdu and English research mode unless a supplied translation is added later. No fiqh ruling or hadith-authenticity assessment is inferred from the corpus.
