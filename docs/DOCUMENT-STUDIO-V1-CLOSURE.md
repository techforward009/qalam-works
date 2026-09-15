# Document Studio v1 Closure

**Status:** V1 STABLE / CLOSED  
**Closure date:** 2026-09-15

## Accepted production scope

Document Studio v1 supports the accepted production workflow:

- rich-text editing and document autosave;
- English, Urdu, Arabic, Persian, and mixed RTL/LTR document editing;
- document commands including search and replace;
- real DOCX export and PDF export;
- document templates and library workflows; and
- desktop and mobile browser use.

`Qalam AI` remains experimental. It is not part of the closed v1 acceptance claim.

## Browser acceptance evidence

The dedicated Linux browser-acceptance workflow completed successfully on 2026-09-15:

- 10 of 10 Playwright scenarios passed;
- English LTR editing, Urdu RTL and mixed-direction editing, command workflows, and mobile layout were exercised;
- the DOCX export download was verified as a non-empty `.docx` file; and
- the PDF export endpoint was verified as HTTP 200 with a non-empty `.pdf` download.

Workflow: https://github.com/techforward009/qalam-works/actions/runs/34940362467

## Validation and baseline note

Focused Document Studio tests pass (78 tests), along with TypeScript and the production build.

Two Writer Engine wall-clock microbenchmarks are environment-sensitive on local Windows: an earlier full-suite run exceeded the 5 ms and 25 ms thresholds, while three immediately repeated isolated runs on both current `main` and this closure branch passed. No Writer Engine source, tests, Roman Urdu fixtures, or performance thresholds changed in this closure branch. This is tracked as an environment-sensitive benchmark caveat, not a Document Studio regression.

The Linux full-suite baseline run also reported three existing Date Studio source-assertion failures that reproduce from current `main`; they are outside Document Studio v1 and are not changed by this closure.

The accepted PDF regression baseline remains commit `b36` as previously recorded; it is a regression baseline, not a claim about the current HEAD.

## Deliberately outside v1

The following are not part of Document Studio v1:

- searchable Arabic-script PDF output;
- Word bracket-mirroring parity beyond the accepted editor/export behavior;
- tables, images, footnotes, and collaboration; and
- changing the experimental status of Qalam AI.

Earlier phase documents remain historical implementation records. This document is the current v1 closure record.
