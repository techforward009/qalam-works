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
codebase (qalam-platform) is retired as a live product.

**Reason:**
The newer qalam-works repo is already live on Next.js. Next.js offers
stronger SEO support (SSR, meta tags, sitemaps) than Vite, which matters
directly for the free-tools traffic strategy. Maintaining two frameworks
long-term is not worth the migration cost avoided today.

---

## Decision: qalam-platform (Vite) Retirement

**Date:** 2026-08-04
**Status:** Approved

**Decision:**
The Vite/React qalam-platform repo is retired as a product. Its Invoice
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
module (Phase 2.5). It gets its own route (/tools/invoice-generator) and
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

**Implementation note (2026-08-05):** Invoice Studio v1 MVP shipped —
basic invoice form (seller/client/items/totals), one Qalam-branded
template, bilingual Urdu/English labels (not full Arabic — matches the
rest of the site's convention), browser print-to-PDF (no new
dependency), reused the old invoiceEngine.ts calculation logic verbatim.
Deferred to a later version: multiple templates, multi-invoice
management, undo/redo, Smart Draft parser, logo/signature upload, bank
details, payment tracking, advanced reviewer. Not linked from homepage
or navigation, per this decision.

---

## Decision: Folder Architecture

**Date:** 2026-08-04
**Status:** Approved (corrected same day, see note below)

**Decision:**
Tool-based modular architecture under app/tools/<tool-name>/, each with
its own page.tsx, components/, and utils/. Shared code lives inside app/
at the top level in components/ (split into ui/, layout/, shared/) and
utils/ — but only once something is actually reused by a second tool,
not pre-emptively.

**Correction:** ARCHITECTURE.md originally specified components/, utils/,
and types/ at the repo root, sibling to app/. The actual repo convention
(established before this documentation existed) keeps these folders
inside app/ — e.g. app/utils/, app/components/, app/types/. Rather than
restructure the existing repo, the documentation was corrected to match
reality. Always use app/utils/..., app/components/... in import paths,
not root-level utils/....

**Reason:**
Qalam Works is no longer a single-page utility; it will host multiple
independent tool workflows (Unicode Standardizer, Quality Checker,
Document Studio, Invoice Generator, Translation Studio, Research
Assistant). Isolating each tool's code avoids tangled dependencies and
makes future modules easier to add without touching existing ones.
Full detail in ARCHITECTURE.md.

---

## Decision: Design Tokens Are Provisional

**Date:** 2026-08-04
**Status:** Provisional

**Decision:**
The brand color palette locked in DESIGN-SYSTEM.md (deep green primary,
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
**Status:** Approved (updated same day — see history below)

**Decision:**
- ChatGPT — Product Architect / Strategy Owner: vision, roadmap, feature
  priority, positioning, monetization. Also performs fresh-context
  architecture/UX/product audits after implementation.
- Claude — Independent Technical Reviewer AND Implementation Partner:
  architecture review, code quality, technical risk, alternatives, and
  writes/refactors code directly.
- Sajjad — Final Approval / Product Owner. All decisions ultimately
  require sign-off here.

**History:** Originally GitHub Copilot handled implementation while
Claude was review-only. This changed the same day once Sajjad obtained a
Claude subscription specifically to have Claude handle coding as well,
making a separate implementation AI unnecessary.

**Reason:**
Role division should be based on function, not tooling. A docs/ folder
(this file plus ROADMAP.md, ARCHITECTURE.md, DESIGN-SYSTEM.md) serves as
the single source of truth so context doesn't need to be re-explained to
any AI collaborator each session, and so contradictory advice (as
happened once with the Invoice Studio decision) can be caught by checking
against a locked entry here.

---

## Decision: Documentation Before Implementation

**Date:** 2026-08-04
**Status:** Approved — documentation phase complete as of this entry

**Decision:**
No coding began until ROADMAP.md, ARCHITECTURE.md, DESIGN-SYSTEM.md, and
this file were written and approved. All four were approved v1.0 before
implementation started.

**Reason:**
For a multi-year, multi-module project, the biggest risk is direction
drift, not coding mistakes. A small upfront documentation investment
prevents costly rework and repeated re-litigation of settled decisions.

---

## Decision: Deployment Platform — Migrating to Vercel

**Date:** 2026-08-05
**Status:** Approved (migration in progress)

**Decision:**
Qalam Works' primary deployment will move from Netlify to Vercel.

- Vercel — primary deployment platform going forward: GitHub auto-deploy,
  and eventually the custom domain once stable.
- Netlify — kept as a temporary backup during migration only. Its
  auto-deployment will be disabled once Vercel proves stable across a few
  production deployments, but the project will not be deleted for some
  time.

**Migration steps:**
1. Fix Vercel project's Framework Preset (was "Other," corrected to
   "Next.js") — done.
2. Verify a few consecutive successful production deployments on Vercel,
   including checking that /tools/unicode-standardizer and other pages
   render correctly there.
3. Point the custom domain to Vercel.
4. Disable Netlify auto-deploy (keep the Netlify project itself for now).

**Reason:**
Qalam Works' framework is Next.js, and Vercel (Next.js's own creator) is a
more natural fit — better GitHub integration and preview deployments.
Netlify's free-tier deployment limit was becoming a practical constraint
on the current development pace; Vercel's Hobby plan currently allows up
to 100 deployments per day, which comfortably fits the current workflow.

**Caveat to revisit later:**
Vercel's Hobby plan is intended for personal/non-commercial use. Since
Qalam Works is meant to eventually generate revenue, the plan will need
to be reviewed (likely upgraded to Vercel Pro) once the product is
actively monetized — this is not an issue today, but should not be
forgotten as the roadmap progresses toward Phase 6 (AI Backend + SaaS).

**Resolution note (2026-08-05):** Discovered 6 duplicate Vercel projects
all connected to the same GitHub repo, all auto-deploying on every push.
Kept only qalam-works-r8ko (the correctly-configured one) and deleted the
other 5. The GitHub-Vercel connection also had to be disconnected and
reconnected once to fix a broken auto-deploy trigger.

---

## Decision: Document Editor Engine

**Date:** 2026-08-05
**Status:** Approved

**Decision:**
TipTap (built on ProseMirror) is the rich text editor engine for
Document Studio.

**Reason:**
Document Studio's core problem isn't just "let the user type text" — it's
RTL/LTR mixed formatting, custom Qalam-specific actions (running
standardization/quality-check on selected text), and long-term
extensibility toward tables, footnotes, and collaboration-style features
later. TipTap has a mature extension model suited to exactly this, and
its community/ecosystem size matters for a solo developer who will often
need existing solutions rather than building from primitives. Lexical
(Meta's newer editor framework) was considered but has a smaller,
more implementation-heavy ecosystem for custom extensions right now.

**Accepted trade-off:** this is a deliberate, one-time exception to the
"no unnecessary dependencies" principle used everywhere in Phase 2/2.5 —
a real rich text editor cannot be safely hand-built from `contentEditable`
for production use.

---

## Decision: DOCX Export Engine

**Date:** 2026-08-05
**Status:** Approved

**Decision:**
The `docx` npm package (dolanmiu/docx) is used for generating new .docx
files in Document Studio's export pipeline.

**Reason:**
The existing `mammoth` dependency (already used in the Document Pipeline)
only reads/extracts text from DOCX files — it cannot generate new ones.
`docx` is the standard tool for programmatically building new .docx files
(headings, paragraphs, tables, styles). `mammoth` stays for reading;
`docx` is added for writing — complementary, not overlapping.

---

## Decision: AI Collaboration Policy — Risk-Based Role Division

**Date:** 2026-08-06
**Status:** Approved (supersedes the role-assignment part of the
2026-08-04 "AI Collaboration Workflow" entry above)

**Decision:**
Gemini is added to the coding rotation alongside Claude. The detailed,
day-to-day operating rules — role assignments, the mandatory
inspect-before-diff rule, the risk classification for what each AI may
touch, and the verification checklist — now live in a separate file,
`docs/AI-COLLABORATION.md`, not in this decisions log. Role division is
risk-based (which parts of the codebase are high-stakes to get wrong),
not model-based (no assumption that one model is categorically better
than another).

**Reason:**
Claude subscription usage limits were slowing work down, prompting
Gemini's addition. A review of the resulting work (ChatGPT audit,
2026-08-06) found the friction wasn't really "Gemini vs Claude" — it was
that inspection-before-coding discipline wasn't being consistently
applied. Making that rule explicit and universal (applies to any AI used
on this project, present or future) addresses the actual root cause,
rather than the specific tool. AI-COLLABORATION.md is kept separate from
this file because it's an operational/process document that will be
referenced and followed on every task, whereas this file is a historical
log of one-time decisions.

---

## Decision: Phase 3B Frozen, Word-Bidi Deferred to Phase 3C

**Date:** 2026-08-07
**Status:** Approved

**Decision:**
Phase 3B (Publishing Intelligence) is frozen at its MVP-complete state —
see `PHASE-3B-CLOSURE.md` for exactly what's automated-tested vs.
manually-verified. Plain-text (`.txt`) export remains plain text only;
it is not extended further to try to fix Word-specific bidi rendering.
That limitation is documented in `KNOWN-LIMITATIONS.md` as a structural
constraint of the plain-text format, not a bug. Word-quality export
responsibility moves entirely to Phase 3C (DOCX Export), which starts
next.

**Reason:**
Two attempts at fixing bracket-mirroring in Word via invisible Unicode
bidi marks (RLM, then LRM) both failed, and the second broke
direct-copy-paste behavior that had been working correctly — concrete
proof that plain text has no way to carry the paragraph-direction
metadata this problem actually needs. Continuing to guess at plain-text
bidi marker fixes was diminishing-returns engineering effort; a real
`.docx` file can encode paragraph direction explicitly, which is the
correct place to solve "Word-quality" export instead.


