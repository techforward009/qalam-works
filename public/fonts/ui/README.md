# Qalam Page UI fonts

Bundled so that the Qalam Page menus, toolbars, dialogs and status bar look the same on
Linux/Android as on Windows, without the user installing anything. The @font-face rules in
app/globals.css (`QalamUISegoe`, `QalamUITahoma`, `QalamUIArial`) list the installed font first
via `local("Segoe UI")`, `local("Tahoma")`, `local("Arial")`, so Windows and macOS keep using
their own fonts and never download these files. Only where that font is missing (Linux,
Android, ChromeOS) is the bundled woff2 used. A plain "insert after Tahoma" fallback would not
work on Android, because Android aliases Tahoma/Arial to Roboto. The files are subset to Latin +
general punctuation only, so Urdu text still falls back to the normal Urdu fonts.

| File | CSS family | Source | Licence |
| --- | --- | --- | --- |
| qalam-ui-tahoma-regular.woff2, qalam-ui-tahoma-bold.woff2 | `QalamUITahoma`, `QalamUISegoe` | Wine `fonts/tahoma.ttf`, `fonts/tahomabd.ttf` (Wine's metric-compatible Tahoma replacement, based on Bitstream Vera) | LGPL-2.1-or-later, see LICENSE-wine-tahoma.txt |
| qalam-ui-arial-regular.woff2, qalam-ui-arial-bold.woff2 | `QalamUIArial` | Liberation Sans 2.1.5 (metric-compatible with Arial) | SIL OFL 1.1, see LICENSE-liberation-sans-OFL.txt |

Converted with `pyftsubset --unicodes=U+0000-024F,U+2010-205F,U+20AC,U+2122,U+2212 --flavor=woff2`.
Original sources: https://gitlab.winehq.org/wine/wine/-/tree/master/fonts and
https://github.com/liberationfonts/liberation-fonts (release 2.1.5). The unmodified glyph
outlines are those of the upstream fonts; only the character set was reduced.
