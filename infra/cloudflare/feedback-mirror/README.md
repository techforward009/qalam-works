# Qalam Works: private feedback R2 — owner-controlled setup

This Worker is a private, same-account alternative to Vercel Blob for **both**
`user-feedback/v1/**` ratings/comments and `contact-inquiries/v1/**` contact messages.

## Important audit finding
The current Qalam Works feedback route stores both categories in the **qalam-research**
Vercel Blob client. The unconnected `qalam-user-feedback` store visible in Vercel's
dashboard is not used by the current application code; **inspect both stores
before deleting either one**. The owner must check for historical objects too.

## Manual Cloudflare setup (do not include secrets in chat or GitHub)
1. Cloudflare Dashboard > Storage & databases > R2 > Create bucket
   `qalam-user-feedback-private`. Keep it **private**; no `r2.dev` or custom public bucket domain.
2. Workers & Pages > create `qalam-feedback-private-mirror`, deploy code from
   `src/index.ts` with `wrangler.toml`, or your approved CI process.
3. Worker Settings > Bindings > Add R2 bucket > variable `FEEDBACK_BUCKET`,
   select `qalam-user-feedback-private`.
4. Worker Settings > Variables and Secrets > add encrypted **AUTH_TOKEN** (at least
   32 high-entropy characters). Copy it privately to Vercel's server environment.
5. Vercel Preview environment variables:
   `QALAM_FEEDBACK_STORAGE_BACKEND=cloudflare-r2`
   `QALAM_FEEDBACK_R2_WORKER_URL=https://qalam-feedback-private-mirror.<your-account>.workers.dev`
   `QALAM_FEEDBACK_R2_BEARER_TOKEN=<same private secret>`.
   Never expose this URL + secret to the browser. There is no Worker-to-Blob fallback.
6. Confirm a feedback POST, contact POST, and authenticated contact admin listing
   against Preview. Confirm Worker 401 without its secret; read-back and key parity.
7. Export **existing** `user-feedback/v1/` and `contact-inquiries/v1/` objects
   from the authoritative old store, upload **byte-identical** objects with original keys
   into the new R2 bucket and verify counts, hashes, timestamps, and admin listing.
   **Do not delete any old objects until the copy is proven.**
8. Owner-approved production release: apply the three environment variables to
   Production and deploy the code. Monitor failures and Worker R2 requests. Only then
   consider retiring the old Vercel stores after dependency and backup checks.

## Security/behavior
- No public object/list access: every request requires a private server-to-Worker bearer token.
- Valid object paths and prefixes are restricted; max object size 8 KiB.
- `Cache-Control: private, no-store`; GETs must not be CDN cached.
- Existing frontend form validation, origin checks, request throttling, email notifications,
  contact admin authentication, and response shapes remain unchanged.
- The new backend is **opt-in** and fails closed; the legacy backend remains selected
  until the owner authorizes cutover. Never send secrets through chat or commit them.
- This repository change does not create Cloudflare resources, migrate existing
  private objects, change production settings, or delete Vercel stores.
