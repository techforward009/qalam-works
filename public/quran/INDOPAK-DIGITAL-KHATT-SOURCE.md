# Qalam Works — IndoPak Digital Khatt edition

This is a separate Quran edition. It does not replace, normalize, or rewrite the AhmedGraf Indo-Pak corpus used by `/quran`.

## Text

- Snapshot file: `public/quran/indopak-digital-khatt.json`
- Upstream path: `risan/quran-json` → `data/digitalkhatt/quran.json`
- Source project: https://github.com/risan/quran-json
- Origin recorded by that project: DigitalKhatt Indo-Pak typesetting
- Text licence recorded for this script: MIT
  https://github.com/DigitalKhatt/digitalkhatt-js/blob/main/LICENSE
- Host repository licence: CC BY-SA 4.0 (`LICENSE.txt` in risan/quran-json)
- Stored bytes are the upstream file, unchanged
- Shape: an object with keys `"1"` … `"114"`. Each value is an array of `{ "chapter", "verse", "text" }`
- 114 surahs, 6,236 numbered ayahs
- Al-Fatiha keeps the DigitalKhatt numbering: the basmala is not a numbered ayah, so 1:1 is `اَلْحَمْدُ لِلّٰهِ…` and the surah still has seven numbered ayahs
- No stored verse begins with the basmala. The reader may draw it as chapter furniture. That line is not written back into the corpus
- This is not Taj Company text, not AhmedGraf text, and not a Madani/Uthmani edition

## Font

- File: `public/fonts/DigitalKhattIndoPak.woff2`
- Source: https://github.com/DigitalKhatt/indopakfont
- Release: v1.0.0-beta.1 (`indopak.woff2`)
- Licence: SIL Open Font License 1.1
- Licence text shipped beside the font: `public/fonts/DigitalKhattIndoPak-OFL.txt`
