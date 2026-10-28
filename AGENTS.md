# Agent instructions — Qalam Works

Read [docs/AI-COLLABORATION.md](docs/AI-COLLABORATION.md) and inspect the current code/commit before changes. They are standing process requirements, not optional guidance.

## Qalam Page / Document Studio

**Mandatory:** for work touching `app/tools/document-studio/`, PDF export, document fonts, editing/selection, saving or print layout, read [docs/QALAM-PAGE-ENGINEERING.md](docs/QALAM-PAGE-ENGINEERING.md) **before** making changes. Its [dated architecture audit](docs/reviews/qalam-page-engineering-audit-2026-10-28.md) is evidence tied to Draft PR #144 at `2b3d7aa3`, **not** proof of current main-branch behavior.

- One validated formatting target; never redirect a frame selection to stale story text.
- Never silently change authored Unicode, fonts, marks, object coordinates, or PDF pagination.
- Do not mistake a fallback font or an HTML-only check for faithful PDF output. Verify real PDF fonts and geometry.
- Preserve existing saved documents and source licensing. Do not touch Muhammadi Quranic font.
- Write focused regression tests, report unresolved issues explicitly, and follow the owner's approved task scope.

## Release permissions

**Do not merge a PR, deploy production, or change infrastructure, font binaries, secrets or billing without explicit owner approval.** Draft status and preview deployment are not production approval. Do not treat a proposed architecture in documentation as permission to implement it.
