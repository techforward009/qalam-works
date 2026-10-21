# Private Book Library R2 mirror

This mirror is opt-in and read-only. It keeps a private R2 bucket behind the same style of Cloudflare Worker used by the existing Tafsir mirror. No `r2.dev` bucket or object URLs are used. The Worker only serves the fixed 15-source allowlist, checks a bearer token before R2 access, rejects query strings and bounds object sizes. The Next.js API keeps the token server-side and validates every downloaded object's length, SHA-256 and decoded records.

The current public Book Library API remains the access-control boundary for the existing publicly readable corpus. Do not add restricted sources to `SOURCE_IDS` until the Next.js API has an explicit per-source authorization policy. Never send the Worker URL or token to browser code.

## Prepare and verify a migration bundle

Obtain the archive and every original file from the authorized source archive. The `--originals` directory must contain exactly the filenames in the archive manifest. Preparation refuses to continue if a source is missing or its SHA-256 differs.

```sh
node scripts/prepare-book-library-r2.mjs \
  --archive /secure/path/Qalam-Foundational-Corpus-With-Kafi.zip \
  --originals /secure/path/originals \
  --output /secure/path/book-library-r2-bundle
```

The bundle includes immutable, Brotli-compressed per-record segments and search indexes, source and root manifests, a `current.json` pointer, and recoverable copies of the original archive and every original file. Keep the bundle in access-controlled storage; it contains the corpus. Preparation validates archive records and original checksums and checks Brotli round trips without trimming or normalizing source text. It writes new files only and will not overwrite an existing output.

## Upload and activate

Create the private R2 bucket and configure the Cloudflare Worker binding/secret through the owner's approved Cloudflare process. `AUTH_TOKEN` must be a high-entropy Worker secret. Deploying Worker code and creating bindings/secrets are separate owner-controlled steps and are not performed by these scripts.

Install/authenticate Wrangler separately, then first inspect the planned transfer:

```sh
node scripts/upload-book-library-r2.mjs --bundle /secure/path/book-library-r2-bundle --bucket qalam-book-library-private --dry-run
```

Upload immutable objects and download each back for checksum verification. This is bounded to at most four simultaneous transfers and never deletes objects:

```sh
node scripts/upload-book-library-r2.mjs --bundle /secure/path/book-library-r2-bundle --bucket qalam-book-library-private
```

Only after successful object verification, activate the version by explicitly passing `--activate`. The mutable `current.json` pointer is uploaded and verified last. This provides rollback: upload a previously verified bundle's pointer again. Do not activate when the originals, checksums or access policy have not been reviewed.

## Enable the reader

Set these server-side environment variables in a non-production Preview environment first:

```text
QALAM_BOOK_LIBRARY_READ_BACKEND=cloudflare-r2
QALAM_BOOK_LIBRARY_R2_MIRROR_URL=https://<private-worker-host>/
QALAM_BOOK_LIBRARY_R2_MIRROR_BEARER_TOKEN=<same value as Worker AUTH_TOKEN>
```

The R2 path is fail-closed: an unavailable mirror returns 503 and does not fall back to Vercel Blob. `record` fetches one record segment; catalog and search/topic use bounded manifests/indexes. Immutable objects are checked and cached in-process (64 entries/32 MiB, five minutes); the pointer is cached for 15 seconds. The Worker also uses Cloudflare Cache API only after checking authorization. Search/topic can fetch more than one source index, so avoid enabling broad search before measuring traffic.

When R2 read mode is selected, the existing Blob-backed admin import POST is intentionally rejected with `r2-write-path-not-configured`; it must not create a second, invisible source of truth. The existing reader route defaults to its current Blob backend until the R2 read flag is configured. Roll back by disabling that flag after confirming the Blob catalog still exists. This branch does not alter production environment variables, permissions, or objects.

## Current limitations

- R2 credentials, deployed Worker and live object access are not present in the implementation environment. A local bundle can be prepared and checksummed, but Cloudflare access cannot be claimed until a real authorized upload/read test is run.
- The current `main` branch's `BookLibraryPanel` reads a whole source record. This change makes the API's `record` request selective, but the separate measured visual paginator from Draft PR #74 is not on `main`; it must be merged or ported before claiming one measured page is one network segment.
- Import and activation UI remains disabled in R2 mode; this branch provides only a guarded migration bundle uploader, not an R2 write-admin flow.
- Do not include the local migration bundle in Git. It contains original religious texts and is intentionally recoverable only through the approved secure source/archive process.
