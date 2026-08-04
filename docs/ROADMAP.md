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
- SEO-friendly routing structure (`/tools/