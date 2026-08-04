# Qalam Works — Design System

**Last updated:** 2026-08-04
**Status:** Locked (v1.0 — tokens only)

This document locks reusable design tokens and rules only. It is not a
full UI design — component-level design decisions are made per-tool during
Phase 2 implementation, using these tokens as the shared foundation.

## Brand Colors

> Placeholder values below — replace with Qalam Works' actual brand colors
> if already chosen elsewhere; otherwise these are safe defaults for a
> trust-based, professional publishing tool (not flashy "AI product" colors).

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#0F4C3A` (deep green) | Primary actions, links, brand accents |
| `--color-primary-light` | `#1B6B52` | Hover states |
| `--color-ink` | `#1A1A1A` | Body text |
| `--color-paper` | `#FAF9F6` | Page background (warm off-white, evokes manuscript paper) |
| `--color-border` | `#E3E0D8` | Borders, dividers |
| `--color-success` | `#2E7D32` | Corrections applied, success states |
| `--color-warning` | `#B8860B` | Flagged issues in quality checker |
| `--color-error` | `#B3261E` | Errors, validation failures |
| `--color-muted` | `#6B6B6B` | Secondary text, captions |

## Typography

### Fonts
- **Urdu/Arabic/Persian text:** a Nastaleeq or Naskh-style webfont
  (decide specific font during Phase 2 — e.g. Noto Nastaliq Urdu for
  Urdu, or a shared Naskh font if one face must cover all three scripts).
  Load via `next/font` for performance.
- **English/Latin text:** a clean sans-serif (e.g. Inter or system font
  stack) for UI labels, navigation, and Latin body text.

### Scale
| Token | Size | Use |
|---|---|---|
| `--text-xs` | 0.75rem | Captions, metadata |
| `--text-sm` | 0.875rem | Secondary UI text |
| `--text-base` | 1rem | Body text |
| `--text-lg` | 1.125rem | Emphasized body / lead paragraphs |
| `--text-xl` | 1.5rem | Section headings |
| `--text-2xl` | 2rem | Page headings |
| `--text-3xl` | 2.5rem | Hero heading |

Urdu/Arabic script generally needs slightly larger sizes and more line
height than Latin text at the same visual weight — apply a script-aware
line-height multiplier rather than reusing Latin defaults as-is.

## Spacing Scale

Use a consistent 4px base unit: `4, 8, 12, 16, 24, 32, 48, 64` (px), mapped
to Tailwind's default spacing scale — no custom one-off spacing values in
components.

## Border Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Inputs, badges |
| `--radius-md` | 8px | Cards, buttons |
| `--radius-lg` | 16px | Modals, large panels |

## Shadows

| Token | Use |
|---|---|
| `--shadow-sm` | Cards at rest |
| `--shadow-md` | Cards on hover, dropdowns |
| `--shadow-lg` | Modals |

Keep shadows subtle — this is a professional tool, not a marketing site
with heavy depth effects.

## Buttons

- Primary: solid `--color-primary` background, white text
- Secondary: outlined, `--color-primary` border and text
- Ghost/tertiary: text-only, used for low-emphasis actions (e.g. "Copy",
  "Download report")
- All buttons: `--radius-md`, consistent horizontal padding across sizes

## Cards

- Background: `--color-paper` or white (whichever contrasts with page
  background), `--radius-md`, `--shadow-sm` at rest
- Used for: ToolCard (homepage tool previews), ResultPanel (tool output)

## Forms / Inputs

- Border: `--color-border`, `--radius-sm`
- Focus state: `--color-primary` border, visible focus ring for
  accessibility
- Textareas for tool input (Unicode Standardizer, Quality Checker) should
  support both RTL and LTR typing without layout jumps

## RTL / LTR Rules

- Page `dir` attribute set per content type: Urdu/Arabic/Persian content
  blocks render `dir="rtl"`; English UI chrome (nav, buttons with English
  labels) stays `dir="ltr"` — mixed-direction pages are expected, not an
  edge case.
- Never mirror icons or numerals when switching direction — only text flow
  and text alignment mirror; icons (upload, download, arrows) keep their
  natural orientation unless they are directional (e.g. a "next" arrow,
  which should flip in RTL contexts).
- Input/output panels in tools (e.g. Unicode Standardizer's before/after)
  should each independently detect and apply the correct `dir` based on
  their own content, not inherit a single fixed direction for the whole
  page.

## What This Document Does Not Cover

Folder structure and code organization are defined in `ARCHITECTURE.md`.
Product decisions and reasoning are logged in `DECISIONS.md`. This
document will evolve organically during Phase 2 as real tool UIs are
built — but the tokens above should not be changed casually once tools
start depending on them; a token change is a `DECISIONS.md`-worthy
decision, not a quiet edit.
