# PR #128 follow-up: PDF fallback, ayah digits and first font layout

Continues directly from `6a2020e82e1d4318ade172266a248b995ca1d459`, without rebasing. Digital Khatt in Qalam Page is an Arabic/Quranic font, including Arabic text imported with Urdu codepoints. All seven existing aliases are retained, including U+06D2 → `yehshape.isol`. No Urdu-prose letters were added.

| Item | Result | Evidence |
| --- | --- | --- |
| 1. PDF fallback | Missing Digital Khatt graphemes use the editor's exact `public/fonts/naskh-400.woff2` bytes, embedded under a private PDF CSS alias. Arabic punctuation and U+06EB export successfully. All unsupported characters are listed together, e.g. `U+1F600, U+1F680`. | [Punctuation/mark PDF raster](pdf-punctuation.png), [verse PDF](aal-imran.pdf), [extracted original-codepoint text layer](text-layer.txt). |
| 2. Ayah markers | U+06F0–U+06F9 alias the existing U+0660–U+0669 glyphs. `۝۲۶` and `۝٢٦` shape to identical glyph IDs/advances, without changing source codepoints. | [Desktop markers](markers-desktop.png), [mobile markers](markers-mobile.png), [actual PDF raster](pdf-markers.png). |
| 3. First font layout | FontFaceSet events/ready and whole-document replacement transactions invalidate stale line measurements. The measurement completion signal avoids sleeps. Digital Khatt Auto leading uses the font's actual hhea metrics: `(1500 + 700 + 200) / 1000 = 2.4`; explicit leading and other fonts are unchanged. First and warm glyph rasters match, and separate character-range assertions prove the lines do not overlap. | [First desktop render](first-desktop.png), [first mobile render](first-mobile.png). Ten cold-font trials per platform passed. |
| 4. Name ID 21 | Updated to `DigitalKhatt IndoPak Qalam`, matching the new family. | [Font metadata and complete alias map](font-metadata.json). |

The PDF guard preserves native grapheme shaping and the original Unicode through source, HTML and Chromium. It permits Naskh only in graphemes that need it, and verifies painted fonts via CDP. The existing verified ASCII-period exception remains unchanged. The actual PDF text layer was independently extracted with `pdftotext`; Urdu letters, ayah markers, all ten Urdu digits, Arabic punctuation and U+06EB remain present.

## Validation

- `npx tsc --noEmit`: passed.
- Normal `npx next build` (Turbopack): passed. The local generated Turbopack cache was cleared before building because this environment's persisted cache could not be reopened. No build configuration was changed.
- Three targeted Vitest files, with `QALAM_PDF_CHROMIUM` and `CHROME_PATH` set: **42 passed, 0 failed, 0 skipped**.
- `digitalKhattUrdu.spec.ts --grep 'uses one font' --repeat-each=10 --workers=1`: **20 passed**, desktop 10/10 and mobile 10/10.
- Other targeted browser cases: **4 passed, 2 intentionally skipped**. The skipped mobile cases are the desktop everyday-use and full-book import passes; mobile marker and all ten cold-font checks ran.
- **Total: 66 passed, 2 intentional skips, 0 remaining failures.**

The screenshot assertions compare monochrome glyph ink, excluding transient native blue editing handles and subpixel colour fringes; original colour PNGs are retained above for review. Glyph IDs and positioning are separately compared exactly in the real Chromium PDF stack, and font use is checked with CDP. This is not merely a first/second screenshot equality check: a separate DOM character-range test rejects overlapping lines.

The everyday pass covered default-font Urdu prose, Quran text in Digital Khatt, Enter onto later pages, select/delete, undo/redo, all menus and fullscreen, font size/colour, direction arrows, 50/100/200% zoom, both views and actual PDF download with `۝۲۶۔` / `۝۲۷۔`.

The actual `hadiyat.inp` fixture was opened through the UI. Only its Arabic Aal-Imran passage was selected and given Digital Khatt; its original text remained exact. [Selection/text evidence](hadiyat-passage.json), [editor screenshot](hadiyat-digital.png).

The WOFF2 build is reproducible. All tables except cmap/name/head remain byte-identical to the original, including GSUB, GPOS, outlines and metrics. The source Regular font and bundled Naskh asset are unchanged. No workflows, package/lockfiles, prohibited fonts, toolbar files, LatinScriptRuns, documentCommands, FirstLineLayout, or Facing Pages/view-mode implementation files changed. Generated next-env.d.ts, tsbuildinfo and test-results are excluded.
