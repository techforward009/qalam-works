# Processing languages (document cleaning & quality)

## Modes

| Mode | Code | Behavior |
|------|------|----------|
| Auto | `auto` | Conservative local detection; explicit choice always wins |
| Urdu | `ur` | Full Urdu Unicode + punctuation maps (historical default) |
| English | `en` | Spacing/line-ending cleanup only; **no** Arabic punctuation conversion |
| Arabic | `ar` | Neutral + Arabic-safe spacing; **preserve** ي/ك/أ/إ |

## Architecture

- `neutralCleanup` — CRLF, spaces, blank lines, safe duplicate punct
- `englishCleanup` — Latin punctuation spacing only
- `arabicSafeCleanup` — spacing around Arabic punct; no letter maps
- `urduNormalize` — historical Urdu engine (`{{…}}` Arabic protect)
- `processText(text, mode)` — dispatcher
- `standardizeUrduText` — thin wrapper → `processText(text, "ur")`

## Auto-detection limits

- Shared Arabic Unicode block → **cannot** reliably tell Urdu from Arabic.
- Auto never selects `ar`; pure Arabic-script defaults to `ur` for product continuity.
- Users who need Arabic letter preservation must choose **Arabic** explicitly.
- Future Persian should add `fa` mode + rules without rewriting the dispatcher.

## Privacy

All detection and processing remain in-browser / local. No external APIs.
