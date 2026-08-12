# WhatsApp RTL Formatter – Integration Guide

## Files (as integrated in Qalam Works)

```
app/
  utils/
    whatsappRtlFormatter.ts          # pure engine
  tools/
    whatsapp-rtl-formatter/
      page.tsx                       # route + metadata
      WhatsAppRtlFormatterContent.tsx # wires language context
      components/
        WhatsAppRtlFormatter.tsx     # portable React component
tests/
  whatsappRtlFormatter.test.ts       # Vitest suite
docs/
  WHATSAPP-RTL-FORMATTER.md          # this document
```

The pure engine has zero React or UI dependencies and can be imported anywhere.

## Importing the formatter

```ts
import { formatForWhatsAppRTL } from "@/utils/whatsappRtlFormatter";
// or relative from tests:
import { formatForWhatsAppRTL } from "../app/utils/whatsappRtlFormatter";

const safeText = formatForWhatsAppRTL(rawUserText);
```

## Using the React component

```tsx
import WhatsAppRtlFormatter from "@/tools/whatsapp-rtl-formatter/components/WhatsAppRtlFormatter";

// English UI
export default function Page() {
  return <WhatsAppRtlFormatter language="en" />;
}

// Urdu UI
export default function PageUr() {
  return <WhatsAppRtlFormatter language="ur" />;
}
```

### Connecting to Qalam Works language context

Already done in `WhatsAppRtlFormatterContent.tsx`:

```tsx
import { useLanguage } from "../../lib/language-context";
import WhatsAppRtlFormatter from "./components/WhatsAppRtlFormatter";

export default function WhatsAppRtlFormatterContent() {
  const { language, dir } = useLanguage();
  return (
    <main className="py-10 md:py-14" dir={dir}>
      <div className="site-container">
        <WhatsAppRtlFormatter language={language} />
      </div>
    </main>
  );
}
```

### Props

| Prop          | Type          | Default | Description                                      |
|---------------|---------------|---------|--------------------------------------------------|
| `language`    | `"en" \| "ur"`| `"en"`  | Controls all visible labels (never mixed).       |
| `className`   | `string`      | `""`    | Optional extra class on the root element.        |
| `showPreview` | `boolean`     | `true`  | Show Before/After preview when output exists.    |

The component is marked `"use client"`. It uses only semantic HTML and CSS class names (`whatsapp-rtl-formatter`, `waf-*`). No inline styles and no external UI libraries are required. Style the classes from your own CSS / design system.

Example minimal host CSS (optional):

```css
.whatsapp-rtl-formatter { max-width: 42rem; margin: 0 auto; padding: 1rem; }
.waf-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
.waf-description { margin: 0 0 1rem; opacity: 0.85; }
.waf-label { display: block; font-weight: 600; margin-bottom: 0.25rem; }
.waf-textarea { width: 100%; box-sizing: border-box; padding: 0.75rem; min-height: 10rem; }
.waf-textarea-output { background: #f7f7f7; }
.waf-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0; }
.waf-btn { padding: 0.5rem 1rem; cursor: pointer; }
.waf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.waf-error { color: #b00020; }
.waf-preview { margin-top: 1.5rem; border-top: 1px solid #e0e0e0; padding-top: 1rem; }
.waf-preview-title { font-size: 1.1rem; margin: 0 0 0.75rem; }
.waf-preview-grid { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
.waf-preview-panel { border: 1px solid #ddd; border-radius: 4px; padding: 0.5rem; }
.waf-preview-label { font-size: 0.85rem; font-weight: 600; margin: 0 0 0.35rem; }
.waf-preview-text { white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; margin: 0; max-height: 12rem; overflow: auto; }
.waf-footer { margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.8; }
```

## Clipboard behaviour

```ts
await navigator.clipboard.writeText(output);
```

- Only plain text is written.
- The invisible Unicode controls travel with the string and survive normal clipboard operations on modern platforms.
- No HTML is placed on the clipboard.

If clipboard access is denied the component surfaces a short error so the user can select-and-copy from the output textarea.

## Unicode controls intentionally inserted

| Code point | Name                        | When inserted                                      |
|------------|-----------------------------|----------------------------------------------------|
| U+2066     | LEFT-TO-RIGHT ISOLATE (LRI) | Opens an isolated LTR run that sits inside RTL text |
| U+2069     | POP DIRECTIONAL ISOLATE (PDI)| Closes the most recent isolate                    |

- Only LRI / PDI are used. RLI and older embedding controls are never inserted.
- On every call the engine first removes only LRI / PDI (the controls it itself may have written). User-supplied directional marks are left untouched.
- Controls appear **only** around meaningful LTR runs (English words, numbers, abbreviations, URLs, emails) that occur inside a line containing RTL (Urdu/Arabic) characters.
- Leading list markers (`1.`, `2)`, `•`, `-`, `*`) are never isolated; they stay attached to the RTL list item.
- Pure English paragraphs and pure LTR lines receive zero control characters.

## Core design decisions (engine)

1. **RTL-context only** – A line is examined for the presence of Arabic/Urdu script. If none is found the line is returned unchanged. This prevents pure English text from being wrapped.
2. **List markers stay plain** – Leading numbered or bulleted markers are detected and left free of isolation controls so they remain visually attached to their RTL line.
3. **Meaningful runs only** – An LTR run must contain at least one alphanumeric character. Pure punctuation is never isolated.
4. **Token-preserving connectors** – Characters such as `@ . _ - : / ? & = % + #` are allowed *inside* a run so that URLs, emails, numeric ranges and dates stay atomic.
5. **Idempotent** – `formatForWhatsAppRTL(formatForWhatsAppRTL(text))` yields the same result as a single pass.
6. **No content mutation** – Visible characters, order, numbers, URLs and emails are never altered, translated or reversed.

## Manual testing checklist

This tool improves visual stability of mixed RTL/LTR plain text inside WhatsApp. It does **not** claim perfect results on every WhatsApp version or device. Always verify:

### Platforms
- WhatsApp Web (Chrome / Firefox / Safari)
- WhatsApp Android (latest stable)
- WhatsApp iOS (latest stable)

### Content to test
- Long pure Urdu paragraphs (must stay identical)
- Pure English paragraphs (must stay identical – no controls)
- Bullet lists (`•`, `-`, `*`) containing English or numbers
- Numbered lists (`1.`, `2)`) – markers must stay on the correct side; only embedded LTR content is isolated
- English words and abbreviations (`PDF`, `DOCX`, `TXT`, `PKR`)
- Numbers, numeric ranges (`1500-2500`) and dates (`2024-08-12`)
- Full URLs and email addresses
- Mixed sentences that combine several of the above
- Multiline text with blank lines

### Suggested steps
1. Paste the original (unformatted) mixed text into WhatsApp → observe broken order / markers on the wrong side.
2. Run the same text through the formatter → Copy for WhatsApp.
3. Paste into the same WhatsApp surface.
4. Confirm:
   - List markers stay on the correct side of the line and are not isolated.
   - English fragments, numbers, ranges, URLs and emails read left-to-right.
   - Urdu reading order is preserved.
   - No visible characters were added, removed or reversed.
   - Pure English text is completely unchanged.
5. Repeat on Web, Android and iOS.

## Limitations (explicit)

- WhatsApp’s own text-layout engine can still apply additional bidi heuristics.
- Extremely complex nested directional runs or rare edge-case punctuation may still need manual adjustment.
- The tool never translates, rewrites or reorders visible characters; it only inserts invisible isolation controls where an LTR fragment sits inside RTL text.

Always treat the output as “improved plain text” and perform the manual platform checks above before publishing important content.
