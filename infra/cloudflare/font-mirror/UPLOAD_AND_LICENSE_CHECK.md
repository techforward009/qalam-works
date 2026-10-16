# Cloudflare font recovery — owner handoff

**Separate from the working Tafsir service. Never edit the Tafsir Worker.**
No production deployment, Cloudflare Worker publication, or paid-tier change has
been performed by these source changes.

## Required existing R2 source
- Private bucket: `qalam-fonts-private` (the owner uploaded 10 original WOFF2 files).
- Bucket public access must remain **disabled**.
- R2 object names are exact, at the root of the private bucket.
- Do not commit the binaries to Git, rename the files or silently substitute.
- The old DigitalKhattIndoPakRegular and several other missing Blob fonts are
  NOT in these ten uploads. Do not claim full PDF font recovery.

## Minimal owner Cloudflare steps (only after verifying redistribution permissions)

1. Workers & Pages → Create → Worker → Hello World. Set name to
   `qalam-fonts-private-mirror` and deploy initial empty Worker.
2. Settings → Bindings → Add → R2 bucket: variable name `FONT_BUCKET`,
   bucket name `qalam-fonts-private`. Save/deploy.
3. Edit code, replace Hello World with `infra/cloudflare/font-mirror/index.js`,
   deploy. Without publication flags, it responds **403** to known filenames.
4. Settings → Variables → add **Text** `OFL_PUBLICATION_APPROVED=true`
   after OFL copyright and license notices are available to users. Do NOT
   enable `RESTRICTED_DISTRIBUTION_APPROVED` unless the owner confirms the
   required redistribution rights for each named font (Alvi and Nafees have
   restrictive licenses; Muhammadi/Jameel are not clearly redistribution-licensed).
5. Worker public GET checks (no secrets required):
   `/fonts/Gulzar-Regular.woff2` (200 and font/woff2)
   `/fonts/Sahel.woff2` (200 and font/woff2)
   `/fonts/ScheherazadeNew-Medium.woff2` (200 and font/woff2)
   `/fonts/Alvi_Nastaleeq.woff2` (403 pending verified rights)
   Missing names (404).
6. Validate correct CORS, fresh browser fonts and rendering in a protected
   Qalam Preview. Only after explicit owner sign-off merge/deploy to Production.

## Three redistributable font notices
Gulzar: Copyright 2021 The Gulzar Project Authors
(http://github.com/googlefonts/gulzar/).
Sahel: Copyright 2016 Saber Rastikerdar, based on DejaVu, Open Sans portions
under Apache License 2.0.
Scheherazade New: Copyright (c) 1994-2026 SIL Global, Reserved Font Names
"Scheherazade" and "SIL".

All three have embedded SIL Open Font License version 1.1 references. Keep
the full license alongside the distributed files:
https://openfontlicense.org/open-font-license-official-text/

## Exact future source identities
Refer to the owner-verified `Qalam_Cloudflare_R2_Upload_Ready_Verified_20261016.zip`
(private Library archive), and never use newer similar-named fonts as substitutes.
