# Qalam Works — Product roles & positioning (Batch 5)

## Tool roles

| Tool | Role |
|------|------|
| Document Studio | Full write/edit/review/export workspace |
| Document Cleaner | Quick paste/upload language-aware cleanup |
| Quality Audit | Inspection only — does not modify text |
| Urdu Unicode Standardizer | Urdu-specific orthographic normalization |
| WhatsApp RTL Formatter | WhatsApp mixed-script direction formatting |
| Invoice Generator | Language-neutral invoice utility |

## Language support truth

- **Auto**: Latin → English path; Arabic-script uncertain → rtl-neutral (non-destructive). Never silent Urdu maps.
- **Urdu**: Full historical Urdu maps.
- **English**: Spacing/punct only; no Arabic punct conversion.
- **Arabic**: Preserve ي/ك/أ/إ.
- **Persian**: No dedicated mode; Auto remains non-destructive.

## Naming

- Quality Audit (route remains `/tools/quality-checker`)
- Urdu Unicode Standardizer (route `/tools/unicode-standardizer`)
- Invoice Generator (route `/tools/invoice-generator`)

## SEO

- Titles: `[Intent] | Qalam Works` (no double brand suffix)
- Canonical host: `https://qalamworks.com` (metadataBase / layout)
- No hreflang: UI language is same-URL switch, not separate indexable locales

## Privacy

- Cleaner / Standardizer / Quality Audit / Studio text processing: browser-local
- Studio PDF export: uses `/api/export-pdf` server route
