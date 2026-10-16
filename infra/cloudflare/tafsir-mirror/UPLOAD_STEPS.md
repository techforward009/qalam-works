# Owner-approved recovery steps — no deployment or subscription change

The original immutable Urdu/English Tafsir V10 archives have been checked and
losslessly split by Quran surah: 114 encrypted? **No**. These are compressed but
**not encrypted**. Keep both R2 buckets private. Never set public r2.dev access.

The owner-upload kit is `Qalam_Cloudflare_Ready_20261016.zip` (available only
through their private ChatGPT download/Library). Do not add its content to Git.

## R2 private upload layout

Create a **Standard** class private bucket named `qalam-tafsir-private`, after
the owner explicitly activates R2 and reviews any billing terms. Inside the
bucket, upload the **unzipped individual files**, preserving keys:

```text
manifest-v1.json
ur/001.json.br
ur/002.json.br
...
ur/114.json.br
en/001.json.br
...
en/114.json.br
```

The manifest SHA-256 is:
`3f45650bb760432fe5e43cb91d42a49927791ea9e411dc952c2b92c0f9a2daca`.

Shards were derived from original:
- Urdu `119f8e96988a317df531a21ac8f271447e7c3a856f1ab11bac57cf5fb8a45c38`
- English `6e08e6952e33a452f7f644c6462cdad3d8250741ef7f1445c3ae5d37becaed59`

The uploader reconstructs and checks all 6,236 verse mappings and source entry
identities in each language. All 228 shard SHA-256 checksums are preserved in
`manifest-v1.json`. No Quran translation text was added or changed.

## Authenticated Worker

Set the R2 binding `TAFSIR_BUCKET` to the private bucket. Set `AUTH_TOKEN`
as a Worker **secret**; do not put a token in a public source file.

Only fixed HTTPS paths are supported, with Bearer authentication:
`/shards/manifest-v1.json` and `/shards/{ur|en}/001.json.br` through 114.

The old full archive paths remain supported as a rollback option only, when the
original files are uploaded separately.

## App server Preview settings

Configure only on the protected Preview initially:
- `QALAM_TAFSIR_V10_SHARDS_BASE_URL=https://YOUR-PRIVATE-WORKER.workers.dev`
- `QALAM_TAFSIR_V10_MIRROR_BEARER_TOKEN=` same secret as Worker.
- Existing Tafsir V10 publication flags remain as before.

With that variable **unset**, the original Blob-based route is unchanged.
With it configured, the app downloads the manifest once and downloads only
the requested surah or up to 3 surahs for a cross-surah Quran page. All files
have checksum verification. The cache keeps up to 24 surah chunks in each
server instance. Source corpus never appears as a public R2 bucket.

## Required acceptance, before user-approved production

1. In Preview, confirm both language samples: Fatiha 1:1, 1:2, 1:7,
   Al Baqarah 2:153, An Nas 114:6.
2. Check crossing Quran page boundaries (for example the end of one surah
   and beginning of another), source coverage and repeated topics.
3. Compare requested text and referents to the original owner-provided releases.
4. Confirm R2 bill, Worker request counter and source licenses.
5. Separately review and approve font rights. `qalam-fonts-private` stays
   private until the owner authorizes delivery and the license conditions hold.
6. Do not deploy, merge, reconfigure production domains, or spend money without
   the owner's explicit instruction.

## Costs

228 shard objects plus one manifest, roughly 13.4 MB in private R2. Alongside
the ten supplied fonts, the combined source package is about 25 MB.
Standard R2 currently has free-tier storage of 10 GB-month, 1M Class A writes,
and 10M Class B reads per month, subject to rate/pricing changes and all other
usage. Alerts do not enforce a hard spending limit.

For Windows use, download the kit ZIP and extract it locally. Upload the
individual `ur/` and `en/` directories and the manifest, not the ZIP.
Check Cloudflare dashboard shows 229 objects in the Tafsir bucket.
