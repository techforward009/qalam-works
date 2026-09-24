# 12 — UI spec

**Status:** SPEC FREEZE. First workspace implemented 2026-09-24 at `/tools/research-studio`. Not added to the sitemap. Documents remain process memory.
**Depends on:** [11-API-CONTRACT.md](11-API-CONTRACT.md)  
**Phase H workspace:** shipped 2026-09-24 after engine phases A–G.

## Surface

Route: `/tools/research-studio`  
Do not add to `sitemap.ts` until the page is a real product, not a stub.

Existing notes store UI is **not** required for v0.1. If a notes panel is shown later, keep it separate from Ask.

## Layout (LTR sketch)

```text
┌────────────────────────────────────┐
│ Research Studio                    │
├────────────────────────────────────┤
│ Sources                            │
│  ☑ Book A.pdf                      │
│  ☑ Book B.pdf                      │
│  ☑ Book C.pdf                      │
│                                    │
│ Ask your sources…                  │
│ [ Ask ]                            │
├────────────────────────────────────┤
│ Answer                             │
│  ……………… [1]                        │
│  ……………… [2]                        │
│                                    │
│ Sources                            │
│  [1] Book A — p. 137               │
│  [2] Book C — p. 42                │
└────────────────────────────────────┘
```

Click `[1]` → document → page 137 → highlighted passage (`rawText` range).

## Answer states

Only two primary states:

- **Answered** with citations
- **Insufficient evidence** (Urdu copy from [10-LLM-CONTRACT.md](10-LLM-CONTRACT.md))

No “I’m not sure but maybe…” panel.

## RTL

When UI language is Urdu (existing `useLanguage()`):

- `dir="rtl"` on the studio shell
- filename and page numbers stay `dir="ltr"` isolates
- quotes keep source direction (`dir=auto` on the quote block)

Follow Qalam header/footer and design tokens. Do not invent a separate visual brand.

## MUST

- Never render `answered: true` without visible citations.
- Show page number, not only chunk id.
- Disable Ask while `processingStatus !== "ready"` for selected sources.

## MUST NOT

- Embed Document Studio’s editor as the Ask box.
- Auto-send document text to analytics events.
- Display raw chunk ids as the only reference.

## ACCEPTANCE

- RTL screenshot/fixture: citation list remains readable; PDF names do not reverse.
- Clicking citation opens the matching page number from the API.
- Refusal state has no fabricated bullet list.
