# Qalam Works — Product Roadmap

**Last updated:** 2026-08-04
**Status:** Active

## Vision

Qalam Works is a professional publishing toolkit for Urdu, Arabic, and Persian —
positioned as **"Professional Publishing Tools for Urdu, Arabic & Persian"**,
not as an "AI-powered" product (yet). AI capabilities will be introduced later
as a premium layer, once real AI backends are integrated. Until then, tools
are rule-based and should be presented honestly as such.

Long-term identity: **Urdu, Arabic, Persian Publishing & Document Intelligence.**

## Platform Decision

- Single unified product going forward. There is no split between
  "qalam-works" and "qalam-platform" — they converge into one codebase.
- **Next.js (App Router)** is the final, locked-in framework.
- The earlier Vite/React codebase (`qalam-platform`) is retired as a live
  product but its Invoice Studio code is retained as an implementation
  reference for the Next.js port (see Phase 2.5).
- Deployment: Netlify, auto-deploy from GitHub `main` branch.

## Phases

### Phase 1 — Product Foundation
- Lock Next.js project architecture (see ARCHITECTURE.md)
- Shared components: Header, Footer, ToolCard, UploadBox
- Core design tokens: typography, colors, spacing, RTL/LTR handling
  (full design system allowed to evolve organically through Phase 2 —
  only tokens need to be locked now)
- SEO-friendly routing structure (`/tools/<tool-name>`)

### Phase 2 — Free Tools to Product Level
Bring the existing three tools from demo-quality to product-quality, each
with its own permanent URL, SEO metadata, and polished output:
- `/tools/unicode-standardizer` — input/output editor, copy, download,
  character report, before/after comparison
- `/tools/quality-checker` (Publication Quality Checker) — paragraph
  analysis, punctuation issues, Arabic/Urdu spacing, mixed-script
  detection, downloadable report
- `/tools/document-cleaner` (Document Upload) — foundation for the future
  Document Studio

Each tool page includes: SEO title/description, schema markup, FAQ section,
usage examples.

Homepage should add a "Free Publishing Tools" preview section right after
the hero, with cards for each tool.

### Phase 2.5 — Invoice Studio (Parallel, Low Priority)
**Decision: "Build it, but don't lead with it."**
- Port existing Vite implementation to Next.js — treat old code as a logic
  reference, not a direct migration; rebuild to match Qalam Works
  conventions (shared components, design tokens, RTL support)
- Own route: `/tools/invoice-generator`
- Own SEO landing page — this is an independent traffic asset
- Templates: Urdu/English invoices, PDF export, print optimization
- **Not featured on the homepage hero or primary navigation** — stays a
  secondary/parallel module so it doesn't dilute the "Arabic-script
  publishing intelligence" brand identity
- Same header/footer/typography/RTL branding as the rest of the site —
  should never feel like a bolted-on separate tool
- Side benefit: this becomes the testing ground for the PDF generation
  pipeline, template system, and export architecture that Document Studio
  and Research Assistant will reuse later

### Phase 3 — Document Studio
- Rich text editor
- AI-assisted writing/rewrite/simplify (once AI backend exists)
- Academic/legal style support
- Translation mode across Urdu/Arabic/Persian/English/French
- RTL/LTR handling
- DOCX/PDF export
- Builds directly on Phase 2's document-cleaning and Unicode-normalization
  groundwork

### Phase 4 — Translation Studio
- Urdu/English/Arabic/Persian translation pairs
- Academic/literary translation modes
- Side-by-side comparison
- Terminology memory
- Build a rule-based foundation first (terminology glossary, Islamic terms
  database, style preferences, translation memory) before layering AI on
  top — this differentiates Qalam Works from generic AI translators

### Phase 5 — Research Assistant
- Summarization, notes, citations, outlines, literature review help
- Highest complexity: needs documents, references, citations, AI
  retrieval, and user accounts all working together

### Phase 6 — AI Backend + SaaS Layer
- Real AI integration across tools
- Authentication, subscriptions, credits, payment, API integration
- Deliberately last: the free tools need to prove real usage first

## AI Collaboration Model

| Role | Owner |
|---|---|
| Product vision, roadmap, priorities, monetization, positioning | ChatGPT (Product Architect) |
| Fresh-context architecture/UX/product audits after implementation | ChatGPT |
| Implementation (coding, refactoring, debugging) | Claude |
| Independent technical review (architecture, code quality, risk) | Claude |
| Final approval | Sajjad (Product Owner) |

Note: role division is based on function, not tooling — Copilot is no
longer used now that Claude handles implementation directly.

## Standard Process per Module
Specification → Implementation → Tests → Build → Production Check → Commit.
Reuse shared UI/language/export patterns established in earlier modules
rather than rebuilding them each time.