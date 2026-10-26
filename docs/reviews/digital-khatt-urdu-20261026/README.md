# Qalam Page: Digital Khatt Urdu aliases

Qalam Page keeps imported/stored Unicode unchanged and loads `DigitalKhattIndoPakQalam.woff2` for the existing `digital-khatt-indo-pak` font ID. The Quran reader and Khateeb font declarations still load their original files.

## Added cmap entries

| Codepoint | Existing glyph |
| --- | --- |
| U+06A9 | kaf.isol |
| U+06BE | heh.isol |
| U+06C1 | heh.isol |
| U+06C3 | heh.twodotsup.isol |
| U+06CC | yehshape.isol |
| U+06D2 | yehshape.isol |
| U+06D3 | alefmaksura.hamzaabove.isol |

U+06F0–U+06F9 remain unmapped. The optional U+06D3 target exists in the source font.

## Rebuild

With Python 3 and `fonttools[woff]` installed:

```sh
python scripts/build-digital-khatt-qalam.py
```

The script uses the original checked-in Regular file, writes the derivative, preserves the OFL copyright/license notice, marks the internal names as modified, and regenerates `digitalKhattCmap.json`. No package or lockfile changes are required.

Two builds produced identical WOFF2 bytes:

- Derivative SHA-256: `0cd2c407004694ae176aeb373b66e6d351b74b503d464ee24a75d7b98fc43304`
- Original SHA-256: `313c3100da7c4c1a29dd9c3b83313a3e055539944ab3c45a43170dfb4a6b3582`

Every font table except `cmap`, `name`, and the resulting `head` checksum is byte-identical to the original, including GSUB, GPOS, outlines, metrics, and glyph order. The isolated `yehshape.isol` outline is identical to the font's dotless `alefmaksura.isol` outline.

## Shaping and screenshots

The targeted PDF test shapes both Aal-Imran 3:26–27 variants through Chromium's actual PDF stack and compares the complete text drawing operators: glyph IDs, advances and positions. It also covers isolated/initial/medial/final joining samples and every added alias. PDF accessibility Unicode is excluded from that comparison because the source codepoints intentionally differ.

A separate HarfBuzz inspection confirmed 239 and 215 glyphs for the two verses, with equal glyph IDs, x/y advances and x/y offsets between the Urdu and Arabic variants.

The Playwright test loads the actual editor. It compares PNG bytes for Urdu and Arabic variants of the verses and `اللّٰھم النّہار تؤتی شیء`, checks every painted descendant with CDP for fallback, and preserves the original codepoints in the editor. CDP evidence is in [platform-fonts.json](platform-fonts.json).

- [Before: original font with Urdu-codepoint fallback](aal-imran-before.png)
- [After: Qalam derivative with Urdu codepoints](aal-imran-after.png)
- [Arabic-codepoint reference using the derivative](aal-imran-arabic.png)

The after/reference images are byte-identical. The before image differs.

## Validation

- `npx tsc --noEmit`: passed.
- `npx next build --webpack`: passed. The initial default Turbopack attempt hit a local persistence database error; webpack completed the production build.
- `CHROME_PATH=/tmp/qalam-chrome/chromium QALAM_PDF_CHROMIUM=/tmp/qalam-chrome/chromium npx vitest run tests/digitalKhattPdf.test.ts tests/pdfPhase1eScriptAware.test.ts tests/fontRegistry.test.ts`: **38 passed, 0 failed, 0 skipped**.

- `PLAYWRIGHT_CHROMIUM_PATH=/tmp/qalam-chrome/chromium npx playwright test tests/e2e/digitalKhattUrdu.spec.ts --project=desktop-chrome --workers=1`: **2 passed, 0 failed**.
- Total: **40 passed; no remaining test failures**.
- Actual UI PDF download: [aal-imran-digital.pdf](aal-imran-digital.pdf). Server diagnostic: two protected runs, 391 Unicode codepoints, `sourceHtmlChromiumExact: true`, only `DigitalKhatt IndoPak Qalam` painted.

Chromium 149 was already included in the existing PDF package. It was unpacked locally for testing; no repository dependency was added. Local Liberation Serif was made available for the existing guarded period tests.

The everyday-use browser check covers four default-font Urdu paragraphs, four Digital Khatt paragraphs, actual Enter-key pagination to page 2, select/delete/undo, every menu, fullscreen, size/colour, the direction arrow, 50/100/200% zoom, Pages/Pageless views, and an actual Digital Khatt PDF download.

No workflows, package manifests, lockfile, protected font files, toolbar files, FirstLineLayout, or view/facing-pages implementation files are changed. Generated next-env.d.ts, tsbuildinfo and test-results are excluded from the commit.
