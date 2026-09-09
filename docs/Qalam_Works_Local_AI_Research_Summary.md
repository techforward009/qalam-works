# Qalam Works — Local AI Research Summary

**Date:** 2026-09-09

## Core conclusion

Qalam Works can realistically add free, locally-running AI in the browser without making a paid API part of the core product.

Preferred architecture:

`Qalam rules-first Language Intelligence → Optional Local Browser AI → User-facing assistance`

AI should supplement, not replace, Qalam Works' deterministic rules.

## Leading candidates

### Qwen3-0.6B — preferred first prototype
- Small
- Multilingual, including Urdu
- Browser-ready ONNX/WebGPU variants exist
- Suitable for Transformers.js/WebGPU
- No paid inference API required when run on-device

Likely uses:
- explain a suggestion
- short Urdu rewrite
- tone improvement
- short summary
- heading suggestions
- simple mixed Urdu/English interpretation
- basic translation assistance

Role: **Qalam AI Lite**

### Qwen3-1.7B — preferred quality candidate
- Larger and likely more capable
- Same multilingual Qwen3 family
- Browser/WebGPU builds available
- Better fit for capable laptops/desktops

Likely uses:
- paragraph rewriting
- richer contextual proofreading
- mixed-language analysis
- terminology decisions
- stronger Urdu writing assistance

Tradeoff:
- larger download
- higher RAM/GPU requirements

Role: **Qalam AI Quality**

### Qwen3.5-0.8B — experimental challenger
- Newer generation
- Broad multilingual coverage
- Urdu support
- Browser-compatible builds exist

Keep as a benchmark challenger until browser/WebGPU maturity is clearer.

## DeepSeek

DeepSeek-R1-Distill-Qwen-1.5B is free/open and useful for reasoning experiments, but it is not the first choice for Qalam's Urdu writing layer. It may be useful later for reasoning-heavy review or second-opinion analysis.

## Recommended architecture

```text
Document Studio
      ↓
Qalam deterministic rules
      ↓
Language Intelligence
      ↓
User requests AI assistance
      ↓
Browser checks WebGPU capability
      ↓
Local model runs on user's device
      ↓
Result
```

If local AI cannot run:
- Document Studio must continue normally
- rules-first Quality Audit remains available
- AI remains optional

## Recommended two-level product

**Qalam AI Lite**  
Candidate: `Qwen3-0.6B`

**Qalam AI Quality**  
Candidate: `Qwen3-1.7B`

## Privacy advantage

Local browser AI could allow Qalam Works to keep document text on the user's device, avoid per-request API billing, and potentially work offline after model files are cached.

Exact privacy wording must match the final implementation.

## Important limitations

1. Urdu support does not guarantee professional Urdu quality.
2. WebGPU performance varies by browser/device/GPU/RAM.
3. Open model weights are free, but server-hosted GPU inference costs money.

Therefore, the zero-cost preference is:

**browser/local inference first**

## Qalam AI benchmark requirement

Before production selection, create a Qalam Urdu & Multilingual AI Benchmark covering:

- pure Urdu
- pure English
- Urdu + English technical writing
- Urdu + Arabic quotation
- Persian
- Roman Urdu
- punctuation correction
- spelling/orthographic edge cases
- URLs/emails/filenames
- PDF/DOCX/TXT
- code-like text
- protected tokens
- formal rewrite
- academic rewrite
- simplification
- summaries
- translation
- false-positive traps

Measure:
- correctness
- Urdu quality
- protected-token preservation
- false positives
- meaning preservation
- hallucination rate
- latency
- memory usage
- model download size

## Recommended decision

Do not integrate AI into the current production flow yet.

Recommended order:

`Phase 6 → LI-1 → LI-2 → LI-3 → later Language Intelligence stages → local AI prototype`

Prototype order:

1. Qwen3-0.6B
2. Qwen3-1.7B
3. Qwen3.5-0.8B as challenger
4. DeepSeek only if a specific reasoning use case justifies it

## Long-term product principle

Qalam Works should not become an AI wrapper.

Target stack:

**Deterministic Qalam rules + Urdu/RTL publishing intelligence + optional local AI**

Rules decide what is safe, protected, and structurally correct. AI helps where context, rewriting, explanation, summarization, and judgment are useful.

The final goal is not merely Google Docs parity; Qalam Works should aim to exceed generic editors in Urdu and multilingual writing intelligence.
