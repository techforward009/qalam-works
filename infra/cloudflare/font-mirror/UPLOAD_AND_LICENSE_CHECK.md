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

Mehr Nastaliq Web is a separate CC BY-SA 4.0 preview file, not one of those ten
owner-uploaded originals. The Worker allowlist name is `MehrNastaliqWeb.woff2`
(55,884 bytes, sha256 `a3c651455e754cb1e20e8bba05e449dfd12fa778870a79f11bca3108dbe41457`).
The original TrueType file is Mehr Nastaliq Web Version 2.00, 132,816 bytes,
sha256 `1339f7fbf3531908048a0b2965d3c79deb7d41a98614c77ac1d2f691cd6aa373`.
This environment has no Cloudflare credentials, so the R2 object was not uploaded
and the live Worker was not redeployed. Until that upload, browsers use the
same-origin `/fonts/MehrNastaliqWeb.woff2` fallback. Do not put this file on Vercel Blob.

Nafees Nastaleeq v1.02 replaces the site's button/UI copy of v1.00. The official
TrueType from cle.org.pk is `Nafees Nastaleeq v1.02.ttf`, 396,948 bytes, name-table
Version 1.02, manufacturer CRULP, designer Mr. Jamil-ur-Rehman, licence name ID 13
kept, licence URL `http://crulp.org/software/license/Nafees_Nastaleeq_License.html`.
The generated WOFF2 is `NafeesNastaleeq-v1.02.woff2`, 147,664 bytes, sha256
`0ded94076db53a8be209e5f2745a58eb244ead9a79ebc0e98a15750b2ca1feaf`. Conversion
did not subset or rename glyphs. `NafeesNastaleeq.woff2` (v1.00, 129,624 bytes) and
`NafeesNastaleeq-Web.woff2` (23,692 bytes) are no longer on the Worker allowlist.
The Worker returns 404 for those names. Delete these R2 objects separately:
`NafeesNastaleeq.woff2` and `NafeesNastaleeq-Web.woff2`. Delete these Vercel Blob
objects separately: `asif-quranic-400.woff2` and
`al-qalam-quran-majeed-web-regular.woff2`. This environment did not delete
remote objects. Jameel
Noori Nastaleeq was not rewritten; its "Free Of Charge For Urdu Lovers" name-table
note is untouched because the binary was not opened or re-encoded.

Their verified original sizes are pinned in `index.js`; the identity hashes
were verified against the owner's recovery archive in the prior preparation
stage. The Worker reads the exact original bytes from R2 and never edits them.

## Test before releasing Qalam Works

1. `https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/muhammadi-quranic-400.woff2` — should return 200 font/woff2.
2. `.../fonts/jameel-noori-nastaleeq-400.woff2` — same.
3. `.../fonts/NafeesNastaleeq-v1.02.woff2` — same. `.../fonts/NafeesNastaleeq.woff2` and `.../fonts/NafeesNastaleeq-Web.woff2` must return 404.
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
