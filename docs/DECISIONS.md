# Qalam Works — Decisions Log

This file is the single source of truth for major product and technical
decisions. Each entry records the decision, the reasoning, and its status.
When any AI or collaborator proposes something that contradicts an entry
here, that contradiction must be resolved explicitly — either the entry is
outdated and gets a new dated status, or the new proposal is wrong.

---

## Decision: Unified Single Product

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
Qalam Works and Qalam Platform are not two separate products — they
converge into a single unified product going forward.

**Reason:**
The original intention, from the start, was always one product. Two
parallel codebases risk direction drift and wasted effort.

---

## Decision: Next.js as Final Framework

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
Next.js (App Router) is the final, locked-in framework. The Vite/React
codebase (`qalam-platform`) is retired as a live product.

**Reason:**
The newer `qalam-works` repo is already live on Next.js. Next.js offers
stronger SEO support (SSR, meta tags, sitemaps) than Vite, which matters
directly for the free-tools traffic strategy. Maintaining two frameworks
long-term is not worth the migration cost avoided today.

---

## Decision: qalam-platform (Vite) Retirement

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
The Vite/React `qalam-platform` repo is retired as a product. Its Invoice
Studio code is retained only as an implementation reference for the
Next.js port — not migrated directly.

**Reason:**
Vite and Next.js have different routing and build models; a direct copy
isn't viable. Existing logic still reduces the effort of rebuilding
Invoice Studio in Next.js.

---

## Decision: Brand Positioning — Not "AI-Powered" Yet

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
Qalam Works will be positioned as "Professional Publishing Tools for
Urdu, Arabic & Persian," not as an AI-powered product. AI features are
noted as "coming soon" and introduced later as a premium layer.

**Reason:**
Current tools (Unicode Standardizer, Quality Checker) are rule-based, not
AI-driven. Claiming "AI-Powered" now risks damaging trust once users
discover the actual mechanism. Honest positioning now makes the AI claim
more credible later, once a real AI backend exists.

---

## Decision: Invoice Studio — Build It, Don't Lead With It

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
Invoice Studio will be ported to Next.js as a parallel, low-priority
module (Phase 2.5). It gets its own route (`/tools/invoice-generator`) and
own SEO landing page, but is not featured on the homepage hero or primary
navigation. It uses the same header/footer/typography/RTL branding as the
rest of the site.

**Reason:**
This resolves a genuine tension between two valid perspectives: Invoice
Generator is a strong organic-SEO traffic asset (supports growth), but
leading with it on the homepage would dilute Qalam Works' "Arabic-script
publishing intelligence" brand identity (supports positioning). Building
it quietly captures the traffic benefit without the positioning cost.
It also becomes the testing ground for the PDF export pipeline and
template system that Document Studio and Research Assistant will reuse.

---

## Decision: Folder Architecture

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
Tool-based modular architecture under `app/tools/<tool-name>/`, each with
its own `page.tsx`, `components/`, and `utils/`. Shared code lives at the
top level in `components/` (split into `ui/`, `layout/`, `shared/`) and
`utils/` — but only once something is actually reused by a second tool,
not pre-emptively.

**Reason:**
Qalam Works is no longer a single-page utility; it will host multiple
independent tool workflows (Unicode Standardizer, Quality Checker,
Document Studio, Invoice Generator, Translation Studio, Research
Assistant). Isolating each tool's code avoids tangled dependencies and
makes future modules easier to add without touching existing ones.
Full detail in `ARCHITECTURE.md`.

---

## Decision: Design Tokens Are Provisional

**Date:** 2026-08-04
**Status:** Provisional

**Decision:**
The brand color palette locked in `DESIGN-SYSTEM.md` (deep green primary,
warm paper background, etc.) is provisional until a logo/official
branding review happens.

**Reason:**
No official brand colors were defined yet; the current palette is a
reasonable default for a trust-based, professional publishing tool, not a
final brand decision. Flagging this now means a future color change is
recognized as an intentional, tracked decision — not an unexplained
inconsistency.

---

## Decision: AI Collaboration Workflow

**Date:** 2026-08-04
**Status:** Approved (superseded once already — see history below)

**Decision:**
- **ChatGPT** — Product Architect / Strategy Owner: vision, roadmap,
  feature priority, positioning, monetization. Also performs fresh-context
  architecture/UX/product audits after implementation.
- **Claude** — Independent Technical Reviewer AND Implementation Partner:
  architecture review, code quality, technical risk, alternatives, and
  now also writes/refactors code directly.
- **Sajjad** — Final Approval / Product Owner. All decisions ultimately
  require sign-off here.

**Reason:**
Role division should be based on function, not tooling. Originally
GitHub Copilot handled implementation while Claude was review-only; this
changed once Sajjad obtained a Claude subscription specifically to have
Claude handle coding as well, making a separate implementation AI
unnecessary. A `docs/` folder (this file plus `ROADMAP.md`,
`ARCHITECTURE.md`, `DESIGN-SYSTEM.md`) serves as the single source of
truth so context doesn't need to be re-explained to any AI collaborator
each session, and so contradictory advice (as happened once with the
Invoice Studio decision) can be caught by checking against a locked entry
here.

---

## Decision: Documentation Before Implementation

**Date:** 2026-08-04
**Status:** Approved — documentation phase complete as of this entry

**Decision:**
No coding begins until `ROADMAP.md`, `ARCHITECTURE.md`, `DESIGN-SYSTEM.md`,
and this file are written and approved. All four are now approved v1.0.
Implementation may begin.

**Reason:**
For a multi-year, multi-module project, the biggest risk is direction
drift, not coding mistakes. A small upfront documentation investment
prevents costly rework and repeated re-litigation of settled decisions.
