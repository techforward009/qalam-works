# Private research R2 Worker

This is a non-production scaffold. No Worker or bucket is deployed by this PR.

Create a private R2 bucket named `qalam-research-private`, bind it as `RESEARCH_BUCKET`, and set a strong encrypted `AUTH_TOKEN` Worker secret. Never commit or display that secret.

Only the authenticated server may PUT/GET `research/v1/documents/<id>.json` or list the exact prefix. The endpoint is not for browsers. The current research application is NOT switched to this Worker yet; it still uses Vercel Blob. Test with non-sensitive synthetic records before any switch. The owner explicitly does not want old data migrated.

Next: implement a server-only client, integrate behind a preview-scoped environment switch, test 25 MiB bounds, list pagination, errors and research workflows, then separately retire the Blob path after acceptance.
