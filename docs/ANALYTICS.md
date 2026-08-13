# Analytics architecture

## Stack

- `@vercel/analytics` — Web Analytics + `track()`
- `@vercel/speed-insights` — real-user performance
- `app/lib/analytics/*` — typed allow-list event layer

## Adding an event

```ts
import { trackEvent } from "@/lib/analytics";

trackEvent("tool_process", {
  tool: "document_cleaner",
  mode: "auto",
  resolved_mode: "rtl-neutral",
  success: true,
});
```

Only properties defined in `AnalyticsProps` are sent. Forbidden keys are stripped.

## Tool IDs

`document_studio` · `document_cleaner` · `quality_audit` · `urdu_unicode_standardizer` · `whatsapp_rtl_formatter` · `invoice_generator`

## Funnels (conceptual)

**Content tools:** Landing → tool_open → process → copy/download  
**Studio:** open → mode_change → process → preview_confirm → export  
**Unicode:** open → process → copy · cross_link → Cleaner  

## Deduplication

`trackToolOpenOnce` guards `tool_open` per tool per page session.
