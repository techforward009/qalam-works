# Qalam Works — Architecture

**Last updated:** 2026-08-04
**Status:** Locked (v1.0)

## Stack

- Next.js (App Router)
- Tailwind CSS
- TypeScript
- Deployed on Netlify, auto-deploy from GitHub `main`

## Folder Structure

```
qalam-works/
│
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   │
│   └── tools/
│       ├── unicode-standardizer/
│       │   ├── page.tsx
│       │   ├── components/      # tool-specific UI only
│       │   └── utils/           # tool-specific logic only
│       │
│       ├── quality-checker/
│       │   ├── page.tsx
│       │   ├── components/
│       │   └── utils/
│       │
│       ├── document-cleaner/
│       │   ├── page.tsx
│       │   ├── components/
│       │   └── utils/
│       │
│       └── invoice-generator/
│           ├── page.tsx
│           ├── components/
│           └── utils/
│
├── components/
│   ├── ui/           # Button, Card, Badge — base building blocks
│   ├── layout/       # Header, Footer — site structure
│   └── shared/       # ToolCard, UploadBox, ResultPanel — used by 2+ tools
│
├── utils/
│   ├── unicode/       # shared across multiple tools
│   ├── exporters/     # shared PDF/print export logic
│   ├── validators/
│   └── formatters/
│
├── types/
├── data/
│
└── docs/
    ├── ROADMAP.md
    ├── ARCHITECTURE.md
    ├── DESIGN-SYSTEM.md
    └── DECISIONS.md
```

## Core Rules

### 1. Tool-specific code stays in the tool's folder
If a component or utility is only used by one tool, it lives inside that
tool's `components/` or `utils/` folder — not at the top level.

Example: `app/tools/invoice-generator/utils/calculateTotals.ts` stays local
to Invoice Generator.

### 2. Promote to shared only when actually shared
A component or util only moves to the top-level `components/shared/` or
`utils/` once a second tool needs it. Don't pre-emptively generalize code
that's currently used by only one tool.

Example: `components/shared/TextEditor.tsx` belongs at the top level only
once Translation Studio, Document Studio, and Unicode Standardizer all use
the same editor component.

### 3. `utils/` is pure logic only
No UI, no JSX, no React components inside any `utils/` folder — tool-level
or shared. Pure functions and data transforms only.

### 4. Components split three ways
- `ui/` — generic, app-agnostic building blocks (Button, Card, Badge)
- `layout/` — site-wide structural components (Header, Footer)
- `shared/` — feature components reused across multiple tools

### 5. Routing follows the tools folder directly
Each tool's `page.tsx` under `app/tools/<tool-name>/` maps directly to its
public URL (`/tools/<tool-name>`) — this is also the tool's SEO landing
page per the roadmap.

### 6. Path aliases
Use `@/` path aliases (configured in `tsconfig.json`) for all cross-folder
imports — no long relative paths (`../../../`).

## Data Flow

- Tool pages are the entry point; they call into their own local `utils/`
  first, then shared `utils/` for common operations (Unicode normalization,
  export, validation).
- Shared UI state (if any is needed across tools later, e.g. user accounts
  in Phase 6) will be introduced via React context at the `app/layout.tsx`
  level — not decided in detail yet, revisit when Phase 6 starts.

## Naming Conventions

- Components: PascalCase (`ToolCard.tsx`)
- Utility files: camelCase (`normalizeUnicode.ts`)
- Route folders: kebab-case, matching the public URL (`unicode-standardizer`)

## What This Document Does Not Cover

Visual design tokens (colors, typography scale, spacing scale) are defined
in `DESIGN-SYSTEM.md`, not here. Product decisions and their reasoning are
logged in `DECISIONS.md`, not here — this document is structure and
conventions only.
