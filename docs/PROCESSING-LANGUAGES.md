# Processing languages (document cleaning & quality)

## Modes

| Mode | Code | Behavior |
|------|------|----------|
| Auto | `auto` | Conservative local detection; **never** applies Urdu maps without explicit Urdu |
| Urdu | `ur` | Full Urdu Unicode + punctuation maps (historical default for explicit choice) |
| English | `en` | Spacing/line-ending cleanup only; **no** Arabic punctuation conversion |
| Arabic | `ar` | Neutral + Arabic-safe spacing; **preserve** ي/ك/أ/إ |

## Resolved states (after Auto)

| Resolved | When | Maps applied | Direction |
|----------|------|--------------|-----------|
| `en` | Latin-only / overwhelmingly Latin | English-safe + neutral | LTR |
| `rtl-neutral` | Arabic-script present, Urdu vs Arabic uncertain | Neutral + Arabic-safe spacing only | RTL |
| `ur` | **Only** when user selects Urdu | Full Urdu orthography maps | RTL |
| `ar` | **Only** when user selects Arabic | Arabic-safe only | RTL |

## Architecture

- `neutralCleanup` — CRLF, spaces, blank lines, safe duplicate punct
- `englishCleanup` — Latin punctuation spacing only
- `arabicSafeCleanup` — spacing around Arabic punct; no letter maps
- `urduNormalize` — historical Urdu engine (`{{…}}` Arabic protect)
- `processText(text, mode)` — dispatcher
- `standardizeUrduText` — thin wrapper → `processText(text, "ur")`

## Auto-detection limits

- Shared Arabic Unicode block → **cannot** tell Urdu from Arabic or Persian.
- Auto **never** selects `ur` or `ar` from script alone.
- Uncertain Arabic-script → `rtl-neutral` (least destructive).
- Users who need Urdu normalization or Arabic-specific handling must choose explicitly.
- Future Persian should add `fa` without rewriting the dispatcher.

## Privacy

All detection and processing remain in-browser / local. No external APIs.
