# Qalam Works — Architecture

**Last verified:** 2026-08-24  
**Status:** Living architecture document  
**Production:** https://www.qalamworks.com

---

## 1. System Overview

Qalam Works is a multilingual publishing and language-processing web application built with the Next.js App Router.

The system is designed around three architectural priorities:

1. **Deterministic text processing first** — core cleanup, normalization, transliteration, formatting, and protection rules should be predictable and testable.
2. **Urdu/RTL as first-class behavior** — direction, punctuation, typography, mixed-script handling, and content isolation are architectural concerns, not cosmetic afterthoughts.
3. **Tool isolation with shared foundations** — each major tool owns its feature-specific UI and logic, while genuinely reusable processing, localization, analytics, and document utilities live in shared layers.

The application supports English, Urdu, Arabic, Persian, Roman Urdu, and mixed-script workflows.

---

## 2. Current Technology Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16 (App Router) |
| **UI Runtime** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Rich Text Editing** | TipTap 3 |
| **Unit / Integration Tests** | Vitest 4 + Testing Library |
| **End-to-End Tests** | Playwright |
| **Document Import** | Mammoth |
| **DOCX Export** | `docx` |
| **PDF / Rendering** | `pdf-lib`, Puppeteer Core, Chromium |
| **Fonts** | Inter, Noto Naskh Arabic, Noto Nastaliq Urdu, Amiri, Vazirmatn |
| **Analytics** | Vercel Analytics + Speed Insights |
| **Hosting** | Vercel |
| **Version Control** | GitHub |

`tsconfig.json` uses strict TypeScript settings and the `@/*` alias mapped to the repository root.

---

## 3. High-Level Repository Structure

```text
qalam-works/
├── app/
│   ├── actions/                 # Server actions
│   ├── api/                     # API routes
│   ├── components/              # Shared site-level UI
│   ├── lib/                     # Language, translations, analytics
│   ├── tools/                   # Tool routes + tool-owned code
│   ├── about/
│   ├── contact/
│   ├── privacy/
│   ├── services/
│   ├── terms/
│   ├── layout.tsx               # Root application shell
│   ├── page.tsx                 # Home page
│   ├── globals.css
│   ├── robots.ts
│   └── sitemap.ts
│
├── docs/                        # Specifications, decisions, roadmap, architecture
├── public/                      # Static public assets
├── scripts/                     # Project scripts / maintenance utilities
├── tests/                       # Unit, integration, regression, benchmark, E2E support
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── next.config.ts
```

A legacy `netlify.toml` still exists in the repository, but the current production deployment target is Vercel.

---

## 4. Application Shell and Global State

### `app/layout.tsx`

The root layout provides the common application shell, including:

- global metadata
- shared Header
- shared Footer
- language context
- analytics / speed insights
- global fonts and styles

### Language Context

`app/lib/language-context.tsx` is the global language state.

Supported site languages are:

```text
en
ur
```

It manages the selected interface language and updates document language/direction metadata.

### Translation Dictionary

`app/lib/translations.ts` is the main shared translation source for site-level and tool-level interface strings that use the common localization system.

Tool-local dictionaries may still be used where a tool has specialized UI.

---

## 5. Direction Architecture

Qalam Works separates **interface direction** from **content direction**.

This is a core product rule.

### Interface direction

- English interface: LTR
- Urdu interface: RTL
- Global Header: intentionally locked English/LTR in both site languages
- Footer: localized separately for English and Urdu

### Content direction

User content must not be forced to match the site language.

Examples:

- Urdu input: RTL
- English / Roman Urdu output: LTR
- Translation source and target panes: direction follows the actual language of each side
- Mixed-content tools may use `dir="auto"` or content-aware direction logic

### Machine-readable islands

URLs, email addresses, filenames, file extensions, IDs, hashes, versions, and similar machine-readable tokens may remain LTR inside Urdu UI.

Prefer semantic isolation such as:

```html
<bdi dir="ltr">...</bdi>
```

Do not insert bidi control characters into stored user content merely to repair visual presentation.

---

## 6. Tool Architecture

Public tools live under:

```text
app/tools/<tool-name>/
```

Each public tool route maps directly to:

```text
/tools/<tool-name>
```

### Current public tools

```text
app/tools/
├── document-studio/
├── translation-studio/
├── roman-urdu-writer/
├── urdu-roman-writer/
├── document-cleaner/
├── quality-checker/
├── unicode-standardizer/
├── invoice-generator/
└── whatsapp-rtl-formatter/
```

### Research Studio

`app/tools/research-studio/` currently contains internal utilities only and does not expose a public `page.tsx` route in the present tree.

Do not treat folder existence alone as proof of a public tool.

---

## 7. Tool Ownership Rule

Tool-specific behavior stays inside the tool.

Typical structure:

```text
app/tools/example-tool/
├── page.tsx
├── ExampleToolContent.tsx
├── components/
└── utils/
```

### Rule

If a function, component, dictionary, benchmark helper, or transformation is only used by one tool, keep it local.

Promote code to a shared location only after genuine reuse exists.

Avoid premature abstraction.

---

## 8. Shared Layers

### `app/components/`

Shared site UI such as:

- Header
- Footer
- Language Switch
- homepage/shared presentation components

These components should remain product-wide rather than being duplicated per tool.

### `app/lib/`

Shared application-level services such as:

- language context
- translations
- analytics

### Shared processing utilities

Cross-tool deterministic processing utilities may live in shared utility areas when multiple tools depend on the same behavior.

Examples include:

- script/language detection
- Unicode normalization
- protected-token handling
- document extraction
- file validation
- direction helpers
- formatting and export support

Pure transformation logic should remain independent of React wherever practical.

---

## 9. Document Studio Architecture

Document Studio is the most feature-rich publishing surface.

It combines:

- TipTap-based rich-text editing
- paragraph and heading direction
- language-aware processing
- document settings
- publishing presets
- document analysis
- quality audit
- statistics
- suggestions/review
- find/replace
- outline
- glossary
- DOCX export
- PDF export
- file import
- local persistence

Feature-specific logic remains under:

```text
app/tools/document-studio/
```

Document processing/export logic must remain separate from localization/presentation changes.

Direction attributes stored on document nodes are part of document behavior and must not be confused with the current site-language direction.

---

## 10. Roman Urdu → Urdu Architecture

The Roman Urdu Writer is a deterministic conversion system, not a generic generative translation feature.

Its accepted architecture includes:

- lexical matching
- phonetic fallback
- compound handling
- punctuation handling
- protected tokens
- ambiguity/review logic
- Urdu-script output policy
- regression benchmarks
- everyday acceptance tests

The UI layer must not silently change frozen engine behavior.

Presentation, localization, and routing work should remain separate from conversion-engine work unless explicitly approved.

---

## 11. Urdu → Roman Architecture

The Urdu → Roman Writer is an independent module from Roman Urdu → Urdu.

Key separation:

```text
Urdu input
   ↓
Urdu → Roman conversion
   ↓
Style layer
   ↓
Roman output
```

Current responsibilities include:

- Urdu-script input
- Roman transliteration
- selectable style output
- draft persistence
- independent route
- dedicated tests/benchmarks

Do not reuse Roman → Urdu engine assumptions in the reverse direction.

Input direction remains RTL; Roman output remains LTR regardless of site language.

---

## 12. Translation Studio Architecture

Translation Studio is a structured translation workspace.

Architecture must preserve the separation between:

- site UI language
- source language
- target language
- translation project state
- segment-level review/state

Source and target direction must be derived from their actual languages, not from the global site locale.

Translation logic, handoff behavior, glossary/review state, and UI localization should remain independently testable.

---

## 13. Document Import / Export Boundary

Document handling is split between browser-side feature logic and server/API rendering where required.

Current repository surfaces include:

```text
app/actions/documentAction.ts
app/api/export-pdf/
```

Use server-side execution only where required for document generation, filesystem-like processing, headless-browser rendering, or protected server behavior.

Client UI components should not absorb server-rendering responsibilities.

---

## 14. Data and Persistence

Qalam Works currently uses browser persistence for selected workflows such as drafts/settings where appropriate.

Rules:

- storage keys should be tool-scoped
- schemas should be versioned where useful
- corrupted storage must fail safely
- output should generally be re-derived from source state rather than storing redundant derived data
- Clear/reset actions must clear the corresponding persisted state
- persistence changes must be regression-tested

Do not share storage keys between independent tools.

---

## 15. Localization Architecture

Localization is layered:

### Shared localization

Use:

```text
app/lib/language-context.tsx
app/lib/translations.ts
```

for common product UI.

### Tool-local localization

A tool may own a local `UI.en / UI.ur` or equivalent dictionary when its interface is specialized.

### Locked exceptions

The following are intentional product decisions:

- Header remains English/LTR in both site modes
- Language Switch is bilingual by nature
- decorative Urdu `ق` may appear in English UI
- sample/demo text may intentionally use a different language from the surrounding interface

Do not treat these as localization defects.

---

## 16. API and Server Actions

Current server-side application surfaces include:

```text
app/actions/
└── documentAction.ts

app/api/
└── export-pdf/
```

New API routes or server actions should be added only when a browser-only implementation is not appropriate.

Keep validation at trust boundaries.

Never assume user-uploaded or imported document content is safe.

---

## 17. Testing Architecture

The project uses layered verification.

### Unit / integration / regression

```bash
npm test
```

Vitest tests cover:

- processing engines
- document utilities
- normalization
- converters
- benchmarks/regressions
- persistence
- analytics/privacy behavior
- export helpers
- quality checks

### Type verification

```bash
npx tsc --noEmit
```

### Production build

```bash
npm run build
```

### Browser acceptance

```bash
npx playwright test
```

Playwright is used for visible user-flow verification, including mobile-sensitive behavior.

### Verification discipline

During development:

1. run focused tests while iterating
2. run broad gates once at a meaningful acceptance point
3. if one gate fails, fix and rerun the failed/relevant gate
4. avoid repeatedly running all broad gates without need

---

## 18. Frozen Baseline Rule

Accepted processing behavior may be explicitly frozen through commits/tags and benchmark expectations.

A frozen baseline means:

- do not casually refactor behavior
- do not update expected outputs merely to make tests pass
- identify whether a change is presentation-only or engine-level
- verify regression metrics before accepting engine changes

UI/localization work should not alter frozen conversion outputs.

---

## 19. AI-Assisted Development Boundary

AI agents may assist with:

- repository inspection
- implementation
- refactoring
- tests
- documentation
- review

But permission to inspect or edit does **not** imply permission to:

- commit
- push
- deploy
- merge
- change unrelated files
- broaden scope
- rewrite frozen logic

High-risk repository actions should be explicit separate steps.

Recommended sequence:

```text
Read-only audit
    ↓
Human review
    ↓
Approved implementation
    ↓
Focused tests
    ↓
Full verification gates
    ↓
Diff review
    ↓
Explicit commit/push approval
```

---

## 20. Import and Dependency Rules

### Cross-folder imports

Prefer the configured alias:

```ts
@/...
```

for cross-feature imports when appropriate.

Avoid fragile deep relative paths where a stable alias improves clarity.

### Dependency direction

Preferred direction:

```text
Page / UI
   ↓
Tool-local components
   ↓
Tool-local pure utilities
   ↓
Shared pure utilities / services
```

Avoid circular dependencies between tools.

A tool should not import another tool's internal implementation unless there is an explicit shared contract.

If behavior becomes genuinely shared, extract it to a shared layer.

---

## 21. Styling and Typography Boundary

Global design primitives live in:

```text
app/globals.css
docs/DESIGN-SYSTEM.md
```

Tool-specific layout belongs with the tool.

Do not solve isolated RTL/LTR bugs through broad global CSS overrides that may affect unrelated tools.

Prefer:

- logical CSS properties
- `text-start` / `text-end`
- `margin-inline-*`
- explicit `dir`
- content-aware direction helpers

Typography rules should preserve the established font architecture.

---

## 22. SEO / Public Route Boundary

Public routes are defined by actual App Router pages.

SEO support includes:

```text
app/robots.ts
app/sitemap.ts
```

The sitemap must be kept synchronized with genuinely public routes.

Do not infer public availability from folder names alone.

---

## 23. Architecture Change Policy

This document is a **living architecture description**, not an immutable specification.

Update it when any of these materially change:

- framework/runtime
- deployment platform
- public tool set
- global state/localization architecture
- document processing/export boundary
- shared-vs-local code organization
- persistence model
- test strategy
- major routing structure

Historical design decisions should remain in `docs/DECISIONS.md` rather than being silently rewritten here.

---

## 24. Related Documentation

See also:

- `README.md` — current product overview
- `docs/DESIGN-SYSTEM.md` — visual and typography rules
- `docs/DECISIONS.md` — accepted product/architecture decisions
- `docs/ROADMAP.md` — development direction
- `docs/AI-COLLABORATION.md` — AI-assisted development conventions
- `docs/KNOWN-LIMITATIONS.md` — known constraints
- `docs/PROCESSING-LANGUAGES.md` — language-processing behavior
- `docs/DOCUMENT-STUDIO-SPEC.md` — Document Studio specification

When documentation conflicts with the current implementation, inspect the current code and the latest accepted decisions before making changes.
