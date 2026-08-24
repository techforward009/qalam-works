# Qalam Works

> **A modern publishing and language toolkit for Urdu, Arabic, Persian, Roman Urdu, English, and mixed-script text.**

**Live:** https://www.qalamworks.com

---

## Overview

Qalam Works is a production web workspace for writing, cleaning, converting, translating, reviewing, and preparing multilingual text for digital and print use.

The product is designed especially for Urdu and other right-to-left scripts, while also handling English and mixed-script content safely. Its core philosophy is **rules-first, deterministic processing**: predictable text transformations, protected tokens, language-aware direction handling, and regression-tested behavior come before optional AI assistance.

---

## Current Tools

| Tool | Route | Purpose |
| --- | --- | --- |
| **Document Studio** | `/tools/document-studio` | Direction-aware document editing, formatting, cleanup, review, and publishing/export workflows. |
| **Translation Studio** | `/tools/translation-studio` | Structured multilingual translation workspace with source/target handling, review support, and translation workflow tools. |
| **Roman Urdu Writer** | `/tools/roman-urdu-writer` | Converts Roman Urdu into Urdu script with deterministic rules, ambiguity handling, and protected-token preservation. |
| **Urdu → Roman Writer** | `/tools/urdu-roman-writer` | Converts Urdu script into Roman Urdu with selectable output styles and draft persistence. |
| **Document Cleaner** | `/tools/document-cleaner` | Cleans and normalizes pasted or uploaded text while preserving meaningful content. |
| **Quality Checker** | `/tools/quality-checker` | Reviews text for publication-quality, consistency, spacing, punctuation, and related issues. |
| **Unicode Standardizer** | `/tools/unicode-standardizer` | Normalizes Urdu/Arabic/Persian Unicode variants and common script inconsistencies. |
| **Invoice Generator** | `/tools/invoice-generator` | Creates clean invoice layouts with multilingual and direction-aware presentation. |
| **WhatsApp RTL Formatter** | `/tools/whatsapp-rtl-formatter` | Prepares Urdu, English, and mixed text for more reliable RTL/LTR display in WhatsApp. |

> `app/tools/research-studio/` currently contains internal utilities but is not exposed as a public tool route.

---

## Product Principles

### 1. Rules First

Core text-processing behavior should be deterministic, explainable, and testable.

Do not replace stable rule-based processing with generative AI where a deterministic solution is more reliable.

### 2. Preserve User Content

Cleaning and normalization should correct representation and presentation problems without silently rewriting the user's meaning.

Protected machine-readable content—such as URLs, email addresses, filenames, paths, IDs, hashes, version strings, and similar tokens—must remain intact where required.

### 3. Urdu and RTL Are First-Class

Urdu is not treated as an English interface with reversed alignment.

Direction, typography, punctuation, font selection, and mixed-script behavior must be handled deliberately.

### 4. UI Direction and Content Direction Are Separate

The website language and the text being edited are not always the same.

- English interface chrome is LTR.
- Urdu interface chrome is RTL.
- The **global Header is intentionally locked to English/LTR in both site languages**.
- The Footer is localized separately for English and Urdu.
- User-entered text, source/target translation panes, samples, and mixed-script content keep their own natural or detected direction.
- Machine-readable LTR tokens may remain isolated LTR inside Urdu UI.

### 5. Protect Frozen Behavior

Benchmark-backed and accepted text-processing behavior should not be changed casually.

When improving a writer or processing engine, preserve frozen baselines unless a change is explicitly approved and re-verified.

---

## Technology Stack

The current codebase uses:

| Area | Technology |
| --- | --- |
| **Framework** | Next.js 16 |
| **UI Runtime** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Rich Text Editing** | TipTap 3 |
| **Testing** | Vitest 4 + Testing Library |
| **End-to-End Testing** | Playwright |
| **Document Handling** | DOCX, Mammoth, PDF tooling, Puppeteer/Chromium |
| **Fonts** | Inter, Noto Naskh Arabic, Noto Nastaliq Urdu, Amiri, Vazirmatn |
| **Analytics** | Vercel Analytics + Speed Insights |
| **Deployment** | Vercel |
| **Version Control** | GitHub |

---

## Local Development

### Prerequisites

- A current Node.js LTS release
- npm
- Git

### Install

```bash
git clone https://github.com/techforward009/qalam-works.git
cd qalam-works
npm install
```

### Run locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Verification

### Unit and integration tests

```bash
npm test
```

### TypeScript

```bash
npx tsc --noEmit
```

### Production build

```bash
npm run build
```

### End-to-end tests

```bash
npx playwright test
```

For normal development, prefer focused tests while iterating. Run broad gates at meaningful acceptance points instead of repeatedly rerunning the entire suite after every small edit.

---

## Repository Structure

The project follows the Next.js App Router structure, with tool-specific UI and logic kept close to each tool.

```text
qalam-works/
├── app/
│   ├── components/          # Shared site components
│   ├── lib/                 # Shared application context/config
│   ├── tools/               # Public tools and tool-local code
│   │   ├── document-studio/
│   │   ├── translation-studio/
│   │   ├── roman-urdu-writer/
│   │   ├── urdu-roman-writer/
│   │   ├── document-cleaner/
│   │   ├── quality-checker/
│   │   ├── unicode-standardizer/
│   │   ├── invoice-generator/
│   │   └── whatsapp-rtl-formatter/
│   └── utils/               # Shared processing utilities
├── docs/                    # Architecture, decisions, specifications, roadmap
├── tests/                   # Unit, integration, benchmark, and E2E coverage
└── package.json
```

### Architecture rule

Keep tool-specific code inside that tool's folder. Promote components or utilities to shared locations only when they are genuinely reused.

---

## Development and Review Workflow

Qalam Works is developed with a strong acceptance-and-freeze discipline.

A safe change normally follows this order:

1. Inspect the relevant code and existing behavior.
2. Define the intended scope and explicit non-goals.
3. Make the smallest necessary change.
4. Run focused tests while iterating.
5. Verify the final change with the appropriate full gates.
6. Review the diff and repository status.
7. Commit/freeze only after acceptance.

For AI-assisted development, agents should not assume permission to commit, push, deploy, or broaden scope unless explicitly instructed.

---

## Documentation

More detailed project documentation lives in [`docs/`](docs/).

Useful starting points include:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)
- [`docs/DECISIONS.md`](docs/DECISIONS.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/AI-COLLABORATION.md`](docs/AI-COLLABORATION.md)
- [`docs/KNOWN-LIMITATIONS.md`](docs/KNOWN-LIMITATIONS.md)
- [`docs/PROCESSING-LANGUAGES.md`](docs/PROCESSING-LANGUAGES.md)

Some historical planning documents may describe earlier product stages. When documentation and the current implementation differ, verify the current code and the latest accepted project decisions before making changes.

---

## Project Status

Qalam Works is an actively developed, production-deployed project.

The current focus is not simply adding more tools; it is improving the reliability, language quality, RTL/LTR correctness, publishing workflow, and regression safety of the existing product.

---

## Original Project Charter

The original README began as a project charter and execution blueprint. It is worth preserving for historical context, but it should live separately from the current operational README—for example:

```text
docs/PROJECT-CHARTER.md
```

The root `README.md` should describe the product **as it exists now**.
