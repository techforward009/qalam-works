# Analytics privacy contract

Qalam Works measures **product usage events**, never **document or invoice content**.

## Never transmitted

- Pasted/uploaded/cleaned text
- TipTap document JSON or HTML
- Filenames
- Invoice names, addresses, phones, emails, line items, amounts
- Clipboard contents
- Raw exception messages that may include user text
- Hashes or snippets of user content

## Allowed

- Tool id, mode, resolved_mode (`en` | `ur` | `ar` | `rtl-neutral`)
- Input method (`paste` | `upload` | …)
- Export format (`txt` | `docx` | `pdf` | `copy`)
- success boolean
- Controlled error codes
- Coarse count buckets only

## Providers

- **Vercel Web Analytics** — page views + custom events
- **Vercel Speed Insights** — Core Web Vitals (RUM)

Analytics failures must never break tools.
