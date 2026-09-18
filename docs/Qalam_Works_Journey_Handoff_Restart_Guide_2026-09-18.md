# Qalam Works --- Project Journey, Handoff & Restart Guide

**Prepared:** 18 September 2026\
**Project:** Qalam Works --- Product & Engineering\
**Production:** https://www.qalamworks.com\
**Repository:** `techforward009/qalam-works`\
**Pause-point commit:** `02f1bef` --- `Enforce canonical www host`

> **Purpose of this file:** When work on Qalam Works resumes, give this
> file to ChatGPT first. It is intended to restore the project's
> product, engineering, debugging, SEO, workflow, and strategic context
> without having to retell the journey from scratch.

------------------------------------------------------------------------

## 1. Executive summary

Qalam Works began as an effort to build useful, professional digital
tools for Urdu and multilingual writing. Over time it developed into a
Next.js product containing writing, document, text-cleaning, Roman Urdu,
date/calendar, invoice, PDF/DOCX and publishing-oriented tools.

The project went through a long period of intensive engineering and
repeated visual/regression debugging. By the pause in September 2026,
the product was live on its custom domain, the repository was building
cleanly, major Invoice Studio and Date Studio validation suites were
green, repository hygiene had been repaired, initial search-intent SEO
pages were live, Google Search Console had begun showing real
impressions, and canonical host consolidation had been implemented.

The strategic decision at the pause point was **not to keep adding
features**. The next phase should be driven by search and user-demand
data.

------------------------------------------------------------------------

## 2. Product vision

Qalam Works should become a practical Urdu-first digital workspace
rather than a collection of disconnected gimmicks.

Core principles:

-   Urdu/RTL and English/LTR are first-class.
-   Preserve multilingual and mixed-text behavior.
-   Prefer deterministic/rules-based processing where reliability
    matters.
-   Do not silently invent certainty in ambiguous Roman Urdu or
    historical date conversion.
-   Professional output quality matters, especially PDF/DOCX.
-   Free tools should attract search traffic.
-   Useful workflows should create repeat usage.
-   Professional services can generate revenue before subscription-scale
    traffic exists.
-   Paid/Pro features should eventually be based on demonstrated
    repeat/high-intent usage, not speculation.

------------------------------------------------------------------------

## 3. Technology and deployment

-   Next.js App Router
-   React
-   TypeScript
-   Tailwind CSS
-   Vercel deployment
-   GitHub repository: `techforward009/qalam-works`
-   Production: `https://www.qalamworks.com`

Important engineering rules developed during the project:

-   Make scoped changes.
-   Preserve accepted behavior.
-   Do not opportunistically refactor stable areas.
-   Do not run `npm audit fix`.
-   Do not upgrade dependencies without a specific need.
-   Restore generated files if builds alter them unintentionally.
-   Treat PDF and Urdu typography regressions as visual problems
    requiring real output inspection.
-   Avoid large/full-file connector uploads for critical source files.

------------------------------------------------------------------------

## 4. Major product areas reached

### Document Studio

Document Studio became a substantial multilingual editor/workspace.

Important completed capabilities included:

-   Urdu/English/mixed text editing
-   RTL/LTR handling
-   PDF/DOCX export
-   tables
-   images
-   image wrapping
-   page breaks
-   section breaks
-   pagination behavior
-   safe caret behavior around atomic nodes
-   PDF handling for Nastaliq and multilingual content

A future roadmap item, Comments + Suggesting, was intentionally paused.

### Date Studio / Date Converter

The original Date Converter expanded toward a broader Date Studio.

Work included:

-   Gregorian/Hijri/Solar Hijri conversion
-   date profile concepts
-   calendar explorer
-   historical date intelligence foundation
-   search-intent Hijri-to-Gregorian page
-   Urdu/RTL presentation
-   careful preservation of the deterministic rules-first date engine

Important rule: do **not** silently alter historical Hijri results
merely to match third-party websites.

### Calendar Maker

Calendar Maker went through substantial debugging, especially around
Pakistan 2027 Hijri month adjustments and visual ordering.

Important accepted behavior included:

-   canonical monthly Hijri adjustment controls
-   archive persistence
-   calculated-engine reset behavior
-   corrected RTL chronological Hijri month ordering
-   annual Gregorian/Hijri calendar output
-   PDF export

Calendar Maker was considered closed/stable after final fixes.

### Invoice Studio

Invoice Studio received extensive layout and presentation work.

At the final validation stage:

-   Western numeric columns were centered as intended.
-   Urdu amount alignment was preserved.
-   Header scaling supported a 35% minimum.
-   A4/A5 and multiple invoice layouts had focused tests.
-   Discount/tax/large-number behavior had focused coverage.

Final focused validation before the pause:

-   Invoice tests: **63 passed**
-   Date Studio tests: **82 passed**
-   TypeScript: passed
-   Build: passed
-   `git diff --check`: clean

No regression needed fixing during that final validation.

------------------------------------------------------------------------

## 5. Important engineering incidents and lessons

### 5.1 Catastrophic connector file truncation

At one point a connector-based upload replaced a critical Calendar Maker
source file with essentially only:

`"use client";`

The file had to be restored from a known-good local commit and pushed
again.

**Permanent lesson:** never use connector full-file upload casually for
large or critical files. Prefer normal repository/local editing
workflows and inspect diffs before pushing.

### 5.2 PDF export failures

Document Studio PDF export produced several difficult regressions.

One important error was horizontal glyph-ink validation blocking valid
Nastaliq overhang. The architecture originally treated the CSS content
width as if it were the physical clipping boundary.

The corrected principle became:

-   layout/frame must fit within content width;
-   glyph ink may safely overhang into physical page margins;
-   glyph ink should block only when it crosses the actual physical page
    boundary;
-   safe Nastaliq overhang should not cause horizontal shifting.

This distinction is important if PDF pagination/ink logic is revisited.

Another PDF issue involved image vertical anchoring and print-only
pagination decorations. The broader lesson was that PDF regressions must
be tested against real documents and visually rendered output---not only
synthetic API requests.

### 5.3 RTL/LTR and punctuation

Mixed Urdu/English text repeatedly exposed direction and punctuation
edge cases.

Accepted philosophy:

-   Urdu prose may normalize punctuation appropriately.
-   Protected tokens such as URLs, emails, filenames/extensions,
    decimals, numeric thousands, mentions and hashtags must not be
    blindly altered.
-   English punctuation must not be converted simply because Urdu exists
    elsewhere in the same sentence.
-   Direction controls must preserve mixed-language readability.

### 5.4 Generated `.next` artifacts were tracked

Although `.gitignore` already ignored `.next`, 79 `.next/dev` generated
files were tracked in Git.

They were removed in commit:

`e2f02044722c37cd1f66850ff809970129bb00da`
`Remove tracked Next.js build artifacts`

Afterward:

`git ls-files .next`

returned no output.

### 5.5 Canonical host duplication

Google Search Console showed both `qalamworks.com` and
`www.qalamworks.com` variants receiving impressions.

The application already used `https://www.qalamworks.com` for
`metadataBase`, sitemap URLs and canonical metadata, but there was no
explicit non-www → www redirect.

This was fixed at the pause point:

`02f1bef` --- `Enforce canonical www host`

Behavior:

-   `qalamworks.com/*` → permanent 308 → `www.qalamworks.com/*`
-   pathname preserved
-   query parameters preserved
-   no www self-redirect loop

Focused test added: `tests/canonicalWww.test.ts`.

------------------------------------------------------------------------

## 6. Repository state at the pause

The last known pushed main commit is:

**`02f1bef` --- `Enforce canonical www host`**

The immediately preceding hygiene commit was:

**`e2f0204` --- `Remove tracked Next.js build artifacts`**

Before the canonical-host patch, final focused validation reported:

-   Invoice focused tests: 63 passed
-   Date Studio focused tests: 82 passed
-   `npx tsc --noEmit`: exit 0
-   `npm run build`: exit 0
-   Next.js build: 33/33 pages
-   `git diff --check`: clean
-   `.next` tracked files: 79 → 0

The canonical-host patch subsequently also passed:

-   TypeScript
-   build
-   `git diff --check`

When resuming, **verify current `origin/main` first rather than assuming
this file is still current**.

------------------------------------------------------------------------

## 7. SEO shift: from building features to building search doors

A major strategic realization was that Qalam Works did not primarily
need another long cycle of feature development. It needed discovery and
distribution.

Competitor research showed that Urdu tool sites often receive search
traffic through many intent-specific URLs.

The Qalam Works strategy became:

> Do not build 40 separate engines. Reuse strong existing engines
> through genuinely useful, intent-specific entry pages.

But avoid thin/doorway-page behavior. Each search page should:

-   satisfy a real distinct search intent;
-   contain the actual usable tool;
-   have unique useful explanatory content;
-   use appropriate defaults;
-   link naturally to related workflows.

Rather than launching dozens at once, the decision was to launch **three
first** and wait for Search Console evidence.

------------------------------------------------------------------------

## 8. First three search-intent pages

The first three SEO pages were:

### Urdu Text to PDF

Route:

`/tools/urdu-text-to-pdf`

Purpose: reuse Document Studio for users specifically searching for
Urdu-to-PDF functionality.

### Roman Urdu to Urdu

Route:

`/tools/roman-urdu-to-urdu`

Purpose: reuse the Roman Urdu writer/conversion engine for the exact
transliteration intent.

Canonical:

`/tools/roman-urdu-to-urdu`

The page is also present in the sitemap and internally linked from the
tools area.

### Hijri to Gregorian

Route:

`/tools/hijri-to-gregorian`

Purpose: reuse Date Studio with Hijri conversion preselected.

These pages were intentionally built as real tool experiences, not
redirects.

------------------------------------------------------------------------

## 9. Google Search Console status at pause

On 17 September 2026, the three new pages were manually checked with URL
Inspection.

All three Live Tests reported:

-   **URL is available to Google**
-   **Page can be indexed**

Indexing requests were submitted.

Sitemaps were showing **Success**.

At the time, Search Console showed two historical sitemap
submissions/host variants, but canonical host consolidation was
subsequently implemented.

### Three-month baseline

Search Console showed approximately:

-   **307 impressions**
-   **12 clicks**
-   **3.9% CTR**
-   **47.6 average position**

This is the baseline to compare against after the break.

### Important query signals

Visible top queries included:

-   `roman urdu to urdu` --- 10 impressions
-   `urdu proofreading` --- 5
-   `urdu writer` --- 4
-   `roman to urdu` --- 4
-   `roman urdu to urdu typing` --- 3
-   `urdu in roman english` --- 3
-   `date converter` --- 3
-   `urdu to roman english` --- 3
-   `urdu to roman urdu` --- 3
-   `whatsapp rtl` --- 2

This was the first strong evidence that **Roman Urdu is a real
organic-search opportunity for Qalam Works**.

### Important page signals

Visible page data included:

-   homepage: 39 impressions / 6 clicks on www variant
-   Unicode Standardizer: 44 impressions / 1 click
-   WhatsApp RTL Formatter: 24 / 1
-   Document Cleaner: 21 / 1
-   Date Converter: 21 / 0
-   Invoice Generator: 19 / 0

Historical Search Console data also showed both host variants.

Most notably, the existing Urdu/Roman writer family had substantial
impressions but no clicks. This reinforced the decision to test a
dedicated `roman-urdu-to-urdu` search-intent page.

------------------------------------------------------------------------

## 10. What NOT to do immediately on return

Do not resume by saying:

> "What new feature should we build?"

Do not immediately:

-   refactor Invoice Studio;
-   refactor large Document Studio files;
-   add 20 SEO pages;
-   redesign Date Studio;
-   change Roman Urdu titles before seeing post-indexing data;
-   upgrade dependencies for cleanliness;
-   run broad audits just because time has passed;
-   pay Grok/other coding-agent credits for repository exploration
    ChatGPT can do itself.

The project suffered from long debugging loops and repeated polish
cycles. The next phase must be more disciplined.

------------------------------------------------------------------------

## 11. Restart procedure

When this project resumes, follow this order.

### Step 1 --- Restore context

Give this Markdown file to ChatGPT and say:

> "Qalam Works --- resume from this handoff. First verify the current
> state; do not implement anything yet."

### Step 2 --- Verify repository state

Check:

-   current `origin/main`
-   whether `02f1bef` is still the relevant baseline
-   production deployment health
-   no unexpected repository drift

Do not perform a full repo re-audit unless evidence warrants it.

### Step 3 --- Check Search Console before coding

The first substantive question should be:

> **What changed in Google Search Console during the break?**

Compare against the baseline:

-   307 impressions
-   12 clicks
-   3.9% CTR
-   47.6 average position

Then inspect:

-   last 28 days vs previous 28 days
-   last 3 months if useful
-   top queries
-   top pages
-   impressions
-   clicks
-   CTR
-   average position
-   indexed status of the three search-intent pages

Specifically inspect:

`/tools/roman-urdu-to-urdu`

Questions:

-   Is it indexed?
-   Is it receiving impressions?
-   Which queries trigger it?
-   Did Roman Urdu impressions move from older/general writer pages
    toward this dedicated page?
-   Did CTR improve?
-   Are `www` canonical signals consolidating?

### Step 4 --- Let data select the next SEO family

If Roman Urdu clearly wins:

-   improve the dedicated page based on actual queries;
-   consider only genuinely distinct Roman/Urdu search intents;
-   strengthen internal linking;
-   avoid cannibalizing the existing writer pages.

If Date queries begin growing:

-   consider Gregorian→Hijri or other genuine date-intent pages.

If Urdu PDF grows:

-   consider closely related document-output intents only when they are
    genuinely distinct.

If another existing tool unexpectedly wins, follow that evidence
instead.

------------------------------------------------------------------------

## 12. Distribution strategy after the break

SEO alone should not carry the entire project.

A practical distribution loop:

1.  Pick one real user problem.
2.  Show the problem in a short visual demo.
3.  Show Qalam Works solving it quickly.
4.  Link directly to the relevant tool---not only the homepage.
5.  Share where relevant Urdu users already are.

Potential channels:

-   relevant Facebook communities
-   LinkedIn
-   WhatsApp communities where appropriate
-   publishers
-   translation agencies
-   university departments
-   journals
-   schools/madrasas
-   NGOs
-   media organizations

Avoid generic "we launched a startup" promotion.

Prefer:

> problem → demonstration → useful free tool → professional help for
> larger jobs

------------------------------------------------------------------------

## 13. Revenue strategy

Do not wait for massive traffic before thinking about revenue, but do
not overbuild payment infrastructure without demand.

Near-term revenue logic:

**Search traffic → useful free tool → trust → professional service
inquiry**

Potential service-oriented revenue areas include:

-   Urdu proofreading/editing
-   translation
-   Unicode/text normalization
-   document formatting/publication preparation
-   larger professional document jobs

Later, paid product features should be selected from actual
high-intent/repeat workflows.

Measure:

-   Google impressions
-   clicks
-   tool usage/completions
-   service inquiries
-   repeat usage
-   eventually paid conversion

The purpose is not traffic for traffic's sake. The purpose is to
discover where Qalam Works creates enough value that people return or
pay.

------------------------------------------------------------------------

## 14. Development workflow on return

The preferred collaboration model became:

### ChatGPT

-   product strategy
-   repository inspection/review where possible
-   root-cause reasoning
-   SEO/query analysis
-   specifications
-   test strategy
-   coding-agent prompts
-   final review

### Grok / coding agent

Use for narrowly scoped implementation.

Prompts should explicitly say:

-   do not inspect unrelated files;
-   do not redo accepted work;
-   do not refactor;
-   run only specified tests;
-   stop if the working tree contains unrelated user changes;
-   do not upgrade dependencies;
-   do not run `npm audit fix`;
-   do not use connectors unless explicitly required.

Avoid paying coding-agent credits for broad "audit the repo" tasks if
ChatGPT/GitHub inspection can answer the question first.

### User

The user should mainly handle:

-   product priorities
-   final visual acceptance
-   account-only actions such as Search Console/Vercel settings when
    unavoidable

Do not turn the user into a manual QA worker when the assistant/tooling
can reasonably perform the check.

------------------------------------------------------------------------

## 15. Testing philosophy

Use the smallest meaningful validation gate.

For a narrow change:

-   focused tests
-   `npx tsc --noEmit`
-   `git diff --check`

Run `npm run build` when route/runtime/bundling/deployment risk warrants
it.

Avoid automatically running the entire test suite for every tiny change.

For visual/PDF changes:

-   generate real output;
-   render it;
-   inspect it visually;
-   test realistic Urdu/Nastaliq documents;
-   do not trust API 200 alone.

------------------------------------------------------------------------

## 16. Architecture cautions

Some large files were identified as future maintainability concerns,
notably substantial Invoice Studio implementation files.

This is **not** permission to refactor them immediately.

Refactor only when:

-   the product area is stable;
-   there is a concrete maintenance need;
-   tests are strong enough;
-   the refactor is isolated from feature work.

"Cleaner architecture" is not worth reopening a stable visual/regression
cycle by itself.

------------------------------------------------------------------------

## 17. Product philosophy learned the hard way

Several principles emerged from the project:

1.  A working stable tool is more valuable than a perpetually polished
    tool.
2.  Visual acceptance is a real release gate for Urdu publishing
    software.
3.  Nastaliq exposes assumptions ordinary Latin text does not.
4.  Search intent should shape entry pages, not necessarily new engines.
5.  Google impressions are evidence; feature ideas are hypotheses.
6.  A debugging loop can consume more founder energy than the bug is
    worth.
7.  Repository cleanliness matters, but cleanup should not become a
    hobby.
8.  Protect accepted behavior.
9.  Make one change for one proven reason.
10. The founder's time and energy are project resources too.

------------------------------------------------------------------------

## 18. Pause decision

The September 2026 pause was intentional.

Continuous Qalam Works work had begun seriously affecting the user's
other activities. The subscription was cancelled temporarily to create
space and take a break.

This should **not** be interpreted as abandonment of Qalam Works.

The project was deliberately paused at a healthy point:

-   production live;
-   repository green;
-   major recent validation green;
-   generated Git artifacts cleaned;
-   canonical host fixed;
-   search-intent pages launched;
-   indexing requests submitted;
-   real Search Console data available;
-   initial organic opportunity identified.

Therefore, when returning, resist the psychological urge to "catch up"
by immediately coding for days.

First observe what happened while nobody was touching it.

------------------------------------------------------------------------

## 19. First decision after return

The first strategic decision should be based on this question:

> **During the break, what did users and Google tell us Qalam Works is
> actually useful for?**

Then invest in the strongest evidence.

At the pause point, the leading signal was **Roman Urdu → Urdu**, but
that must be revalidated with fresh Search Console data.

------------------------------------------------------------------------

## 20. Quick restart checklist

-   [ ] Give this file to ChatGPT.
-   [ ] Verify current `origin/main`.
-   [ ] Verify production is healthy.
-   [ ] Check whether canonical non-www → www redirect remains active.
-   [ ] Open Google Search Console.
-   [ ] Compare fresh data with 307 impressions / 12 clicks baseline.
-   [ ] Check indexing/performance of the three search-intent pages.
-   [ ] Inspect Roman Urdu queries and landing pages first.
-   [ ] Do not code until the data suggests a concrete next move.
-   [ ] Choose one narrow experiment.
-   [ ] Measure it before expanding.

------------------------------------------------------------------------

## 21. Final handoff note to future ChatGPT

You are resuming a project whose main risk is **not lack of features**.
Its main risk is spending too much engineering effort before proving
distribution and demand.

Treat existing accepted tools as valuable assets. Protect them.

Before proposing new engineering work:

1.  inspect current repository state;
2.  inspect current Search Console evidence;
3.  distinguish production defects from architecture preferences;
4.  identify the smallest action that could materially improve
    discovery, usage or revenue.

Keep the user's workload and coding-agent credit usage low.

The intended next chapter of Qalam Works is:

**stability → indexing → search evidence → distribution →
service/revenue evidence → only then selective product expansion.**

------------------------------------------------------------------------

# Restart phrase

When ready to begin again, upload this file and say:

> **"Qalam Works --- resume from this handoff. Verify current repo and
> Search Console state first, then tell me what changed during the
> break. Do not implement anything until we agree on the next
> evidence-based step."**
