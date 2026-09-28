# Qalam IndoPak Quranic — Phase 2C test results

fontTools compile and the HarfBuzz check pass. The font has 151 glyphs. Al-Fatihah 1:1–1:7 is still 316 shaped glyphs and zero `.notdef`. Heh, kaf, and seen were not redrawn.

## New letters

Each form below is an AhmedGraf word. None of these words produced `.notdef`.

| Letter | isol | init | medi | fina |
|---|---|---|---|---|
| ء | ءَاَنْذَرْتَھُمْ | — non-joining | — | — |
| خ | الْاَخِ | خَتَمَ | يُخٰدِعُوْنَ | نَنْسَخْ |
| ز | رَزَقْنٰھُمْ | — right-joining | — | اُنْزِلَ |
| ش | — | اشْتَرَوُا | يَشْعُرُوْنَ | وَلْيَخْشَ |
| ظ | — | ظٰلِمُوْنَ | يَظُنُّوْنَ | الْغَيْظَ |
| ى | الَّذِى | بِاَسْمَاۗىِٕہِمْ | اُولٰۗىِٕكَ | فِىْ |

In `اُولٰۗىِٕكَ`, kasra sits below hamza-below. That is the only mark change: hamza-below gained a bottom anchor, and `mkmk` can stack a bottom mark on it. Joins, shadda plus fatha, superscript alif, and U+06DD still pass.

## Consistency

The six letters use the same thin centerline as heh, kaf, and seen. Sheen keeps seen’s uneven troughs. Zah stays in the tah family and is shorter than a heavy naskh zah. Khah’s connected head is an open arch, not a closed circle. They are still simpler than PDMS: the hamza is small, the sheen dots are plain, and the maqsura return is restrained.

Words that also contain tanween (`ءٌ`, `شٍ`, `ظٌ`, `دًى`) still show a missing-glyph box for U+064B, U+064C, or U+064D. Those marks were not added. Maryam 19:1–4 and 2:282 still miss other letters that were out of scope, including U+0626.

No reference outlines were imported. The corpus and the production reader were not modified.
