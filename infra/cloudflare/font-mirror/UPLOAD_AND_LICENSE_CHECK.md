# Qalam Works — Cloudflare original font recovery

The owner confirms authorization to distribute the **unmodified original font
binaries** uploaded to the private R2 bucket. This file records that owner
attestation; it does not independently determine the scope of external licenses.
No font has been renamed, substituted, or committed to the public repository.

## One-time setup

- Existing R2 bucket: `qalam-fonts-private`, with Public Access **disabled**.
- Create a **separate** Cloudflare Worker with exact name
  `qalam-fonts-private-mirror`. Do not edit `qalam-tafsir-private-mirror`.
- Worker Settings -> Bindings -> R2 bucket:
  `FONT_BUCKET` -> `qalam-fonts-private`.
- Worker Edit Code: paste the entire `index.js` from this directory,
  replacing Hello World; Deploy.
- No authorization header, payment plan change, release flags, environment
  secrets or R2 public bucket toggle are needed for this browser-font gateway.
- Confirm exact original names, MIME type and browser cross-origin permission.

## Exact verified owner-uploaded names

```
AlFars9Badr.woff2
Alvi_Nastaleeq.woff2
BNazanin.woff2
Gulzar-Regular.woff2
NafeesNastaleeq-Web.woff2
NafeesNastaleeq.woff2
Sahel.woff2
ScheherazadeNew-Medium.woff2
jameel-noori-nastaleeq-400.woff2
muhammadi-quranic-400.woff2
```

Their verified original sizes are pinned in `index.js`; the identity hashes
were verified against the owner's recovery archive in the prior preparation
stage. The Worker reads the exact original bytes from R2 and never edits them.

## Test before releasing Qalam Works

1. `https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/muhammadi-quranic-400.woff2` — should return 200 font/woff2.
2. `.../fonts/jameel-noori-nastaleeq-400.woff2` — same.
3. `.../fonts/NafeesNastaleeq.woff2` — same.
4. `.../fonts/Alvi_Nastaleeq.woff2` — same.
5. `.../fonts/Gulzar-Regular.woff2` — same.
6. `.../shards/ur/001.json.br` — must return 404, NOT tafsir bytes.

Then test protected Qalam Preview in a fresh browser, verify actual fonts are
painted rather than fallbacks, and verify Urdu, English, Arabic and Quran
typography. PDF must still independently validate requested font identity,
Unicode and glyph embedding; missing locked DigitalKhattIndoPakRegular is not
in the ten uploaded originals and must not be silently replaced.

## Staging status

Source code prepared in a **draft review** only. No Cloudflare Worker for
fonts created by the assistant, no actual R2 web-serving endpoint verified,
no main merge, no production deployment. Owner approval for production
deployment is separate.
